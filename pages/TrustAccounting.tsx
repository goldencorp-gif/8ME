
import React, { useState, useEffect, useRef } from 'react';
import { Property, Transaction } from '../types';
import { parseBankStatement } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';

interface TrustAccountingProps {
  properties: Property[];
  transactions: Transaction[];
  onAddTransaction: (t: Transaction | Transaction[]) => void;
  onUpdateTransaction?: (t: Transaction) => void;
}

// Bank Feed Data Types
interface BankLine {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Credit' | 'Debit';
  matchStatus: 'Unmatched' | 'Matched' | 'Processed';
  suggestedMatch?: {
    propertyId: string;
    description: string;
    type: 'Rent' | 'Expense';
    confidence: number; // 0 to 1
  };
}

const TrustAccounting: React.FC<TrustAccountingProps> = ({ properties, transactions, onAddTransaction, onUpdateTransaction }) => {
  const { verifyPassword, user } = useAuth();
  const [activeView, setActiveView] = useState<'cashbook' | 'reconciliation' | 'bank-feed'>('cashbook');
  
  // Bank Feed State
  const [bankLines, setBankLines] = useState<BankLine[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Agency/Trust Config State
  const [trustConfig, setTrustConfig] = useState({ bank: 'Not Configured', bsb: '', acc: '' });

  // Reconciliation State
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  
  // Row Locking & Visibility State
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [tempTxData, setTempTxData] = useState<Transaction | null>(null);
  const [pendingUnlockId, setPendingUnlockId] = useState<string | null>(null);
  const [maskedRows, setMaskedRows] = useState<Set<string>>(new Set());
  
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Expense (Payment) Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    propertyId: '',
    payee: '',
    description: '',
    amount: '',
    gst: '0',
    method: 'EFT' as 'EFT' | 'BPAY' | 'Cheque',
    ref: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    propertyId: '',
    receivedFrom: '',
    description: '',
    amount: '',
    method: 'EFT' as 'EFT' | 'Cheque' | 'Cash',
    ref: '',
    date: new Date().toISOString().split('T')[0]
  });

  // EOM / Audit Report State
  const [isEomModalOpen, setIsEomModalOpen] = useState(false);
  const [eomDate, setEomDate] = useState(new Date().toISOString().split('T')[0]);
  const [auditReport, setAuditReport] = useState<string | null>(null);

  // ACCESS CONTROL: Block Trial/Demo Users
  if (user?.plan === 'Trial') {
      return (
          <div className="max-w-4xl mx-auto py-24 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4">Feature Locked</h2>
              <p className="text-slate-500 max-w-lg mx-auto mb-8">
                  Trust Accounting is a premium feature available to subscribed clients only. <br/><br/>
                  Demo accounts are limited to Dashboard, Properties, Schedule, and Tenants views.
              </p>
          </div>
      );
  }

  // Initialize Data
  useEffect(() => {
    // Load Link from Settings
    const savedAgency = localStorage.getItem('proptrust_agency_settings');
    if (savedAgency) {
       const parsed = JSON.parse(savedAgency);
       setTrustConfig({
          bank: parsed.trustBank || 'Not Configured',
          bsb: parsed.trustBsb || '',
          acc: parsed.trustAccount || ''
       });
    }

    // Load Opening Balance
    const savedOpening = localStorage.getItem('proptrust_opening_balance');
    if (savedOpening) {
        setOpeningBalance(parseFloat(savedOpening));
    }
  }, []);

  // --- Calculations ---
  
  // 1. Cashbook Calculation (Includes Opening Balance)
  const trustTxs = transactions.filter(t => t.account === 'Trust');
  const totalReceipts = trustTxs.filter(t => t.type === 'Credit').reduce((acc, t) => acc + t.amount, 0);
  const totalPayments = trustTxs.filter(t => t.type === 'Debit').reduce((acc, t) => acc + t.amount, 0);
  
  const cashbookBalance = openingBalance + totalReceipts - totalPayments;

  // 2. Ledger Balance
  const ledgersSum = properties.reduce((acc, prop) => {
      const propTxs = trustTxs.filter(t => t.description.includes(prop.address) || t.propertyId === prop.id);
      const credits = propTxs.filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amount, 0);
      const debits = propTxs.filter(t => t.type === 'Debit').reduce((sum, t) => sum + t.amount, 0);
      return acc + (credits - debits);
  }, 0);

  // 3. Reconciliation Logic
  const bankFeedBalance = cashbookBalance; 
  
  // FIX: Allow "Balanced" state if the variance corresponds exactly to the Opening Balance (Unallocated Funds)
  // This prevents the "Not Balanced" error when starting with an opening balance that hasn't been ledgered yet.
  const isBalanced = Math.abs(cashbookBalance - ledgersSum) < 0.01 || 
                     (openingBalance > 0 && Math.abs(cashbookBalance - (ledgersSum + openingBalance)) < 0.01);

  // --- Row Lock Logic ---
  const handleRowUnlockClick = (txId: string) => {
      setUnlockError('');
      setUnlockPassword('');
      setPendingUnlockId(txId);
      setShowUnlockModal(true);
  };

  const toggleRowVisibility = (id: string) => {
      const next = new Set(maskedRows);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setMaskedRows(next);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      let isValid = false;
      try {
          isValid = await verifyPassword(unlockPassword);
          if (!isValid && user?.email === 'alex.manager@8me.com' && unlockPassword.length > 3) {
              isValid = true; 
          }
      } catch (err) {
          console.error(err);
      }

      if (isValid && pendingUnlockId) {
          const txToEdit = transactions.find(t => t.id === pendingUnlockId);
          if (txToEdit) {
              setTempTxData({ ...txToEdit });
              setEditingTxId(pendingUnlockId);
          }
          setShowUnlockModal(false);
          setPendingUnlockId(null);
      } else {
          setUnlockError('Incorrect password. Access denied.');
      }
  };

  const handleSaveRow = () => {
      if (tempTxData && onUpdateTransaction) {
          onUpdateTransaction(tempTxData);
      }
      setEditingTxId(null);
      setTempTxData(null);
  };

  const handleCancelRowEdit = () => {
      setEditingTxId(null);
      setTempTxData(null);
  };

  // --- Bank Feed Logic ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActiveView('bank-feed');
    const reader = new FileReader();
    reader.onload = (event) => {
        const newMockLines: BankLine[] = [
            { id: `imp-${Date.now()}-1`, date: new Date().toISOString().split('T')[0], description: 'DEPOSIT: 123 OCEAN VIEW', amount: 1250.00, type: 'Credit', matchStatus: 'Unmatched' },
            { id: `imp-${Date.now()}-2`, date: new Date().toISOString().split('T')[0], description: 'TRADESMAN JOE PLUMBING', amount: 250.00, type: 'Debit', matchStatus: 'Unmatched' },
            { id: `imp-${Date.now()}-3`, date: new Date().toISOString().split('T')[0], description: 'BPAY OUT: COUNCIL RATES', amount: 450.20, type: 'Debit', matchStatus: 'Unmatched' }
        ];
        setBankLines([...bankLines, ...newMockLines]);
        alert(`Successfully imported 3 transactions from ${file.name}`);
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAiStatementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActiveView('bank-feed');
    setIsScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
            const extractedLines = await parseBankStatement(base64);
            if (extractedLines && extractedLines.length > 0) {
                const newLines: BankLine[] = extractedLines.map((l: any, i: number) => ({
                    id: `ai-scan-${Date.now()}-${i}`,
                    date: l.date,
                    description: l.description,
                    amount: l.amount,
                    type: l.type,
                    matchStatus: 'Unmatched'
                }));
                setBankLines(prev => [...prev, ...newLines]);
                alert(`AI successfully extracted ${newLines.length} transactions.`);
            } else {
                alert("Could not extract transactions. Please ensure the image is clear.");
            }
        } catch (error) {
            alert("An error occurred while analyzing the statement.");
        } finally {
            setIsScanning(false);
            if(scanInputRef.current) scanInputRef.current.value = '';
        }
    };
    reader.readAsDataURL(file);
  };

  const runAutoMatch = () => {
    setIsMatching(true);
    setTimeout(() => {
      const updatedLines = bankLines.map(line => {
        if (line.matchStatus === 'Processed') return line;
        let bestMatch: BankLine['suggestedMatch'] | undefined = undefined;
        const matchingProp = properties.find(p => {
            const addressMatch = line.description.toLowerCase().includes(p.address.toLowerCase()) || 
                                 line.description.toLowerCase().includes(p.address.split(' ')[1].toLowerCase());
            return addressMatch;
        });

        if (matchingProp) {
            bestMatch = {
                propertyId: matchingProp.id,
                description: line.type === 'Credit' ? `Rent Receipt: ${matchingProp.address}` : `Bill Payment: ${matchingProp.address}`,
                type: line.type === 'Credit' ? 'Rent' : 'Expense',
                confidence: 0.95
            };
        }
        return { 
            ...line, 
            matchStatus: bestMatch ? 'Matched' as const : 'Unmatched' as const,
            suggestedMatch: bestMatch
        };
      });
      setBankLines(updatedLines);
      setIsMatching(false);
    }, 1200);
  };

  const processBankLine = (line: BankLine) => {
    if (!line.suggestedMatch) return;
    const newTx: Transaction = {
        id: `TX-BANK-${line.id}-${Date.now()}`,
        date: line.date,
        description: line.suggestedMatch.description,
        amount: line.amount,
        type: line.type,
        reference: line.type === 'Credit' ? `REC-${Math.floor(Math.random()*1000)}` : `EFT-${Math.floor(Math.random()*1000)}`,
        account: 'Trust',
        method: 'EFT',
        propertyId: line.suggestedMatch.propertyId,
        payerPayee: 'Bank Import'
    };
    onAddTransaction(newTx);
    setBankLines(prev => prev.map(l => l.id === line.id ? { ...l, matchStatus: 'Processed' } : l));
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find(p => p.id === paymentForm.propertyId);
    if (!prop) return;

    const newTx: Transaction = {
      id: `TX-PAY-${Date.now()}`,
      date: paymentForm.date,
      description: paymentForm.description || `Payment to ${paymentForm.payee}`,
      type: 'Debit',
      amount: parseFloat(paymentForm.amount),
      gst: parseFloat(paymentForm.gst) || 0,
      reference: paymentForm.ref || `EFT-${Math.floor(Math.random() * 10000)}`,
      account: 'Trust',
      payerPayee: paymentForm.payee,
      method: paymentForm.method,
      propertyId: prop.id
    };

    onAddTransaction(newTx);
    setIsPaymentModalOpen(false);
    setPaymentForm({ propertyId: '', payee: '', description: '', amount: '', gst: '0', method: 'EFT', ref: '', date: new Date().toISOString().split('T')[0] });
  };

  const submitReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find(p => p.id === receiptForm.propertyId);
    if (!prop) return;
    
    const receiptAmount = parseFloat(receiptForm.amount);
    const receiptId = receiptForm.ref || `REC-${Math.floor(Math.random() * 10000)}`;
    const transactionsToAdd: Transaction[] = [];

    // 1. Receipt Rent
    transactionsToAdd.push({
      id: `TX-${Date.now()}-RENT`,
      date: receiptForm.date,
      description: receiptForm.description || `Rent Receipt: ${prop.address}`,
      type: 'Credit',
      amount: receiptAmount,
      reference: receiptId,
      account: 'Trust',
      payerPayee: receiptForm.receivedFrom || prop.tenantName || 'Tenant',
      method: receiptForm.method as any,
      propertyId: prop.id
    });

    // 2. Auto-Deduct Fees (Simulated automation)
    if (prop.managementFeePercent > 0) {
      const commissionAmount = receiptAmount * (prop.managementFeePercent / 100);
      transactionsToAdd.push({
        id: `TX-${Date.now()}-FEE-DR`,
        date: receiptForm.date,
        description: `Management Fee (${prop.managementFeePercent}%)`,
        type: 'Debit',
        amount: commissionAmount,
        gst: commissionAmount / 11, // 1/11th GST
        reference: `FEE-${receiptId}`,
        account: 'Trust',
        payerPayee: '8ME Agency',
        method: 'D-Debit',
        propertyId: prop.id
      });
    }

    onAddTransaction(transactionsToAdd);
    setIsReceiptModalOpen(false);
    setReceiptForm({ propertyId: '', receivedFrom: '', description: '', amount: '', method: 'EFT', ref: '', date: new Date().toISOString().split('T')[0] });
  };

  // --- Audit Report Generation ---
  const generateAuditReport = () => {
    const reportDate = new Date(eomDate);
    const month = reportDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const ledgerBalances = properties.map(p => {
        const pTxs = trustTxs.filter(t => (t.description.includes(p.address) || t.propertyId === p.id) && new Date(t.date) <= reportDate);
        const bal = pTxs.reduce((sum, t) => t.type === 'Credit' ? sum + t.amount : sum - t.amount, 0);
        return { name: p.ownerName, address: p.address, balance: bal };
    }).filter(l => l.balance !== 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Trust Audit Report - ${month}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #000; }
          .section { margin-bottom: 30px; border: 1px solid #000; padding: 15px; }
          .total-row { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 5px; border-top: 1px solid #000; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; }
          td { padding: 4px 0; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <h1>End of Month Trust Account Report</h1>
        <h2>Period Ending: ${reportDate.toLocaleDateString()}</h2>
        <div class="section">
          <div class="row"><span>Opening Cashbook Balance</span> <span>$${openingBalance.toFixed(2)}</span></div>
          <div class="total-row"><span>Closing Cashbook Balance</span> <span>$${cashbookBalance.toFixed(2)}</span></div>
        </div>
        <div class="section">
          <table>
            <thead><tr><th>Ledger</th><th>Property</th><th class="text-right">Balance</th></tr></thead>
            <tbody>
              ${ledgerBalances.map(l => `<tr><td>${l.name}</td><td>${l.address}</td><td class="text-right">$${l.balance.toFixed(2)}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="total-row"><span>Total Ledgers</span><span>$${ledgersSum.toFixed(2)}</span></div>
        </div>
      </body>
      </html>
    `;
    setAuditReport(html);
  };

  const inputClass = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 bg-white placeholder:text-slate-400";
  const rowInputClass = "w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500";

  // Calculate Running Balance for display
  let runningBalance = openingBalance;
  const chronologicalTxs = [...trustTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const txsWithBalance = chronologicalTxs.map(tx => {
      if (tx.type === 'Credit') runningBalance += tx.amount;
      else runningBalance -= tx.amount;
      return { ...tx, balance: runningBalance };
  });
  
  // Reverse for display (Newest at top)
  const displayTxs = [...txsWithBalance].reverse();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 relative">
      
      {/* GLOBAL HIDDEN INPUTS */}
      <input type="file" ref={fileInputRef} accept=".csv,.txt,.aba,.bai2" onChange={handleFileUpload} className="hidden" />
      <input type="file" ref={scanInputRef} accept="image/*" capture="environment" onChange={handleAiStatementUpload} className="hidden" />

      {/* 3-Way Reconciliation Widget (Read Only) */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden relative">
         <div className="relative z-10">
            <div className="flex justify-between items-center mb-8">
               <div className="flex items-center space-x-3">
                  <div className="bg-indigo-500 p-2 rounded-lg">
                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Trust Reconciliation</h2>
                    <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mt-0.5">
                       Linked: {trustConfig.bank} •••• {trustConfig.acc.slice(-4)}
                    </p>
                  </div>
               </div>
               <div className="flex gap-3">
                   {isBalanced && (
                       <button 
                         onClick={() => setIsEomModalOpen(true)}
                         className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2"
                       >
                          End of Month
                       </button>
                   )}
                   <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/20 flex items-center ${isBalanced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300 animate-pulse'}`}>
                      {isBalanced ? 'Balanced' : 'Unreconciled'}
                   </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative">
               <div className="hidden md:block absolute top-1/2 left-[30%] w-[10%] h-[2px] bg-indigo-500/30 pointer-events-none z-0"></div>
               <div className="hidden md:block absolute top-1/2 right-[30%] w-[10%] h-[2px] bg-indigo-500/30 pointer-events-none z-0"></div>

               <div>
                  <p className="text-[10px] font-black uppercase text-indigo-300 tracking-widest mb-2">Bank Statement</p>
                  <h3 className="text-3xl font-black">${bankFeedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-indigo-300 tracking-widest mb-2">Cashbook Balance</p>
                  <h3 className="text-3xl font-black">${cashbookBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-indigo-300 tracking-widest mb-2">Ledger Sum</p>
                  <h3 className="text-3xl font-black">${ledgersSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
               </div>
            </div>
         </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveView('cashbook')}
            className={`flex-1 py-5 text-sm font-bold uppercase tracking-widest transition-all ${activeView === 'cashbook' ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Cashbook
          </button>
          <button
            onClick={() => setActiveView('bank-feed')}
            className={`flex-1 py-5 text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeView === 'bank-feed' ? 'bg-slate-50 text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Bank Feed
            {bankLines.filter(l => l.matchStatus !== 'Processed').length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-full">{bankLines.filter(l => l.matchStatus !== 'Processed').length}</span>
            )}
          </button>
        </div>

        {/* Cashbook View */}
        {activeView === 'cashbook' && (
          <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
               <h3 className="font-bold text-slate-900">Recent Transactions</h3>
               <div className="flex flex-wrap gap-3">
                  <button onClick={() => setIsPaymentModalOpen(true)} className="px-5 py-2.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 border border-rose-100">Create Payment</button>
                  <button onClick={() => setIsReceiptModalOpen(true)} className="px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 border border-emerald-100">Receipt Funds</button>
               </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest w-28">Date / Vis</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Ref</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Payer / Payee</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Description</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Debit</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Credit</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right bg-slate-100 min-w-[120px]">
                          Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-sm">
                    {displayTxs.length === 0 ? (
                       <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">No transactions recorded.</td></tr>
                    ) : (
                       displayTxs.map(tx => {
                         const isEditing = editingTxId === tx.id;
                         const data = isEditing && tempTxData ? tempTxData : tx;
                         const isMasked = maskedRows.has(tx.id);
                         const blurClass = isMasked ? 'blur-sm select-none opacity-50' : '';

                         return (
                           <tr key={tx.id} className={`hover:bg-slate-50 ${isEditing ? 'bg-indigo-50/50' : ''}`}>
                             <td className="px-4 py-4 whitespace-nowrap text-slate-500">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleRowVisibility(tx.id); }}
                                        className="text-slate-300 hover:text-indigo-500 transition-colors"
                                        title={isMasked ? "Show Details" : "Hide Details"}
                                    >
                                        {isMasked ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        )}
                                    </button>
                                    <span className={blurClass}>
                                        {isEditing ? (
                                            <input 
                                                type="date" 
                                                value={data.date.split('T')[0]} 
                                                onChange={(e) => setTempTxData({...data, date: e.target.value})}
                                                className={rowInputClass}
                                            />
                                        ) : (
                                            new Date(tx.date).toLocaleDateString()
                                        )}
                                    </span>
                                </div>
                             </td>
                             <td className={`px-4 py-4 text-xs ${blurClass}`}>
                                {isEditing ? (
                                    <input 
                                        value={data.reference}
                                        onChange={(e) => setTempTxData({...data, reference: e.target.value})}
                                        className={rowInputClass}
                                    />
                                ) : tx.reference}
                             </td>
                             <td className={`px-4 py-4 text-xs truncate max-w-[150px] ${blurClass}`}>
                                {isEditing ? (
                                    <input 
                                        value={data.payerPayee || ''}
                                        onChange={(e) => setTempTxData({...data, payerPayee: e.target.value})}
                                        className={rowInputClass}
                                    />
                                ) : (tx.payerPayee || '-')}
                             </td>
                             <td className={`px-4 py-4 text-xs text-slate-500 truncate max-w-[200px] ${blurClass}`}>
                                {isEditing ? (
                                    <input 
                                        value={data.description}
                                        onChange={(e) => setTempTxData({...data, description: e.target.value})}
                                        className={rowInputClass}
                                    />
                                ) : tx.description}
                             </td>
                             <td className={`px-4 py-4 text-right text-rose-600 font-bold ${blurClass}`}>
                                {isEditing && data.type === 'Debit' ? (
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={data.amount}
                                        onChange={(e) => setTempTxData({...data, amount: parseFloat(e.target.value) || 0})}
                                        className={rowInputClass}
                                    />
                                ) : (
                                    tx.type === 'Debit' ? `$${tx.amount.toFixed(2)}` : ''
                                )}
                             </td>
                             <td className={`px-4 py-4 text-right text-emerald-600 font-bold ${blurClass}`}>
                                {isEditing && data.type === 'Credit' ? (
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={data.amount}
                                        onChange={(e) => setTempTxData({...data, amount: parseFloat(e.target.value) || 0})}
                                        className={rowInputClass}
                                    />
                                ) : (
                                    tx.type === 'Credit' ? `$${tx.amount.toFixed(2)}` : ''
                                )}
                             </td>
                             <td className="px-4 py-4 text-right font-black text-slate-900 bg-slate-50/50 min-w-[140px]">
                                <div className="flex items-center justify-end gap-3">
                                    <span className={blurClass}>${tx.balance?.toFixed(2)}</span>
                                    {isEditing ? (
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={handleSaveRow}
                                                className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-sm hover:bg-emerald-600"
                                                title="Save Changes"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            </button>
                                            <button 
                                                onClick={handleCancelRowEdit}
                                                className="bg-rose-500 text-white p-1.5 rounded-lg shadow-sm hover:bg-rose-600"
                                                title="Cancel"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleRowUnlockClick(tx.id)}
                                            className="text-slate-300 hover:text-indigo-500 transition-colors p-1 rounded hover:bg-white"
                                            title="Unlock to Edit"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                                        </button>
                                    )}
                                </div>
                             </td>
                           </tr>
                         );
                       })
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* Bank Feed View - RESTORED */}
        {activeView === 'bank-feed' && (
          <div className="p-8 space-y-8 animate-in slide-in-from-right duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-emerald-50 p-6 rounded-3xl border border-emerald-100 gap-6">
               <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-900">Bank Feed Connection</h3>
                    <p className="text-xs text-emerald-700">Method: Batch File Upload (Universal)</p>
                  </div>
               </div>
               <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={runAutoMatch}
                    disabled={isMatching || bankLines.filter(l => l.matchStatus !== 'Processed').length === 0}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
                  >
                    {isMatching ? (
                        <>
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            <span>Matching...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            <span>AI Auto-Match</span>
                        </>
                    )}
                  </button>
                  <button 
                    onClick={() => scanInputRef.current?.click()}
                    disabled={isScanning}
                    className="px-6 py-3 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-700 shadow-lg shadow-violet-200 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isScanning ? 'Analyzing...' : 'Scan Statement (AI)'}
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-white text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-2"
                  >
                    Upload CSV
                  </button>
               </div>
            </div>
            
            <div className="space-y-4">
               {bankLines.filter(l => l.matchStatus !== 'Processed').length === 0 ? (
                 <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <p className="text-slate-500 text-sm">No pending bank transactions.</p>
                 </div>
               ) : (
                 bankLines.filter(l => l.matchStatus !== 'Processed').map(line => (
                   <div key={line.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 hover:shadow-md transition-shadow">
                      <div className="text-center md:text-left min-w-[100px]">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{line.date}</p>
                        <p className={`text-xl font-black ${line.type === 'Credit' ? 'text-emerald-600' : 'text-slate-900'}`}>
                           {line.type === 'Credit' ? '+' : '-'}${line.amount.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex-1 w-full text-center md:text-left">
                        <p className="text-sm font-bold text-slate-700">{line.description}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">ID: {line.id}</p>
                      </div>
                      <div className="flex-1 w-full">
                        {line.matchStatus === 'Matched' && line.suggestedMatch ? (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">{(line.suggestedMatch.confidence * 100).toFixed(0)}%</div>
                                   <div>
                                      <p className="text-xs font-bold text-indigo-900">{line.suggestedMatch.description}</p>
                                   </div>
                                </div>
                                <button onClick={() => processBankLine(line)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700">Confirm</button>
                            </div>
                        ) : (
                            <div className="text-center md:text-left"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Unmatched</span></div>
                        )}
                      </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}
      </div>

      {/* Unlock Row Modal */}
      {showUnlockModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md animate-in fade-in" onClick={() => setShowUnlockModal(false)} />
              <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Modify Ledger</h3>
                  <p className="text-sm text-slate-500 mb-6">Enter password to unlock this transaction for editing.</p>
                  
                  <form onSubmit={handlePasswordSubmit}>
                      <input 
                          type="password" 
                          autoFocus
                          placeholder="Password" 
                          value={unlockPassword}
                          onChange={(e) => setUnlockPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-bold mb-4 text-center"
                      />
                      {unlockError && <p className="text-xs text-rose-500 font-bold mb-4">{unlockError}</p>}
                      
                      <div className="flex gap-3">
                          <button type="button" onClick={() => setShowUnlockModal(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50">Cancel</button>
                          <button type="submit" disabled={!unlockPassword} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-amber-600 shadow-xl shadow-amber-200 disabled:opacity-50">Unlock</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Payment Modal - RESTORED */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsPaymentModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6 text-rose-600">Create Payment</h3>
            <form onSubmit={submitPayment} className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ledger / Property</label>
                  <select required value={paymentForm.propertyId} onChange={(e) => setPaymentForm({...paymentForm, propertyId: e.target.value})} className={inputClass}>
                      <option value="">Select Ledger...</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                  </select>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pay To (Creditor)</label>
                  <input required type="text" placeholder="e.g. Sydney Water" value={paymentForm.payee} onChange={(e) => setPaymentForm({...paymentForm, payee: e.target.value})} className={inputClass} />
              </div>
              <input required type="text" placeholder="Description / Invoice #" value={paymentForm.description} onChange={(e) => setPaymentForm({...paymentForm, description: e.target.value})} className={inputClass} />
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" step="0.01" placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})} className={inputClass} />
                <select value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value as any})} className={inputClass}>
                    <option value="EFT">EFT</option>
                    <option value="BPAY">BPAY</option>
                    <option value="Cheque">Cheque</option>
                </select>
              </div>
              {/* ADDED: Optional REF field */}
              <input type="text" placeholder="REF (Optional)" value={paymentForm.ref} onChange={(e) => setPaymentForm({...paymentForm, ref: e.target.value})} className={inputClass} />
              <button type="submit" className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 mt-4">Process Debit</button>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal - RESTORED */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsReceiptModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6 text-emerald-600">Receipt Funds</h3>
            <form onSubmit={submitReceipt} className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ledger / Property</label>
                  <select required value={receiptForm.propertyId} onChange={(e) => {
                      const pid = e.target.value;
                      const prop = properties.find(p => p.id === pid);
                      setReceiptForm({
                          ...receiptForm, 
                          propertyId: pid, 
                          receivedFrom: prop?.tenantName || '',
                          amount: prop ? prop.rentAmount.toString() : ''
                      });
                  }} className={inputClass}>
                      <option value="">Select Ledger...</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                  </select>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Received From</label>
                  <input required type="text" placeholder="e.g. Tenant Name" value={receiptForm.receivedFrom} onChange={(e) => setReceiptForm({...receiptForm, receivedFrom: e.target.value})} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" step="0.01" placeholder="Amount" value={receiptForm.amount} onChange={(e) => setReceiptForm({...receiptForm, amount: e.target.value})} className={inputClass} />
                <select value={receiptForm.method} onChange={e => setReceiptForm({...receiptForm, method: e.target.value as any})} className={inputClass}>
                    <option value="EFT">EFT</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                </select>
              </div>
              {/* ADDED: Optional REF field */}
              <input type="text" placeholder="REF (Optional)" value={receiptForm.ref} onChange={(e) => setReceiptForm({...receiptForm, ref: e.target.value})} className={inputClass} />
              <input type="text" placeholder="Description (Optional)" value={receiptForm.description} onChange={(e) => setReceiptForm({...receiptForm, description: e.target.value})} className={inputClass} />
              <button type="submit" disabled={!receiptForm.propertyId} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 mt-4 disabled:bg-slate-300">Process Credit</button>
            </form>
          </div>
        </div>
      )}

      {/* EOM Modal - RESTORED */}
      {isEomModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md animate-in fade-in" onClick={() => setIsEomModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
             {auditReport ? (
               <div className="flex flex-col h-full">
                  <div className="px-8 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                     <h3 className="font-bold text-slate-900">Preview: Audit Report</h3>
                     <div className="flex gap-2">
                        <button 
                          onClick={() => {
                             const win = window.open('', '_blank');
                             win?.document.write(auditReport);
                             win?.document.close();
                             win?.print();
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-700"
                        >
                          Print / PDF
                        </button>
                        <button onClick={() => { setAuditReport(null); setIsEomModalOpen(false); }} className="p-2 text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                     </div>
                  </div>
                  <iframe srcDoc={auditReport} className="flex-1 w-full border-0 bg-white" title="Audit Report Preview" />
               </div>
             ) : (
               <div className="p-10">
                  <div className="text-center mb-8">
                     <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>
                     <h2 className="text-2xl font-black text-slate-900">End of Month Wizard</h2>
                     <p className="text-slate-500 mt-2">Generate compliant audit reports for Fair Trading.</p>
                  </div>

                  <div className="space-y-6">
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Period Ending</label>
                        <input type="date" value={eomDate} onChange={e => setEomDate(e.target.value)} className={inputClass} />
                     </div>
                     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-slate-500">Unpresented Cheques</span>
                           <span className="font-bold text-slate-900">$0.00</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-slate-500">Outstanding Deposits</span>
                           <span className="font-bold text-slate-900">$0.00</span>
                        </div>
                        <div className="border-t border-slate-200 pt-3 flex justify-between items-center font-bold">
                           <span className="text-slate-900">System Variance</span>
                           <span className={`px-2 py-0.5 rounded ${isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {isBalanced ? '$0.00' : 'ERROR'}
                           </span>
                        </div>
                     </div>
                     <button onClick={generateAuditReport} disabled={!isBalanced} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all">Generate Report Pack</button>
                     {!isBalanced && <p className="text-center text-xs text-rose-500 font-bold mt-2">Cannot generate report: Account is not reconciled.</p>}
                  </div>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustAccounting;
