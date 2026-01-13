
import React, { useState, useMemo } from 'react';
import { Property, MaintenanceTask, CalendarEvent } from '../types';
import { generateEntryNotice } from '../services/geminiService';
import ScheduleAssistant from '../components/ScheduleAssistant';

interface ScheduleProps {
  properties?: Property[];
  maintenanceTasks?: MaintenanceTask[];
  manualEvents: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onUpdateEvent?: (event: CalendarEvent) => void;
  onRecordHistory?: (record: any) => void;
  onDeleteEvent: (id: string) => void;
}

// --- STYLING LOGIC (Moved outside component) ---

// 1. Property-Based Background Color (Deterministic Hash)
const getPropertyBackgroundColor = (address?: string) => {
  if (!address || address === 'General / Office' || address === 'General Appointment') return 'bg-white';
  
  const colors = [
    'bg-red-50', 'bg-orange-50', 'bg-amber-50', 'bg-yellow-50', 'bg-lime-50',
    'bg-green-50', 'bg-emerald-50', 'bg-teal-50', 'bg-cyan-50', 'bg-sky-50',
    'bg-blue-50', 'bg-indigo-50', 'bg-violet-50', 'bg-purple-50', 'bg-fuchsia-50',
    'bg-pink-50', 'bg-rose-50', 'bg-slate-100', 'bg-gray-100'
  ];
  
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// 2. Event Type Text & Border Color (Fixed for consistency)
const getEventTypeStyles = (type: CalendarEvent['type']) => {
  switch (type) {
    case 'Inspection': return 'text-indigo-800 border-indigo-500';
    case 'Legal': return 'text-rose-800 border-rose-500';
    case 'Lease': return 'text-emerald-800 border-emerald-500';
    case 'Maintenance': return 'text-amber-800 border-amber-500';
    case 'Viewing': return 'text-sky-800 border-sky-500';
    case 'Call': return 'text-cyan-800 border-cyan-500';
    case 'Email': return 'text-violet-800 border-violet-500';
    default: return 'text-slate-800 border-slate-400';
  }
};

// 3. Badge Style for Agenda View (Keep distinct)
const getEventTypeBadgeColor = (type: CalendarEvent['type']) => {
  switch (type) {
    case 'Inspection': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'Legal': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'Lease': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Maintenance': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'Viewing': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'Call': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    case 'Email': return 'bg-violet-100 text-violet-700 border-violet-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

interface EventCardProps {
  ev: CalendarEvent;
  onDraftNotice: (ev: CalendarEvent) => void;
  onAiSuggest: (ev: CalendarEvent) => void;
  onDelete: (ev: CalendarEvent) => void;
  onCheckOut: (ev: CalendarEvent) => void;
}

// Helper component for rendering a single event card
const EventCard: React.FC<EventCardProps> = ({ ev, onDraftNotice, onAiSuggest, onDelete, onCheckOut }) => {
  const isCall = ev.type === 'Call';
  const isEmail = ev.type === 'Email';

  return (
    <div className={`group relative p-5 rounded-2xl border transition-all duration-300 ${ev.checkedOut ? 'bg-emerald-50 border-emerald-200 opacity-80' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg'}`}>
      <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
             <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getEventTypeBadgeColor(ev.type)}`}>
             {ev.type}
             </span>
             {/* Check-Out Box */}
             <div className="flex items-center">
                <input 
                    type="checkbox" 
                    checked={!!ev.checkedOut}
                    onChange={(e) => { e.stopPropagation(); onCheckOut(ev); }}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title={isCall || isEmail ? "Mark as Done" : "Check out to verify attendance"}
                />
             </div>
          </div>
          <div className="flex items-center gap-2">
          {ev.type === 'Inspection' && !ev.checkedOut && (
              <button 
                  onClick={(e) => { e.stopPropagation(); onDraftNotice(ev); }}
                  className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 px-2 py-0.5 rounded transition-colors"
                  title="Send Entry Notice"
              >
                  Email Notice
              </button>
          )}
          {isCall && ev.contact && (
             <a href={`tel:${ev.contact}`} onClick={(e) => e.stopPropagation()} className="text-cyan-500 hover:text-cyan-700 bg-cyan-50 p-1 rounded-md">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
             </a>
          )}
          {isEmail && ev.contact && (
             <a href={`mailto:${ev.contact}`} onClick={(e) => e.stopPropagation()} className="text-violet-500 hover:text-violet-700 bg-violet-50 p-1 rounded-md">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 00-2 2z" /></svg>
             </a>
          )}

          <button 
              onClick={(e) => { e.stopPropagation(); onAiSuggest(ev); }} 
              className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
              title="Get AI Suggestions"
          >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              AI Suggest
          </button>
          
          {/* Delete Button - Only for manual events */}
          {!ev.id.startsWith('auto-') && (
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(ev); }}
                className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1 rounded-md transition-colors"
                title="Delete Event"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}

          <span className={`text-xs font-bold ${ev.checkedOut ? 'text-emerald-700' : 'text-slate-900'}`}>{ev.time}</span>
          </div>
      </div>
      <h4 className={`font-bold ${ev.checkedOut ? 'text-emerald-900 line-through' : 'text-slate-900'}`}>{ev.title}</h4>
      
      {/* Contact Info Row */}
      {ev.contact && (
        <p className="text-xs text-indigo-600 font-medium mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            {ev.contact}
        </p>
      )}

      {ev.propertyAddress && ev.propertyAddress !== 'General / Office' && (
        <p className="text-xs text-slate-500 mt-1">{ev.propertyAddress}</p>
      )}
      
      <div className="flex gap-2 items-center">
        {ev.reminderSet && <span className="inline-block mt-2 text-[9px] font-black uppercase text-amber-600 tracking-widest bg-amber-100 px-2 py-0.5 rounded">Reminder Set</span>}
        {ev.checkedOut && <span className="inline-block mt-2 text-[9px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-100 px-2 py-0.5 rounded">Complete</span>}
      </div>

      {ev.description && (
          <div className="mt-3 pt-3 border-t border-slate-200/50">
          <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>
          </div>
      )}
    </div>
  );
};

const Schedule: React.FC<ScheduleProps> = ({ properties = [], maintenanceTasks = [], manualEvents, onAddEvent, onUpdateEvent, onRecordHistory, onDeleteEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  
  // View Management State
  const [viewMode, setViewMode] = useState<'time' | 'property'>('time');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Inspection' | 'Maintenance' | 'Viewing' | 'Communication'>('All');
  
  // Custom Sort Order (Event IDs)
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  // Notice State
  const [noticeDraft, setNoticeDraft] = useState('');
  const [loadingNotice, setLoadingNotice] = useState(false);
  const [selectedNoticeEvent, setSelectedNoticeEvent] = useState<CalendarEvent | null>(null);
  
  // AI Suggestion State
  const [activeAiTask, setActiveAiTask] = useState<CalendarEvent | null>(null);
  
  // Delete Modal State
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

  // New Event Form State
  const [newEvent, setNewEvent] = useState<{
    title: string;
    type: CalendarEvent['type'];
    time: string;
    description: string;
    propertyId: string;
    contact: string;
    reminder: boolean;
  }>({
    title: '',
    type: 'Viewing',
    time: '09:00',
    description: '',
    propertyId: '',
    contact: '',
    reminder: false
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
    const isCommTask = newEvent.type === 'Call' || newEvent.type === 'Email';
    // If it's a call/email, force it to office. Otherwise use selected property.
    const prop = isCommTask ? null : properties.find(p => p.id === newEvent.propertyId);
    
    const dateStr = formatDateKey(selectedDate);
    
    const event: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: newEvent.title,
      date: dateStr,
      time: newEvent.time,
      type: newEvent.type,
      description: newEvent.description,
      propertyAddress: isCommTask ? 'General / Office' : (prop ? prop.address : 'General / Office'),
      contact: isCommTask ? newEvent.contact : undefined,
      reminderSet: newEvent.reminder
    };

    onAddEvent(event);
    setIsModalOpen(false);
    setNewEvent({ title: '', type: 'Viewing', time: '09:00', description: '', propertyId: '', contact: '', reminder: false });
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

  const handleToggleCheckOut = (ev: CalendarEvent) => {
      if (!onAddEvent) return;

      // If it's an automated event, we need to clone it to manual to save the state
      if (ev.id.startsWith('auto-')) {
          const manualCopy: CalendarEvent = {
              ...ev,
              id: `evt-verified-${Date.now()}`, // New ID
              checkedOut: true // Set checked out
          };
          onAddEvent(manualCopy);
      } else {
          // It's a manual event, update it
          if (onUpdateEvent) {
              onUpdateEvent({ ...ev, checkedOut: !ev.checkedOut });
          }
      }
  };

  const handleDraftNotice = async (event: CalendarEvent) => {
    setSelectedNoticeEvent(event);
    setLoadingNotice(true);
    setIsNoticeModalOpen(true);
    
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
    
    if (onRecordHistory && selectedNoticeEvent) {
        onRecordHistory({
            id: `hist-notice-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'Communication',
            description: `Entry Notice Sent for ${selectedNoticeEvent.title}`,
            propertyAddress: selectedNoticeEvent.propertyAddress,
            relatedId: selectedNoticeEvent.id
        });
    }

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
  
  // --- FILTERING & SORTING LOGIC ---
  const filteredEvents = useMemo(() => {
    let events = [...rawSelectedDayEvents];

    // Filter out automated events if a manual verified version exists for same prop/date to avoid duplicates
    const verifiedKeys = events.filter(e => e.checkedOut).map(e => e.propertyAddress + e.date);
    events = events.filter(e => {
        if (e.id.startsWith('auto-') && verifiedKeys.includes(e.propertyAddress + e.date)) return false;
        return true;
    });

    // 1. Search Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      events = events.filter(e => 
        e.title.toLowerCase().includes(lower) || 
        (e.propertyAddress || '').toLowerCase().includes(lower) ||
        (e.description || '').toLowerCase().includes(lower) ||
        (e.contact || '').toLowerCase().includes(lower)
      );
    }

    // 2. Type Filter
    if (filterType !== 'All') {
      if (filterType === 'Communication') {
          events = events.filter(e => e.type === 'Call' || e.type === 'Email');
      } else {
          events = events.filter(e => e.type === filterType || (filterType === 'Viewing' && (e.type === 'Lease' || e.type === 'Viewing')));
      }
    }

    // 3. Custom Ordering (Voice Command)
    if (customOrder.length > 0) {
      events.sort((a, b) => {
        const idxA = customOrder.indexOf(a.id);
        const idxB = customOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    } else {
        // Default Sort by Time
        events.sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));
    }

    return events;
  }, [rawSelectedDayEvents, searchTerm, filterType, customOrder]);

  // Group events by property for 'Property View'
  const groupedEvents = useMemo(() => {
    if (viewMode !== 'property') return null;
    
    const groups: { [address: string]: CalendarEvent[] } = {};
    filteredEvents.forEach(ev => {
        const key = ev.propertyAddress || 'General / Office';
        if (!groups[key]) groups[key] = [];
        groups[key].push(ev);
    });
    return groups;
  }, [filteredEvents, viewMode]);

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
                
                <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div 
                        key={ev.id} 
                        className={`text-[9px] font-bold truncate px-2 py-1.5 rounded-md border-l-[3px] shadow-sm ${getPropertyBackgroundColor(ev.propertyAddress)} ${getEventTypeStyles(ev.type)} ${ev.checkedOut ? 'opacity-50 line-through' : ''}`}
                        title={`${ev.title} - ${ev.propertyAddress}`}
                    >
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
        
        {/* 1. Schedule Assistant (AI) */}
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <ScheduleAssistant 
                currentDate={selectedDate}
                dayEvents={filteredEvents}
                allHistoryEvents={allEvents}
                onAddEvent={onAddEvent}
                onReorderEvents={setCustomOrder}
                suggestTask={activeAiTask}
                onClearSuggestion={() => setActiveAiTask(null)}
            />
        </div>

        {/* 2. Selected Date Agenda (Manual Interactions) */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col min-h-[600px] overflow-hidden">
          
          <div className="p-8 border-b border-slate-100 pb-4">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-3xl font-black text-slate-900">{selectedDate.getDate()}</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{selectedDate.toLocaleString('default', { month: 'long', weekday: 'long' })}</p>
                </div>
                {/* Manual Add Button */}
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-indigo-600 transition-all active:scale-95 group"
                    title="Add Manual Appointment"
                >
                    <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>

            {/* --- Advanced Search & Filter Controls --- */}
            <div className="space-y-3 mt-4">
                {/* Search Bar */}
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Filter by address, contact or task..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                <div className="flex justify-between items-center">
                    {/* Filter Tabs */}
                    <div className="flex gap-1 overflow-x-auto no-scrollbar">
                        {(['All', 'Inspection', 'Maintenance', 'Viewing', 'Communication'] as const).map(type => {
                            let count = 0;
                            if (type === 'Communication') {
                                count = rawSelectedDayEvents.filter(e => e.type === 'Call' || e.type === 'Email').length;
                            } else {
                                count = rawSelectedDayEvents.filter(e => type === 'All' ? true : e.type === type).length;
                            }
                            
                            if (type !== 'All' && count === 0) return null; // Hide empty categories to save space
                            
                            return (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                                        filterType === type 
                                        ? 'bg-slate-800 text-white border-slate-800' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    {type === 'Communication' ? 'Calls/Emails' : type} <span className="opacity-60 ml-0.5">({count})</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* View Mode Toggle */}
                    <button 
                        onClick={() => setViewMode(viewMode === 'time' ? 'property' : 'time')}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-2 shrink-0"
                        title={viewMode === 'time' ? "Switch to Property Grouping" : "Switch to Time Line"}
                    >
                        {viewMode === 'time' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                    </button>
                </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-slate-50/50">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-slate-900 font-bold">No Events Found</p>
                <p className="text-slate-400 text-xs mt-1">Try adjusting filters or select another day.</p>
                <button onClick={() => setIsModalOpen(true)} className="mt-4 text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline">Add Event</button>
              </div>
            ) : (
                viewMode === 'time' ? (
                    // Standard Chronological List
                    filteredEvents.map(ev => (
                      <EventCard 
                        key={ev.id} 
                        ev={ev} 
                        onDraftNotice={handleDraftNotice}
                        // FORCE UPDATE: Create a new object reference to ensure useEffect triggers even if clicking same task
                        onAiSuggest={(e) => setActiveAiTask({ ...e, _ts: Date.now() } as any)} 
                        onDelete={(e) => setEventToDelete(e)}
                        onCheckOut={handleToggleCheckOut}
                      />
                    ))
                ) : (
                    // Grouped By Property (Collapsible/Sectioned)
                    Object.entries((groupedEvents || {}) as Record<string, CalendarEvent[]>).map(([address, events]) => (
                        <div key={address} className="mb-6 last:mb-0">
                            <div className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur py-2 px-3 rounded-lg mb-3 border border-slate-200 flex justify-between items-center">
                                <h5 className="text-xs font-black text-slate-700 truncate max-w-[200px]">{address}</h5>
                                <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">{events.length} Tasks</span>
                            </div>
                            <div className="space-y-3 pl-2 border-l-2 border-slate-200">
                                {events.map(ev => (
                                  <EventCard 
                                    key={ev.id} 
                                    ev={ev}
                                    onDraftNotice={handleDraftNotice}
                                    // FORCE UPDATE: Create a new object reference
                                    onAiSuggest={(e) => setActiveAiTask({ ...e, _ts: Date.now() } as any)}
                                    onDelete={(e) => setEventToDelete(e)}
                                    onCheckOut={handleToggleCheckOut}
                                  />
                                ))}
                            </div>
                        </div>
                    ))
                )
            )}
          </div>
        </div>

        {/* Legend Widget */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
          <h4 className="text-xs font-black uppercase tracking-widest mb-6 opacity-50">Event Key</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-3"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" /><span className="text-xs font-bold">Routine</span></div>
            <div className="flex items-center space-x-3"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" /><span className="text-xs font-bold">VCAT / Legal</span></div>
            <div className="flex items-center space-x-3"><div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" /><span className="text-xs font-bold">Calls</span></div>
            <div className="flex items-center space-x-3"><div className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" /><span className="text-xs font-bold">Emails</span></div>
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
                  {['Viewing', 'Inspection', 'Legal', 'Call', 'Email'].map(type => (
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
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
                <input 
                  type="text" 
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="e.g. Open for Inspection or Call Landlord"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {(newEvent.type === 'Call' || newEvent.type === 'Email') && (
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Name / Number</label>
                    <input 
                    type="text" 
                    value={newEvent.contact}
                    onChange={e => setNewEvent({...newEvent, contact: e.target.value})}
                    placeholder={newEvent.type === 'Call' ? "+61 4..." : "client@email.com"}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Related Property</label>
                <select 
                  value={(newEvent.type === 'Call' || newEvent.type === 'Email') ? "" : newEvent.propertyId}
                  onChange={e => setNewEvent({...newEvent, propertyId: e.target.value})}
                  disabled={newEvent.type === 'Call' || newEvent.type === 'Email'}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">General / Office</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
                {(newEvent.type === 'Call' || newEvent.type === 'Email') && (
                    <p className="text-[10px] text-slate-400 mt-1 italic">Office task only - No travel required.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Time</label>
                <div className="flex gap-4 items-center">
                    <input 
                        type="time" 
                        value={newEvent.time}
                        onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                        className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    {/* Notification Toggle */}
                    <div 
                        className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 cursor-pointer transition-all ${newEvent.reminder ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}
                        onClick={() => setNewEvent({...newEvent, reminder: !newEvent.reminder})}
                    >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${newEvent.reminder ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}>
                            {newEvent.reminder && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className={`text-xs font-bold ${newEvent.reminder ? 'text-amber-700' : 'text-slate-400'}`}>Remind Me</span>
                    </div>
                </div>
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

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setEventToDelete(null)} />
            <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Event?</h3>
                <p className="text-sm text-slate-500 mb-8">Are you sure you want to delete <span className="font-bold text-slate-900">"{eventToDelete.title}"</span>?</p>
                <div className="flex gap-3">
                    <button onClick={() => setEventToDelete(null)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50">Cancel</button>
                    <button onClick={() => { onDeleteEvent(eventToDelete.id); setEventToDelete(null); }} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-200">Delete</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
