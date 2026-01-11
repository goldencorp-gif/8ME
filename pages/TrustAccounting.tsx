
import React, { useState, useEffect, useRef } from 'react';
import { Property, Transaction } from '../types';
import { parseBankStatement } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';

interface TrustAccountingProps {
  properties: Property[];
  transactions: Transaction[];
  onAddTransaction: (t: Transaction | Transaction[]) => void;
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

const TrustAccounting: React.FC<TrustAccountingProps> = ({ properties, transactions, onAddTransaction }) => {
  const { verifyPassword } = useAuth();
  const [activeView, setActiveView] = useState<'cashbook' | 'reconciliation' | 'bank-feed'>('cashbook');
  
  // Bank Feed State
  const [bankLines, setBankLines] = useState<BankLine[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Agency/Trust Config State
  const [trustConfig, setTrustConfig] = useState({ bank: 'Not Configured', bsb: '', acc: '' });

  // Reconciliation Lock State
  const [manualBankBalance, setManualBankBalance] = useState<number | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
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
    date: new Date().toISOString().split('T')[0]
  });

  // EOM / Audit Report State
  const [isEomModalOpen, setIsEomModalOpen] = useState(false);
  const [eomDate, setEomDate] = useState(new Date().toISOString().split('T')[0]);
  const [auditReport, setAuditReport] = useState<string | null>(null);

  // Initialize Mock Data & Load Config
  useEffect(() => {
    if (bankLines.length === 0) {
      setBankLines([
        { id: 'bf1', date: new Date().toISOString().split('T')[0], description: 'CREDIT TRANSFER REF: SMITH RENT', amount: 750.00, type: 'Credit', matchStatus: 'Unmatched' },
        { id: 'bf2', date: new Date().toISOString().split('T')[0], description: 'DEBIT DIRECT DEBIT SYDNEY WATER', amount: 120.50, type: 'Debit', matchStatus: 'Unmatched' },
      ]);
    }

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

    // Load Manual Balance
    const savedBalance = localStorage.getItem('proptrust_manual_bank_balance');
    if (savedBalance) {
        setManualBankBalance(parseFloat(savedBalance));
    }
  }, []);

  // --- Calculations ---
  // 1. Bank Balance (Simulated via Transactions for this demo, usually from Feed)
  const trustTxs = transactions.filter(t => t.account === 'Trust');
  const totalReceipts = trustTxs.filter(t => t.type === 'Credit').reduce((acc, t) => acc + t.amount, 0);
  const totalPayments = trustTxs.filter(t => t.type === 'Debit').reduce((acc, t) => acc + t.amount, 0);
  const cashbookBalance = totalReceipts - totalPayments;

  // 2. Ledger Balance (Sum of all property balances)
  const ledgersSum = properties.reduce((acc, prop) => {
      const propTxs = trustTxs.filter(t => t.description.includes(prop.address) || t.propertyId === prop.id);
      const credits = propTxs.filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amount, 0);
      const debits = propTxs.filter(t => t.type === 'Debit').reduce((sum, t) => sum + t.amount, 0);
      return acc + (credits - debits);
  }, 0);

  // 3. Bank Balance Logic: Use manual if set, otherwise default to cashbook for demo
  // Note: We use 0 as default fallback if manual is cleared, or cashbook if never set
  const bankBalance = manualBankBalance !== null ? manualBankBalance : cashbookBalance;

  const isBalanced = Math.abs(cashbookBalance - ledgersSum) < 0.01 && Math.abs(bankBalance - cashbookBalance) < 0.01;

  // --- Unlock Logic ---
  const handleUnlockClick = () => {
      setUnlockError('');
      setUnlockPassword('');
      setShowUnlockModal(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const isValid = await verifyPassword(unlockPassword);
      if (isValid) {
          setIsUnlocked(true);
          setShowUnlockModal(false);
          // If no manual balance set yet, default to current cashbook to start editing from a sane value
          if (manualBankBalance === null) {
              setManualBankBalance(cashbookBalance);
          }
      } else {
          setUnlockError('Incorrect password. Access denied.');
      }
  };

  const handleSaveAndLock = () => {
      setIsUnlocked(false);
      if (manualBankBalance !== null) {
          localStorage.setItem('proptrust_manual_bank_balance', manualBankBalance.toString());
      }
  };

  // --- Bank Feed Logic ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Switch view to see import
    setActiveView('bank-feed');

    // Simulate parsing a CSV file
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

    // Switch to bank feed view immediately so user sees loading state
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
                alert(`AI successfully extracted ${newLines.length} transactions.\n\nPlease review them in the Bank Feed below and match them to property ledgers.`);
            } else {
                alert("Could not extract transactions. Please ensure the image is clear, well-lit, and contains a visible transaction table.");
            }
        } catch (error) {
            alert("An error occurred while analyzing the statement. Please try again.");
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
            const tenantMatch = p.tenantName && line.description.toLowerCase().includes(p.tenantName.split(' ')[1].toLowerCase());
            return addressMatch || tenantMatch;
        });

        if (matchingProp) {
            if (line.type === 'Credit') {
                bestMatch = {
                    propertyId: matchingProp.id,
                    description: `Rent Receipt: ${matchingProp.address}`,
                    type: 'Rent',
                    confidence: 0.95
                };
            } else {
                bestMatch = {
                    propertyId: matchingProp.id,
                    description: `Bill Payment: ${matchingProp.address}`,
                    type: 'Expense',
                    confidence: 0.85
                };
            }
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
      reference: `EFT-${Math.floor(Math.random() * 10000)}`,
      account: 'Trust',
      payerPayee: paymentForm.payee,
      method: paymentForm.method,
      propertyId: prop.id
    };

    onAddTransaction(newTx);
    setIsPaymentModalOpen(false);
    setPaymentForm({ propertyId: '', payee: '', description: '', amount: '', gst: '0', method: 'EFT', date: new Date().toISOString().split('T')[0] });
  };

  const submitReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find(p => p.id === receiptForm.propertyId);
    if (!prop) return;
    
    const receiptAmount = parseFloat(receiptForm.amount);
    const receiptId = `REC-${Math.floor(Math.random() * 10000)}`;
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
    setReceiptForm({ propertyId: '', receivedFrom: '', description: '', amount: '', method: 'EFT', date: new Date().toISOString().split('T')[0] });
  };

  // --- Audit Report Generation ---
  const generateAuditReport = () => {
    // This is the core logic that mimics PropertyMe/Console audit reports
    const reportDate = new Date(eomDate);
    const month = reportDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Ledger Balances for report
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
          h1 { text-align: center; font-size: 18px; text-transform: uppercase; margin-bottom: 5px; }
          h2 { text-align: center; font-size: 14px; margin-top: 0; font-weight: normal; margin-bottom: 40px; }
          .section { margin-bottom: 30px; border: 1px solid #000; padding: 15px; }
          .section-title { font-weight: bold; text-decoration: underline; margin-bottom: 10px; font-size: 14px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
          .total-row { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 5px; border-top: 1px solid #000; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; }
          td { padding: 4px 0; }
          .text-right { text-align: right; }
          .footer { margin-top: 50px; font-size: 12px; text-align: center; }
          .signature-box { margin-top: 50px; display: flex; justify-content: space-between; }
          .sig-line { border-top: 1px solid #000; width: 200px; padding-top: 5px; text-align: center; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>End of Month Trust Account Report</h1>
        <h2>Period Ending: ${reportDate.toLocaleDateString()}</h2>
        <div style="text-align:center; font-size:12px; margin-bottom: 20px;">
           Trust Account: ${trustConfig.bank} (${trustConfig.bsb} ${trustConfig.acc})
        </div>

        <div class="section">
          <div class="section-title">Part A: Cashbook Reconciliation</div>
          <div class="row"><span>Opening Cashbook Balance</span> <span>$0.00</span></div>
          <div class="row"><span>Add: Total Receipts</span> <span>$${totalReceipts.toFixed(2)}</span></div>
          <div class="row"><span>Less: Total Payments</span> <span>$${totalPayments.toFixed(2)}</span></div>
          <div class="total-row"><span>Closing Cashbook Balance</span> <span>$${cashbookBalance.toFixed(2)}</span></div>
        </div>

        <div class="section">
          <div class="section-title">Part B: Bank Reconciliation</div>
          <div class="row"><span>Bank Statement Balance</span> <span>$${bankBalance.toFixed(2)}</span></div>
          <div class="row"><span>Add: Outstanding Deposits</span> <span>$0.00</span></div>
          <div class="row"><span>Less: Unpresented Cheques</span> <span>$0.00</span></div>
          <div class="total-row"><span>Reconciled Bank Balance</span> <span>$${bankBalance.toFixed(2)}</span></div>
        </div>

        <div class="section">
          <div class="section-title">Part C: Ledger Trial Balance</div>
          <table>
            <thead>
              <tr><th>Ledger / Owner</th><th>Property</th><th class="text-right">Balance</th></tr>
            </thead>
            <tbody>
              ${ledgerBalances.map(l => `
                <tr>
                  <td>${l.name}</td>
                  <td>${l.address}</td>
                  <td class="text-right">$${l.balance.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-row" style="margin-top: 15px;">
             <span>Total Ledger Balances</span>
             <span>$${ledgersSum.toFixed(2)}</span>
          </div>
        </div>

        <div class="section" style="border: none; padding: 0;">
           <div class="section-title">Reconciliation Status</div>
           <div class="row">
              <span>Variance (A - B - C)</span>
              <span>$${(cashbookBalance - bankBalance).toFixed(2)}</span>
           </div>
           <p style="font-size: 12px; font-style: italic; margin-top: 5px;">
             ${isBalanced ? "The Trust Account is fully reconciled." : "WARNING: Discrepancy detected. Audit failed."}
           </p>
        </div>

        <div class="signature-box">
           <div class="sig-line">Licensee In Charge</div>
           <div class="sig-line">Date</div>
        </div>

        <div class="footer">
           Generated by 8ME Property Software • Compliant with PSBA Act 2002
        </div>
      </body>
      </html>
    `;
    
    setAuditReport(html);
  };

  const inputClass = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 bg-white placeholder:text-slate-400";

  // Calculate Running Balance for display
  let runningBalance = 0;
  const chronologicalTxs = [...trustTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const txsWithBalance = chronologicalTxs.map(tx => {
      if (tx.type === 'Credit') runningBalance += tx.amount;
      else runningBalance -= tx.amount;
      return { ...tx, balance: runningBalance };
  });
  // Reverse for display (newest first)
  const displayTxs = [...txsWithBalance].reverse();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 relative">
      
      {/* GLOBAL HIDDEN INPUTS - Accessible from any tab */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".csv,.txt,.aba,.bai2" 
        onChange={handleFileUpload} 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={scanInputRef} 
        accept="image/*" 
        capture="environment" 
        onChange={handleAiStatementUpload} 
        className="hidden" 
      />

      {/* Compliance Disclaimer */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-xl shadow-sm">
        <div className="flex items-start">
          <div className="shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-bold text-amber-800">Trust Accounting Disclaimer</h3>
            <div className="mt-2 text-xs text-amber-700 space-y-1">
              <p>• This application does not have active bank integrations and is not connected to financial institutions.</p>
              <p>• Users must manually enter or import monthly bank statement information for each trust account.</p>
              <p>• This tool is provided to assist record-keeping only and does not replace professional trust accounting or compliance obligations.</p>
              <p>• Final review and confirmation of figures is the user’s responsibility.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Way Reconciliation Widget */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden relative">
         <div className="absolute top-0 right-0 p-32 bg-indigo-600 rounded-full blur-[100px] opacity-20"></div>
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
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          End of Month
                       </button>
                   )}
                   <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/20 flex items-center ${isBalanced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300 animate-pulse'}`}>
                      {isBalanced ? 'Balanced' : 'Unreconciled'}
                   </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative">
               {/* Connecting Lines */}
               <div className="hidden md:block absolute top-1/2 left-[30%] w-[10%] h-[2px] bg-indigo-500/30"></div>
               <div className="hidden md:block absolute top-1/2 right-[30%] w-[10%] h-[2px] bg-indigo-500/30"></div>

               <div className="relative group">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                      <p className="text-[10px] font-black uppercase text-indigo-300 tracking-widest">Bank Statement</p>
                      {/* LOCK BUTTON */}
                      {isUnlocked ? (
                          <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveAndLock(); }}
                            className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white p-1 rounded transition-colors relative z-20"
                            title="Save & Lock"
                          >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                          </button>
                      ) : (
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleUnlockClick(); }}
                            className="text-slate-500 hover:text-indigo-400 transition-colors relative z-20"
                            title="Unlock to Edit (Password Required)"
                          >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          </button>
                      )}
                  </div>
                  
                  {isUnlocked ? (
                      <input 
                        type="number"
                        step="0.01"
                        value={manualBankBalance ?? ''}
                        onChange={(e) => setManualBankBalance(parseFloat(e.target.value) || 0)}
                        className="text-3xl font-black bg-white/10 text-white text-center w-full rounded-lg border border-indigo-500/50 outline-none focus:ring-2 focus:ring-indigo-500 py-1"
                        autoFocus
                      />
                  ) : (
                      <h3 className="text-3xl font-black">${bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                  )}
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
                  {/* NEW SCAN BUTTON: Quick Access */}
                  <button 
                    onClick={() => scanInputRef.current?.click()} 
                    className="px-5 py-2.5 bg-violet-50 text-violet-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-100 active:scale-95 transition-all flex items-center gap-2 border border-violet-100"
                  >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Scan with Camera
                  </button>
                  <button onClick={() => setIsPaymentModalOpen(true)} className="px-5 py-2.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 active:scale-95 transition-all flex items-center gap-2 border border-rose-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                      Create Payment
                  </button>
                  <button onClick={() => setIsReceiptModalOpen(true)} className="px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 active:scale-95 transition-all flex items-center gap-2 border border-emerald-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Receipt Funds
                  </button>
               </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest w-12"></th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Ref</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Property / Ledger</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Payer / Payee</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Description</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Debit</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Credit</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right bg-slate-100">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-sm">
                    {displayTxs.length === 0 ? (
                       <tr><td colSpan={9} className="p-8 text-center text-slate-400 italic">No transactions recorded.</td></tr>
                    ) : (
                       displayTxs.map(tx => {
                         const prop = properties.find(p => p.id === tx.propertyId);
                         return (
                           <tr key={tx.id} className="hover:bg-slate-50">
                             <td className="px-6 py-4 text-center">
                               {/* Immutable Lock Button (Responsive) */}
                               <button 
                                 type="button"
                                 onClick={() => alert(`Audit Lock: Transaction ${tx.reference} is immutable. Edits must be made via reversal.`)}
                                 className="group relative focus:outline-none hover:scale-110 transition-transform cursor-pointer"
                                 title="Immutable Record"
                               >
                                 <svg className="w-4 h-4 text-slate-300 group-hover:text-rose-400 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>
                                 <div className="hidden group-hover:block absolute left-full top-0 ml-2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg">Immutable Record</div>
                               </button>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-slate-500">{new Date(tx.date).toLocaleDateString()}</td>
                             <td className="px-6 py-4 text-xs">{tx.reference}</td>
                             <td className="px-6 py-4 text-xs font-bold text-indigo-600 truncate max-w-[150px]">{prop ? prop.address : 'General'}</td>
                             <td className="px-6 py-4 text-xs truncate max-w-[150px]">{tx.payerPayee || '-'}</td>
                             <td className="px-6 py-4 text-xs text-slate-500 truncate max-w-[200px]">{tx.description}</td>
                             <td className="px-6 py-4 text-right text-rose-600 font-bold">{tx.type === 'Debit' ? `$${tx.amount.toFixed(2)}` : ''}</td>
                             <td className="px-6 py-4 text-right text-emerald-600 font-bold">{tx.type === 'Credit' ? `$${tx.amount.toFixed(2)}` : ''}</td>
                             <td className="px-6 py-4 text-right font-black text-slate-900 bg-slate-50/50 flex items-center justify-end gap-2">
                               <span>${tx.balance?.toFixed(2)}</span>
                               <svg className="w-3 h-3 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
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

        {/* Bank Feed View */}
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
               <div className="flex items-center gap-3">
                  {/* AI Scan Button */}
                  <button 
                    onClick={() => scanInputRef.current?.click()}
                    disabled={isScanning}
                    className="px-6 py-3 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-700 shadow-lg shadow-violet-200 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isScanning ? (
                        <>
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Scan Statement (AI)
                        </>
                    )}
                  </button>

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-white text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Upload CSV
                  </button>
                  <button 
                    onClick={runAutoMatch} 
                    disabled={isMatching || bankLines.filter(l => l.matchStatus !== 'Processed').length === 0}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isMatching ? 'Matching...' : 'Run Auto-Match'}
                  </button>
               </div>
            </div>

            <div className="space-y-4">
               {bankLines.filter(l => l.matchStatus !== 'Processed').length === 0 ? (
                 <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <h3 className="text-lg font-bold text-slate-900">All Caught Up!</h3>
                    <p className="text-slate-500 text-sm">Scan or upload a new statement file to process transactions.</p>
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
                                      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Suggested {line.suggestedMatch.type}</p>
                                   </div>
                                </div>
                                <button 
                                  onClick={() => processBankLine(line)}
                                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700"
                                >
                                  Confirm
                                </button>
                            </div>
                        ) : (
                            <div className="text-center md:text-left">
                               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                 Unmatched
                               </span>
                            </div>
                        )}
                      </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
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
              <button type="submit" className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 mt-4">Process Debit</button>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
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
              <input type="text" placeholder="Description (Optional)" value={receiptForm.description} onChange={(e) => setReceiptForm({...receiptForm, description: e.target.value})} className={inputClass} />
              <button type="submit" disabled={!receiptForm.propertyId} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 mt-4 disabled:bg-slate-300">Process Credit</button>
            </form>
          </div>
        </div>
      )}

      {/* Unlock Balance Modal */}
      {showUnlockModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md animate-in fade-in" onClick={() => setShowUnlockModal(false)} />
              <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Security Verification</h3>
                  <p className="text-sm text-slate-500 mb-6">Enter your agency password to manually edit the Trust Bank Balance.</p>
                  
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

      {/* End of Month Audit Wizard */}
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
                        <input 
                          type="date" 
                          value={eomDate} 
                          onChange={e => setEomDate(e.target.value)} 
                          className={inputClass} 
                        />
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

                     <button 
                        onClick={generateAuditReport}
                        disabled={!isBalanced}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                     >
                        Generate Report Pack
                     </button>
                     {!isBalanced && (
                        <p className="text-center text-xs text-rose-500 font-bold mt-2">
                           Cannot generate report: Account is not reconciled.
                        </p>
                     )}
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
