
import React, { useState, useEffect } from 'react';
import { Agency } from '../types';

const MOCK_AGENCIES: Agency[] = [
  { id: 'ag-1', name: 'Apex Real Estate', contactEmail: 'director@apexre.com', status: 'Active', subscriptionPlan: 'Enterprise', usersCount: 12, licenseLimit: 20, propertiesCount: 145, propertyLimit: -1, joinedDate: '2023-01-15', mrr: 1688, termsAcceptedAt: '2023-01-15T09:00:00Z' },
  { id: 'ag-2', name: 'Coastal Living', contactEmail: 'info@coastal.com', status: 'Active', subscriptionPlan: 'Growth', usersCount: 4, licenseLimit: 5, propertiesCount: 42, propertyLimit: 200, joinedDate: '2023-06-20', mrr: 228, termsAcceptedAt: '2023-06-20T14:30:00Z' },
  { id: 'ag-3', name: 'StartUp Properties', contactEmail: 'founder@startup.com', status: 'Trial', subscriptionPlan: 'Starter', usersCount: 1, licenseLimit: 1, propertiesCount: 5, propertyLimit: 50, joinedDate: '2024-02-01', mrr: 0, termsAcceptedAt: '2024-02-01T10:15:00Z' },
  { id: 'ag-4', name: 'Old School Realty', contactEmail: 'bob@oldschool.com', status: 'Suspended', subscriptionPlan: 'Growth', usersCount: 3, licenseLimit: 5, propertiesCount: 88, propertyLimit: 200, joinedDate: '2022-11-10', mrr: 228, termsAcceptedAt: '2022-11-10T11:00:00Z' },
];

// Mock Data for the Revenue Engine (The "Spread")
const REVENUE_METRICS = {
    totalConnections: 142, // Total utilities connected this month
    avgProviderPayout: 350, // What Movinghub pays YOU
    avgAgencyCommission: 50, // What YOU pay the Agency
};

interface MasterConsoleProps {
  onImpersonate?: (agency: Agency) => void;
}

const MasterConsole: React.FC<MasterConsoleProps> = ({ onImpersonate }) => {
  const [agencies, setAgencies] = useState<Agency[]>(MOCK_AGENCIES);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add Agency Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAgency, setNewAgency] = useState({
    name: '',
    email: '',
    plan: 'Growth' as Agency['subscriptionPlan'],
    seats: 5,
    contractSigned: false
  });

  // Dynamic Pricing & Limits Calculator
  const [calculatedMrr, setCalculatedMrr] = useState(0);
  const [listingCap, setListingCap] = useState<string>('');

  // Revenue Calcs
  const grossPartnerRevenue = REVENUE_METRICS.totalConnections * REVENUE_METRICS.avgProviderPayout;
  const totalCommissionsPaid = REVENUE_METRICS.totalConnections * REVENUE_METRICS.avgAgencyCommission;
  const netPartnerProfit = grossPartnerRevenue - totalCommissionsPaid;

  useEffect(() => {
    let basePrice = 0;
    let includedSeats = 0;
    let extraSeatPrice = 0;
    let cap = '';

    if (newAgency.plan === 'Starter') {
        basePrice = 68;
        includedSeats = 1;
        extraSeatPrice = 49;
        cap = '50 Properties';
    } else if (newAgency.plan === 'Growth') {
        basePrice = 228;
        includedSeats = 5;
        extraSeatPrice = 29;
        cap = '200 Properties';
    } else { // Enterprise
        basePrice = 1688;
        includedSeats = 20;
        extraSeatPrice = 15;
        cap = 'Unlimited';
    }

    // Default seat count logic if user switches plan
    let currentSeats = newAgency.seats;
    // Don't let seats drop below included amount automatically for better UX
    if (currentSeats < includedSeats) currentSeats = includedSeats; 

    const extraSeats = Math.max(0, newAgency.seats - includedSeats);
    const total = basePrice + (extraSeats * extraSeatPrice);
    
    setCalculatedMrr(total);
    setListingCap(cap);
  }, [newAgency.plan, newAgency.seats]);

  // Set default seats when changing plan
  const handlePlanChange = (plan: Agency['subscriptionPlan']) => {
      let defaultSeats = 1;
      if (plan === 'Growth') defaultSeats = 5;
      if (plan === 'Enterprise') defaultSeats = 20;
      setNewAgency({ ...newAgency, plan, seats: defaultSeats });
  };

  const filteredAgencies = agencies.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMRR = agencies.filter(a => a.status === 'Active').reduce((acc, a) => acc + a.mrr, 0);
  const totalUsers = agencies.reduce((acc, a) => acc + a.usersCount, 0);

  const toggleStatus = (id: string) => {
    setAgencies(agencies.map(a => {
        if(a.id === id) {
            return { ...a, status: a.status === 'Suspended' ? 'Active' : 'Suspended' }
        }
        return a;
    }));
  };

  const handleAddAgency = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine limit number for DB
    let propLimit = -1; // -1 for unlimited
    if (newAgency.plan === 'Starter') propLimit = 50;
    if (newAgency.plan === 'Growth') propLimit = 200;

    const agency: Agency = {
        id: `ag-${Date.now()}`,
        name: newAgency.name,
        contactEmail: newAgency.email,
        status: 'Active',
        subscriptionPlan: newAgency.plan,
        usersCount: 1, // Default admin user
        licenseLimit: newAgency.seats,
        propertiesCount: 0,
        propertyLimit: propLimit,
        joinedDate: new Date().toISOString().split('T')[0],
        // THIS IS WHERE THE AGREEMENT DATE IS STORED
        termsAcceptedAt: newAgency.contractSigned ? new Date().toISOString() : undefined,
        mrr: calculatedMrr
    };

    setAgencies([...agencies, agency]);
    setIsAddModalOpen(false);
    setNewAgency({ name: '', email: '', plan: 'Growth', seats: 5, contractSigned: false });
  };

  const handlePreviewContract = () => {
    const contractText = `
    ENTERPRISE SERVICE AGREEMENT
    
    Customer: ${newAgency.name || '[AGENCY NAME]'}
    Date: ${new Date().toLocaleDateString()}
    
    1. PLAN DETAILS
    - Plan: Enterprise
    - Monthly Fee: $${calculatedMrr.toLocaleString()}
    - Included Seats: ${newAgency.seats}
    - Asset Limit: Unlimited
    
    2. TERMS
    Provider (8ME) agrees to provide the Service...
    
    [... Full Standard Clauses Here ...]
    
    Signed: __________________________
    Date: ____________________________
    `;
    
    const win = window.open('', '_blank');
    if (win) {
        win.document.write(`<pre style="font-family: monospace; padding: 40px; font-size: 14px;">${contractText}</pre>`);
        win.document.title = `Contract - ${newAgency.name}`;
        win.print();
    }
  };

  const handleRedrawContract = (agency: Agency) => {
    if (!agency.termsAcceptedAt) return;

    const signDate = new Date(agency.termsAcceptedAt);
    const signatureHash = btoa(`${agency.id}-${agency.termsAcceptedAt}-${agency.name}`).substring(0, 32); // Mock digital signature

    const contractText = `
    MASTER SERVICE AGREEMENT (EXECUTED COPY)
    -------------------------------------------------------
    Reference ID: ${agency.id.toUpperCase()}
    Digital Signature: ${signatureHash}
    Timestamp: ${agency.termsAcceptedAt}
    -------------------------------------------------------

    PARTIES
    1. 8ME Pty Ltd ("Provider")
    2. ${agency.name} ("Customer")
       Email: ${agency.contactEmail}

    AGREEMENT TERMS
    Effective Date: ${signDate.toLocaleDateString()}
    
    1. SUBSCRIPTION SCOPE
       Plan: ${agency.subscriptionPlan}
       License Count: ${agency.licenseLimit} Users
       Asset Limit: ${agency.propertyLimit === -1 ? 'Unlimited' : agency.propertyLimit} Properties
       Current Fees: $${agency.mrr}/month (Subject to change per Clause 3.4)

    2. SERVICE LEVEL AGREEMENT (SLA)
       Provider agrees to provide 99.9% uptime...
    
    3. DATA OWNERSHIP
       Customer retains full ownership of all property and tenant data...

    [... STANDARD LEGAL CLAUSES OMITTED FOR BREVITY ...]

    -------------------------------------------------------
    EXECUTED ELECTRONICALLY
    By clicking "I Agree" on ${signDate.toLocaleString()}, the Customer 
    accepted all terms and conditions bound by this agreement.
    -------------------------------------------------------
    `;

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(`
            <html>
            <head>
                <title>Contract_${agency.id}.pdf</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 40px; font-size: 12px; color: #333; max-width: 800px; margin: 0 auto; }
                    h1 { font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                    .header { margin-bottom: 40px; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; }
                    .stamp { position: fixed; bottom: 50px; right: 50px; border: 4px double #ef4444; color: #ef4444; padding: 10px 20px; font-weight: bold; text-transform: uppercase; transform: rotate(-10deg); opacity: 0.5; font-size: 24px; }
                </style>
            </head>
            <body>
                <div class="stamp">Signed Electronically</div>
                <pre>${contractText}</pre>
                <script>window.print();</script>
            </body>
            </html>
        `);
        win.document.close();
    }
  };

  const getStatusBadge = (status: Agency['status']) => {
    switch(status) {
        case 'Active': return 'bg-emerald-100 text-emerald-700';
        case 'Trial': return 'bg-indigo-100 text-indigo-700';
        case 'Suspended': return 'bg-rose-100 text-rose-700';
    }
  };

  const inputClass = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 bg-white placeholder:text-slate-400 transition-all";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-indigo-600 rounded-full blur-[100px] opacity-30"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight">Master Console</h2>
                    <p className="text-slate-400 mt-2">Platform Overview & Agency Management</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">SaaS MRR</p>
                        <h3 className="text-4xl font-black mt-1">${totalMRR.toLocaleString()}</h3>
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-white text-slate-900 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-50 transition-colors shadow-lg active:scale-95"
                    >
                        + Onboard Agency
                    </button>
                </div>
            </div>
        </div>

        {/* REVENUE ENGINE SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-24 bg-white opacity-5 rounded-full blur-[80px]"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-8">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl">⚡</div>
                        <div>
                            <h3 className="text-xl font-bold">Partner Revenue Engine</h3>
                            <p className="text-xs text-indigo-200">Utility & Insurance Integration Performance</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Gross Revenue (In)</p>
                            <p className="text-3xl font-black text-white">${grossPartnerRevenue.toLocaleString()}</p>
                            <p className="text-[10px] text-indigo-300 mt-1">From Providers @ ${REVENUE_METRICS.avgProviderPayout}/lead</p>
                        </div>
                        <div className="relative">
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-2xl text-indigo-500/50">-</div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-300 mb-1">Commissions (Out)</p>
                            <p className="text-3xl font-black text-rose-400">${totalCommissionsPaid.toLocaleString()}</p>
                            <p className="text-[10px] text-rose-300/70 mt-1">Paid to Agencies @ ${REVENUE_METRICS.avgAgencyCommission}/lead</p>
                        </div>
                        <div className="relative">
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-2xl text-indigo-500/50">=</div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-1">Net Profit (Kept)</p>
                            <p className="text-4xl font-black text-emerald-400">${netPartnerProfit.toLocaleString()}</p>
                            <p className="text-[10px] text-emerald-300/70 mt-1">Your Margin</p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                            <span className="text-xs font-bold text-indigo-200">{REVENUE_METRICS.totalConnections} Connections this month</span>
                        </div>
                        <button className="text-xs font-bold text-white hover:text-indigo-300 transition-colors">View Detailed Report &rarr;</button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-[calc(50%-12px)]">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active SaaS Licenses</p>
                    <div className="flex items-baseline gap-2 mt-2">
                        <h4 className="text-3xl font-black text-slate-900">{totalUsers}</h4>
                        <span className="text-xs font-bold text-slate-400">Seats</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-[calc(50%-12px)]">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Agencies</p>
                    <div className="flex items-baseline gap-2 mt-2">
                        <h4 className="text-3xl font-black text-slate-900">{agencies.length}</h4>
                        <span className="text-xs font-bold text-emerald-600">+1 this week</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Agency Directory</h3>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search Agencies..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
            </div>
            <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-100">
                    <tr>
                        <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Agency Name</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Plan</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Compliance</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Utilization</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredAgencies.map(agency => {
                        const usagePercent = agency.usersCount / agency.licenseLimit * 100;
                        const propLimitLabel = agency.propertyLimit === -1 ? '∞' : agency.propertyLimit;
                        const hasAgreement = !!agency.termsAcceptedAt;
                        
                        return (
                        <tr key={agency.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-5">
                                <p className="font-bold text-slate-900">{agency.name}</p>
                                <p className="text-xs text-slate-500">{agency.contactEmail}</p>
                            </td>
                            <td className="px-8 py-5">
                                <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">{agency.subscriptionPlan}</span>
                                <p className="text-[10px] text-slate-400 mt-1">${agency.mrr}/mo</p>
                            </td>
                            <td className="px-8 py-5">
                                {hasAgreement ? (
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-900 uppercase">Signed</p>
                                                <p className="text-[9px] text-slate-400">{new Date(agency.termsAcceptedAt!).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRedrawContract(agency)}
                                            className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                                            title="Redraw Legal Contract"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2 opacity-50">
                                        <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Pending</p>
                                    </div>
                                )}
                            </td>
                            <td className="px-8 py-5">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end text-xs">
                                        <span className="font-bold text-slate-500">Seats: {agency.usersCount}/{agency.licenseLimit}</span>
                                        <span className="font-bold text-slate-500">Props: {agency.propertiesCount}/{propLimitLabel}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${usagePercent >= 100 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                                            style={{ width: `${Math.min(100, usagePercent)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-5">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusBadge(agency.status)}`}>
                                    {agency.status}
                                </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                                <div className="flex justify-end gap-2">
                                    <button 
                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Impersonate / Login As"
                                        onClick={() => onImpersonate ? onImpersonate(agency) : alert(`Logging in as ${agency.name} Admin...`)}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                    </button>
                                    <button 
                                        onClick={() => toggleStatus(agency.id)}
                                        className={`p-2 rounded-lg transition-colors ${agency.status === 'Suspended' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-500 hover:bg-rose-50'}`}
                                        title={agency.status === 'Suspended' ? 'Activate' : 'Suspend'}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {agency.status === 'Suspended' 
                                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            }
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>

        {/* Add Agency Modal (truncated for brevity, logic remains the same) */}
        {isAddModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsAddModalOpen(false)} />
                <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-6">Onboard New Agency</h3>
                    <form onSubmit={handleAddAgency} className="space-y-4">
                        <div>
                            <label className={labelClass}>Agency Name</label>
                            <input 
                                required 
                                type="text" 
                                placeholder="e.g. Prestige Properties"
                                value={newAgency.name} 
                                onChange={e => setNewAgency({...newAgency, name: e.target.value})} 
                                className={inputClass} 
                            />
                        </div>
                        {/* ... rest of the form ... */}
                        <div>
                            <label className={labelClass}>Admin Email</label>
                            <input 
                                required 
                                type="email" 
                                placeholder="admin@prestige.com"
                                value={newAgency.email} 
                                onChange={e => setNewAgency({...newAgency, email: e.target.value})} 
                                className={inputClass} 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Base Plan</label>
                                <select 
                                    value={newAgency.plan} 
                                    onChange={e => handlePlanChange(e.target.value as any)} 
                                    className={inputClass}
                                >
                                    <option value="Starter">Starter (Max 50 Props)</option>
                                    <option value="Growth">Growth (Max 200 Props)</option>
                                    <option value="Enterprise">Enterprise (Unlimited)</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Licensed Seats</label>
                                <input 
                                    type="number"
                                    min="1"
                                    value={newAgency.seats} 
                                    onChange={e => setNewAgency({...newAgency, seats: parseInt(e.target.value) || 1})} 
                                    className={inputClass} 
                                />
                            </div>
                        </div>

                        {/* Contract Verification Toggle (Manual Onboarding) */}
                        <div className="bg-slate-100 p-4 rounded-xl space-y-3">
                            <div className="flex items-center space-x-3">
                                <input 
                                    type="checkbox"
                                    id="contractSigned"
                                    checked={newAgency.contractSigned}
                                    onChange={e => setNewAgency({...newAgency, contractSigned: e.target.checked})}
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                                <label htmlFor="contractSigned" className="text-xs font-bold text-slate-600 uppercase tracking-wide cursor-pointer select-none">
                                    {newAgency.plan === 'Enterprise' ? 'Contract Signed & Uploaded' : 'Agreed to T&Cs'}
                                </label>
                            </div>
                            
                            {newAgency.plan === 'Enterprise' && (
                                <button 
                                    type="button"
                                    onClick={handlePreviewContract}
                                    className="w-full py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-50 transition-colors"
                                >
                                    Preview Contract PDF
                                </button>
                            )}
                        </div>

                        {/* Pricing & Limits Preview */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-500">Base Plan</span>
                                <span className="text-xs font-bold text-slate-900">
                                    {newAgency.plan === 'Starter' ? '$68' : newAgency.plan === 'Growth' ? '$228' : '$1,688'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-500">Asset Cap</span>
                                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                    {listingCap}
                                </span>
                            </div>
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200">
                                <span className="text-xs font-bold text-slate-500">Additional Seats</span>
                                <span className="text-xs font-bold text-slate-900">
                                    + ${(calculatedMrr - (newAgency.plan === 'Starter' ? 68 : newAgency.plan === 'Growth' ? 228 : 1688))}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-black uppercase text-indigo-600 tracking-widest">Total Monthly</span>
                                <span className="text-xl font-black text-indigo-600">${calculatedMrr}</span>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={!newAgency.contractSigned}
                            className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Create Account & Invoice
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default MasterConsole;
