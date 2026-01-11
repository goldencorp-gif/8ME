
import React, { useState, useEffect } from 'react';
import { UserProfile, UserAccount } from '../types';
import { getStripeConfig, StripeConfig } from '../services/stripeService';

interface SettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  users: UserAccount[];
  onUpdateUsers: (users: UserAccount[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ userProfile: initialProfile, onUpdateProfile, users, onUpdateUsers }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'agency' | 'billing' | 'data' | 'subscription'>('team');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Stripe Config State
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null);

  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfile);
  
  // New User Form State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Manager' as 'Admin' | 'Manager' | 'Viewer' });

  // Agency Details State
  const [agencyDetails, setAgencyDetails] = useState({
    name: '8ME',
    abn: '12 345 678 901',
    license: 'L-99887766',
    address: 'Level 45, 120 Collins St, Melbourne VIC 3000',
    trustBank: 'Commonwealth Bank',
    trustBsb: '063-000',
    trustAccount: '1122 3344',
    websiteUrl: '',
    loginBackgroundImage: '',
    subscriptionPlan: 'Growth' as 'Starter' | 'Growth' | 'Enterprise', // Added Plan Tracking
    subscriptionStatus: 'Active'
  });

  // Partner Integration State
  const [partners, setPartners] = useState({
    utilitiesProvider: 'Movinghub',
    utilitiesId: '',
    insuranceProvider: 'EBM RentCover',
    insuranceId: '',
    depreciationProvider: 'BMT',
    depreciationId: ''
  });

  // Service Offerings State - THE MENU
  const [services, setServices] = useState({
    electricity: true,
    gas: true,
    internet: true,
    payTv: false,
    removals: false,
    cleaning: false,
    autoSend: true // Auto-send offer on lease creation
  });

  // Cloud Data State
  const [cloudConfig, setCloudConfig] = useState({
    enabled: false,
    provider: 'Supabase' as 'Supabase' | 'Firebase' | 'AWS',
    endpoint: '',
    apiKey: ''
  });
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);

  useEffect(() => {
    // Load settings from local storage
    const savedAgency = localStorage.getItem('proptrust_agency_settings');
    if (savedAgency) setAgencyDetails(prev => ({ ...prev, ...JSON.parse(savedAgency) }));
    
    const savedPartners = localStorage.getItem('proptrust_partner_settings');
    if (savedPartners) setPartners(JSON.parse(savedPartners));

    const savedServices = localStorage.getItem('proptrust_service_config');
    if (savedServices) setServices(JSON.parse(savedServices));

    const savedCloud = localStorage.getItem('proptrust_cloud_config');
    if (savedCloud) {
        const parsed = JSON.parse(savedCloud);
        setCloudConfig(parsed);
        // If they are already enabled, assume they accepted previously
        if (parsed.enabled) setLiabilityAccepted(true);
    }

    // Load Stripe Config
    getStripeConfig().then(setStripeConfig);

    // Sync local state if parent prop updates
    setUserProfile(initialProfile);

    // Check for payment success return
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success') === 'true') {
        const newPlan = urlParams.get('plan');
        if (newPlan) {
            setAgencyDetails(prev => {
                const updated = { ...prev, subscriptionPlan: newPlan as any, subscriptionStatus: 'Active' };
                localStorage.setItem('proptrust_agency_settings', JSON.stringify(updated));
                return updated;
            });
            setSuccessMsg('Subscription updated successfully!');
            setActiveTab('subscription');
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }
  }, [initialProfile]);

  const handleSave = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      // Call parent updater
      onUpdateProfile(userProfile);
      
      // Save details locally
      localStorage.setItem('proptrust_agency_settings', JSON.stringify(agencyDetails));
      localStorage.setItem('proptrust_partner_settings', JSON.stringify(partners));
      localStorage.setItem('proptrust_service_config', JSON.stringify(services));
      localStorage.setItem('proptrust_cloud_config', JSON.stringify(cloudConfig));
      
      // Force reload if data source changed to ensure DB service picks it up
      if (activeTab === 'data') {
         window.location.reload();
      } else {
         setLoading(false);
         setSuccessMsg('Settings updated successfully');
         setTimeout(() => setSuccessMsg(''), 3000);
      }
    }, 800);
  };

  const toggleUserStatus = (userId: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        // Don't allow suspending self if logged in (simplified check for demo)
        if(u.email === userProfile.email && u.status === 'Active') {
            alert("You cannot suspend your own account.");
            return u;
        }
        return { ...u, status: (u.status === 'Active' ? 'Suspended' : 'Active') as 'Active' | 'Suspended' };
      }
      return u;
    });
    onUpdateUsers(updatedUsers);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUserObj: UserAccount = {
        id: `usr-${Date.now()}`,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: 'Active',
        lastActive: 'Never'
    };
    onUpdateUsers([...users, newUserObj]);
    setIsAddUserOpen(false);
    setNewUser({ name: '', email: '', role: 'Manager' });
  };

  // Calculate potential commission based on enabled services
  const calculatePotentialRevenue = () => {
      let base = 0;
      if (services.electricity) base += 50;
      if (services.gas) base += 50;
      if (services.internet) base += 30;
      if (services.payTv) base += 20;
      if (services.removals) base += 100;
      if (services.cleaning) base += 25;
      return base;
  };

  const handleSubscribe = (plan: 'Starter' | 'Growth' | 'Enterprise') => {
      if (!stripeConfig) return;
      
      let url = '';
      if (plan === 'Starter') url = stripeConfig.starterLink;
      if (plan === 'Growth') url = stripeConfig.growthLink;
      if (plan === 'Enterprise') url = stripeConfig.enterpriseLink;

      if (!url || url === '#' || url === '') {
          alert("Payment link not configured. Please check site-settings.json");
          return;
      }

      // We append a query param so when they come back we can simulate a success update (in a real app, webhooks handle this)
      // Note: Payment links support redirect URLs configured in Stripe Dashboard, 
      // but for this demo, we assume the user returns to the app manually or via the redirect.
      window.open(url, '_blank');
  };

  const handlePortal = () => {
      if (stripeConfig?.customerPortalLink) {
          window.open(stripeConfig.customerPortalLink, '_blank');
      } else {
          alert("Portal not configured.");
      }
  };

  const inputClass = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 bg-white placeholder:text-slate-400 transition-all";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2";

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Settings & Configuration</h2>
          <p className="text-slate-500 mt-1">Manage your agency profile, team members, and system preferences.</p>
        </div>
        {successMsg && (
          <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center animate-pulse">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {successMsg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Settings Sidebar */}
        <div className="lg:col-span-1 space-y-2">
           <button 
            onClick={() => setActiveTab('team')}
            className={`w-full text-left px-5 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-between ${activeTab === 'team' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            <span>Team & Access</span>
            {activeTab === 'team' && <div className="w-2 h-2 bg-white rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('agency')}
            className={`w-full text-left px-5 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-between ${activeTab === 'agency' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            <span>Agency Details</span>
            {activeTab === 'agency' && <div className="w-2 h-2 bg-white rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('subscription')}
            className={`w-full text-left px-5 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-between ${activeTab === 'subscription' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            <span>My Subscription</span>
            {activeTab === 'subscription' && <div className="w-2 h-2 bg-white rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-5 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-between ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            <span>My Profile</span>
            {activeTab === 'profile' && <div className="w-2 h-2 bg-white rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={`w-full text-left px-5 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-between ${activeTab === 'billing' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            <span>Revenue & Services</span>
            {activeTab === 'billing' && <div className="w-2 h-2 bg-white rounded-full" />}
          </button>
          <div className="pt-4 border-t border-slate-200 mt-4">
            <button 
                onClick={() => setActiveTab('data')}
                className={`w-full text-left px-5 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-between ${activeTab === 'data' ? 'bg-indigo-900 text-white shadow-lg' : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100'}`}
            >
                <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                    Data Sovereignty
                </span>
                {activeTab === 'data' && <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          
          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        </div>
                        <div>
                           <h3 className="text-xl font-bold text-slate-900">Subscription Plan</h3>
                           <p className="text-sm text-slate-500">Manage your 8ME billing and features.</p>
                        </div>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Status</span>
                       <div className="flex items-center justify-end gap-2 mt-1">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                          <span className="text-emerald-600 font-bold">{agencyDetails.subscriptionStatus || 'Active'}</span>
                       </div>
                    </div>
                </div>

                {/* Current Plan Highlight */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Your Plan</p>
                        <h2 className="text-3xl font-black text-slate-900">{agencyDetails.subscriptionPlan}</h2>
                        <p className="text-sm text-slate-500 mt-2">
                            {agencyDetails.subscriptionPlan === 'Starter' && 'Up to 50 Properties • 1 User'}
                            {agencyDetails.subscriptionPlan === 'Growth' && 'Up to 200 Properties • 5 Users'}
                            {agencyDetails.subscriptionPlan === 'Enterprise' && 'Unlimited Properties • 20 Users'}
                        </p>
                    </div>
                    <button 
                        onClick={handlePortal}
                        className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        Manage Billing
                    </button>
                </div>

                {/* Plans Grid */}
                <div>
                    <h4 className="font-bold text-slate-900 mb-6">Available Plans</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Starter */}
                        <div className={`p-6 rounded-2xl border transition-all ${agencyDetails.subscriptionPlan === 'Starter' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 bg-white'}`}>
                            <h5 className="font-black text-lg text-slate-900">Starter</h5>
                            <p className="text-3xl font-bold text-slate-900 mt-2">$68<span className="text-sm text-slate-400 font-medium">/mo</span></p>
                            <ul className="mt-4 space-y-2 text-xs text-slate-600 font-medium">
                                <li className="flex items-center">✓ 50 Properties</li>
                                <li className="flex items-center">✓ 1 User Seat</li>
                                <li className="flex items-center">✓ Basic Support</li>
                            </ul>
                            {agencyDetails.subscriptionPlan === 'Starter' ? (
                                <button disabled className="w-full mt-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest opacity-50 cursor-default">Current Plan</button>
                            ) : (
                                <button onClick={() => handleSubscribe('Starter')} className="w-full mt-6 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50">Downgrade</button>
                            )}
                        </div>

                        {/* Growth */}
                        <div className={`p-6 rounded-2xl border transition-all relative ${agencyDetails.subscriptionPlan === 'Growth' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 bg-white'}`}>
                            {agencyDetails.subscriptionPlan !== 'Growth' && <div className="absolute top-0 right-0 bg-indigo-100 text-indigo-700 text-[9px] font-bold px-2 py-1 rounded-bl-xl uppercase tracking-widest">Popular</div>}
                            <h5 className="font-black text-lg text-slate-900">Growth</h5>
                            <p className="text-3xl font-bold text-slate-900 mt-2">$228<span className="text-sm text-slate-400 font-medium">/mo</span></p>
                            <ul className="mt-4 space-y-2 text-xs text-slate-600 font-medium">
                                <li className="flex items-center">✓ 200 Properties</li>
                                <li className="flex items-center">✓ 5 User Seats</li>
                                <li className="flex items-center">✓ Priority Support</li>
                            </ul>
                            {agencyDetails.subscriptionPlan === 'Growth' ? (
                                <button disabled className="w-full mt-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest opacity-50 cursor-default">Current Plan</button>
                            ) : (
                                <button 
                                    onClick={() => handleSubscribe('Growth')} 
                                    className={`w-full mt-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${agencyDetails.subscriptionPlan === 'Starter' ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                                >
                                    {agencyDetails.subscriptionPlan === 'Starter' ? 'Upgrade' : 'Switch'}
                                </button>
                            )}
                        </div>

                        {/* Enterprise */}
                        <div className={`p-6 rounded-2xl border transition-all ${agencyDetails.subscriptionPlan === 'Enterprise' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 bg-white'}`}>
                            <h5 className="font-black text-lg text-slate-900">Enterprise</h5>
                            <p className="text-3xl font-bold text-slate-900 mt-2">$1,688<span className="text-sm text-slate-400 font-medium">/mo</span></p>
                            <ul className="mt-4 space-y-2 text-xs text-slate-600 font-medium">
                                <li className="flex items-center">✓ Unlimited Assets</li>
                                <li className="flex items-center">✓ 20 User Seats</li>
                                <li className="flex items-center">✓ Dedicated Account Mgr</li>
                            </ul>
                            {agencyDetails.subscriptionPlan === 'Enterprise' ? (
                                <button disabled className="w-full mt-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest opacity-50 cursor-default">Current Plan</button>
                            ) : (
                                <button 
                                    onClick={() => handleSubscribe('Enterprise')} 
                                    className={`w-full mt-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${agencyDetails.subscriptionPlan !== 'Enterprise' ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg' : ''}`}
                                >
                                    Upgrade
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* Team Access Tab */}
          {activeTab === 'team' && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in">
                {/* ... User Table Content ... */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <div>
                        <h3 className="text-xl font-bold text-slate-900">User Access Control</h3>
                        <p className="text-sm text-slate-500">Manage who can login to your agency portal.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsAddUserOpen(true)}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors shadow-lg"
                    >
                        + Add User
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">User Details</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Role</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Access Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-900">{u.name}</p>
                                        <p className="text-xs text-slate-500">{u.email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${u.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <div className={`w-2 h-2 rounded-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                            <span className={`text-xs font-bold ${u.status === 'Active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {u.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => toggleUserStatus(u.id)}
                                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                                u.status === 'Active' 
                                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100' 
                                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100'
                                            }`}
                                        >
                                            {u.status === 'Active' ? 'Suspend' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* Agency Tab */}
          {activeTab === 'agency' && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in">
              <div className="flex items-center space-x-4 border-b border-slate-100 pb-6">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Agency Configuration</h3>
                  <p className="text-sm text-slate-500">Legal details used for invoices and agreements.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className={labelClass}>Agency / Trading Name</label>
                  <input 
                    type="text" 
                    value={agencyDetails.name}
                    onChange={e => setAgencyDetails({...agencyDetails, name: e.target.value})}
                    className={inputClass}
                  />
                </div>
                
                <div className="md:col-span-2 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-4">
                   <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      <h4 className="font-bold text-indigo-900">Website Integration</h4>
                   </div>
                   <div>
                      <label className={labelClass}>Main Website URL</label>
                      <input 
                        type="url" 
                        placeholder="https://myagency.com"
                        value={agencyDetails.websiteUrl}
                        onChange={e => setAgencyDetails({...agencyDetails, websiteUrl: e.target.value})}
                        className={inputClass}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">This adds a "Back to Website" button on the Login screen.</p>
                   </div>
                   <div>
                      <label className={labelClass}>Login Screen Background Image URL</label>
                      <input 
                        type="url" 
                        placeholder="https://myagency.com/images/hero.jpg"
                        value={agencyDetails.loginBackgroundImage}
                        onChange={e => setAgencyDetails({...agencyDetails, loginBackgroundImage: e.target.value})}
                        className={inputClass}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Paste a direct link to an image on your website to brand the login portal.</p>
                   </div>
                </div>

                <div>
                  <label className={labelClass}>ABN / Tax ID</label>
                  <input 
                    type="text" 
                    value={agencyDetails.abn}
                    onChange={e => setAgencyDetails({...agencyDetails, abn: e.target.value})}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>License Number</label>
                  <input 
                    type="text" 
                    value={agencyDetails.license}
                    onChange={e => setAgencyDetails({...agencyDetails, license: e.target.value})}
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Physical Address</label>
                  <input 
                    type="text" 
                    value={agencyDetails.address}
                    onChange={e => setAgencyDetails({...agencyDetails, address: e.target.value})}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Statutory Trust Account Section */}
              <div className="bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold uppercase px-4 py-1.5 rounded-bl-2xl shadow-sm tracking-widest">
                   Audit Linked
                </div>
                
                <div className="flex items-center space-x-3 mb-6">
                   <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <div>
                      <h4 className="text-sm font-black uppercase text-slate-900 tracking-widest">Statutory Trust Account</h4>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">Primary reconciliation source for Fair Trading audits.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="md:col-span-2">
                      <label className={labelClass}>Financial Institution</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Macquarie Bank"
                        value={agencyDetails.trustBank}
                        onChange={e => setAgencyDetails({...agencyDetails, trustBank: e.target.value})}
                        className={`${inputClass} border-emerald-200 focus:ring-emerald-500`}
                      />
                   </div>
                   <div>
                        <label className={labelClass}>BSB Number</label>
                        <input 
                          type="text" 
                          placeholder="000-000"
                          maxLength={7}
                          value={agencyDetails.trustBsb}
                          onChange={e => setAgencyDetails({...agencyDetails, trustBsb: e.target.value})}
                          className={`${inputClass} font-mono tracking-widest border-emerald-200 focus:ring-emerald-500`}
                        />
                   </div>
                   <div>
                        <label className={labelClass}>Account Number</label>
                        <input 
                          type="text" 
                          placeholder="0000 0000"
                          value={agencyDetails.trustAccount}
                          onChange={e => setAgencyDetails({...agencyDetails, trustAccount: e.target.value})}
                          className={`${inputClass} font-mono tracking-widest border-emerald-200 focus:ring-emerald-500`}
                        />
                   </div>
                </div>
                <div className="mt-4 flex items-center space-x-2 text-[10px] text-emerald-700 font-bold bg-emerald-100/50 p-2 rounded-lg inline-block">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                   <span>These details will appear on all Trust Receipts and the 3-Way Reconciliation Report.</span>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                 <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                 >
                   {loading ? 'Saving...' : 'Save Configuration'}
                 </button>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in">
              <div className="flex items-center space-x-4 border-b border-slate-100 pb-6">
                <div className="relative">
                  <img src="https://picsum.photos/100/100" className="w-16 h-16 rounded-2xl border-2 border-indigo-100" alt="Profile" />
                  <button className="absolute -bottom-2 -right-2 bg-slate-900 text-white p-1.5 rounded-lg border-2 border-white hover:bg-indigo-600 transition-colors">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Personal Profile</h3>
                  <p className="text-sm text-slate-500">Manage your login and contact details.</p>
                </div>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className={labelClass}>Full Name</label>
                    <input 
                      type="text" 
                      value={userProfile.name}
                      onChange={e => setUserProfile({...userProfile, name: e.target.value})}
                      className={inputClass}
                    />
                 </div>
                 <div>
                    <label className={labelClass}>Job Title</label>
                    <input 
                      type="text" 
                      value={userProfile.title}
                      onChange={e => setUserProfile({...userProfile, title: e.target.value})}
                      className={inputClass}
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label className={labelClass}>Email Address</label>
                      <input 
                        type="email" 
                        value={userProfile.email}
                        onChange={e => setUserProfile({...userProfile, email: e.target.value})}
                        className={inputClass}
                      />
                   </div>
                   <div>
                      <label className={labelClass}>Mobile Phone</label>
                      <input 
                        type="tel" 
                        value={userProfile.phone}
                        onChange={e => setUserProfile({...userProfile, phone: e.target.value})}
                        className={inputClass}
                      />
                   </div>
                 </div>
              </div>

              <div className="flex justify-end pt-4">
                 <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                 >
                   {loading ? 'Saving...' : 'Update Profile'}
                 </button>
              </div>
            </div>
          )}

          {/* Integrations (Revenue & Services) Tab */}
          {activeTab === 'billing' && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in">
              <div className="flex items-center space-x-4 border-b border-slate-100 pb-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Revenue & Integrations</h3>
                  <p className="text-sm text-slate-500">Configure tenant services and monetize your connections.</p>
                </div>
              </div>

              <div className="space-y-6">
                
                {/* 1. Tenant Service Menu (Detailed Selection) */}
                <div className="p-6 border border-slate-200 bg-slate-50 rounded-[2rem]">
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">🛠️</div>
                          <div>
                             <h4 className="font-bold text-slate-900">Tenant Service Menu</h4>
                             <p className="text-xs text-slate-500">Enable services to offer in your Welcome Packs.</p>
                          </div>
                      </div>
                      
                      {/* Commission Calculator */}
                      <div className="bg-white border border-emerald-100 rounded-xl px-4 py-2 shadow-sm text-right">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Commission</p>
                         <p className="text-xl font-black text-emerald-600">${calculatePotentialRevenue()}<span className="text-xs text-emerald-400">/lead</span></p>
                      </div>
                   </div>

                   {/* Partner ID Input */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-1">
                         <label className={labelClass}>Utility Provider</label>
                         <select 
                           value={partners.utilitiesProvider}
                           onChange={e => setPartners({...partners, utilitiesProvider: e.target.value})}
                           className={inputClass}
                         >
                            <option value="Movinghub">Movinghub</option>
                            <option value="Direct Connect">Direct Connect</option>
                            <option value="Compare & Connect">Compare & Connect</option>
                         </select>
                      </div>
                      <div className="space-y-1">
                         <label className={labelClass}>Partner API Key</label>
                         <input 
                           type="text"
                           placeholder="e.g. MH_8ME_001" 
                           value={partners.utilitiesId}
                           onChange={e => setPartners({...partners, utilitiesId: e.target.value})}
                           className={inputClass}
                         />
                      </div>
                   </div>

                   <hr className="border-slate-200 mb-6" />

                   {/* Service Toggles Grid - THE MENU */}
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { key: 'electricity', label: 'Electricity', icon: '⚡', comm: '$50' },
                        { key: 'gas', label: 'Gas', icon: '🔥', comm: '$50' },
                        { key: 'internet', label: 'NBN / Internet', icon: '📶', comm: '$30' },
                        { key: 'payTv', label: 'Pay TV', icon: '📺', comm: '$20' },
                        { key: 'removals', label: 'Removals', icon: '🚚', comm: '$100' },
                        { key: 'cleaning', label: 'Cleaning', icon: '🧹', comm: '$25' },
                      ].map(s => (
                        <div key={s.key} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${services[s.key as keyof typeof services] ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                           <div className="flex items-center gap-2">
                              <span className="text-lg">{s.icon}</span>
                              <div className="flex flex-col">
                                 <span className={`text-xs font-bold ${services[s.key as keyof typeof services] ? 'text-indigo-900' : 'text-slate-500'}`}>{s.label}</span>
                                 <span className="text-[9px] font-medium text-emerald-600">Earns {s.comm}</span>
                              </div>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={services[s.key as keyof typeof services] as boolean}
                                onChange={(e) => setServices({...services, [s.key]: e.target.checked})}
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                           </label>
                        </div>
                      ))}
                   </div>

                   {/* Automation Toggle */}
                   <div className="mt-6 flex items-center space-x-3 bg-white p-4 rounded-xl border border-slate-100">
                      <input 
                        type="checkbox" 
                        checked={services.autoSend}
                        onChange={(e) => setServices({...services, autoSend: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                         <p className="text-sm font-bold text-slate-900">Auto-Send Welcome Pack</p>
                         <p className="text-xs text-slate-500">Automatically email these selected offers to tenants when a new lease is created.</p>
                      </div>
                   </div>
                </div>

                {/* 2. Insurance Integration */}
                <div className="p-6 border border-slate-200 bg-slate-50/50 rounded-[2rem]">
                   <div className="flex items-center space-x-2 mb-4">
                      <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-lg font-bold">🛡️</div>
                      <h4 className="font-bold text-slate-900">Landlord Insurance</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                         <label className={labelClass}>Provider</label>
                         <select 
                           value={partners.insuranceProvider}
                           onChange={e => setPartners({...partners, insuranceProvider: e.target.value})}
                           className={inputClass}
                         >
                            <option value="EBM RentCover">EBM RentCover</option>
                            <option value="Terri Scheer">Terri Scheer</option>
                         </select>
                      </div>
                      <div className="space-y-1">
                         <label className={labelClass}>Agency Referral ID</label>
                         <input 
                           type="text"
                           placeholder="e.g. REF-9988" 
                           value={partners.insuranceId}
                           onChange={e => setPartners({...partners, insuranceId: e.target.value})}
                           className={inputClass}
                         />
                      </div>
                   </div>
                </div>

                {/* Other Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* TrustSoft Card */}
                    <div className="p-6 border border-emerald-200 bg-emerald-50/30 rounded-[2rem] flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl">🏦</div>
                        <div>
                            <h4 className="font-bold text-slate-900">TrustSoft Bridge</h4>
                            <p className="text-xs text-slate-500">Bank feeds & reconciliation</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Connected</span>
                    </div>
                    </div>

                    {/* Gemini AI Card */}
                    <div className="p-6 border border-indigo-200 bg-indigo-50/30 rounded-[2rem] flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl">✨</div>
                        <div>
                            <h4 className="font-bold text-slate-900">Gemini 3 AI</h4>
                            <p className="text-xs text-slate-500">Generative content engine</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Active</span>
                    </div>
                    </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                 <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                 >
                   {loading ? 'Saving...' : 'Update Integrations'}
                 </button>
              </div>
            </div>
          )}

          {/* Data Sovereignty Tab */}
          {activeTab === 'data' && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in">
              <div className="flex items-center space-x-4 border-b border-slate-100 pb-6">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Data Sovereignty</h3>
                  <p className="text-sm text-slate-500">Bring Your Own Database (BYOD). Maintain full legal ownership.</p>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                    <h4 className="font-bold text-slate-900 mb-2">Storage Provider</h4>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setCloudConfig({ ...cloudConfig, enabled: false })}
                            className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${!cloudConfig.enabled ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                        >
                            Browser (Local)
                        </button>
                        <button 
                            onClick={() => setCloudConfig({ ...cloudConfig, enabled: true })}
                            className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${cloudConfig.enabled ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                        >
                            External Cloud
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {cloudConfig.enabled 
                            ? "Data will be read/written directly to your connected database." 
                            : "Data is stored securely within this browser instance. Clearing cache will lose data."}
                    </p>
                 </div>

                 {cloudConfig.enabled && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                        <div>
                            <label className={labelClass}>Cloud Service</label>
                            <select 
                                value={cloudConfig.provider}
                                onChange={(e) => setCloudConfig({ ...cloudConfig, provider: e.target.value as any })}
                                className={inputClass}
                            >
                                <option value="Supabase">Supabase (PostgreSQL)</option>
                                <option value="Firebase">Firebase (NoSQL)</option>
                                <option value="AWS">AWS RDS (via API Gateway)</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>API Endpoint URL</label>
                            <input 
                                type="url" 
                                placeholder="https://xyz.supabase.co"
                                value={cloudConfig.endpoint}
                                onChange={(e) => setCloudConfig({ ...cloudConfig, endpoint: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>API Key / Secret</label>
                            <input 
                                type="password" 
                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                                value={cloudConfig.apiKey}
                                onChange={(e) => setCloudConfig({ ...cloudConfig, apiKey: e.target.value })}
                                className={inputClass}
                            />
                        </div>

                        {/* Liability Disclaimer */}
                        <div className="mt-4 p-4 border border-amber-200 bg-amber-50 rounded-2xl">
                            <div className="flex items-start space-x-3">
                                <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                <div>
                                    <h5 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Liability Disclaimer</h5>
                                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                        By connecting an external database, you assume full responsibility as the <strong>Data Controller</strong>. 
                                        8ME Pty Ltd cannot recover lost data, manage backups, or secure your database credentials. 
                                        You agree to indemnify 8ME against any claims regarding data loss or breaches originating from your external storage.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-amber-200/50">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={liabilityAccepted}
                                        onChange={(e) => setLiabilityAccepted(e.target.checked)}
                                        className="w-5 h-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span className="text-xs font-bold text-amber-900">I accept full responsibility for data persistence and security.</span>
                                </label>
                            </div>
                        </div>
                    </div>
                 )}
              </div>

              <div className="flex justify-end pt-4">
                 <button 
                  onClick={handleSave}
                  disabled={loading || (cloudConfig.enabled && !liabilityAccepted)}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {loading ? 'Connecting...' : 'Save & Reload Database'}
                 </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsAddUserOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Add Team Member</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
               <div>
                  <label className={labelClass}>Full Name</label>
                  <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className={inputClass} />
               </div>
               <div>
                  <label className={labelClass}>Email Address</label>
                  <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className={inputClass} />
               </div>
               <div>
                  <label className={labelClass}>Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})} className={inputClass}>
                      <option value="Admin">Admin (Full Access)</option>
                      <option value="Manager">Manager (No Settings)</option>
                      <option value="Viewer">Viewer (Read Only)</option>
                  </select>
               </div>
               <button type="submit" className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700">Invite User</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
