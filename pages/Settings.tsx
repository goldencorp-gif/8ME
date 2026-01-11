
import React, { useState } from 'react';
import { UserProfile, UserAccount } from '../types';

interface SettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  users: UserAccount[];
  onUpdateUsers: (users: UserAccount[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ userProfile, onUpdateProfile, users, onUpdateUsers }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'billing' | 'integrations'>('profile');
  
  // Agency Config
  const [agencyDetails, setAgencyDetails] = useState({
    name: 'My Agency',
    subscriptionPlan: 'Growth',
    billingEmail: userProfile.email,
    paymentMethod: 'Visa ending 4242'
  });

  const handleSubscribe = (plan: string) => {
    setAgencyDetails(prev => ({ ...prev, subscriptionPlan: plan }));
    alert(`Switched to ${plan} plan successfully.`);
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

  const inputClass = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 bg-white";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-12">
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
               <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">Active: {agencyDetails.subscriptionPlan}</span>
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
                        <button onClick={() => handleSubscribe('Starter')} className="w-full mt-6 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50">Downgrade</button>
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
                            className={`w-full mt-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${agencyDetails.subscriptionPlan === 'Starter' ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                        >
                            {agencyDetails.subscriptionPlan === 'Starter' ? 'Upgrade' : 'Switch'}
                        </button>
                    )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-6">
             <h3 className="text-xl font-bold text-slate-900">External Connections</h3>
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
    </div>
  );
};

export default Settings;
