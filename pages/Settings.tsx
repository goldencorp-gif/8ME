import React, { useState, useEffect } from 'react';
import { UserProfile, UserAccount } from '../types';
import { db } from '../services/db';
import { getStripeConfig } from '../services/stripeService';

interface SettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  users: UserAccount[];
  onUpdateUsers: (users: UserAccount[]) => void;
}

// Helper to hash password (client-side simulation matching AuthContext/MasterConsole)
async function hashPassword(password: string): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    return btoa(`fallback_hash_${password}`).split('').reverse().join('');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const Settings: React.FC<SettingsProps> = ({ userProfile, onUpdateProfile, users, onUpdateUsers }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'billing' | 'integrations'>('profile');
  
  // Agency Config
  const [agencyDetails, setAgencyDetails] = useState({
    name: 'My Agency',
    subscriptionPlan: (userProfile.plan || 'Trial') as 'Trial' | 'Starter' | 'Growth' | 'Enterprise',
    billingEmail: userProfile.email,
    paymentMethod: 'Visa ending 4242'
  });

  // AI API Key State
  const [aiApiKey, setAiApiKey] = useState('');

  // Payment & Activation State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<'Starter' | 'Growth' | 'Enterprise' | null>(null);
  const [activationKey, setActivationKey] = useState('');
  const [stripeLinks, setStripeLinks] = useState({ starter: '', growth: '', enterprise: '' });
  const [isActivating, setIsActivating] = useState(false);

  // Load Settings on Mount
  useEffect(() => {
    const saved = localStorage.getItem('proptrust_agency_settings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setAgencyDetails(prev => ({ ...prev, ...parsed }));
            if (parsed.aiApiKey) setAiApiKey(parsed.aiApiKey);
        } catch (e) {
            // Ignore error
        }
    }
    // Ensure local state matches authenticated user profile plan
    if (userProfile.plan) {
        setAgencyDetails(prev => ({ ...prev, subscriptionPlan: userProfile.plan! }));
    }

    // Load Stripe Links
    getStripeConfig().then(config => {
        setStripeLinks({
            starter: config.starterLink,
            growth: config.growthLink,
            enterprise: config.enterpriseLink
        });
    });
  }, [userProfile.plan]);

  const handleSaveApiKey = () => {
      const currentSettings = JSON.parse(localStorage.getItem('proptrust_agency_settings') || '{}');
      const updatedSettings = { ...currentSettings, aiApiKey };
      localStorage.setItem('proptrust_agency_settings', JSON.stringify(updatedSettings));
      alert("AI API Key saved successfully.");
  };

  const handleSubscribe = (plan: 'Trial' | 'Starter' | 'Growth' | 'Enterprise') => {
    if (plan === 'Trial') return; // Cannot switch back to Trial manually
    setPendingPlan(plan as 'Starter' | 'Growth' | 'Enterprise');
    setShowPaymentModal(true);
    setActivationKey('');
  };

  const handleActivatePlan = async () => {
      if (!activationKey) {
          alert("Please enter the Activation Key sent to your email.");
          return;
      }
      setIsActivating(true);

      try {
          // 1. Hash the input key to match stored credentials
          const hash = await hashPassword(activationKey);
          
          // 2. Check Central Registry for this user's email
          // The Admin must have created the agency record in Master Console with this key
          const agency = await db.centralRegistry.getAgencyByEmail(userProfile.email);

          if (agency && agency.passwordHash === hash) {
              // 3. Verify the plan matches (or just upgrade them to whatever the Admin set)
              const newPlan = agency.subscriptionPlan;
              
              if (pendingPlan && newPlan !== pendingPlan) {
                  // If Admin set a different plan than clicked, warn but allow
                  console.warn(`Plan mismatch. User selected ${pendingPlan}, Admin issued ${newPlan}. Upgrading to ${newPlan}.`);
              }

              // 4. Update Local Settings
              setAgencyDetails(prev => ({ ...prev, subscriptionPlan: newPlan }));
              
              // 5. Update User Profile to Unlock Features
              onUpdateProfile({
                  ...userProfile,
                  plan: newPlan
              });

              setShowPaymentModal(false);
              setPendingPlan(null);
              setActivationKey('');
              alert(`Activation Successful! Your agency is now on the ${newPlan} plan.`);
          } else {
              alert("Invalid Activation Key. Please ensure payment is confirmed and you are using the key emailed by support.");
          }
      } catch (error) {
          console.error(error);
          alert("An error occurred during activation.");
      } finally {
          setIsActivating(false);
      }
  };

  const handleEditUser = (user: UserAccount) => {
      const newName = prompt("Edit Team Member Name:", user.name);
      if (newName !== null) {
          const newRole = prompt("Edit Role (Admin, Manager, Viewer):", user.role);
          if (newRole) {
              const updatedUsers = users.map(u => 
                  u.id === user.id ? { ...u, name: newName, role: newRole as any } : u
              );
              onUpdateUsers(updatedUsers);
              // In real app, sync to DB here
          }
      }
  };

  // Helper to safely open external links in PWA/Webview/Browser
  const openExternalLink = (url: string) => {
    // Force new window to avoid X-Frame-Options: DENY from Google
    // 'noopener,noreferrer' is critical for security and to force a new process
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    
    // Fallback if popup blocker catches it
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        alert(`Please visit the following URL in your browser:\n\n${url}`);
    }
  };

  const inputClass = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 bg-white placeholder:text-slate-400";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-12 relative">
      <h2 className="text-3xl font-bold text-slate-900">Settings</h2>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {['profile', 'team', 'billing', 'integrations'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-lg">
            <h3 className="text-xl font-bold text-slate-900">Personal Profile</h3>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
              <input 
                type="text" 
                value={userProfile.name} 
                onChange={(e) => onUpdateProfile({...userProfile, name: e.target.value})}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Job Title</label>
              <input 
                type="text" 
                value={userProfile.title} 
                onChange={(e) => onUpdateProfile({...userProfile, title: e.target.value})}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Office Address</label>
              <p className="text-[10px] text-slate-400 mb-2">Used as the start/end point for AI Logbook calculations.</p>
              <input 
                type="text" 
                value={userProfile.officeAddress || ''} 
                onChange={(e) => onUpdateProfile({...userProfile, officeAddress: e.target.value})}
                className={inputClass}
                placeholder="e.g. 123 Business St, Sydney NSW 2000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input 
                type="email" 
                value={userProfile.email} 
                readOnly
                className={`${inputClass} bg-slate-100 text-slate-500 cursor-not-allowed`}
              />
            </div>
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">Save Changes</button>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Agency Team</h3>
                <p className="text-sm text-slate-500">Manage access for your staff.</p>
              </div>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-700">Invite User</button>
            </div>
            
            <div className="divide-y divide-slate-100">
              {users.map(u => (
                <div key={u.id} className="py-4 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">{u.name.charAt(0)}</div>
                    <div>
                      <p className="font-bold text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${u.role === 'Admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                    <button 
                        onClick={() => handleEditUser(u)}
                        className="text-slate-400 hover:text-indigo-600 text-xs font-bold px-3 py-1 hover:bg-slate-50 rounded transition-colors"
                    >
                        Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-8">
             <div className="flex justify-between items-start">
               <div>
                 <h3 className="text-xl font-bold text-slate-900">Subscription Plan</h3>
                 <p className="text-slate-500 text-sm mt-1">Manage your agency's billing tier.</p>
               </div>
               <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${agencyDetails.subscriptionPlan === 'Trial' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                   Active: {agencyDetails.subscriptionPlan}
               </span>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Starter */}
                <div className={`p-6 rounded-2xl border transition-all ${agencyDetails.subscriptionPlan === 'Starter' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 bg-white'}`}>
                    <h5 className="font-black text-lg text-slate-900">Starter</h5>
                    <p className="text-3xl font-bold text-slate-900 mt-2">$54.99<span className="text-sm text-slate-400 font-medium">/mo</span></p>
                    <ul className="mt-4 space-y-2 text-xs text-slate-600 font-medium">
                        <li className="flex items-center">✓ 50 Properties</li>
                        <li className="flex items-center">✓ 1 User Seat</li>
                        <li className="flex items-center">✓ Basic Support</li>
                    </ul>
                    {agencyDetails.subscriptionPlan === 'Starter' ? (
                        <button disabled className="w-full mt-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest opacity-50 cursor-default">Current Plan</button>
                    ) : (
                        <button 
                            onClick={() => handleSubscribe('Starter')} 
                            className="w-full mt-6 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50"
                        >
                            {agencyDetails.subscriptionPlan === 'Trial' ? 'Activate Plan' : 'Downgrade'}
                        </button>
                    )}
                </div>

                {/* Growth */}
                <div className={`p-6 rounded-2xl border transition-all relative ${agencyDetails.subscriptionPlan === 'Growth' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 bg-white'}`}>
                    {agencyDetails.subscriptionPlan !== 'Growth' && <div className="absolute top-0 right-0 bg-indigo-100 text-indigo-700 text-[9px] font-bold px-2 py-1 rounded-bl-xl uppercase tracking-widest">Popular</div>}
                    <h5 className="font-black text-lg text-slate-900">Growth</h5>
                    <p className="text-3xl font-bold text-slate-900 mt-2">$199.99<span className="text-sm text-slate-400 font-medium">/mo</span></p>
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
                            className={`w-full mt-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${agencyDetails.subscriptionPlan === 'Starter' || agencyDetails.subscriptionPlan === 'Trial' ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                        >
                            {agencyDetails.subscriptionPlan === 'Starter' || agencyDetails.subscriptionPlan === 'Trial' ? 'Upgrade' : 'Switch'}
                        </button>
                    )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-6">
             <h3 className="text-xl font-bold text-slate-900">External Connections</h3>
             
             {/* Google Gemini AI Configuration */}
             <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl">🧠</div>
                        <div>
                            <h4 className="font-bold text-slate-900">Google Gemini AI</h4>
                            <p className="text-xs text-slate-500">Power the AI Assistant, Smart Invoice, and Logistics features.</p>
                        </div>
                    </div>
                    {aiApiKey && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded uppercase tracking-widest">Active</span>}
                </div>
                <div className="bg-white p-4 rounded-xl border border-indigo-100">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">API Key</label>
                    <div className="flex gap-2">
                        <input 
                            type="password" 
                            value={aiApiKey}
                            onChange={(e) => setAiApiKey(e.target.value)}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Enter your Gemini API Key"
                        />
                        <button 
                            onClick={handleSaveApiKey}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 shadow-sm"
                        >
                            Save
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
                        <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Gemini 3 Flash is currently free. 
                          <button 
                            onClick={() => openExternalLink("https://aistudio.google.com/app/apikey")} 
                            className="text-indigo-600 underline font-bold hover:text-indigo-800 ml-1"
                          >
                            Get your free API Key here
                          </button>.
                        </span>
                    </p>
                </div>
             </div>

             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                   <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl">⚡</div>
                   <div>
                      <h4 className="font-bold text-slate-900">Utility Connect</h4>
                      <p className="text-xs text-slate-500">Partner: Movinghub / DirectConnect</p>
                   </div>
                </div>
                <button className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white">Configure</button>
             </div>
             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                   <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl">🏦</div>
                   <div>
                      <h4 className="font-bold text-slate-900">Macquarie DEFT</h4>
                      <p className="text-xs text-slate-500">Payment Gateway</p>
                   </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded uppercase tracking-widest">Active</span>
             </div>
          </div>
        )}
      </div>

      {/* Payment / Activation Modal */}
      {showPaymentModal && pendingPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md animate-in fade-in" onClick={() => setShowPaymentModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 flex flex-col items-center text-center">
             
             <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
             </div>

             <h3 className="text-2xl font-black text-slate-900 mb-2">Activate {pendingPlan}</h3>
             <p className="text-sm text-slate-500 mb-8 max-w-xs">To upgrade your agency to the {pendingPlan} plan, please complete the payment securely.</p>

             <div className="w-full space-y-6">
                {/* Step 1: Payment */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Step 1: Payment</p>
                   <a 
                     href={pendingPlan === 'Starter' ? stripeLinks.starter : pendingPlan === 'Growth' ? stripeLinks.growth : stripeLinks.enterprise} 
                     target="_blank"
                     rel="noopener noreferrer"
                     className="block w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                   >
                     Pay via Stripe &rarr;
                   </a>
                </div>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-bold uppercase tracking-widest">Then</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Step 2: Activation */}
                <div className="text-left">
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Step 2: Enter Activation Key</label>
                   <input 
                      type="password"
                      value={activationKey}
                      onChange={(e) => setActivationKey(e.target.value)}
                      placeholder="Paste key sent to your email..."
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-900 mb-3"
                   />
                   <button 
                      onClick={handleActivatePlan}
                      disabled={isActivating || !activationKey}
                      className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      {isActivating ? 'Verifying...' : 'Unlock Full Access'}
                   </button>
                </div>
             </div>

             <button onClick={() => setShowPaymentModal(false)} className="mt-6 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
