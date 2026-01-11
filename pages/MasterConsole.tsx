
import React, { useState } from 'react';
import { Agency, UserAccount } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface MasterConsoleProps {
  onImpersonate: (agency: Agency) => void;
}

const MasterConsole: React.FC<MasterConsoleProps> = ({ onImpersonate }) => {
  const { role, resetLocalUserPassword } = useAuth();
  const [agencies, setAgencies] = useState<Agency[]>([
    { id: 'a1', name: 'Apex Real Estate', contactEmail: 'director@apex.com', status: 'Active', subscriptionPlan: 'Growth', usersCount: 4, licenseLimit: 5, propertiesCount: 145, joinedDate: '2023-11-01', mrr: 199.99 },
    { id: 'a2', name: 'Coastal Living', contactEmail: 'sarah@coastal.com', status: 'Trial', subscriptionPlan: 'Starter', usersCount: 1, licenseLimit: 1, propertiesCount: 12, joinedDate: '2024-05-10', mrr: 0 },
  ]);

  // Simulated Local Users (In reality, this would query the DB of the current instance)
  const localUsers: UserAccount[] = [
      { id: 'u1', name: 'Alex Manager', email: 'alex.manager@8me.com', role: 'Admin', status: 'Active', lastActive: 'Now' },
      { id: 'u2', name: 'Sarah Smith', email: 'sarah@8me.com', role: 'Manager', status: 'Active', lastActive: '2h ago' }
  ];

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAgency, setNewAgency] = useState({
    name: '',
    email: '',
    plan: 'Starter' as 'Starter' | 'Growth' | 'Enterprise'
  });

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
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
    setAgencies([...agencies, created]);
    setIsCreateModalOpen(false);
    setNewAgency({ name: '', email: '', plan: 'Starter' });
  };

  const handleResetPassword = async (email: string) => {
      if (confirm(`Are you sure you want to forcibly reset the password for ${email}?`)) {
          await resetLocalUserPassword(email);
          alert(`Password reset link sent to ${email} (Simulated).`);
      }
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
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 shadow-xl"
        >
          Provision New Agency
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total MRR</p>
            <p className="text-3xl font-black text-slate-900">${totalRevenue.toLocaleString()}</p>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Agencies</p>
            <p className="text-3xl font-black text-slate-900">{agencies.length}</p>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Users</p>
            <p className="text-3xl font-black text-slate-900">{agencies.reduce((acc, a) => acc + a.usersCount, 0)}</p>
         </div>
      </div>

      {/* Local User Override Section */}
      <div className="bg-rose-50 rounded-[2rem] border border-rose-100 shadow-sm overflow-hidden p-8">
          <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-rose-200 text-rose-700 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <div>
                  <h3 className="text-xl font-bold text-rose-900">Local User Override</h3>
                  <p className="text-xs text-rose-700">Manage accounts on this device instance.</p>
              </div>
          </div>
          
          <div className="bg-white rounded-xl border border-rose-100 overflow-hidden">
              <table className="w-full text-left">
                  <thead className="bg-rose-50/50 border-b border-rose-100">
                      <tr>
                          <th className="px-6 py-3 text-xs font-black uppercase text-rose-400 tracking-widest">User</th>
                          <th className="px-6 py-3 text-xs font-black uppercase text-rose-400 tracking-widest">Role</th>
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
                              <td className="px-6 py-4">
                                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">{user.role}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => handleResetPassword(user.email)}
                                    className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
                                  >
                                      Reset Password
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="px-8 py-6 border-b border-slate-100">
             <h3 className="font-bold text-slate-900">Provisioned Tenants</h3>
         </div>
         <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
               <tr>
                  <th className="px-8 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Agency</th>
                  <th className="px-8 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Plan</th>
                  <th className="px-8 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Status</th>
                  <th className="px-8 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Revenue</th>
                  <th className="px-8 py-4 text-xs font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
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
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${agency.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                           {agency.status}
                        </span>
                     </td>
                     <td className="px-8 py-4 font-mono text-sm font-bold text-slate-700">
                        ${agency.mrr}
                     </td>
                     <td className="px-8 py-4 text-right">
                        <button 
                           onClick={() => onImpersonate(agency)}
                           className="text-xs font-bold text-indigo-600 hover:underline"
                        >
                           Login As
                        </button>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)} />
           <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95">
              <h3 className="text-xl font-black text-slate-900 mb-6">Provision Agency</h3>
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
                    Create Tenant
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default MasterConsole;
