
import React, { useState, useMemo, useEffect } from 'react';
import { Property, InspectionFollowUp } from '../types';
import StatCard from '../components/StatCard';

interface TenanciesProps {
  properties: Property[];
  onSelectProperty: (prop: Property) => void;
  onEditProperty: (prop: Property) => void;
  onUpdateProperty: (prop: Property) => void;
  onNavigate?: (tab: string) => void;
}

const Tenancies: React.FC<TenanciesProps> = ({ properties, onSelectProperty, onEditProperty, onUpdateProperty, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'occupied' | 'vacant' | 'arrears'>('all');

  // Partner Settings State
  const [partnerSettings, setPartnerSettings] = useState<{utilitiesId?: string, utilitiesProvider?: string}>({});

  // Inspection Modal State
  const [inspectModal, setInspectModal] = useState<{isOpen: boolean, propId: string}>({isOpen: false, propId: ''});
  const [newDate, setNewDate] = useState('');
  
  // Follow-up Items State
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<InspectionFollowUp['category']>('Cleaning');

  // Connection Modal State
  const [connectModal, setConnectModal] = useState<{isOpen: boolean, type: 'missing' | 'success', tenant?: string, provider?: string}>({isOpen: false, type: 'missing'});

  // Load Partner Settings on Mount
  useEffect(() => {
    const saved = localStorage.getItem('proptrust_partner_settings');
    if (saved) {
        try {
            setPartnerSettings(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to load partner settings");
        }
    }
  }, []);

  // Intelligent filtering
  const filteredList = useMemo(() => {
    return properties.filter(p => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        p.tenantName?.toLowerCase().includes(searchLower) || 
        p.address.toLowerCase().includes(searchLower) ||
        p.ownerName.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      switch (filter) {
        case 'occupied': return !!p.tenantName;
        case 'vacant': return !p.tenantName;
        case 'arrears': return p.status === 'Arrears';
        default: return true;
      }
    });
  }, [properties, searchTerm, filter]);

  // Derived stats
  const totalOccupied = properties.filter(p => !!p.tenantName).length;
  const arrearsCount = properties.filter(p => p.status === 'Arrears').length;
  const vacancyRate = properties.length > 0 
    ? ((properties.filter(p => !p.tenantName).length / properties.length) * 100).toFixed(1) 
    : "0";

  const getStatusColor = (status: string) => {
    if (status === 'Arrears') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (status === 'Leased') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getInspectionStatus = (prop: Property) => {
    const date = prop.nextInspectionDate;
    const pendingItems = prop.inspectionFollowUps?.filter(i => i.status === 'Pending').length || 0;

    if (pendingItems > 0) {
        return { label: `⚠ ${pendingItems} Action Items`, classes: 'bg-amber-100 text-amber-700 border-amber-200 font-bold' };
    }

    if (!date) return { label: 'Not Set', classes: 'bg-slate-50 text-slate-400 border-slate-100' };
    const today = new Date();
    const target = new Date(date);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return { label: 'Overdue', classes: 'bg-rose-50 text-rose-600 border-rose-100' };
    if (diffDays < 14) return { label: `Due (${diffDays}d)`, classes: 'bg-indigo-50 text-indigo-600 border-indigo-100 animate-pulse' };
    return { label: target.toLocaleDateString('en-AU'), classes: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  };

  const openInspectModal = (prop: Property) => {
    const today = new Date().toISOString().split('T')[0];
    setNewDate(prop.nextInspectionDate || today);
    setInspectModal({isOpen: true, propId: prop.id});
    setNewItemDesc('');
  };

  const saveInspection = () => {
    const prop = properties.find(p => p.id === inspectModal.propId);
    if(prop && onUpdateProperty) {
        onUpdateProperty({...prop, nextInspectionDate: newDate});
    }
    alert("Date updated successfully.");
  };

  const completeInspection = () => {
    const prop = properties.find(p => p.id === inspectModal.propId);
    if(prop && onUpdateProperty) {
        const monthsToAdd = prop.propertyType === 'Commercial' ? 12 : 6;
        const d = new Date();
        d.setMonth(d.getMonth() + monthsToAdd);
        onUpdateProperty({...prop, nextInspectionDate: d.toISOString().split('T')[0]});
        alert(`Inspection completed.\n\nNext routine inspection auto-scheduled for ${d.toLocaleDateString()} (${monthsToAdd} months).`);
    }
    setInspectModal({isOpen: false, propId: ''});
  };

  const handleAddFollowUp = () => {
    if (!newItemDesc) return;
    const prop = properties.find(p => p.id === inspectModal.propId);
    if (!prop) return;

    const newItem: InspectionFollowUp = {
        id: `if-${Date.now()}`,
        description: newItemDesc,
        status: 'Pending',
        category: newItemCategory
    };

    const updatedFollowUps = [...(prop.inspectionFollowUps || []), newItem];
    onUpdateProperty({ ...prop, inspectionFollowUps: updatedFollowUps });
    setNewItemDesc('');
  };

  const toggleFollowUp = (itemId: string) => {
    const prop = properties.find(p => p.id === inspectModal.propId);
    if (!prop || !prop.inspectionFollowUps) return;

    const updatedFollowUps = prop.inspectionFollowUps.map(item => 
        item.id === itemId 
            ? { ...item, status: item.status === 'Pending' ? 'Completed' : 'Pending' as const } 
            : item
    );
    onUpdateProperty({ ...prop, inspectionFollowUps: updatedFollowUps });
  };

  const deleteFollowUp = (itemId: string) => {
    const prop = properties.find(p => p.id === inspectModal.propId);
    if (!prop || !prop.inspectionFollowUps) return;

    const updatedFollowUps = prop.inspectionFollowUps.filter(item => item.id !== itemId);
    onUpdateProperty({ ...prop, inspectionFollowUps: updatedFollowUps });
  };

  // --- MONETIZATION LOGIC (Improved) ---
  const handleConnectUtility = (e: React.MouseEvent, prop: Property) => {
    e.stopPropagation();

    if (!partnerSettings.utilitiesId) {
        setConnectModal({ isOpen: true, type: 'missing' });
        return;
    }

    // Prepare simulation
    setConnectModal({ 
        isOpen: true, 
        type: 'success', 
        tenant: prop.tenantName || 'Tenant', 
        provider: partnerSettings.utilitiesProvider || 'Movinghub' 
    });
  };

  const launchPortal = () => {
      // Simulate launching URL
      const url = "https://movinghub.com/refer?demo=true";
      window.open(url, '_blank');
      setConnectModal({ ...connectModal, isOpen: false });
  };

  const navigateToSettings = () => {
      if (onNavigate) {
          onNavigate('billing'); // Assuming 'billing' is the integrations tab ID
      }
      setConnectModal({ ...connectModal, isOpen: false });
  };

  // Get current modal property for dynamic text
  const activeModalProp = properties.find(p => p.id === inspectModal.propId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Tenancy Center</h2>
          <p className="text-slate-500">Managing {totalOccupied} tenants and monitoring portfolio health.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Active Occupants" 
          value={totalOccupied} 
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <StatCard 
          label="Arrears Alerts" 
          value={arrearsCount} 
          trend={arrearsCount > 0 ? "Requires Follow-up" : "All clear"}
          trendUp={arrearsCount === 0}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard 
          label="Portfolio Vacancy" 
          value={`${vacancyRate}%`} 
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        {/* Advanced Filter Bar */}
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
          <div className="relative flex-1 max-w-xl group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text" 
              placeholder="Search by Tenant Name, Address, or Asset ID..." 
              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-slate-900 shadow-sm placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center p-1.5 bg-slate-200/50 rounded-2xl">
            {(['all', 'occupied', 'vacant', 'arrears'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                  filter === f 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive List View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tenant Detail</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Services</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center text-slate-400 italic">No records found matching your current view.</td>
                </tr>
              ) : (
                filteredList.map((prop) => {
                  const inspection = getInspectionStatus(prop);
                  return (
                    <tr key={prop.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${prop.tenantName ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            {prop.tenantName ? prop.tenantName.charAt(0) : '?'}
                          </div>
                          <div>
                            {prop.tenantName ? (
                              <>
                                <p className="font-bold text-slate-900 text-base">{prop.tenantName}</p>
                                <p className="text-xs text-slate-400 font-medium truncate max-w-[200px]">{prop.address}</p>
                              </>
                            ) : (
                              <button 
                                onClick={() => onEditProperty(prop)}
                                className="text-indigo-600 font-bold text-sm hover:underline flex items-center"
                              >
                                Onboard Tenant
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex space-x-2">
                            {/* Inspection Button */}
                            <button 
                            onClick={(e) => { e.stopPropagation(); openInspectModal(prop); }}
                            title="View Condition Report Actions"
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-md ${inspection.classes}`}
                            >
                            {inspection.label}
                            </button>

                            {/* Revenue Generation Button (Monetization) */}
                            {prop.tenantName && (
                                <button
                                    onClick={(e) => handleConnectUtility(e, prop)}
                                    className="px-3 py-1.5 bg-gradient-to-r from-orange-400 to-rose-400 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-orange-200 transition-all active:scale-95 flex items-center gap-1"
                                    title="Earn commission by connecting utilities"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Connect
                                </button>
                            )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusColor(prop.status)}`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => onSelectProperty(prop)}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {inspectModal.isOpen && activeModalProp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setInspectModal({...inspectModal, isOpen: false})} />
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="text-xl font-bold text-slate-900">Inspection & Condition</h3>
                 <p className="text-xs text-slate-500 mt-1">{activeModalProp.address}</p>
               </div>
               <button onClick={() => setInspectModal({...inspectModal, isOpen: false})} className="text-slate-400 hover:text-slate-600">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
               {/* 1. Schedule Next Inspection */}
               <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-indigo-600 tracking-widest">Schedule</h4>
                  <div className="flex gap-4">
                    <input 
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900"
                    />
                    <button 
                        onClick={saveInspection}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all"
                    >
                        Update
                    </button>
                  </div>
               </div>

               <hr className="border-slate-100" />

               {/* 2. Outstanding Items List */}
               <div className="space-y-4">
                  <div className="flex justify-between items-end">
                     <h4 className="text-xs font-black uppercase text-amber-600 tracking-widest">Condition Report Actions</h4>
                     <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-lg font-bold">Items requiring renter to fix</span>
                  </div>

                  <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                     {(!activeModalProp.inspectionFollowUps || activeModalProp.inspectionFollowUps.length === 0) && (
                        <div className="p-6 text-center text-slate-400 text-xs italic">
                           No outstanding items. Property is in good condition.
                        </div>
                     )}
                     <div className="divide-y divide-slate-100">
                        {activeModalProp.inspectionFollowUps?.map((item) => (
                           <div key={item.id} className={`p-4 flex items-center justify-between transition-colors ${item.status === 'Completed' ? 'bg-slate-50 opacity-50' : 'bg-white'}`}>
                              <div className="flex items-center space-x-3">
                                 <button 
                                    onClick={() => toggleFollowUp(item.id)}
                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.status === 'Completed' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-indigo-500'}`}
                                 >
                                    {item.status === 'Completed' && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                 </button>
                                 <div>
                                    <p className={`text-sm font-bold ${item.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.description}</p>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.category}</span>
                                 </div>
                              </div>
                              <button onClick={() => deleteFollowUp(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Add New Item Input */}
                  <div className="flex gap-2">
                     <select 
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value as any)}
                        className="w-1/3 px-3 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-700"
                     >
                        <option value="Cleaning">Cleaning</option>
                        <option value="Damage">Damage</option>
                        <option value="Garden">Garden</option>
                        <option value="Other">Other</option>
                     </select>
                     <input 
                        type="text" 
                        placeholder="Add new action item (e.g. Clean Oven)..."
                        value={newItemDesc}
                        onChange={(e) => setNewItemDesc(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddFollowUp()}
                        className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 placeholder:font-normal"
                     />
                     <button 
                        onClick={handleAddFollowUp}
                        className="px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
                     >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                     </button>
                  </div>
               </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
               <button 
                   onClick={completeInspection}
                   className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   <span>Finalize Inspection & Re-schedule</span>
               </button>
               <p className="text-center text-[10px] text-slate-400 mt-3">This will mark current inspection as done and set next date for +{activeModalProp.propertyType === 'Commercial' ? '12' : '6'} months.</p>
            </div>
          </div>
        </div>
      )}

      {/* Integration Connect Modal */}
      {connectModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setConnectModal({...connectModal, isOpen: false})} />
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8 text-center">
             
             <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${connectModal.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {connectModal.type === 'success' ? (
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                ) : (
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                )}
             </div>

             <h3 className="text-xl font-bold text-slate-900 mb-2">
                {connectModal.type === 'success' ? 'Utility Connection' : 'Partner Not Configured'}
             </h3>
             
             <p className="text-sm text-slate-500 leading-relaxed mb-8">
                {connectModal.type === 'success' 
                    ? `Initiating connection referral for ${connectModal.tenant} via ${connectModal.provider}.`
                    : "You haven't entered your Movinghub or DirectConnect Partner ID yet. Add it to start earning commissions."
                }
             </p>

             <div className="space-y-3">
                {connectModal.type === 'success' ? (
                    <button 
                        onClick={launchPortal}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all active:scale-95"
                    >
                        Launch Portal
                    </button>
                ) : (
                    <button 
                        onClick={navigateToSettings}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95"
                    >
                        Go to Settings
                    </button>
                )}
                
                <button 
                    onClick={() => setConnectModal({...connectModal, isOpen: false})}
                    className="w-full py-3 bg-white text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600"
                >
                    Cancel
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tenancies;
