
import React, { useState, useEffect, useMemo } from 'react';
import { LogbookEntry, CalendarEvent } from '../types';
import { db } from '../services/db';
import { generateLogbookEntriesFromSchedule } from '../services/geminiService';
import StatCard from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';

interface LogbookProps {
    calendarEvents?: CalendarEvent[];
}

const Logbook: React.FC<LogbookProps> = ({ calendarEvents = [] }) => {
  const { user } = useAuth(); // Access user profile for office address
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Stats State
  const [vehicleName, setVehicleName] = useState('Audi Q5 (ABC-123)');
  const taxRate = 0.85; // Cents per km claim

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicle: 'Audi Q5 (ABC-123)',
    startOdo: 0,
    endOdo: 0,
    purpose: '',
    category: 'Business' as 'Business' | 'Private'
  });

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
                  Advanced features like AI Logbook generation and tax compliance tracking are only available in the full version.
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

  useEffect(() => {
    loadLogbook();
  }, []);

  const loadLogbook = async () => {
    setLoading(true);
    const data = await db.logbook.list();
    // Sort by date desc
    const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEntries(sorted);
    setLoading(false);
  };

  // Determine intelligent start odometer based on last entry
  const getLastEndOdo = () => {
    if (entries.length === 0) return 0;
    // Assuming entries are sorted desc, the first one is the latest
    return entries[0].endOdo;
  };

  const handleOpenModal = () => {
    const lastOdo = getLastEndOdo();
    setFormData({
        date: new Date().toISOString().split('T')[0],
        vehicle: vehicleName,
        startOdo: lastOdo,
        endOdo: lastOdo + 10, // Smart guess: minimum 10km trip
        purpose: '',
        category: 'Business'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const distance = formData.endOdo - formData.startOdo;
    if (distance <= 0) {
        alert("End odometer must be greater than start odometer.");
        return;
    }

    const newEntry: LogbookEntry = {
        id: `log-${Date.now()}`,
        date: formData.date,
        vehicle: formData.vehicle,
        startOdo: Number(formData.startOdo),
        endOdo: Number(formData.endOdo),
        distance: distance,
        purpose: formData.purpose,
        category: formData.category,
        driver: 'Current User' // Simplified
    };

    await db.logbook.add(newEntry);
    await loadLogbook();
    setIsModalOpen(false);
  };

  const handleSyncSchedule = async () => {
      // Find today's verified (checked out) events
      const today = new Date().toISOString().split('T')[0];
      
      const verifiedEvents = calendarEvents.filter(e => {
          return e.date === today && e.checkedOut;
      }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      if (verifiedEvents.length === 0) {
          alert("No verified (checked-out) appointments found for today.\n\nPlease go to Schedule and tick the 'Check-Out' box on your appointments first to confirm you attended them.");
          return;
      }

      setSyncing(true);
      try {
          // Get last odometer to continue sequence
          let currentOdo = getLastEndOdo();
          
          // Use the office address from profile settings, or default
          const startPoint = user?.officeAddress || 'Agency Office';

          // Call AI
          const aiEntries = await generateLogbookEntriesFromSchedule(verifiedEvents, startPoint);
          
          if (aiEntries.length > 0) {
              for (const entry of aiEntries) {
                  // Adjust AI estimated distance to consecutive odometer readings
                  const dist = Math.ceil(entry.distance);
                  const newLog: LogbookEntry = {
                      id: `log-ai-${Date.now()}-${Math.random()}`,
                      date: today,
                      vehicle: vehicleName,
                      startOdo: currentOdo,
                      endOdo: currentOdo + dist,
                      distance: dist,
                      purpose: entry.purpose,
                      category: 'Business',
                      driver: 'AI Auto-Log'
                  };
                  await db.logbook.add(newLog);
                  currentOdo += dist;
              }
              await loadLogbook();
              alert(`Success! Generated ${aiEntries.length} logbook entries based on your verified schedule starting from "${startPoint}".`);
          } else {
              alert("AI could not calculate a valid route. Please ensure appointments have valid addresses.");
          }
      } catch (e: any) {
          console.error("Logbook Sync Error:", e);
          
          // Robust check for Quota/429 errors from any level (SDK or Wrapper)
          const errorMsg = e?.message || JSON.stringify(e);
          const isQuota = e?.isQuotaError || errorMsg.toLowerCase().includes('quota') || errorMsg.includes('429');

          if (isQuota) {
              alert("Daily AI Quota Reached.\n\nThe system has hit the daily limit for the Gemini 3 Flash model. Please try again tomorrow or upgrade your API plan.");
          } else {
              alert("Failed to sync schedule. Please try again later.");
          }
      } finally {
          setSyncing(false);
      }
  };

  const handleExport = () => {
    const headers = "Date,Vehicle,Driver,Purpose,Category,Start Odo,End Odo,Distance (km)\n";
    const rows = entries.map(e => 
        `${e.date},${e.vehicle},${e.driver},"${e.purpose}",${e.category},${e.startOdo},${e.endOdo},${e.distance}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Logbook_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const togglePurposeTag = (tag: string) => {
    // Split by comma, trim whitespace, remove empty strings
    const currentTags = formData.purpose.split(',').map(s => s.trim()).filter(s => s);
    let newTags;
    
    if (currentTags.includes(tag)) {
        // Remove tag
        newTags = currentTags.filter(t => t !== tag);
    } else {
        // Add tag
        newTags = [...currentTags, tag];
    }
    
    setFormData({...formData, purpose: newTags.join(', ')});
  };

  // Calculations
  const totalKm = useMemo(() => entries.reduce((acc, e) => acc + (e.category === 'Business' ? e.distance : 0), 0), [entries]);
  const estClaim = totalKm * taxRate;
  const businessTrips = entries.filter(e => e.category === 'Business').length;

  const inputClass = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 bg-white placeholder:text-slate-400 transition-all";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Vehicle Logbook</h2>
                <p className="text-slate-500 mt-1">ATO Compliant travel records for {vehicleName}.</p>
            </div>
            <div className="flex space-x-3">
                {/* AI Sync Button */}
                <button 
                    onClick={handleSyncSchedule}
                    disabled={syncing}
                    title="Import verified (checked-out) appointments from today's Schedule"
                    className="px-4 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center gap-2"
                >
                    {syncing ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    )}
                    Import from Schedule
                </button>

                <button 
                    onClick={handleExport}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                >
                    Export CSV
                </button>
                <button 
                    onClick={handleOpenModal}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Log Trip
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
                label="Business Travel (FY)"
                value={`${totalKm.toLocaleString()} km`}
                trend="Tax Deductible"
                trendUp={true}
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>}
            />
            <StatCard 
                label="Estimated Claim"
                value={`$${estClaim.toLocaleString(undefined, {minimumFractionDigits: 2})}`}
                trend={`@ $${taxRate}/km`}
                trendUp={true}
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard 
                label="Total Trips"
                value={businessTrips}
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
               <h3 className="font-bold text-slate-900">Trip History</h3>
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{entries.length} Records</span>
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-white border-b border-slate-100">
                     <tr>
                        <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Date</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Purpose</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Category</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Odometer</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Distance</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {loading ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Loading records...</td></tr>
                     ) : entries.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No trips logged yet.</td></tr>
                     ) : (
                        entries.map(entry => (
                           <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-8 py-5 font-bold text-slate-700 text-sm">
                                 {new Date(entry.date).toLocaleDateString()}
                              </td>
                              <td className="px-8 py-5 font-bold text-slate-900 text-sm">
                                 {entry.purpose}
                                 {entry.driver === 'AI Auto-Log' && <span className="ml-2 text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Auto-Logged</span>}
                              </td>
                              <td className="px-8 py-5">
                                 <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${entry.category === 'Business' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {entry.category}
                                 </span>
                              </td>
                              <td className="px-8 py-5 text-right font-mono text-xs text-slate-500">
                                 {entry.startOdo} &rarr; {entry.endOdo}
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <span className="font-black text-slate-900 text-sm">{entry.distance} km</span>
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
        </div>

        {/* Add Trip Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsModalOpen(false)} />
                <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-6">Log New Trip</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className={labelClass}>Date</label>
                            <input 
                                type="date" 
                                required
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Vehicle</label>
                            <input 
                                type="text"
                                value={formData.vehicle}
                                onChange={e => { setFormData({...formData, vehicle: e.target.value}); setVehicleName(e.target.value); }}
                                className={inputClass}
                            />
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Odometer Reading</p>
                            <div className="flex items-center space-x-2 mb-3">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Start</label>
                                    <input 
                                        type="number"
                                        required
                                        value={formData.startOdo}
                                        onChange={e => setFormData({...formData, startOdo: Number(e.target.value)})}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900"
                                    />
                                </div>
                                <div className="text-slate-300 pt-4">&rarr;</div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">End</label>
                                    <input 
                                        type="number"
                                        required
                                        value={formData.endOdo}
                                        onChange={e => setFormData({...formData, endOdo: Number(e.target.value)})}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900"
                                    />
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-slate-500">Trip Distance: </span>
                                <span className="text-sm font-black text-indigo-600">
                                    {Math.max(0, formData.endOdo - formData.startOdo)} km
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Purpose</label>
                            <input 
                                type="text"
                                required
                                placeholder="e.g. Inspection, Key Collection"
                                value={formData.purpose}
                                onChange={e => setFormData({...formData, purpose: e.target.value})}
                                className={inputClass}
                            />
                            {/* Multi-Purpose Tags */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {['Inspection', 'Appraisal', 'Key Collection', 'Bank', 'Client Meeting', 'Signboard'].map(tag => {
                                    const isSelected = formData.purpose.split(',').map(s => s.trim()).includes(tag);
                                    return (
                                        <button 
                                            type="button"
                                            key={tag}
                                            onClick={() => togglePurposeTag(tag)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                                isSelected 
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Category</label>
                            <div className="flex p-1 bg-slate-100 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, category: 'Business'})}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.category === 'Business' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                                >
                                    Business
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, category: 'Private'})}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.category === 'Private' ? 'bg-slate-500 text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                                >
                                    Private
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all active:scale-95 mt-4"
                        >
                            Save Log
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default Logbook;
