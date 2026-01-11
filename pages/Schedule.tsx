
import React, { useState, useMemo } from 'react';
import { Property, MaintenanceTask, CalendarEvent } from '../types';
import { generateEntryNotice } from '../services/geminiService';
import ScheduleAssistant from '../components/ScheduleAssistant';

interface ScheduleProps {
  properties?: Property[];
  maintenanceTasks?: MaintenanceTask[];
  manualEvents: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
}

const Schedule: React.FC<ScheduleProps> = ({ properties = [], maintenanceTasks = [], manualEvents, onAddEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  
  // Custom Sort Order (Event IDs)
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  // Notice State
  const [noticeDraft, setNoticeDraft] = useState('');
  const [loadingNotice, setLoadingNotice] = useState(false);
  const [selectedNoticeEvent, setSelectedNoticeEvent] = useState<CalendarEvent | null>(null);
  
  // New Event Form State
  const [newEvent, setNewEvent] = useState<{
    title: string;
    type: CalendarEvent['type'];
    time: string;
    description: string;
    propertyId: string;
  }>({
    title: '',
    type: 'Viewing',
    time: '09:00',
    description: '',
    propertyId: ''
  });

  // Helper to get YYYY-MM-DD in local time
  const formatDateKey = (date: Date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const saveManualEvent = () => {
    const prop = properties.find(p => p.id === newEvent.propertyId);
    const dateStr = formatDateKey(selectedDate);
    
    const event: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: newEvent.title,
      date: dateStr,
      time: newEvent.time,
      type: newEvent.type,
      description: newEvent.description,
      propertyAddress: prop ? prop.address : 'General Appointment'
    };

    onAddEvent(event);
    setIsModalOpen(false);
    setNewEvent({ title: '', type: 'Viewing', time: '09:00', description: '', propertyId: '' });
  };

  // Merge Automated Data with Manual Events
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [...manualEvents];

    properties.forEach(p => {
      if (p.nextInspectionDate) {
        events.push({
          id: `auto-insp-${p.id}`,
          title: 'Routine Inspection',
          date: p.nextInspectionDate,
          type: 'Inspection',
          propertyAddress: p.address,
          description: `Scheduled routine inspection for tenant: ${p.tenantName || 'Vacant'}`
        });
      }
      if (p.leaseEnd) {
        events.push({
          id: `auto-lease-${p.id}`,
          title: 'Lease Expiry',
          date: p.leaseEnd,
          type: 'Lease',
          propertyAddress: p.address,
          description: 'Current lease agreement concludes today.'
        });
      }
    });

    maintenanceTasks.forEach(t => {
      events.push({
        id: `auto-maint-${t.id}`,
        title: `Maint: ${t.priority}`,
        date: t.requestDate,
        type: 'Maintenance',
        propertyAddress: t.propertyAddress,
        description: `${t.issue} (${t.status})`
      });
    });

    return events;
  }, [properties, maintenanceTasks, manualEvents]);

  // Identify Compliance Actions (Inspections in next 14 days)
  const upcomingInspections = useMemo(() => {
    const today = new Date();
    const twoWeeks = new Date();
    twoWeeks.setDate(today.getDate() + 14);

    return allEvents.filter(ev => {
      if (ev.type !== 'Inspection') return false;
      const evDate = new Date(ev.date);
      return evDate >= today && evDate <= twoWeeks;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allEvents]);

  const handleDraftNotice = async (event: CalendarEvent) => {
    setSelectedNoticeEvent(event);
    setLoadingNotice(true);
    setIsNoticeModalOpen(true);
    
    // Find Tenant Name from description or property list
    const tenantName = event.description?.includes('tenant:') 
        ? event.description.split('tenant:')[1].trim() 
        : 'Tenant';

    const text = await generateEntryNotice(tenantName, event.propertyAddress || 'the property', event.date);
    setNoticeDraft(text || 'Error generating notice.');
    setLoadingNotice(false);
  };

  const handleSendNotice = () => {
    // Mock send
    alert(`Notice sent successfully to tenant at ${selectedNoticeEvent?.propertyAddress}`);
    setIsNoticeModalOpen(false);
    setNoticeDraft('');
    setSelectedNoticeEvent(null);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
    
    const days: (Date | null)[] = [];
    // Pad start
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Fill days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    // Pad end for complete grid appearance (min 35 cells, max 42)
    const totalSlots = days.length > 35 ? 42 : 35;
    while (days.length < totalSlots) {
      days.push(null);
    }
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = formatDateKey(date);
    return allEvents.filter(e => e.date === dateStr);
  };

  const rawSelectedDayEvents = getEventsForDate(selectedDate);
  
  // Apply Custom Sort if available
  const selectedDayEvents = useMemo(() => {
    if (customOrder.length > 0) {
      // Sort based on index in customOrder array
      return [...rawSelectedDayEvents].sort((a, b) => {
        const idxA = customOrder.indexOf(a.id);
        const idxB = customOrder.indexOf(b.id);
        // If both exist in custom order, sort by index
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        // If only A exists, it goes first
        if (idxA !== -1) return -1;
        // If only B exists, it goes first
        if (idxB !== -1) return 1;
        // Otherwise default sort
        return 0; 
      });
    }
    return rawSelectedDayEvents;
  }, [rawSelectedDayEvents, customOrder]);

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'Inspection': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'Legal': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Lease': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Maintenance': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Viewing': return 'bg-sky-100 text-sky-700 border-sky-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500 pb-12 items-start h-full">
      
      {/* Left: Calendar Grid */}
      <div className="flex-1 w-full bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {/* Calendar Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{monthName}</h2>
            <p className="text-sm text-slate-500 font-medium">Monthly Overview</p>
          </div>
          <div className="flex space-x-2 bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button 
              onClick={() => {
                const today = new Date();
                setCurrentDate(today);
                setSelectedDate(today);
                setCustomOrder([]); // Reset sort when changing date
              }}
              className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/30">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px border-b border-slate-200 flex-1">
          {days.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="bg-white min-h-[140px]" />;
            
            const dateKey = formatDateKey(date);
            const isSelected = dateKey === formatDateKey(selectedDate);
            const isToday = dateKey === formatDateKey(new Date());
            const dayEvents = getEventsForDate(date);

            return (
              <div 
                key={dateKey} 
                onClick={() => { setSelectedDate(date); setCustomOrder([]); }}
                className={`bg-white p-2 min-h-[140px] cursor-pointer hover:bg-indigo-50/30 transition-colors flex flex-col relative ${isSelected ? 'ring-2 ring-inset ring-indigo-500 z-10' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>
                    {date.getDate()}
                  </span>
                </div>
                
                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div key={ev.id} className={`text-[9px] font-bold truncate px-1.5 py-1 rounded-md border-l-2 ${getEventTypeColor(ev.type).replace('bg-', 'bg-opacity-20 ')}`}>
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] text-slate-400 font-bold pl-1">+ {dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Agenda & AI Tools View */}
      <div className="w-full lg:w-[400px] flex flex-col space-y-6 shrink-0">
        
        {/* NEW AI ASSISTANT */}
        <ScheduleAssistant 
          currentDate={selectedDate}
          dayEvents={selectedDayEvents}
          allHistoryEvents={allEvents}
          onAddEvent={onAddEvent}
          onReorderEvents={setCustomOrder}
        />

        {/* Selected Date Agenda */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-100">
            <div>
              <h3 className="text-4xl font-black text-slate-900">{selectedDate.getDate()}</h3>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{selectedDate.toLocaleString('default', { month: 'long', weekday: 'long' })}</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-indigo-600 transition-all active:scale-95 group"
            >
              <svg className="w-6 h-6 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-slate-900 font-bold">No Events</p>
                <p className="text-slate-400 text-xs mt-1">Free day! No appointments scheduled.</p>
                <button onClick={() => setIsModalOpen(true)} className="mt-4 text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline">Add Event</button>
              </div>
            ) : (
              selectedDayEvents.map(ev => (
                <div key={ev.id} className="group relative p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all duration-300">
                   <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getEventTypeColor(ev.type)}`}>
                        {ev.type}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{ev.time}</span>
                   </div>
                   <h4 className="font-bold text-slate-900">{ev.title}</h4>
                   <p className="text-xs text-slate-500 mt-1">{ev.propertyAddress}</p>
                   {ev.description && (
                     <div className="mt-3 pt-3 border-t border-slate-200/50">
                       <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>
                     </div>
                   )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Legend Widget */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
          <h4 className="text-xs font-black uppercase tracking-widest mb-6 opacity-50">Event Key</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-3"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" /><span className="text-xs font-bold">Routine</span></div>
            <div className="flex items-center space-x-3"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" /><span className="text-xs font-bold">VCAT / Legal</span></div>
            <div className="flex items-center space-x-3"><div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]" /><span className="text-xs font-bold">Leasing View</span></div>
            <div className="flex items-center space-x-3"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" /><span className="text-xs font-bold">Lease Renew</span></div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">New Appointment</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Event Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Viewing', 'Inspection', 'Legal'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setNewEvent({...newEvent, type: type as any})}
                      className={`py-2.5 text-[10px] font-black uppercase rounded-xl border-2 transition-all ${newEvent.type === type ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Title</label>
                <input 
                  type="text" 
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="e.g. Open for Inspection"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Related Property</label>
                <select 
                  value={newEvent.propertyId}
                  onChange={e => setNewEvent({...newEvent, propertyId: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">General / Office</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Time</label>
                <input 
                  type="time" 
                  value={newEvent.time}
                  onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</label>
                <textarea 
                  value={newEvent.description}
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder="Additional details..."
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={saveManualEvent}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95"
                >
                  Confirm & Add to Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notice Generator Modal */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsNoticeModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8 flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Drafting Notice of Entry</h3>
                  <p className="text-sm text-slate-500">{selectedNoticeEvent?.propertyAddress}</p>
                </div>
                <button onClick={() => setIsNoticeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>

             {loadingNotice ? (
               <div className="flex-1 flex flex-col items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                  <p className="text-indigo-600 font-bold text-sm">Consulting Tenancy Laws & Drafting...</p>
               </div>
             ) : (
               <>
                 <div className="flex-1 overflow-y-auto mb-6 bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">{noticeDraft}</pre>
                 </div>
                 <div className="flex space-x-3">
                    <button 
                      onClick={() => setIsNoticeModalOpen(false)}
                      className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50"
                    >
                      Discard
                    </button>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(noticeDraft); alert('Copied!'); }}
                      className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-100"
                    >
                      Copy Text
                    </button>
                    <button 
                      onClick={handleSendNotice}
                      className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-200"
                    >
                      Send Official Notice
                    </button>
                 </div>
               </>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
