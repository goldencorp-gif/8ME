
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, UserAccount } from '../types';
import { getDbConnectionInfo } from '../services/db';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userProfile: UserProfile;
  userRole?: UserAccount['role'];
  onLogout?: () => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  userProfile, 
  userRole, 
  onLogout,
  isMobileOpen = false,
  setIsMobileOpen
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [dbInfo, setDbInfo] = useState({ type: 'Local', label: 'Local Storage' });
  const menuRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { id: 'dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Dashboard' },
    { id: 'schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Schedule' },
    { id: 'properties', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', label: 'Properties' },
    { id: 'tenancies', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', label: 'Tenants' },
    { id: 'trust', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Trust Accounting' },
    { id: 'maintenance', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', label: 'Maintenance' },
    { id: 'logbook', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', label: 'Logbook' },
    { id: 'ai-assistant', icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'AI Tools' },
  ];

  // Handle click outside for profile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    setDbInfo(getDbConnectionInfo()); // Check DB status
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle PWA Install Prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  const handleLinkClick = (id: string) => {
      setActiveTab(id);
      if (setIsMobileOpen) setIsMobileOpen(false);
  };

  // Base classes for sidebar container
  const sidebarClasses = `fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-40 transition-transform duration-300 ease-in-out ${
    isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
  }`;

  return (
    <>
        {/* Mobile Overlay */}
        {isMobileOpen && (
            <div 
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
                onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
            />
        )}

        <aside className={sidebarClasses}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <BrandLogo variant="header" />
            {/* Mobile Close Button */}
            <button 
                onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        
        <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto">
            {/* Data Sovereignty Indicator */}
            {dbInfo.type === 'Cloud' && (
                <div className="px-4 py-2 mb-4 mx-1 bg-emerald-900/30 border border-emerald-900/50 rounded-lg flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Connected</p>
                        <p className="text-[10px] text-emerald-400/70 truncate w-40">Private Cloud DB</p>
                    </div>
                </div>
            )}

            {menuItems.map((item) => (
            <button
                key={item.id}
                onClick={() => handleLinkClick(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === item.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span className="font-medium">{item.label}</span>
            </button>
            ))}

            {userRole === 'Master' && (
            <div className="mt-8 pt-8 border-t border-slate-800">
                <p className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Super Admin</p>
                <button
                onClick={() => handleLinkClick('master-console')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeTab === 'master-console' 
                    ? 'bg-gradient-to-r from-rose-600 to-orange-600 text-white shadow-lg' 
                    : 'text-rose-400 hover:bg-slate-800 hover:text-white'
                }`}
                >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                <span className="font-bold">Master Console</span>
                </button>
            </div>
            )}
        </nav>

        <div className="p-4 border-t border-slate-800 relative space-y-4" ref={menuRef}>
            
            {/* Install App Button (Only shows if browser supports PWA) */}
            {showInstallBtn && (
              <button 
                onClick={handleInstallClick}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span className="text-xs font-black uppercase tracking-widest">Install App</span>
              </button>
            )}

            {/* User Menu Popover */}
            {showProfileMenu && (
            <div className="absolute bottom-20 left-4 right-4 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-50">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account</p>
                <p className="text-sm font-bold text-slate-900 truncate">{userProfile.email}</p>
                </div>
                <div className="p-2">
                <button 
                    onClick={() => { handleLinkClick('settings'); setShowProfileMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg flex items-center space-x-2 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    <span>Agency Settings</span>
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button 
                    onClick={() => { if(onLogout) onLogout(); }}
                    className="w-full text-left px-3 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg flex items-center space-x-2 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    <span>Sign Out</span>
                </button>
                </div>
            </div>
            )}

            <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`w-full flex items-center space-x-3 p-2 rounded-xl transition-all ${showProfileMenu ? 'bg-slate-800 ring-2 ring-indigo-500' : 'bg-slate-800/50 hover:bg-slate-800'}`}
            >
            <img src="https://picsum.photos/32/32" className="w-8 h-8 rounded-full border border-indigo-400" alt="Avatar" />
            <div className="flex-1 overflow-hidden text-left">
                <p className="text-sm font-semibold truncate">{userProfile.name}</p>
                <p className="text-xs text-slate-500 truncate">{userProfile.title}</p>
            </div>
            <svg className={`w-4 h-4 text-slate-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            </button>
        </div>
        </aside>
    </>
  );
};

export default Sidebar;
