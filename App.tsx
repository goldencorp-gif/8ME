
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AITools from './pages/AITools';
import Tenancies from './pages/Tenancies';
import TrustAccounting from './pages/TrustAccounting';
import Maintenance from './pages/Maintenance';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import MasterConsole from './pages/MasterConsole';
import Logbook from './pages/Logbook';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import AddPropertyModal from './components/AddPropertyModal';
import PropertyDetailView from './components/PropertyDetailView';
import { Property, Transaction, MaintenanceTask, UserAccount, CalendarEvent, Inquiry, Agency, HistoryRecord } from './types';
import { useAuth } from './contexts/AuthContext';
import { db } from './services/db';

// Extend window for Google Analytics
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
  }
}

const App: React.FC = () => {
  const { isAuthenticated, user, role, logout, isLoading: isAuthLoading, updateProfile } = useAuth();
  
  // Default to 'landing' so the marketing page is the first entry point
  const [viewState, setViewState] = useState<'landing' | 'login' | 'app'>('landing');

  // Sync Auth State with View
  useEffect(() => {
    if (isAuthenticated) {
      setViewState('app');
    } else if (viewState === 'app' && !isAuthenticated) {
      // If we are in 'app' mode but not authenticated, kick back to login
      setViewState('login');
    }
  }, [isAuthenticated, viewState]);

  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loadingData, setLoadingData] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  // --- Google Analytics Tracking ---
  useEffect(() => {
    // This effect runs whenever 'activeTab' or 'viewState' changes.
    // It tells Google Analytics that a "Page View" has occurred.
    if (typeof window.gtag !== 'undefined') {
      const pageTitle = viewState === 'app' ? `8ME - ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` : `8ME - ${viewState.charAt(0).toUpperCase() + viewState.slice(1)}`;
      const pagePath = viewState === 'app' ? `/app/${activeTab}` : `/${viewState}`;

      window.gtag('event', 'page_view', {
        page_title: pageTitle,
        page_location: window.location.origin + pagePath,
        page_path: pagePath
      });
    }
  }, [activeTab, viewState]);

  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  
  // Local Team List (Loaded from DB)
  const [users, setUsers] = useState<UserAccount[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Load Data
  useEffect(() => {
    if (isAuthenticated) {
        setLoadingData(true);
        db.properties.list().then(props => {
        setProperties(props);
        Promise.all([
            db.transactions.list(),
            db.maintenance.list(),
            db.calendar.list(),
            db.history.list(),
            db.users.list() // Load local users
        ]).then(([txs, tasks, events, hist, localUsers]) => {
            setTransactions(txs);
            setMaintenanceTasks(tasks);
            setCalendarEvents(events);
            setUsers(localUsers);
            setLoadingData(false);
        }).catch(err => {
            console.error("Data loading error:", err);
            setLoadingData(false);
        });
        });

        try {
        const savedInq = localStorage.getItem('proptrust_inquiries');
        if (savedInq) setInquiries(JSON.parse(savedInq));
        } catch (e) {
        console.warn("Failed to parse inquiries from storage");
        }
    }
  }, [isAuthenticated]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Centralized History Recorder
  const handleRecordHistory = async (record: HistoryRecord) => {
    await db.history.add(record);
  };

  const handleSendInquiry = (inquiry: Inquiry) => {
      const updated = [inquiry, ...inquiries];
      setInquiries(updated);
      localStorage.setItem('proptrust_inquiries', JSON.stringify(updated));
  };

  const handleImpersonate = (agency: Agency) => {
    // 1. Switch User Profile (Simulation)
    updateProfile({
      name: `${agency.name} Admin`,
      email: agency.contactEmail,
      title: 'Principal',
      phone: '0400 000 000'
    });
    // 2. Switch Tab
    setActiveTab('dashboard');
    // 3. Show Notification
    showToast(`Now viewing as ${agency.name}`, 'success');
  };

  const handleAddOrUpdateProperty = async (newProp: Property) => {
    await db.properties.save(newProp);
    const exists = properties.find(p => p.id === newProp.id);
    if (exists) {
      setProperties(prev => prev.map(p => p.id === newProp.id ? newProp : p));
      showToast('Property synchronized');
    } else {
      setProperties(prev => [newProp, ...prev]);
      showToast('Asset onboarded');
      const initialTx: Transaction = {
        id: `TX-COMM-${Date.now()}`,
        date: new Date().toISOString(),
        description: `Management Commenced: ${newProp.address}`,
        type: 'Credit',
        amount: 0,
        reference: 'COMM-001',
        account: 'Trust'
      };
      handleAddTransaction(initialTx);
    }
    setIsAddModalOpen(false);
    setPropertyToEdit(null);
    if (selectedProperty?.id === newProp.id) setSelectedProperty(newProp);
  };

  const executeDeleteProperty = async () => {
    if (!propertyToDelete) return;
    const id = propertyToDelete;
    const propToDelete = properties.find(p => p.id === id);

    if (propToDelete) {
      await db.properties.delete(id);
      await db.maintenance.deleteForProperty(id);
      await db.calendar.deleteForProperty(propToDelete.address);
      
      // NOTE: We do NOT delete transactions anymore. 
      // Financial history must persist for audit compliance (7 years).
      // await db.transactions.deleteLinkedTo(propToDelete.address.split(',')[0].trim());

      setProperties(prev => prev.filter(p => p.id !== id));
      setMaintenanceTasks(prev => prev.filter(t => t.propertyId !== id));
      setCalendarEvents(prev => prev.filter(e => e.propertyAddress !== propToDelete.address));
      
      // Refresh transactions just in case (though we didn't change them)
      const freshTxs = await db.transactions.list();
      setTransactions(freshTxs);

      showToast('Property archive successful (Ledger Preserved)');
      if (selectedProperty?.id === id) setSelectedProperty(null);
    }
    setPropertyToDelete(null);
  };

  const handleAddTransaction = async (txOrTxs: Transaction | Transaction[]) => {
    await db.transactions.create(txOrTxs);
    const freshTxs = await db.transactions.list();
    setTransactions(freshTxs);
    const count = Array.isArray(txOrTxs) ? txOrTxs.length : 1;
    showToast(`${count} Ledger entries processed`);
  };

  const handleUpdateMaintenance = async (task: MaintenanceTask) => {
    await db.maintenance.save(task);
    const freshTasks = await db.maintenance.list();
    setMaintenanceTasks(freshTasks);
    
    // Log to History
    await db.history.add({
        id: `hist-maint-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'Maintenance',
        description: `Work Order Update: ${task.issue} - ${task.status}`,
        propertyAddress: task.propertyAddress,
        relatedId: task.id
    });

    showToast('Work order updated');
  };

  const handleAddCalendarEvent = async (event: CalendarEvent) => {
    await db.calendar.add(event);
    setCalendarEvents(prev => [...prev, event]);
    
    // Log to History
    await db.history.add({
        id: `hist-evt-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'Event',
        description: `Scheduled: ${event.title} (${event.type})`,
        propertyAddress: event.propertyAddress,
        relatedId: event.id
    });

    showToast('Calendar updated');
  };

  const handleDeleteCalendarEvent = async (eventId: string) => {
    // Only manual events (id starting with 'evt-' or 'voice-') are stored in db.calendar
    if (eventId.startsWith('evt-') || eventId.startsWith('voice-')) {
       await db.calendar.delete(eventId);
       setCalendarEvents(prev => prev.filter(e => e.id !== eventId));
       showToast('Event removed from calendar');
    } else {
       showToast('Cannot delete automated system events', 'error');
    }
  };

  const handleEditProperty = (prop: Property) => {
    setPropertyToEdit(prop);
    setIsAddModalOpen(true);
  };

  const handleExportLedger = (prop: Property) => {
    const propTxs = transactions.filter(t => t.description.includes(prop.address));
    const content = `8ME PROM LEDGER EXPORT\nProperty: ${prop.address}\nOwner: ${prop.ownerName}\n\nDATE,REFERENCE,DESCRIPTION,AMOUNT,TYPE\n${propTxs.map(t => `${new Date(t.date).toLocaleDateString()},${t.reference},${t.description},${t.amount},${t.type}`).join('\n')}`;
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ledger_${prop.id}.csv`;
    a.click();
    showToast('Ledger exported to CSV');
  };

  const renderContent = () => {
    // If data loading, show spinner
    if (loadingData) return <div className="flex flex-col items-center justify-center h-[60vh] text-center text-slate-400 italic uppercase tracking-widest animate-pulse">Loading Secure Data...</div>;

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard properties={properties} maintenanceTasks={maintenanceTasks} onOpenAddModal={() => setIsAddModalOpen(true)} />;
      case 'master-console':
        return <MasterConsole onImpersonate={handleImpersonate} />;
      case 'ai-assistant':
        return <AITools properties={properties} onAddTransaction={handleAddTransaction} onUpdateProperty={handleAddOrUpdateProperty} />;
      case 'tenancies':
        return <Tenancies 
                  properties={properties} 
                  maintenanceTasks={maintenanceTasks} // Added maintenanceTasks prop
                  onSelectProperty={setSelectedProperty} 
                  onEditProperty={handleEditProperty} 
                  onUpdateProperty={handleAddOrUpdateProperty} 
                  onNavigate={setActiveTab} 
               />;
      case 'trust':
        return <TrustAccounting properties={properties} transactions={transactions} onAddTransaction={handleAddTransaction} />;
      case 'maintenance':
        return <Maintenance tasks={maintenanceTasks} properties={properties} onAddTask={handleUpdateMaintenance} onUpdateTask={handleUpdateMaintenance} />;
      case 'schedule':
        return <Schedule 
                  properties={properties} 
                  maintenanceTasks={maintenanceTasks} 
                  manualEvents={calendarEvents} 
                  onAddEvent={handleAddCalendarEvent}
                  onDeleteEvent={handleDeleteCalendarEvent}
                  onRecordHistory={handleRecordHistory}
               />;
      case 'logbook':
        return <Logbook />; // New Route
      case 'settings':
        return <Settings userProfile={user || { name: 'Demo User', email: 'demo@8me.com', title: 'Manager', phone: '' }} onUpdateProfile={updateProfile} users={users} onUpdateUsers={setUsers} />;
      case 'properties':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-4 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Portfolio Assets</h2>
                <p className="text-slate-500 mt-1">Manage physical files, legal agreements, and financials.</p>
              </div>
              <button 
                onClick={() => { setPropertyToEdit(null); setIsAddModalOpen(true); }}
                className="w-full md:auto px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
              >
                + New Management
              </button>
            </div>

            {properties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm mx-4">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8 text-indigo-600">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 text-center px-4">Start Your Portfolio</h3>
                <button onClick={() => setIsAddModalOpen(true)} className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-2xl active:scale-95">Onboard First Property</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12 px-4">
                {properties.map(prop => (
                  <div key={prop.id} onClick={() => setSelectedProperty(prop)} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-sm group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-pointer relative">
                    <div className="relative h-56 overflow-hidden">
                      <div className="absolute top-4 left-4 z-10">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPropertyToDelete(prop.id);
                          }}
                          className="p-3 bg-white/95 backdrop-blur-md rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg hover:shadow-xl active:scale-90 flex items-center justify-center border border-slate-100"
                          title="Archive Property"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        </button>
                      </div>

                      <img src={prop.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={prop.address} />
                      <div className="absolute top-5 right-5">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/20 backdrop-blur-md ${prop.status === 'Leased' ? 'bg-emerald-500/90 text-white' : 'bg-slate-600/90 text-white'}`}>{prop.status}</span>
                      </div>
                      <div className="absolute bottom-5 left-5">
                        <div className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-xl flex items-center space-x-2 shadow-lg">
                           <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                           <span className="text-[10px] font-black text-slate-800 uppercase tracking-wide truncate max-w-[150px]">{prop.address.split(',')[1] || 'Australia'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-black text-xl text-slate-900 leading-tight w-2/3">{prop.address.split(',')[0]}</h3>
                        <p className="text-xl font-bold text-indigo-600">${prop.rentAmount}<span className="text-xs text-slate-400 font-normal">/{prop.rentFrequency === 'Weekly' ? 'pw' : 'mo'}</span></p>
                      </div>
                      <div className="flex space-x-4 mb-6">
                        {prop.beds && <span className="flex items-center text-xs font-bold text-slate-500"><span className="text-slate-900 mr-1.5 text-sm">{prop.beds}</span> Beds</span>}
                        {prop.baths && <span className="flex items-center text-xs font-bold text-slate-500"><span className="text-slate-900 mr-1.5 text-sm">{prop.baths}</span> Baths</span>}
                        {prop.parking && <span className="flex items-center text-xs font-bold text-slate-500"><span className="text-slate-900 mr-1.5 text-sm">{prop.parking}</span> Cars</span>}
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${prop.tenantName ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{prop.tenantName || 'Vacant'}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-300">ID: {prop.id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <>
      {viewState === 'landing' && <LandingPage onLoginClick={() => setViewState('login')} onRequestDemo={() => setViewState('login')} />}
      
      {viewState === 'login' && <Login onBack={() => setViewState('landing')} />}

      {viewState === 'app' && (
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            userProfile={user || { name: 'User', email: 'email', title: 'Role', phone: '' }}
            userRole={role}
            onLogout={logout}
            isMobileOpen={isMobileNavOpen}
            setIsMobileOpen={setIsMobileNavOpen}
          />
          <main className="flex-1 lg:ml-64 p-4 lg:p-8 overflow-x-hidden">
             {/* Mobile Header */}
             <div className="lg:hidden flex justify-between items-center mb-6">
                <button onClick={() => setIsMobileNavOpen(true)} className="p-2 bg-white rounded-lg shadow-sm text-slate-600">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <span className="font-bold text-slate-900">8ME</span>
                <div className="w-10" /> 
             </div>

             {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-top-2 duration-300 ${toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white'}`}>
                   {toast.type === 'success' && <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                   <span className="font-bold text-sm">{toast.msg}</span>
                </div>
             )}

             {renderContent()}
          </main>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {propertyToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setPropertyToDelete(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center animate-in zoom-in-95">
             <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </div>
             <h3 className="text-xl font-bold text-slate-900 mb-2">Archive Property?</h3>
             <p className="text-sm text-slate-500 mb-8">This will remove the property from your active list. Financial history will be preserved for audit purposes.</p>
             <div className="flex gap-3">
               <button onClick={() => setPropertyToDelete(null)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50">Cancel</button>
               <button onClick={executeDeleteProperty} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-200">Archive</button>
             </div>
          </div>
        </div>
      )}

      <AddPropertyModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddOrUpdateProperty}
        editProperty={propertyToEdit}
      />

      {selectedProperty && (
        <PropertyDetailView 
          property={selectedProperty} 
          transactions={transactions}
          onClose={() => setSelectedProperty(null)}
          onEdit={handleEditProperty}
          onExport={handleExportLedger}
          onUpdateProperty={handleAddOrUpdateProperty}
          onAddTransaction={handleAddTransaction}
        />
      )}
    </>
  );
};

export default App;
