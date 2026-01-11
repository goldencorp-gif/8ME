
import React, { useState, useRef } from 'react';
import { Property, Transaction, PropertyDocument } from '../types';
import { parseTransactionFromText } from '../services/geminiService';

interface PropertyDetailViewProps {
  property: Property | null;
  transactions: Transaction[];
  onClose: () => void;
  onEdit: (property: Property) => void;
  onExport: (property: Property) => void;
  onUpdateProperty?: (property: Property) => void;
  onAddTransaction?: (tx: Transaction | Transaction[]) => void;
}

const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({ 
  property, 
  transactions, 
  onClose, 
  onEdit, 
  onExport,
  onUpdateProperty,
  onAddTransaction
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'owner' | 'vault' | 'comms'>('details');
  const [selectedFolder, setSelectedFolder] = useState<PropertyDocument['category'] | null>(null);
  const [invoiceSubFolder, setInvoiceSubFolder] = useState<'Owner' | 'Tenant'>('Owner');
  const [previewDoc, setPreviewDoc] = useState<PropertyDocument | null>(null);
  
  // File Upload Refs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);

  // AI Ledger State
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<Partial<Transaction> | null>(null);

  if (!property) return null;

  const propertyTxs = transactions.filter(t => t.description.includes(property.address));
  
  const docs: PropertyDocument[] = property.documents || [
    { id: 'd1', name: 'Commercial Lease Agreement.pdf', category: 'Legal', type: 'PDF', dateAdded: '2024-01-10', size: '1.2 MB' },
    { id: 'd2', name: 'Quarterly Routine Inspection.pdf', category: 'Inspection', type: 'PDF', dateAdded: '2024-03-12', size: '2.4 MB' },
    { id: 'i1', name: 'Owner_MgmtFee_May2024.pdf', category: 'Invoices', subCategory: 'Owner', type: 'PDF', dateAdded: '2024-05-01', size: '120 KB' },
    { id: 'i2', name: 'Tenant_WaterUsage_Q1.pdf', category: 'Invoices', subCategory: 'Tenant', type: 'PDF', dateAdded: '2024-05-15', size: '98 KB' }
  ];

  const handleSimulateUpload = (category: PropertyDocument['category']) => {
    const newDoc: PropertyDocument = {
      id: `doc-${Date.now()}`,
      name: `${selectedFolder === 'Invoices' ? invoiceSubFolder : ''}_Doc_${Math.floor(Math.random() * 1000)}.pdf`,
      category,
      subCategory: category === 'Invoices' ? invoiceSubFolder : undefined,
      type: 'PDF',
      dateAdded: new Date().toISOString().split('T')[0],
      size: '850 KB'
    };
    
    if (onUpdateProperty) {
      onUpdateProperty({
        ...property,
        documents: [...docs, newDoc]
      });
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateProperty) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateProperty({
          ...property,
          imageUrl: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerMediaReplace = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReplacingDocId(docId);
    mediaInputRef.current?.click();
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && replacingDocId && onUpdateProperty) {
       const reader = new FileReader();
       reader.onloadend = () => {
          const updatedDocs = (property.documents || []).map(d => {
             if (d.id === replacingDocId) {
                return {
                   ...d,
                   name: file.name,
                   size: `${(file.size / 1024).toFixed(0)} KB`,
                   dateAdded: new Date().toISOString().split('T')[0],
                   url: reader.result as string, 
                   type: 'Image' // Assume image replacement for this context
                };
             }
             return d;
          });
          onUpdateProperty({ ...property, documents: updatedDocs });
          setReplacingDocId(null);
          // Clear input
          if(mediaInputRef.current) mediaInputRef.current.value = '';
       };
       reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeText = async () => {
    if (!aiInput) return;
    setAiLoading(true);
    // Append property address context to help Gemini
    const contextInput = `${aiInput} for property: ${property.address}`;
    const result = await parseTransactionFromText(contextInput);
    if (result) {
      setAiResult(result);
    }
    setAiLoading(false);
  };

  const handleConfirmAiTransaction = () => {
    if (aiResult && onAddTransaction) {
      const newTx: Transaction = {
        id: `TX-AI-${Date.now()}`,
        date: new Date().toISOString(),
        description: aiResult.description || 'AI Imported Transaction',
        amount: aiResult.amount || 0,
        type: aiResult.type as 'Credit' | 'Debit' || 'Debit',
        account: aiResult.account as 'Trust' | 'General' || 'Trust',
        reference: aiResult.reference || 'AI-REF'
      };
      onAddTransaction(newTx);
      setAiInput('');
      setAiResult(null);
    }
  };

  const handleProcessInvoicePayment = (doc: PropertyDocument) => {
    if (!onAddTransaction || !onUpdateProperty || !doc.content) return;

    // Determine Transaction Type
    const isOwnerInvoice = doc.subCategory === 'Owner';
    const txType: 'Credit' | 'Debit' = isOwnerInvoice ? 'Debit' : 'Credit';
    const description = isOwnerInvoice 
      ? `Bill Payment: ${doc.content.summary || doc.name}` 
      : `Receipt from Tenant: ${doc.content.summary || doc.name}`;
    
    const newTx: Transaction = {
      id: `TX-INV-PAY-${Date.now()}`,
      date: new Date().toISOString(),
      description: `${description} (${property.address})`,
      amount: doc.content.totalAmount || 0,
      type: txType,
      reference: doc.content.invoiceNumber || 'INV-PAY',
      account: 'Trust'
    };

    // 1. Add Transaction
    onAddTransaction(newTx);

    // 2. Update Document Status to 'Paid'
    const updatedDocs = (property.documents || []).map(d => {
      if (d.id === doc.id) {
        return {
          ...d,
          content: { ...d.content, status: 'Paid' }
        };
      }
      return d;
    });

    onUpdateProperty({
      ...property,
      documents: updatedDocs
    });

    // Close preview or update preview state
    setPreviewDoc({
      ...doc,
      content: { ...doc.content, status: 'Paid' }
    });
    
    alert(`Success!\n\nTransaction recorded: $${newTx.amount} (${newTx.type}).\nInvoice marked as PAID.`);
  };

  const generateInvoiceHtml = (doc: PropertyDocument) => {
    if (!doc.content) return '';
    
    // If we have custom HTML generated by AI from a template, return that.
    if (doc.content.customHtml) {
        return doc.content.customHtml;
    }

    const agency = doc.content.agencyName || '8ME';
    const logoHtml = doc.content.logoUrl 
      ? `<img src="${doc.content.logoUrl}" style="height: 40px; margin-right: 10px; vertical-align: middle;" />` 
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.name}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 60px; max-width: 800px; margin: 0 auto; color: #333; background: #fff; }
          .header { display: flex; justify-content: space-between; margin-bottom: 50px; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; }
          .logo { font-weight: 900; font-size: 24px; color: #4F46E5; display: flex; align-items: center; gap: 10px; }
          .invoice-title { font-size: 42px; font-weight: 300; text-transform: uppercase; color: #111; letter-spacing: -1px; text-align: right; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 60px; }
          .meta-group h4 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin: 0 0 8px 0; }
          .meta-group p { margin: 0; font-weight: 600; font-size: 15px; color: #111; }
          .meta-group .sub { font-weight: 400; font-size: 14px; color: #6b7280; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { text-align: left; border-bottom: 2px solid #111; padding: 15px 0; text-transform: uppercase; font-size: 11px; font-weight: 900; letter-spacing: 1px; }
          td { padding: 20px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
          .amount { text-align: right; font-weight: 700; }
          .total { text-align: right; margin-top: 40px; }
          .total-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; }
          .total-value { font-size: 42px; font-weight: 900; color: #111; letter-spacing: -1px; margin-top: 5px; }
          .footer { margin-top: 80px; padding-top: 20px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; }
          .status { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-top: 15px; }
          .paid { background-color: #d1fae5; color: #065f46; }
          .unpaid { background-color: #fee2e2; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
             ${logoHtml} ${agency}
          </div>
          <div class="invoice-title">Invoice</div>
        </div>
        
        <div class="meta">
          <div class="meta-group">
            <h4>Billed To</h4>
            <p>${doc.subCategory === 'Owner' ? property?.ownerName : (property?.tenantName || 'Current Occupant')}</p>
            <p class="sub">${property?.address}</p>
          </div>
          <div class="meta-group" style="text-align: right;">
            <h4>Details</h4>
            <p>Invoice #: ${doc.content.invoiceNumber}</p>
            <p class="sub">Date: ${doc.content.date}</p>
            <p class="sub">Due: ${doc.content.dueDate}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${doc.content.items.map((item: any) => `
              <tr>
                <td>${item.description}</td>
                <td class="amount">$${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          <div class="total-label">Total Amount</div>
          <div class="total-value">$${doc.content.totalAmount.toFixed(2)}</div>
          <div>
             <span class="status ${doc.content.status === 'Paid' ? 'paid' : 'unpaid'}">${doc.content.status || 'Unpaid'}</span>
          </div>
        </div>

        <div class="footer">
          Generated by ${agency} • Property Management System
        </div>
      </body>
      </html>
    `;
  };

  const handleDownload = (doc: PropertyDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    let content = "";
    let mimeType = "text/plain";
    let filename = doc.name;

    if (doc.content) {
      // Generated Invoice - Create HTML file
      content = generateInvoiceHtml(doc);
      mimeType = "text/html";
      filename = doc.name.replace('.pdf', '.html');
    } else {
      // Mock File - Create Text file
      content = `This is a placeholder content for the file: ${doc.name}\n\nIn a live environment, this would be the actual binary file (PDF/Image) downloaded from secure storage.`;
      mimeType = "text/plain";
      filename = doc.name.endsWith('.pdf') ? doc.name.replace('.pdf', '.txt') : `${doc.name}.txt`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handlePreview = (doc: PropertyDocument) => {
    setPreviewDoc(doc);
  };

  const renderFolderItem = (category: PropertyDocument['category'], icon: React.ReactNode, label: string) => (
    <button 
      onClick={() => setSelectedFolder(category)}
      className="flex flex-col items-center p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all group active:scale-95"
    >
      <div className="text-indigo-500 group-hover:scale-110 transition-transform mb-4">
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">{label}</span>
      <span className="text-[10px] text-slate-400 mt-2 font-bold bg-white px-3 py-0.5 rounded-full border border-slate-100">
        {docs.filter(d => d.category === category).length} Files
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-3xl w-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 rounded-l-[3rem] overflow-hidden">
        
        {/* Banner / Cover Image */}
        <div className="h-60 w-full relative group shrink-0">
            <img 
                src={property.imageUrl} 
                className="w-full h-full object-cover" 
                alt="Property Cover"
            />
            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all duration-300" />
            
            <button 
                onClick={() => coverInputRef.current?.click()}
                className="absolute bottom-4 right-4 px-4 py-2 bg-white/90 hover:bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Change Photo
            </button>
            <input 
                type="file" 
                ref={coverInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleCoverUpload}
            />
        </div>

        {/* Header (Text Overlay/Bottom) */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl shadow-sm ${property.propertyType === 'Commercial' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>{property.propertyType}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Statutory Vault</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight truncate max-w-md">{property.address}</h3>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 rounded-2xl text-slate-400 transition-all shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Navigation */}
        <div className="px-10 bg-white border-b border-slate-100 flex space-x-4">
          {[
            { id: 'details', label: 'Financials' },
            { id: 'owner', label: 'Landlord' },
            { id: 'vault', label: 'Document Vault' },
            { id: 'comms', label: 'Contacts & Log' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setSelectedFolder(null); }}
              className={`py-5 px-6 rounded-t-2xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                activeTab === tab.id ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/20">
          {activeTab === 'details' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Annual Yield</p>
                  <p className="font-black text-slate-900 text-xl">${(property.rentAmount * (property.rentFrequency === 'Weekly' ? 52 : property.rentFrequency === 'Monthly' ? 12 : 1)).toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Mgmt Fee</p>
                  <p className="font-black text-slate-900 text-xl">{property.managementFeePercent}%</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-2">GST Status</p>
                  <p className="font-black text-indigo-600 text-sm uppercase">{property.includesGst ? 'Registered' : 'Non-GST'}</p>
                </div>
              </div>

              {/* AI Smart Ledger Entry Widget */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-indigo-50/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                     <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">AI</div>
                     <h5 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Smart Ledger Entry</h5>
                  </div>
                  <span className="text-[10px] text-indigo-400 font-bold">Paste Invoice Text or Bank Feed Line</span>
                </div>
                <div className="p-8 space-y-4">
                  {!aiResult ? (
                    <div className="flex space-x-3">
                      <input 
                        type="text" 
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        placeholder="e.g. Paid plumber $150 for fixing tap at 123 Ocean View" 
                        className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                      />
                      <button 
                        onClick={handleAnalyzeText}
                        disabled={aiLoading || !aiInput}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
                      >
                        {aiLoading ? 'Thinking...' : 'Analyze'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 animate-in zoom-in-95 duration-200">
                      <div className="flex justify-between items-start mb-4">
                        <h6 className="text-xs font-black uppercase text-slate-500 tracking-widest">AI Extracted Data</h6>
                        <button onClick={() => setAiResult(null)} className="text-slate-400 hover:text-slate-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Description</p>
                          <p className="font-bold text-slate-900 text-sm">{aiResult.description}</p>
                        </div>
                        <div>
                           <p className="text-[10px] text-slate-400 font-bold uppercase">Amount</p>
                           <p className={`font-black text-sm ${aiResult.type === 'Credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {aiResult.type === 'Credit' ? '+' : '-'}${aiResult.amount}
                           </p>
                        </div>
                        <div>
                           <p className="text-[10px] text-slate-400 font-bold uppercase">Account</p>
                           <span className="inline-block px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase">{aiResult.account}</span>
                        </div>
                        <div>
                           <p className="text-[10px] text-slate-400 font-bold uppercase">Reference</p>
                           <p className="font-mono text-xs text-slate-600">{aiResult.reference}</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleConfirmAiTransaction}
                        className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-xl shadow-emerald-200 transition-all"
                      >
                        Confirm & Post to Ledger
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
                <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                   <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Transaction History</h5>
                   <button onClick={() => onExport(property)} className="text-[10px] font-black uppercase text-indigo-600 hover:underline">Export CSV</button>
                </div>
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-slate-50">
                    {propertyTxs.length === 0 ? (
                       <tr>
                         <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic text-xs">No transactions recorded. Try the AI Smart Entry above.</td>
                       </tr>
                    ) : (
                      propertyTxs.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5 text-center w-12">
                             <div className="group relative">
                               <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>
                               <div className="hidden group-hover:block absolute left-full top-0 ml-2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">Locked</div>
                             </div>
                          </td>
                          <td className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">{new Date(tx.date).toLocaleDateString()}</td>
                          <td className="px-8 py-5 font-black text-slate-900 text-xs">{tx.reference}</td>
                          <td className="px-8 py-5 text-sm text-slate-500 truncate max-w-[150px]">{tx.description}</td>
                          <td className={`px-8 py-5 text-right font-black ${tx.type === 'Credit' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            ${tx.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'owner' && (
            <div className="space-y-8 animate-in fade-in duration-300">
               {/* Owner Profile Card */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                  <div className="flex items-center space-x-6">
                     <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-inner shrink-0">
                        {property.ownerName.charAt(0)}
                     </div>
                     <div>
                        <div className="flex items-center space-x-2 mb-1">
                           <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">Property Owner</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{property.ownerName}</h2>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 mt-2 text-sm font-medium text-slate-500">
                           {property.ownerEmail && (
                             <a href={`mailto:${property.ownerEmail}`} className="hover:text-indigo-600 flex items-center gap-1">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 00-2 2z" /></svg>
                               {property.ownerEmail}
                             </a>
                           )}
                           {property.ownerPhone && (
                             <a href={`tel:${property.ownerPhone}`} className="hover:text-indigo-600 flex items-center gap-1">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                               {property.ownerPhone}
                             </a>
                           )}
                        </div>
                     </div>
                  </div>
                  <button onClick={() => onEdit(property)} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg active:scale-95 whitespace-nowrap">
                    Edit Details
                  </button>
               </div>

               {/* Banking & Agreement */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Bank Details */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between">
                     <div>
                        <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                           <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                           </div>
                           Disbursement Account
                        </h3>
                        <div className="space-y-4">
                           <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Name</p>
                              <p className="text-lg font-medium text-slate-900">{property.bankDetails?.accountName || property.ownerName}</p>
                           </div>
                           <div className="flex gap-8">
                              <div>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BSB</p>
                                 <p className="text-lg font-mono font-medium text-slate-900 tracking-wider">{property.bankDetails?.bsb || '--- ---'}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account</p>
                                 <p className="text-lg font-mono font-medium text-slate-900 tracking-wider">{property.bankDetails?.accountNumber || '--- ---'}</p>
                              </div>
                           </div>
                        </div>
                     </div>
                     <div className="mt-8 pt-6 border-t border-slate-50">
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">Active for Payouts</span>
                     </div>
                  </div>

                  {/* Agency Agreement */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between">
                     <div>
                        <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                           <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                           </div>
                           Agency Agreement
                        </h3>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                              <span className="text-sm font-medium text-slate-500">Management Fee</span>
                              <span className="text-xl font-black text-slate-900">{property.managementFeePercent}% <span className="text-xs font-bold text-slate-400">+ GST</span></span>
                           </div>
                           <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                              <span className="text-sm font-medium text-slate-500">Letting Fee</span>
                              <span className="text-sm font-bold text-slate-900">1 Week Rent</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-slate-500">Authority End</span>
                              <span className="text-sm font-bold text-slate-900">Continuing</span>
                           </div>
                        </div>
                     </div>
                     <div className="mt-8 pt-6 border-t border-slate-50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Signed: {property.id ? 'Yes' : 'Pending'}</span>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
              {!selectedFolder ? (
                <div className="grid grid-cols-2 gap-8">
                  {renderFolderItem('Applications', <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, 'Applications')}
                  {renderFolderItem('Legal', <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>, 'Lease Files')}
                  {renderFolderItem('Inspection', <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, 'Condition Reports')}
                  {renderFolderItem('Invoices', <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, 'Invoices')}
                  {renderFolderItem('Media', <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>, 'Media Archive')}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Hidden Input for Media Replacement */}
                  <input 
                    type="file" 
                    ref={mediaInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleMediaUpload}
                  />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <button 
                      onClick={() => setSelectedFolder(null)}
                      className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                      Vault / {selectedFolder}
                    </button>
                    <div className="flex items-center space-x-3">
                      {selectedFolder === 'Invoices' && (
                        <div className="flex p-1 bg-slate-200/50 rounded-2xl gap-1">
                          <button 
                            onClick={() => setInvoiceSubFolder('Owner')}
                            className={`px-5 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${invoiceSubFolder === 'Owner' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                          >Owner Stream</button>
                          <button 
                            onClick={() => setInvoiceSubFolder('Tenant')}
                            className={`px-5 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${invoiceSubFolder === 'Tenant' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                          >Renter Stream</button>
                        </div>
                      )}
                      <button 
                        onClick={() => handleSimulateUpload(selectedFolder)}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all active:scale-95"
                      >
                        Upload Document
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm min-h-[400px]">
                    <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                         Displaying {selectedFolder} {selectedFolder === 'Invoices' ? `> ${invoiceSubFolder}` : ''}
                       </p>
                    </div>
                    {docs.filter(d => d.category === selectedFolder && (selectedFolder !== 'Invoices' || d.subCategory === invoiceSubFolder)).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[350px] text-slate-300">
                        <svg className="w-16 h-16 mb-4 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                        <p className="italic font-bold tracking-widest text-[10px] uppercase">This stream is currently empty.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {docs.filter(d => d.category === selectedFolder && (selectedFolder !== 'Invoices' || d.subCategory === invoiceSubFolder)).map(doc => (
                          <div key={doc.id} onClick={() => handlePreview(doc)} className="p-8 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer">
                            <div className="flex items-center space-x-6">
                              <div className={`p-4 rounded-2xl shadow-sm ${doc.type === 'PDF' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              </div>
                              <div>
                                <p className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{doc.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Size: {doc.size} • Added {doc.dateAdded}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Edit Button for Media */}
                              {(selectedFolder === 'Media' || doc.type === 'Image') && (
                                <button 
                                    onClick={(e) => triggerMediaReplace(doc.id, e)}
                                    className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all"
                                    title="Replace Image"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                </button>
                              )}
                              <button 
                                onClick={(e) => handleDownload(doc, e)}
                                className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all"
                                title="Download File"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              </button>
                              <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comms' && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Owner Contact Card */}
                 <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center space-x-4 mb-6">
                       <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                       </div>
                       <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Owner Contact</h4>
                          <p className="text-xs text-slate-400">Principal Landlord</p>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <div className="flex items-center space-x-3 text-sm">
                          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          <span className="font-bold text-slate-700">{property.ownerPhone || 'No Phone Recorded'}</span>
                       </div>
                       <div className="flex items-center space-x-3 text-sm">
                          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 00-2 2z" /></svg>
                          <span className="font-bold text-slate-700">{property.ownerEmail || 'No Email Recorded'}</span>
                       </div>
                    </div>
                 </div>

                 {/* Tenant Contact Card */}
                 <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center space-x-4 mb-6">
                       <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857" /></svg>
                       </div>
                       <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Tenant Contact</h4>
                          <p className="text-xs text-slate-400">Current Occupant</p>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <div className="flex items-center space-x-3 text-sm mb-4">
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          <span className="font-black text-slate-900 text-lg">{property.tenantName || 'VACANT'}</span>
                       </div>
                       <div className="flex items-center space-x-3 text-sm">
                          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          <span className="font-bold text-slate-700">{property.tenantPhone || 'No Phone Recorded'}</span>
                       </div>
                       <div className="flex items-center space-x-3 text-sm">
                          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 00-2 2z" /></svg>
                          <span className="font-bold text-slate-700">{property.tenantEmail || 'No Email Recorded'}</span>
                       </div>
                    </div>
                 </div>
               </div>

               <div className="p-12 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                  <svg className="w-16 h-16 mx-auto mb-6 text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">Trust & Compliance Log</h4>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mt-2 italic">Statutory record of communications and notices sent for this asset.</p>
               </div>
            </div>
          )}
        </div>

        {/* Global Footer Actions */}
        <div className="p-10 border-t border-slate-100 bg-white flex space-x-5 shrink-0 rounded-bl-[3rem]">
          <button onClick={() => onEdit(property)} className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all active:scale-95">Modify Profile</button>
          <button onClick={() => onExport(property)} className="flex-1 py-5 border-2 border-slate-100 bg-white text-slate-600 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95">Download Ledger</button>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setPreviewDoc(null)} />
          <div className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="font-bold text-slate-900">{previewDoc.name}</h3>
               <div className="flex space-x-2">
                 <button 
                   onClick={(e) => handleDownload(previewDoc, e)}
                   className="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors flex items-center gap-2 px-3 group"
                 >
                   <span className="text-[10px] font-bold uppercase tracking-widest hidden group-hover:block">Download</span>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 </button>
                 <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-200/50 flex justify-center">
              {previewDoc.content ? (
                previewDoc.content.customHtml ? (
                  // Custom HTML Renderer (For Custom Form Invoices)
                  <div className="bg-white shadow-2xl max-w-3xl w-full min-h-[800px] relative flex flex-col rounded-[2rem] overflow-hidden">
                     <iframe 
                        srcDoc={previewDoc.content.customHtml} 
                        className="flex-1 w-full h-full border-0"
                        title={previewDoc.name}
                     />
                     {/* Overlay Status Badge if Paid */}
                     {previewDoc.content.status === 'Paid' && (
                        <div className="absolute top-10 right-10 rotate-12 border-4 border-emerald-600 text-emerald-600 font-black text-4xl uppercase px-4 py-2 opacity-80 pointer-events-none rounded-xl bg-white/50 backdrop-blur-sm shadow-xl">
                           PAID
                        </div>
                     )}
                     
                     {/* Action Bar for Unpaid - Overlaid at bottom */}
                     {previewDoc.content.status === 'Unpaid' && (
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur border-t border-slate-100 flex justify-between items-center shadow-lg">
                           <div>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Due</p>
                              <p className="text-2xl font-black text-slate-900">${previewDoc.content.totalAmount?.toFixed(2)}</p>
                           </div>
                           <button 
                             onClick={() => handleProcessInvoicePayment(previewDoc)}
                             className={`px-8 py-3 text-white rounded-xl font-bold shadow-xl transition-all active:scale-95 flex items-center gap-2 ${
                               previewDoc.subCategory === 'Owner' 
                                 ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' 
                                 : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                             }`}
                           >
                             {previewDoc.subCategory === 'Owner' ? 'Pay from Trust' : 'Receipt Payment'}
                           </button>
                        </div>
                     )}
                  </div>
                ) : (
                  // Render Standard Generated Invoice
                  <div className="bg-white p-12 shadow-xl max-w-2xl w-full min-h-[600px] flex flex-col relative overflow-hidden">
                     {previewDoc.content.status === 'Paid' && (
                       <div className="absolute top-12 right-0 rotate-45 translate-x-12 bg-emerald-500 text-white py-2 px-16 shadow-lg z-10">
                          <span className="text-xl font-black uppercase tracking-widest border-2 border-white px-2">PAID</span>
                       </div>
                     )}
                     
                     <div className="flex justify-between items-start mb-12">
                        <div className="flex items-center space-x-3">
                           {previewDoc.content.logoUrl ? (
                             <img src={previewDoc.content.logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
                           ) : (
                             <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xs">AI</span>
                             </div>
                           )}
                           <div>
                              <h1 className="text-lg font-bold text-slate-900 leading-tight">{previewDoc.content.agencyName || '8ME'}</h1>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Property Management</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <h2 className="text-3xl font-light text-slate-900 uppercase tracking-widest mb-1">Invoice</h2>
                           <p className="font-mono text-slate-500">{previewDoc.content.invoiceNumber}</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-12 mb-12">
                        <div>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
                           <p className="font-bold text-slate-900 text-lg">{previewDoc.subCategory === 'Owner' ? property.ownerName : (property.tenantName || 'Current Occupant')}</p>
                           <p className="text-sm text-slate-500 mt-1">{property.address}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Dates</p>
                           <p className="text-sm text-slate-900"><span className="font-bold">Issued:</span> {previewDoc.content.date}</p>
                           <p className="text-sm text-slate-900"><span className="font-bold">Due:</span> {previewDoc.content.dueDate}</p>
                        </div>
                     </div>

                     <div className="flex-1">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="border-b-2 border-slate-900">
                                 <th className="py-3 text-xs font-black uppercase tracking-widest text-slate-900">Description</th>
                                 <th className="py-3 text-xs font-black uppercase tracking-widest text-slate-900 text-right">Amount</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {(previewDoc.content.items || []).map((item: any, i: number) => (
                                 <tr key={i}>
                                    <td className="py-4 text-sm font-medium text-slate-700">{item.description}</td>
                                    <td className="py-4 text-sm font-bold text-slate-900 text-right">${item.amount.toFixed(2)}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>

                     <div className="border-t-2 border-slate-900 pt-4 flex justify-between items-center mt-8">
                        <p className="text-sm font-medium text-slate-500">{previewDoc.content.summary}</p>
                        <div className="text-right">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Amount</p>
                           <p className="text-3xl font-black text-slate-900">${previewDoc.content.totalAmount.toFixed(2)}</p>
                        </div>
                     </div>

                     {/* Payment Action Bar */}
                     {previewDoc.content.status === 'Unpaid' && (
                       <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end">
                         <button 
                           onClick={() => handleProcessInvoicePayment(previewDoc)}
                           className={`px-8 py-3 text-white rounded-xl font-bold shadow-xl transition-all active:scale-95 flex items-center gap-2 ${
                             previewDoc.subCategory === 'Owner' 
                               ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' 
                               : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                           }`}
                         >
                           {previewDoc.subCategory === 'Owner' ? (
                             <>
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                               Pay Bill from Trust
                             </>
                           ) : (
                             <>
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                               Receipt Tenant Payment
                             </>
                           )}
                         </button>
                       </div>
                     )}
                  </div>
                )
              ) : (
                // Generic Preview Unavailable
                <div className="flex flex-col items-center justify-center text-center p-12">
                   <div className="w-24 h-24 bg-slate-300 rounded-xl mb-6 flex items-center justify-center text-slate-500 shadow-inner">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                   </div>
                   <h3 className="text-xl font-bold text-slate-900">Preview Unavailable</h3>
                   <p className="text-slate-500 max-w-xs mt-2">This is a mockup file. Only invoices generated via the AI Assistant can be fully previewed in this demo.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetailView;
