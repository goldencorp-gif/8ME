
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
import Logbook from './pages/Logbook'; // Import new page
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import AddPropertyModal from './components/AddPropertyModal';
import PropertyDetailView from './components/PropertyDetailView';
import { Property, Transaction, MaintenanceTask, UserAccount, CalendarEvent, Inquiry, Agency } from './types';
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
  
  const [users, setUsers] = useState<UserAccount[]>([
    { id: 'u1', name: 'Alex Manager', email: 'alex.manager@8me.com', role: 'Admin', status: 'Active', lastActive: 'Now' },
    { id: 'u2', name: 'Sarah Smith', email: 'sarah@8me.com', role: 'Manager', status: 'Active', lastActive: '2h ago' },
    { id: 'u3', name: 'System Overlord', email: 'admin@master.com', role: 'Master', status: 'Active', lastActive: 'Now' }
  ]);

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
            db.calendar.list()
        ]).then(([txs, tasks, events]) => {
            setTransactions(txs);
            setMaintenanceTasks(tasks);
            setCalendarEvents(events);
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
    showToast('Work order updated');
  };

  const handleAddCalendarEvent = async (event: CalendarEvent) => {
    await db.calendar.add(event);
    setCalendarEvents(prev => [...prev, event]);
    showToast('Calendar updated');
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
                  onSelectProperty={setSelectedProperty} 
                  onEditProperty={handleEditProperty} 
                  onUpdateProperty={handleAddOrUpdateProperty} 
                  onNavigate={setActiveTab} // Pass navigation handler
               />;
      case 'trust':
        return <TrustAccounting properties={properties} transactions={transactions} onAddTransaction={handleAddTransaction} />;
      case 'maintenance':
        return <Maintenance tasks={maintenanceTasks} properties={properties} onAddTask={handleUpdateMaintenance} onUpdateTask={handleUpdateMaintenance} />;
      case 'schedule':
        return <Schedule properties={properties} maintenanceTasks={maintenanceTasks} manualEvents={calendarEvents} onAddEvent={handleAddCalendarEvent} />;
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
                           <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{(prop.documents || []).length} Files</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-8">
                      <h3 className="font-bold text-slate-900 truncate text-xl leading-tight group-hover:text-indigo-600 transition-colors">{prop.address}</h3>
                      <p className="text-xs text-slate-400 mt-2 font-medium uppercase tracking-widest">{prop.ownerName}</p>
                      <div className="mt-8 flex justify-between items-end border-t border-slate-50 pt-6">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Asset Value</p>
                          <div className="flex items-baseline space-x-1">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">${prop.rentAmount.toLocaleString()}</span>
                            <span className="text-xs text-slate-400 font-bold">/{prop.rentFrequency.substring(0, 2).toLowerCase()}</span>
                          </div>
                        </div>
                        <div className="w-12 h-12 bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white rounded-[1.25rem] flex items-center justify-center transition-all shadow-sm">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return <div className="flex flex-col items-center justify-center h-[60vh] text-center text-slate-400 italic uppercase tracking-widest">Module Loading...</div>;
    }
  };

  // --- VIEW CONTROLLER ---
  
  if (viewState === 'landing') {
    return (
      <LandingPage 
        properties={properties} 
        onLoginClick={() => { 
            setViewState('login');
        }} 
        onRequestDemo={() => {
          // Force user to login first before seeing app
          setViewState('login');
        }}
        onSendInquiry={handleSendInquiry}
      />
    );
  }

  if (viewState === 'login') {
    return <Login />;
  }

  // viewState === 'app'
  return (
    <div className="flex min-h-screen selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userProfile={user || { name: 'Demo User', title: 'Manager', email: 'demo@8me.com', phone: '' }} 
        userRole={role} 
        onLogout={() => {
           logout();
           setViewState('landing');
        }} 
        isMobileOpen={isMobileNavOpen}
        setIsMobileOpen={setIsMobileNavOpen}
      />
      <main className="flex-1 lg:ml-64 min-h-screen p-4 md:p-10 transition-all duration-300 bg-slate-50/30 relative">
        <header className="flex justify-between items-center mb-6 md:mb-10 bg-white/80 backdrop-blur-xl sticky top-0 z-30 py-4 md:py-6 border-b border-slate-200/50 -mx-4 md:-mx-10 px-4 md:px-10">
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsMobileNavOpen(true)}
                className="lg:hidden p-2 text-slate-900 hover:bg-slate-100 rounded-lg"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase truncate max-w-[150px] md:max-w-none">
                {activeTab === 'master-console' ? 'System Admin' : activeTab}
            </div>
          </div>
          <button onClick={() => setActiveTab('ai-assistant')} className="px-4 md:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-200 active:scale-95 font-bold text-sm flex items-center space-x-2">
            <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center text-[10px]">AI</div>
            <span className="hidden md:inline">Assistant</span>
          </button>
        </header>

        {renderContent()}

        {toast && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-4 flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span>{toast.msg}</span>
          </div>
        )}

        <AddPropertyModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setPropertyToEdit(null); }} onAdd={handleAddOrUpdateProperty} editProperty={propertyToEdit} />
        
        <PropertyDetailView 
          property={selectedProperty} 
          transactions={transactions}
          onClose={() => setSelectedProperty(null)} 
          onEdit={handleEditProperty} 
          onExport={handleExportLedger} 
          onUpdateProperty={handleAddOrUpdateProperty}
          onAddTransaction={handleAddTransaction}
        />

        {propertyToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setPropertyToDelete(null)} />
            <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Archive Property?</h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                You are about to archive <strong className="text-slate-900">{properties.find(p => p.id === propertyToDelete)?.address}</strong>. <br/><br/>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">Ledger history will be preserved</span>
              </p>
              
              <div className="flex space-x-3">
                <button 
                  onClick={() => setPropertyToDelete(null)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDeleteProperty}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-100"
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
