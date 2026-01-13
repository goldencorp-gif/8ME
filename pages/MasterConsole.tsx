
import React, { useState, useEffect } from 'react';
import { Agency, UserAccount } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';

interface MasterConsoleProps {
  onImpersonate: (agency: Agency) => void;
}

// Helper to hash manually issued passwords (Duplicate of AuthContext for component independence)
async function hashPassword(password: string): Promise<string> {
  // Fallback for non-secure contexts
  if (!window.crypto || !window.crypto.subtle) {
    return btoa(`fallback_hash_${password}`).split('').reverse().join('');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to generate secure random password
function generateSecurePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  // Check if crypto.getRandomValues is available
  if (window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(12);
      window.crypto.getRandomValues(array);
      for (let i = 0; i < 12; i++) {
        password += chars[array[i] % chars.length];
      }
  } else {
      // Fallback generator
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
  }
  return password;
}

const MasterConsole: React.FC<MasterConsoleProps> = ({ onImpersonate }) => {
  const { role, resetLocalUserPassword } = useAuth();
  
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [localUsers, setLocalUsers] = useState<UserAccount[]>([]);

  // Create Agency State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAgency, setNewAgency] = useState({
    name: '',
    email: '',
    password: '', 
    plan: 'Starter' as 'Starter' | 'Growth' | 'Enterprise'
  });

  // Edit Agency State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [editForm, setEditForm] = useState({
      name: '',
      email: '',
      plan: 'Starter' as 'Starter' | 'Growth' | 'Enterprise',
      status: 'Active' as Agency['status']
  });

  // Reset Credentials State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetData, setResetData] = useState({ email: '', newPassword: '' });

  useEffect(() => {
      // Load from Central Registry (Cloud Sim)
      db.centralRegistry.listAgencies().then(data => {
          if (data.length === 0) {
              // Seed initial data if empty
              const seeds: Agency[] = [
                { id: 'a1', name: 'Apex Real Estate', contactEmail: 'director@apex.com', status: 'Active', subscriptionPlan: 'Growth', usersCount: 4, licenseLimit: 5, propertiesCount: 145, joinedDate: '2023-11-01', mrr: 199.99 },
                { id: 'a2', name: 'Coastal Living', contactEmail: 'sarah@coastal.com', status: 'Trial', subscriptionPlan: 'Starter', usersCount: 1, licenseLimit: 1, propertiesCount: 12, joinedDate: '2024-05-10', mrr: 0 },
              ];
              setAgencies(seeds);
              // Persist seeds
              localStorage.setItem('proptrust_central_agencies', JSON.stringify(seeds));
          } else {
              setAgencies(data);
          }
      });

      // Load Local Users (Device)
      db.users.list().then(users => {
          setLocalUsers(users);
      });
  }, []);

  if (role !== 'Master') {
      return (
          <div className="flex items-center justify-center h-[60vh] flex-col text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900">Access Denied</h2>
              <p className="text-slate-500 mt-2">You do not have permission to view the Master Console.</p>
          </div>
      );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgency.password) {
        alert("A temporary password is required to issue credentials.");
        return;
    }

    try {
        const hash = await hashPassword(newAgency.password);

        const created: Agency = {
            id: `a-${Date.now()}`,
            name: newAgency.name,
            contactEmail: newAgency.email,
            status: 'Active',
            subscriptionPlan: newAgency.plan,
            usersCount: 1,
            licenseLimit: newAgency.plan === 'Starter' ? 1 : 5,
            propertiesCount: 0,
            joinedDate: new Date().toISOString().split('T')[0],
            mrr: newAgency.plan === 'Starter' ? 54.99 : newAgency.plan === 'Growth' ? 199.99 : 1688.00
        };

        // Save to Central Registry
        await db.centralRegistry.registerAgency(created, hash);
        
        // Update Local State
        setAgencies([...agencies, created]);
        setIsCreateModalOpen(false);
        
        // Store creds temporarily to show alert
        const createdPass = newAgency.password;
        setNewAgency({ name: '', email: '', password: '', plan: 'Starter' });
        
        alert(`Account Created!\n\nAgency: ${created.name}\nUser: ${created.contactEmail}\nPass: ${createdPass}\n\nEmail these credentials to the client.`);
    } catch (e) {
        alert("Failed to issue credentials. Check console.");
        console.error(e);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingAgency) return;

      const updates = {
          name: editForm.name,
          contactEmail: editForm.email,
          subscriptionPlan: editForm.plan,
          status: editForm.status,
          // Recalculate limits/MRR based on plan
          licenseLimit: editForm.plan === 'Starter' ? 1 : 5,
          mrr: editForm.plan === 'Starter' ? 54.99 : editForm.plan === 'Growth' ? 199.99 : 1688.00
      };

      await db.centralRegistry.updateAgencyDetails(editingAgency.id, updates);
      
      setAgencies(prev => prev.map(a => a.id === editingAgency.id ? { ...a, ...updates } : a));
      setIsEditModalOpen(false);
      setEditingAgency(null);
      alert(`Agency '${updates.name}' updated successfully.`);
  };

  const openEditModal = (agency: Agency) => {
      setEditingAgency(agency);
      setEditForm({
          name: agency.name,
          email: agency.contactEmail,
          plan: agency.subscriptionPlan,
          status: agency.status
      });
      setIsEditModalOpen(true);
  };

  const handleStatusChange = async (agency: Agency, newStatus: Agency['status']) => {
      await db.centralRegistry.updateStatus(agency.contactEmail, newStatus);
      setAgencies(prev => prev.map(a => a.id === agency.id ? { ...a, status: newStatus } : a));
  };

  const openResetModal = (email: string) => {
      setResetData({ email, newPassword: generateSecurePassword() });
      setIsResetModalOpen(true);
  };

  const submitCentralReset = async () => {
      try {
        const hash = await hashPassword(resetData.newPassword);
        await db.centralRegistry.updateCredentials(resetData.email, hash);
        alert(`Password Reset Successful for ${resetData.email}\n\nNew Temporary Password: ${resetData.newPassword}`);
        setIsResetModalOpen(false);
      } catch (e) {
        alert("Error resetting password.");
        console.error(e);
      }
  };

  const handleResetLocalPassword = async (email: string) => {
      // Use window.confirm explicitly to avoid namespace collisions and ensure it fires
      const confirmed = window.confirm(`MASTER OVERRIDE:\n\nAre you sure you want to forcibly reset the password for ${email}?`);
      
      if (confirmed) {
          try {
            await resetLocalUserPassword(email);
            alert(`Password has been reset for ${email} to: reset123`);
          } catch (e) {
            alert("Unexpected error calling reset function. Check console.");
            console.error(e);
          }
      }
  };

  const handleExportRegistry = async () => {
      const json = await db.centralRegistry.exportRegistry();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `8me_registry_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const calculatedMrr = newAgency.plan === 'Starter' ? 54.99 : newAgency.plan === 'Growth' ? 199.99 : 1688.00;
  const listingCap = newAgency.plan === 'Starter' ? 50 : newAgency.plan === 'Growth' ? 200 : 'Unlimited';
  const totalRevenue = agencies.reduce((acc, a) => acc + a.mrr, 0);

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-3xl font-black text-slate-900">Master Console</h2>
           <p className="text-slate-500">Super Admin Controls</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={handleExportRegistry}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-slate-50 shadow-sm flex items-center gap-2"
                title="Download Database for Cross-Browser Sync"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export DB
            </button>
            <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 shadow-xl"
            >
            Create Account
            </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total MRR</p>
            <p className="text-3xl font-black text-slate-900">${totalRevenue.toLocaleString()}</p>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Agencies</p>
            <p className="text-3xl font-black text-slate-900">{agencies.filter(a => a.status === 'Active').length}</p>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Suspended / Paused</p>
            <p className="text-3xl font-black text-rose-600">{agencies.filter(a => a.status !== 'Active').length}</p>
         </div>
      </div>

      {/* Agency Management Table */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="px-8 py-6 border-b border-slate-100">
             <h3 className="font-bold text-slate-900">Central Agency Registry</h3>
         </div>
         <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
               <tr>
                  <th className="px-8 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Agency</th>
                  <th className="px-8 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Plan</th>
                  <th className="px-8 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Status</th>
                  <th className="px-8 py-4 text-xs font-black uppercase text-slate-400 tracking-widest text-right">Access Control</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {agencies.map(agency => (
                  <tr key={agency.id} className="hover:bg-slate-50">
                     <td className="px-8 py-4">
                        <p className="font-bold text-slate-900">{agency.name}</p>
                        <p className="text-xs text-slate-500">{agency.contactEmail}</p>
                     </td>
                     <td className="px-8 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${agency.subscriptionPlan === 'Growth' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                           {agency.subscriptionPlan}
                        </span>
                     </td>
                     <td className="px-8 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest 
                            ${agency.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 
                              agency.status === 'Paused' ? 'bg-amber-100 text-amber-600' : 
                              'bg-rose-100 text-rose-600'}`}>
                           {agency.status}
                        </span>
                     </td>
                     <td className="px-8 py-4 text-right flex justify-end gap-2">
                        {/* Edit Button */}
                        <button 
                            onClick={() => openEditModal(agency)}
                            className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Account Details"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>

                        {/* Credential Recovery Button */}
                        <button 
                            onClick={() => openResetModal(agency.contactEmail)}
                            className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Reset Password"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        </button>

                        {agency.status === 'Active' ? (
                            <>
                                <button 
                                onClick={() => handleStatusChange(agency, 'Paused')}
                                className="px-3 py-1.5 border border-amber-200 text-amber-600 rounded-lg text-[10px] font-bold uppercase hover:bg-amber-50"
                                >
                                Pause
                                </button>
                                <button 
                                onClick={() => handleStatusChange(agency, 'Suspended')}
                                className="px-3 py-1.5 border border-rose-200 text-rose-600 rounded-lg text-[10px] font-bold uppercase hover:bg-rose-50"
                                >
                                Suspend
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => handleStatusChange(agency, 'Active')}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-700 shadow-sm"
                            >
                                Reactivate
                            </button>
                        )}
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>

      {/* Local User Override Section (Device Specific) */}
      <div className="bg-rose-50 rounded-[2rem] border border-rose-100 shadow-sm overflow-hidden p-8 opacity-70 hover:opacity-100 transition-opacity">
          <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-rose-200 text-rose-700 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <div>
                  <h3 className="text-xl font-bold text-rose-900">Local Device Override</h3>
                  <p className="text-xs text-rose-700">Emergency reset for cached credentials on this physical machine.</p>
              </div>
          </div>
          
          <div className="bg-white rounded-xl border border-rose-100 overflow-hidden">
              {localUsers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic text-sm">
                      No local users found on this device.
                  </div>
              ) : (
                  <table className="w-full text-left">
                      <thead className="bg-rose-50/50 border-b border-rose-100">
                          <tr>
                              <th className="px-6 py-3 text-xs font-black uppercase text-rose-400 tracking-widest">Local User</th>
                              <th className="px-6 py-3 text-xs font-black uppercase text-rose-400 tracking-widest text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-50">
                          {localUsers.map(user => (
                              <tr key={user.id}>
                                  <td className="px-6 py-4">
                                      <p className="font-bold text-slate-900">{user.name}</p>
                                      <p className="text-xs text-slate-500">{user.email}</p>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <button 
                                        onClick={() => handleResetLocalPassword(user.email)}
                                        className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
                                      >
                                          Reset Local Pass
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              )}
          </div>
      </div>

      {/* Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)} />
           <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95">
              <h3 className="text-xl font-black text-slate-900 mb-6">Create New Client Account</h3>
              <p className="text-xs text-slate-500 mb-6">Manually generate an account and credentials for a new agency.</p>
              <form onSubmit={handleCreate} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Agency Name</label>
                    <input 
                       required 
                       type="text" 
                       value={newAgency.name}
                       onChange={(e) => setNewAgency({...newAgency, name: e.target.value})}
                       className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Admin Email</label>
                    <input 
                       required 
                       type="email" 
                       value={newAgency.email}
                       onChange={(e) => setNewAgency({...newAgency, email: e.target.value})}
                       className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Access Credentials (Password)</label>
                    <div className="flex gap-2">
                        <input 
                        required 
                        type="text" 
                        value={newAgency.password}
                        onChange={(e) => setNewAgency({...newAgency, password: e.target.value})}
                        className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900"
                        placeholder="e.g. Welcome2024!"
                        />
                        <button 
                            type="button"
                            onClick={() => setNewAgency({...newAgency, password: generateSecurePassword()})}
                            className="px-3 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200"
                            title="Auto-Generate Secure Password"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Subscription Plan</label>
                    <select 
                       value={newAgency.plan}
                       onChange={(e) => setNewAgency({...newAgency, plan: e.target.value as any})}
                       className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                       <option value="Starter">Starter</option>
                       <option value="Growth">Growth</option>
                       <option value="Enterprise">Enterprise</option>
                    </select>
                 </div>

                 {/* Pricing & Limits Preview */}
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-500">Base Plan</span>
                        <span className="text-xs font-bold text-slate-900">
                            {newAgency.plan === 'Starter' ? '$54.99' : newAgency.plan === 'Growth' ? '$199.99' : '$1,688'}
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
                            + ${(calculatedMrr - (newAgency.plan === 'Starter' ? 54.99 : newAgency.plan === 'Growth' ? 199.99 : 1688)).toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-black uppercase text-indigo-600 tracking-widest">Total Monthly</span>
                        <span className="text-xl font-black text-indigo-600">${calculatedMrr.toFixed(2)}</span>
                    </div>
                 </div>

                 <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all active:scale-95 mt-4">
                    Generate Account
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Edit Agency Modal */}
      {isEditModalOpen && editingAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)} />
           <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95">
              <h3 className="text-xl font-black text-slate-900 mb-6">Edit Account Details</h3>
              <form onSubmit={handleUpdate} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Agency Name</label>
                    <input 
                       type="text" 
                       value={editForm.name}
                       onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                       className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Admin Email</label>
                    <input 
                       type="email" 
                       value={editForm.email}
                       onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                       className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                    <select 
                       value={editForm.status}
                       onChange={(e) => setEditForm({...editForm, status: e.target.value as any})}
                       className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                       <option value="Active">Active</option>
                       <option value="Paused">Paused</option>
                       <option value="Suspended">Suspended</option>
                       <option value="Trial">Trial</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Subscription Plan</label>
                    <select 
                       value={editForm.plan}
                       onChange={(e) => setEditForm({...editForm, plan: e.target.value as any})}
                       className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                       <option value="Starter">Starter (1 User, 50 Props)</option>
                       <option value="Growth">Growth (5 Users, 200 Props)</option>
                       <option value="Enterprise">Enterprise (Unlimited)</option>
                    </select>
                 </div>

                 <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all active:scale-95 mt-4">
                    Save Changes
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Central Password Reset Modal */}
      {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsResetModalOpen(false)} />
            <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Reset Agency Password</h3>
                <p className="text-xs text-slate-500 mb-6">Generating new temporary credential for <span className="font-bold text-slate-700">{resetData.email}</span>.</p>
                
                <div className="bg-slate-100 p-4 rounded-xl mb-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">New Temporary Password</p>
                    <div className="flex items-center justify-center gap-2">
                        <p className="text-lg font-mono font-bold text-slate-900">{resetData.newPassword}</p>
                        <button 
                            onClick={() => setResetData({ ...resetData, newPassword: generateSecurePassword() })}
                            className="text-indigo-600 hover:text-indigo-800"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setIsResetModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50">Cancel</button>
                    <button onClick={submitCentralReset} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-amber-600 shadow-xl shadow-amber-200">Confirm Reset</button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default MasterConsole;
