
import React, { useState, useEffect, useMemo } from 'react';
import StatCard from '../components/StatCard';
import FeatureGuide from '../components/FeatureGuide';
import { Property, MaintenanceTask, CalendarEvent } from '../types';

interface DashboardProps {
  properties: Property[];
  maintenanceTasks: MaintenanceTask[];
  calendarEvents?: CalendarEvent[];
  onOpenAddModal: () => void;
}

interface NotificationItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  time: string;
  category: string;
}

const Dashboard: React.FC<DashboardProps> = ({ properties, maintenanceTasks, calendarEvents = [], onOpenAddModal }) => {
  const [showGuide, setShowGuide] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    const hidden = localStorage.getItem('hide_feature_guide');
    if (hidden) setShowGuide(false);

    const savedDismissed = localStorage.getItem('proptrust_dismissed_notifs');
    if (savedDismissed) {
      try {
        setDismissedIds(JSON.parse(savedDismissed));
      } catch (e) {
        console.error("Failed to parse dismissed notifications");
      }
    }
  }, []);

  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.setItem('hide_feature_guide', 'true');
  };

  // Generate Notifications
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 1. Arrears Alerts
    properties.filter(p => p.status === 'Arrears').forEach(p => {
      list.push({
        id: `arr-${p.id}`,
        type: 'critical',
        title: 'Rent Arrears',
        message: `Tenant at ${p.address} is marked as in arrears.`,
        time: 'Action Required',
        category: 'Financial'
      });
    });

    // 2. Urgent Maintenance
    maintenanceTasks.filter(t => t.priority === 'Urgent' && t.status !== 'Completed').forEach(t => {
      list.push({
        id: `maint-urg-${t.id}`,
        type: 'critical',
        title: 'Urgent Repair',
        message: `${t.issue} at ${t.propertyAddress}`,
        time: new Date(t.requestDate).toLocaleDateString(),
        category: 'Maintenance'
      });
    });

    // 3. New Maintenance Requests
    maintenanceTasks.filter(t => t.status === 'New').forEach(t => {
      list.push({
        id: `maint-new-${t.id}`,
        type: 'info',
        title: 'New Request',
        message: `${t.issue} reported at ${t.propertyAddress}`,
        time: new Date(t.requestDate).toLocaleDateString(),
        category: 'Maintenance'
      });
    });

    // 4. Vacancies
    properties.filter(p => p.status === 'Vacant').forEach(p => {
      list.push({
        id: `vac-${p.id}`,
        type: 'warning',
        title: 'Vacancy',
        message: `${p.address} is currently vacant.`,
        time: 'Ongoing',
        category: 'Leasing'
      });
    });

    // 5. Inspections Due (within 14 days)
    properties.forEach(p => {
      if (p.nextInspectionDate) {
        const d = new Date(p.nextInspectionDate);
        const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (diff >= 0 && diff <= 14) {
          list.push({
            id: `insp-${p.id}`,
            type: 'warning',
            title: 'Inspection Due',
            message: `Routine inspection for ${p.address} due in ${diff} days.`,
            time: p.nextInspectionDate,
            category: 'Inspection'
          });
        } else if (diff < 0) {
          list.push({
            id: `insp-over-${p.id}`,
            type: 'critical',
            title: 'Inspection Overdue',
            message: `Routine inspection for ${p.address} was due on ${p.nextInspectionDate}.`,
            time: 'Overdue',
            category: 'Inspection'
          });
        }
      }
    });

    // 6. Logbook Reminder (End of Day)
    // Check if there are unchecked events for today and time is after 3PM (simple heuristic)
    const uncheckedToday = calendarEvents.filter(e => e.date === todayStr && !e.checkedOut);
    if (uncheckedToday.length > 0) {
        list.push({
            id: `logbook-reminder-${todayStr}`,
            type: 'info',
            title: 'Logbook Reminder',
            message: `You have ${uncheckedToday.length} unchecked appointments today. Verify them in Schedule to auto-log your travel.`,
            time: 'End of Day',
            category: 'Logbook'
        });
    }

    // Filter out dismissed notifications
    return list.filter(n => !dismissedIds.includes(n.id));
  }, [properties, maintenanceTasks, dismissedIds, calendarEvents]);

  const handleDismissAll = () => {
    const currentIds = notifications.map(n => n.id);
    const newDismissed = [...dismissedIds, ...currentIds];
    setDismissedIds(newDismissed);
    localStorage.setItem('proptrust_dismissed_notifs', JSON.stringify(newDismissed));
    setShowNotifications(false);
  };

  const unreadCount = notifications.length;

  // Real-time calculations for stats
  const totalAssets = properties.length;
  const leasedCount = properties.filter(p => p.status === 'Leased').length;
  const occupancyRate = totalAssets > 0 ? ((leasedCount / totalAssets) * 100).toFixed(1) : "0.0";

  const estMonthlyYield = properties.reduce((acc, p) => {
    let amount = p.rentAmount;
    if (p.rentFrequency === 'Weekly') amount = (amount * 52) / 12;
    if (p.rentFrequency === 'Annually') amount = amount / 12;
    return acc + amount;
  }, 0);

  const totalBondHeld = properties.reduce((acc, p) => acc + (p.bondAmount || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 relative" onClick={() => showNotifications && setShowNotifications(false)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Portfolio Dashboard</h2>
          <p className="text-slate-500">
            {totalAssets === 0 
              ? "Welcome! Start by onboarding your first management asset." 
              : `Reviewing ${totalAssets} active management agreements.`}
          </p>
        </div>
        <div className="flex space-x-4 items-center">
          {/* Notification Bell */}
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); }}
              className={`p-3 rounded-xl transition-all ${showNotifications ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-slate-400 hover:text-indigo-600 hover:bg-slate-50'} shadow-sm border border-slate-200`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-900">Notifications</h3>
                  <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">{unreadCount} Pending</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <p className="text-sm">You're all caught up! No alerts.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {notifications.map(item => (
                        <div key={item.id} className="p-5 hover:bg-slate-50 transition-colors flex gap-4">
                          <div className={`mt-1 shrink-0 w-2 h-2 rounded-full ${item.type === 'critical' ? 'bg-rose-500' : item.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                          <div className="flex-1">
                             <div className="flex justify-between items-start mb-1">
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{item.category}</p>
                               <span className="text-[10px] text-slate-400">{item.time}</span>
                             </div>
                             <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                             <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="px-6 py-3 bg-slate-50 text-center border-t border-slate-100">
                    <button onClick={handleDismissAll} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Dismiss All</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            onClick={onOpenAddModal}
            className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center space-x-2"
          >
            <span>+ Onboard</span>
          </button>
        </div>
      </div>

      {showGuide && <FeatureGuide onClose={handleCloseGuide} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Est. Monthly Revenue" 
          value={`$${estMonthlyYield.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          trend={totalAssets > 0 ? "Live from portfolio" : "Awaiting data"} 
          trendUp={totalAssets > 0}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard 
          label="Total Assets" 
          value={totalAssets} 
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
        <StatCard 
          label="Occupancy" 
          value={`${occupancyRate}%`} 
          trendUp={parseFloat(occupancyRate) >= 90}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <StatCard 
          label="Trust Funds Held" 
          value={`$${totalBondHeld.toLocaleString()}`} 
          trend="Bonds & Prepaid Rent"
          trendUp={true}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* New Inspection Reminder Sidebar */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Upcoming Inspections</h3>
            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full">14 Day Outlook</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {properties.filter(p => {
              if (!p.nextInspectionDate) return false;
              const d = new Date(p.nextInspectionDate);
              const diff = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              return diff >= 0 && diff <= 14;
            }).length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic text-sm">
                <p>No inspections scheduled in the next 14 days.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {properties.filter(p => {
                    if (!p.nextInspectionDate) return false;
                    const d = new Date(p.nextInspectionDate);
                    const diff = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                    return diff >= 0 && diff <= 14;
                  })
                  .sort((a, b) => new Date(a.nextInspectionDate!).getTime() - new Date(b.nextInspectionDate!).getTime())
                  .map(prop => (
                  <div key={prop.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-black uppercase text-indigo-600">
                        {new Date(prop.nextInspectionDate!).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Routine</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 truncate">{prop.address}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">Tenant: {prop.tenantName || 'VACANT'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Management Commencement Log</h3>
            <span className="text-xs font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-3 py-1 rounded-full">TrustSoft Sync Active</span>
          </div>
          <div className="divide-y divide-slate-50">
            {properties.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-400 italic">No management history found. Assets you onboard will appear here as ledger commencement entries.</p>
              </div>
            ) : (
              properties.map((prop, idx) => (
                <div key={prop.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{prop.address}</p>
                      <p className="text-xs text-slate-500">Management Commenced • Initial Ledger Created</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">Sync Complete</p>
                    <p className="text-[10px] text-slate-400 font-mono">OWNER: {prop.ownerName.toUpperCase()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
