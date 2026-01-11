
import React, { useState } from 'react';
import { generatePropertyDescription, analyzeArrearsMessage, parseInvoiceRequest, generateQuoteRequestEmail, generateBackgroundCheck, generatePrivacyConsent, generateLeaseAppraisal, generateSalesAppraisal, generateProspectingMessage } from '../services/geminiService';
import { Property, Transaction, PropertyDocument } from '../types';
import { useAuth } from '../contexts/AuthContext'; // Import Auth

interface AIToolsProps {
  properties?: Property[];
  onAddTransaction?: (tx: Transaction | Transaction[]) => void;
  onUpdateProperty?: (property: Property) => void;
}

const AITools: React.FC<AIToolsProps> = ({ properties = [], onAddTransaction, onUpdateProperty }) => {
  const { user } = useAuth(); // Get user to check plan
  
  const [address, setAddress] = useState('');
  const [features, setFeatures] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  // Arrears Tool State
  const [arrearsTenantName, setArrearsTenantName] = useState('');
  const [arrearsAddress, setArrearsAddress] = useState('');
  const [arrearsAmount, setArrearsAmount] = useState('');
  const [arrearsDays, setArrearsDays] = useState('');
  const [arrearsItem, setArrearsItem] = useState('Rent');
  const [arrearsDeadline, setArrearsDeadline] = useState('');
  const [arrearsPaymentMethod, setArrearsPaymentMethod] = useState('EFT to Trust Account');

  // Quote Tool State
  const [quoteTradesman, setQuoteTradesman] = useState('');
  const [quotePropertyId, setQuotePropertyId] = useState('');
  const [quoteIssue, setQuoteIssue] = useState('');

  // Invoice Tool State
  const [invPropertyId, setInvPropertyId] = useState('');
  const [invRecipient, setInvRecipient] = useState<'Owner' | 'Tenant'>('Owner');
  const [invDescription, setInvDescription] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [agencyName, setAgencyName] = useState('8ME');
  const [templateFile, setTemplateFile] = useState<string | null>(null);
  const [isCustomTemplate, setIsCustomTemplate] = useState(false);

  // Background Check Tool State
  const [checkName, setCheckName] = useState('');
  const [checkId, setCheckId] = useState('');
  const [checkAddress, setCheckAddress] = useState('');
  const [checkPropertyId, setCheckPropertyId] = useState('');
  const [checkResult, setCheckResult] = useState<any | null>(null);
  const [isPrivacyMode, setIsPrivacyMode] = useState(true);

  // Consent Generator State
  const [consentApplicant, setConsentApplicant] = useState('');
  const [consentAddress, setConsentAddress] = useState('');

  // Lease Appraisal State
  const [appraisalAddress, setAppraisalAddress] = useState('');
  const [appraisalType, setAppraisalType] = useState('Residential');
  const [appraisalBeds, setAppraisalBeds] = useState('');
  const [appraisalBaths, setAppraisalBaths] = useState('');
  const [appraisalCars, setAppraisalCars] = useState('');
  const [appraisalFeatures, setAppraisalFeatures] = useState('');

  // Sales Appraisal State
  const [salesAddress, setSalesAddress] = useState('');
  const [salesType, setSalesType] = useState('Residential');
  const [salesBeds, setSalesBeds] = useState('');
  const [salesBaths, setSalesBaths] = useState('');
  const [salesCars, setSalesCars] = useState('');
  const [salesFeatures, setSalesFeatures] = useState('');

  // Prospecting Generator State
  const [prospectArea, setProspectArea] = useState('');
  const [prospectType, setProspectType] = useState('Letterbox Drop');
  const [prospectHook, setProspectHook] = useState('');

  const inputClass = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 bg-white placeholder:text-slate-400";

  // CHECK PLAN STATUS
  const isPremium = user?.plan && user.plan !== 'Trial';

  if (!isPremium) {
      return (
          <div className="max-w-4xl mx-auto py-24 text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4">Demo Restriction</h2>
              <p className="text-slate-500 max-w-lg mx-auto mb-8">
                  AI features like Gemini integration, Lease Appraisals, and Legal Drafting are only available in the full version.
              </p>
              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 inline-block text-left max-w-sm">
                  <h4 className="font-bold text-indigo-900 mb-2">Activation Steps:</h4>
                  <ol className="list-decimal list-inside text-sm text-indigo-800 space-y-2">
                      <li>Purchase a subscription plan.</li>
                      <li>Receive your credentials from the Master Admin.</li>
                      <li>Log in with the new credentials to unlock these features instantly.</li>
                  </ol>
              </div>
          </div>
      );
  }

  const handleGenerateListing = async () => {
    if (!address) return;
    setLoading(true);
    const desc = await generatePropertyDescription(address, features.split(',').map(f => f.trim()));
    setResult(desc || 'Failed');
    setLoading(false);
    setInvoiceData(null);
    setCheckResult(null);
  };

  const handleGenerateArrears = async () => {
    if (!arrearsTenantName || !arrearsAmount) return;
    setLoading(true);
    const msg = await analyzeArrearsMessage(
      arrearsTenantName, 
      parseFloat(arrearsAmount), 
      parseInt(arrearsDays) || 0,
      arrearsAddress,
      arrearsItem,
      arrearsDeadline,
      arrearsPaymentMethod
    );
    setResult(msg || 'Failed');
    setLoading(false);
    setInvoiceData(null);
    setCheckResult(null);
  };

  const handleGenerateQuote = async () => {
    if (!quoteTradesman || !quotePropertyId || !quoteIssue) return;
    const prop = properties.find(p => p.id === quotePropertyId);
    if (!prop) return;

    setLoading(true);
    const msg = await generateQuoteRequestEmail(quoteTradesman, prop.address, quoteIssue);
    setResult(msg || 'Failed');
    setLoading(false);
    setInvoiceData(null);
    setCheckResult(null);
  };

  const handleGenerateInvoice = async () => {
    if (!invPropertyId || !invDescription) return;
    const prop = properties.find(p => p.id === invPropertyId);
    if (!prop) return;

    setLoading(true);
    // strip header from base64 if present for API
    const cleanTemplate = templateFile ? templateFile.split(',')[1] : undefined;
    const data = await parseInvoiceRequest(invDescription, prop.address, invRecipient, invDate, cleanTemplate);
    setInvoiceData(data);
    setResult(''); 
    setCheckResult(null);
    setLoading(false);
  };

  const handleBackgroundCheck = async () => {
    if (!checkName || !checkId) return;
    setLoading(true);
    const data = await generateBackgroundCheck(checkName, checkId, checkAddress);
    
    // Add timestamp to result
    const resultWithTimestamp = {
      ...data,
      timestamp: new Date().toLocaleString('en-AU', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };

    setCheckResult(resultWithTimestamp);
    setIsPrivacyMode(true); // Default to privacy mode on new search
    setResult('');
    setInvoiceData(null);
    setLoading(false);
  };

  const handleSaveScreeningReport = () => {
    if (!checkResult || !checkPropertyId || !onUpdateProperty) return;

    const prop = properties.find(p => p.id === checkPropertyId);
    if (!prop) return;

    const newDoc: PropertyDocument = {
      id: `DOC-CHECK-${Date.now()}`,
      name: `Screening_Report_${checkName.replace(/\s+/g, '_')}.pdf`,
      category: 'Applications', // Changed from Legal to Applications
      type: 'PDF',
      dateAdded: new Date().toISOString().split('T')[0],
      size: '150 KB',
      content: {
        ...checkResult,
        applicantName: checkName,
        applicantId: checkId
      }
    };

    const updatedProp = {
      ...prop,
      documents: [...(prop.documents || []), newDoc]
    };
    onUpdateProperty(updatedProp);

    alert(`Report Saved to Vault!\n\nDocument has been filed under 'Applications' for ${prop.address}.\n\nYou can move it to 'Legal' or 'Tenancy' once the lease is approved.`);
    setCheckResult(null);
    setCheckName('');
    setCheckId('');
    setCheckAddress('');
  };

  const handleGenerateConsent = async () => {
    if (!consentApplicant || !consentAddress) return;
    setLoading(true);
    const text = await generatePrivacyConsent(agencyName, consentApplicant, consentAddress);
    setResult(text || 'Failed');
    setLoading(false);
    setInvoiceData(null);
    setCheckResult(null);
  };

  const handleGenerateAppraisal = async () => {
    if (!appraisalAddress) return;
    setLoading(true);
    const text = await generateLeaseAppraisal(
        appraisalAddress, 
        appraisalType, 
        appraisalBeds, 
        appraisalBaths, 
        appraisalCars, 
        appraisalFeatures.split(',').map(f => f.trim())
    );
    setResult(text || 'Failed');
    setLoading(false);
    setInvoiceData(null);
    setCheckResult(null);
  };

  const handleGenerateSalesAppraisal = async () => {
    if (!salesAddress) return;
    setLoading(true);
    const text = await generateSalesAppraisal(
        salesAddress,
        salesType,
        salesBeds,
        salesBaths,
        salesCars,
        salesFeatures.split(',').map(f => f.trim())
    );
    setResult(text || 'Failed');
    setLoading(false);
    setInvoiceData(null);
    setCheckResult(null);
  };

  const handleGenerateProspecting = async () => {
    if (!prospectArea || !prospectHook) return;
    setLoading(true);
    const text = await generateProspectingMessage(
      prospectArea,
      prospectType,
      prospectHook
    );
    setResult(text || 'Failed');
    setLoading(false);
    setInvoiceData(null);
    setCheckResult(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTemplateFile(reader.result as string);
        setIsCustomTemplate(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApproveInvoice = () => {
    if (!invoiceData || !onUpdateProperty) return;
    
    const prop = properties.find(p => p.id === invPropertyId);
    if (!prop) return;

    // Save as Document in Vault - Status set to 'Unpaid'
    const newDoc: PropertyDocument = {
      id: `DOC-INV-${Date.now()}`,
      name: `Invoice_${invoiceData.invoiceNumber}_${invRecipient}.pdf`,
      category: 'Invoices',
      subCategory: invRecipient,
      type: 'PDF',
      dateAdded: invoiceData.date,
      size: '45 KB',
      content: { 
        ...invoiceData, 
        logoUrl,
        agencyName, 
        status: 'Unpaid'
      } 
    };
      
    const updatedProp = {
      ...prop,
      documents: [...(prop.documents || []), newDoc]
    };
    onUpdateProperty(updatedProp);

    alert(`Invoice #${invoiceData.invoiceNumber} Issued!\n\nIt has been saved to the Property Vault as "Unpaid".\n\nGo to the Property Vault to process the payment when funds are sent or received.`);
    
    setInvoiceData(null);
    setInvDescription('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">AI Property Assistant</h2>
        <p className="text-slate-500 mt-2">Generate listings, draft communications, and analyze portfolio data with Gemini 3.</p>
        <span className="inline-block mt-2 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">{user?.plan} Plan Active</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* 1. Smart Invoice Generator */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          {/* ... Invoice Content ... */}
          <div className="absolute top-0 right-0 p-2 bg-emerald-500 rounded-bl-2xl text-[10px] font-black uppercase text-white tracking-widest px-4">New</div>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900">Smart Invoice</h3>
          </div>
          
          <div className="space-y-4 flex-1">
             {/* Toggle between Standard and Custom */}
             <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setIsCustomTemplate(false)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isCustomTemplate ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                >Standard</button>
                <button 
                  onClick={() => setIsCustomTemplate(true)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isCustomTemplate ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                >Custom Form</button>
             </div>

             <div>
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Select Property</label>
               <select 
                 className={inputClass}
                 value={invPropertyId}
                 onChange={(e) => setInvPropertyId(e.target.value)}
               >
                 <option value="">Choose Asset...</option>
                 {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
               </select>
             </div>
             
             <div>
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Invoice To</label>
               <div className="flex bg-slate-200/50 rounded-xl p-1 gap-1">
                 <button 
                   onClick={() => setInvRecipient('Owner')} 
                   className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${invRecipient === 'Owner' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                 >Owner</button>
                 <button 
                   onClick={() => setInvRecipient('Tenant')} 
                   className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${invRecipient === 'Tenant' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                 >Renter</button>
               </div>
             </div>

             {isCustomTemplate ? (
               <div>
                 <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Upload Blank Form</label>
                 <div className="relative">
                   <input 
                     type="file" 
                     accept="image/*"
                     onChange={handleTemplateUpload}
                     className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                   />
                   {templateFile && <span className="absolute right-0 top-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Loaded</span>}
                 </div>
                 <p className="text-[9px] text-slate-400 mt-1">AI will scan this form and attempt to fill it.</p>
               </div>
             ) : (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Company Logo</label>
                    <div className="relative">
                        <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                        />
                        {logoUrl && <span className="absolute right-0 top-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">✓</span>}
                    </div>
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Agency Name</label>
                    <input 
                        type="text"
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        className={inputClass}
                    />
                    </div>
                </div>
             )}

             <div>
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice Date</label>
               <input 
                 type="date"
                 value={invDate}
                 onChange={(e) => setInvDate(e.target.value)}
                 className={inputClass}
               />
             </div>

             <div>
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Details</label>
               <textarea 
                 value={invDescription}
                 onChange={(e) => setInvDescription(e.target.value)}
                 placeholder={invRecipient === 'Owner' ? "e.g. Charge owner for tap repair $150 and admin fee $20" : "e.g. Charge tenant for water usage $45.50 and key replacement"}
                 className={`${inputClass} h-24`}
               />
             </div>
          </div>
          
          <button 
            onClick={handleGenerateInvoice}
            disabled={loading || !invPropertyId || (isCustomTemplate && !templateFile)}
            className="w-full mt-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 disabled:bg-slate-300 transition-colors shadow-lg shadow-emerald-200"
          >
            {loading ? 'Processing...' : isCustomTemplate ? 'Fill Custom Form' : 'Draft Invoice'}
          </button>
        </div>

        {/* 2. Listing Generator */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2-2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900">Listing Generator</h3>
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Property Address</label>
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Ocean View Drive"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Key Features</label>
              <textarea 
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                placeholder="3 beds, pool, newly renovated"
                className={`${inputClass} h-24`}
              />
            </div>
          </div>
          <button 
            onClick={handleGenerateListing}
            disabled={loading}
            className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 disabled:bg-slate-300 transition-colors shadow-lg shadow-indigo-200"
          >
            {loading ? 'Thinking...' : 'Generate Description'}
          </button>
        </div>

        {/* 3. Arrears Assistant */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-rose-100 rounded-2xl text-rose-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900">Arrears Assistant</h3>
          </div>
          <div className="space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tenant Name</label>
                <input type="text" value={arrearsTenantName} onChange={e => setArrearsTenantName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Amount ($)</label>
                <input type="number" value={arrearsAmount} onChange={e => setArrearsAmount(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Days Overdue</label>
                <input type="number" value={arrearsDays} onChange={e => setArrearsDays(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Deadline</label>
                <input type="date" value={arrearsDeadline} onChange={e => setArrearsDeadline(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Property</label>
              <input type="text" value={arrearsAddress} onChange={e => setArrearsAddress(e.target.value)} placeholder="Full Address" className={inputClass} />
            </div>
          </div>
          <button onClick={handleGenerateArrears} disabled={loading} className="w-full mt-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 disabled:bg-slate-300 transition-colors shadow-lg shadow-rose-200">
            {loading ? 'Drafting...' : 'Draft Breach Notice'}
          </button>
        </div>

        {/* 4. Maintenance Quote */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2-2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900">Request Quote</h3>
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tradesperson Name</label>
              <input type="text" value={quoteTradesman} onChange={e => setQuoteTradesman(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Property</label>
              <select value={quotePropertyId} onChange={e => setQuotePropertyId(e.target.value)} className={inputClass}>
                <option value="">Select Property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Issue</label>
              <textarea value={quoteIssue} onChange={e => setQuoteIssue(e.target.value)} className={`${inputClass} h-24`} />
            </div>
          </div>
          <button onClick={handleGenerateQuote} disabled={loading} className="w-full mt-6 py-3 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 disabled:bg-slate-300 transition-colors shadow-lg shadow-amber-200">
            {loading ? 'Drafting...' : 'Draft Quote Request'}
          </button>
        </div>

        {/* 5. Tenant Screening */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-violet-100 rounded-2xl text-violet-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900">Tenant Screening</h3>
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Applicant Name</label>
              <input type="text" value={checkName} onChange={e => setCheckName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Address</label>
              <input 
                type="text" 
                value={checkAddress} 
                onChange={e => setCheckAddress(e.target.value)} 
                placeholder="For ID matching"
                className={inputClass} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ID / Driver License</label>
              <input type="text" value={checkId} onChange={e => setCheckId(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Property Applied For (Optional)</label>
              <select 
                className={inputClass}
                value={checkPropertyId}
                onChange={(e) => setCheckPropertyId(e.target.value)}
              >
                <option value="">-- Select Asset --</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleBackgroundCheck} disabled={loading} className="w-full mt-6 py-3 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-700 disabled:bg-slate-300 transition-colors shadow-lg shadow-violet-200">
            {loading ? 'Searching...' : 'Run Background Check'}
          </button>
        </div>

        {/* 6. Prospecting Generator */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            </div>
            <div>
               <h3 className="font-bold text-slate-900">Prospecting Gen</h3>
               <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">New</span>
            </div>
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Area</label>
              <input 
                type="text" 
                value={prospectArea}
                onChange={(e) => setProspectArea(e.target.value)}
                placeholder="e.g. Bondi Beach (2026)"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Message Type</label>
              <select 
                value={prospectType}
                onChange={(e) => setProspectType(e.target.value)}
                className={inputClass}
              >
                <option value="Letterbox Drop">Letterbox Drop / Flyer</option>
                <option value="Email Blast">Email Newsletter</option>
                <option value="Facebook Post">Social Media Post</option>
                <option value="SMS">SMS Campaign</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">The "Hook" (Reason)</label>
              <textarea 
                value={prospectHook}
                onChange={(e) => setProspectHook(e.target.value)}
                placeholder="e.g. Just sold 22 Smith St for record price, have left over buyers"
                className={`${inputClass} h-20`}
              />
            </div>
          </div>
          <button 
            onClick={handleGenerateProspecting}
            disabled={loading}
            className="w-full mt-6 py-3 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 disabled:bg-slate-300 transition-colors shadow-lg shadow-orange-200"
          >
            {loading ? 'Drafting...' : 'Generate Campaign'}
          </button>
        </div>

        {/* 7. Lease Appraisal */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-cyan-100 rounded-2xl text-cyan-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900">Lease Appraisal</h3>
          </div>
          <div className="space-y-4 flex-1">
            <input type="text" placeholder="Address" value={appraisalAddress} onChange={e => setAppraisalAddress(e.target.value)} className={inputClass} />
            <div className="grid grid-cols-3 gap-2">
               <input type="number" placeholder="Beds" value={appraisalBeds} onChange={e => setAppraisalBeds(e.target.value)} className={inputClass} />
               <input type="number" placeholder="Baths" value={appraisalBaths} onChange={e => setAppraisalBaths(e.target.value)} className={inputClass} />
               <input type="number" placeholder="Cars" value={appraisalCars} onChange={e => setAppraisalCars(e.target.value)} className={inputClass} />
            </div>
            <textarea placeholder="Features (e.g. Pool, View)" value={appraisalFeatures} onChange={e => setAppraisalFeatures(e.target.value)} className={`${inputClass} h-20`} />
          </div>
          <button onClick={handleGenerateAppraisal} disabled={loading} className="w-full mt-6 py-3 bg-cyan-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-cyan-700 disabled:bg-slate-300 transition-colors shadow-lg shadow-cyan-200">
            {loading ? 'Valuing...' : 'Generate Appraisal'}
          </button>
        </div>

        {/* 8. Sales Appraisal */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900">Sales Appraisal</h3>
          </div>
          <div className="space-y-4 flex-1">
            <input type="text" placeholder="Address" value={salesAddress} onChange={e => setSalesAddress(e.target.value)} className={inputClass} />
            <div className="grid grid-cols-3 gap-2">
               <input type="number" placeholder="Beds" value={salesBeds} onChange={e => setSalesBeds(e.target.value)} className={inputClass} />
               <input type="number" placeholder="Baths" value={salesBaths} onChange={e => setSalesBaths(e.target.value)} className={inputClass} />
               <input type="number" placeholder="Cars" value={salesCars} onChange={e => setSalesCars(e.target.value)} className={inputClass} />
            </div>
            <textarea placeholder="Features (e.g. Renovated)" value={salesFeatures} onChange={e => setSalesFeatures(e.target.value)} className={`${inputClass} h-20`} />
          </div>
          <button onClick={handleGenerateSalesAppraisal} disabled={loading} className="w-full mt-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:bg-slate-300 transition-colors shadow-lg shadow-blue-200">
            {loading ? 'Valuing...' : 'Generate Sales Report'}
          </button>
        </div>

        {/* 9. Privacy Consent */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900">Privacy Consent</h3>
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Applicant Name</label>
              <input type="text" value={consentApplicant} onChange={e => setConsentApplicant(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Property Applying For</label>
              <input type="text" value={consentAddress} onChange={e => setConsentAddress(e.target.value)} className={inputClass} />
            </div>
          </div>
          <button onClick={handleGenerateConsent} disabled={loading} className="w-full mt-6 py-3 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 disabled:bg-slate-300 transition-colors shadow-lg">
            {loading ? 'Generating...' : 'Create Consent Form'}
          </button>
        </div>

      </div>

      {/* Result: Invoice Generator */}
      {invoiceData && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8">
           {/* ... Invoice Result Content (No changes here) ... */}
           <div className="bg-slate-900 text-white px-8 py-6 flex justify-between items-start">
             <div>
               <div className="mb-6">
                  <div className="flex items-center space-x-3 mb-2">
                     {logoUrl && !invoiceData.customHtml ? (
                       <img src={logoUrl} alt="Company Logo" className="h-12 w-auto object-contain rounded-lg bg-white p-1" />
                     ) : !invoiceData.customHtml ? (
                       <div className="flex items-center space-x-3">
                         <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/50">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                         </div>
                       </div>
                     ) : null}
                     <div>
                        <h1 className="text-xl font-bold tracking-tight leading-none text-white">{agencyName}</h1>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Real Estate Agency</p>
                     </div>
                  </div>
               </div>

               <div className="flex items-center space-x-3">
                 <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${invRecipient === 'Owner' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>{invRecipient} Invoice</span>
                 <span className="font-mono text-sm opacity-70">#{invoiceData.invoiceNumber}</span>
               </div>
             </div>
             <button onClick={() => setInvoiceData(null)} className="text-white/50 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
           </div>
           
           <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
             <div>
                <h4 className="text-xl font-bold text-slate-900 mb-6">Invoice Preview</h4>
                
                {invoiceData.customHtml ? (
                  <div className="border-2 border-slate-200 rounded-xl overflow-hidden h-[500px] w-full relative group">
                     <iframe 
                        srcDoc={invoiceData.customHtml} 
                        className="w-full h-full"
                        title="Generated Invoice"
                     />
                     <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                       AI Generated Layout
                     </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {(invoiceData.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-3 border-b border-slate-100">
                          <span className="text-sm font-medium text-slate-600">{item.description}</span>
                          <span className="text-sm font-bold text-slate-900">${item.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-4">
                        <span className="text-base font-bold text-slate-900">Total Due</span>
                        <span className="text-2xl font-black text-indigo-600">${invoiceData.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-6 flex space-x-2 text-xs text-slate-400">
                      <span>Date: {invoiceData.date}</span>
                      <span>•</span>
                      <span>Due: {invoiceData.dueDate}</span>
                    </div>
                  </>
                )}
             </div>
             
             <div className="bg-slate-50 rounded-3xl p-8 flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h5 className="font-bold text-slate-900 mb-2">Issue Invoice</h5>
                <p className="text-sm text-slate-500 mb-6 max-w-xs">This will save the document to the property vault as <strong>Unpaid</strong>. You can record the payment transaction later from the document viewer.</p>
                
                <button 
                  onClick={handleApproveInvoice}
                  className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl hover:bg-emerald-700 active:scale-95 transition-all w-full md:w-auto"
                >
                  Save to Vault
                </button>
             </div>
           </div>
        </div>
      )}

      {/* Result: Background Check */}
      {checkResult && (
        <div className="bg-white p-8 rounded-[2rem] border border-violet-200 shadow-2xl shadow-violet-500/10 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-start mb-6">
             <div>
               <h3 className="text-2xl font-bold text-slate-900">Screening Report</h3>
               <div className="flex flex-col">
                 <p className="text-slate-500 text-sm">Applicant: {checkName}</p>
                 <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Run on: {checkResult.timestamp}</p>
               </div>
             </div>
             <div className="flex items-center space-x-3">
               <button 
                 onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                 className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-slate-100"
                 title={isPrivacyMode ? "Reveal Sensitive Data" : "Hide Sensitive Data"}
               >
                 {isPrivacyMode ? (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                 ) : (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                 )}
               </button>
               <button onClick={() => setCheckResult(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Credit Score</p>
               <div className="flex items-baseline space-x-2">
                 <span className={`text-4xl font-black ${checkResult.creditScore >= 700 ? 'text-emerald-600' : checkResult.creditScore >= 500 ? 'text-amber-500' : 'text-rose-600'} transition-all duration-500 ${isPrivacyMode ? 'blur-md select-none opacity-50' : 'blur-0 opacity-100'}`}>
                   {checkResult.creditScore}
                 </span>
                 <span className="text-sm font-bold text-slate-500">/ 850</span>
               </div>
               <p className={`text-xs font-bold mt-1 ${checkResult.creditScore >= 700 ? 'text-emerald-600' : 'text-slate-500'}`}>{checkResult.creditRating}</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Database Hits</p>
               <ul className="space-y-2 text-sm font-bold">
                  <li className="flex justify-between items-center h-6">
                    <span>Tenancy DB</span>
                    <span className={`${checkResult.databases?.tenancyDatabase === 'Clear' ? 'text-emerald-600' : 'text-rose-600'} transition-all duration-500 ${isPrivacyMode ? 'blur-sm select-none opacity-50' : 'blur-0 opacity-100'}`}>
                      {checkResult.databases?.tenancyDatabase}
                    </span>
                  </li>
                  <li className="flex justify-between items-center h-6">
                    <span>Bankruptcy</span>
                    <span className={`${checkResult.databases?.bankruptcy === 'Clear' ? 'text-emerald-600' : 'text-rose-600'} transition-all duration-500 ${isPrivacyMode ? 'blur-sm select-none opacity-50' : 'blur-0 opacity-100'}`}>
                      {checkResult.databases?.bankruptcy}
                    </span>
                  </li>
                  <li className="flex justify-between items-center h-6">
                    <span>Court Records</span>
                    <span className={`${checkResult.databases?.courtRecords === 'Clear' ? 'text-emerald-600' : 'text-rose-600'} transition-all duration-500 ${isPrivacyMode ? 'blur-sm select-none opacity-50' : 'blur-0 opacity-100'}`}>
                      {checkResult.databases?.courtRecords}
                    </span>
                  </li>
               </ul>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Risk Assessment</p>
               <div>
                  <span className={`inline-block px-4 py-2 rounded-xl text-lg font-black uppercase tracking-wide ${checkResult.riskLevel === 'Low' ? 'bg-emerald-100 text-emerald-700' : checkResult.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                     {checkResult.riskLevel} Risk
                  </span>
               </div>
            </div>
          </div>

          <div className="bg-violet-50 p-6 rounded-2xl border border-violet-100">
             <h4 className="text-xs font-black uppercase tracking-widest text-violet-600 mb-2">Summary</h4>
             <p className="text-slate-700 text-sm font-medium leading-relaxed">{checkResult.summary}</p>
          </div>
          
          <div className="mt-6 flex justify-end items-center space-x-4">
             {checkPropertyId ? (
                <button 
                  onClick={handleSaveScreeningReport}
                  className="px-6 py-3 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-700 shadow-xl shadow-violet-200 transition-all active:scale-95 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  <span>Save to Property Vault</span>
                </button>
             ) : (
                <span className="text-xs text-slate-400 italic">Select a property in the form above to save this report.</span>
             )}
          </div>
          <p className="text-[10px] text-slate-300 mt-4 text-center italic uppercase tracking-wider">Confidential Report • For Professional Use Only</p>
        </div>
      )}

      {result && !invoiceData && !checkResult && (
        <div className="bg-white p-8 rounded-[2rem] border border-indigo-200 shadow-xl shadow-indigo-500/10 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold text-slate-900">AI Generated Content</h4>
            <button 
              onClick={() => { navigator.clipboard.writeText(result); alert('Copied to clipboard!'); }}
              className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-200 flex items-center"
            >
              Copy Text
            </button>
          </div>
          <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed font-medium">
            {result}
          </div>
        </div>
      )}
    </div>
  );
};

export default AITools;
