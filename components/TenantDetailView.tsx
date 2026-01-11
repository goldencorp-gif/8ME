
import React, { useState, useRef } from 'react';
import { Property, PropertyDocument } from '../types';

interface TenantDetailViewProps {
  property: Property;
  onClose: () => void;
  onOpenProperty: (property: Property) => void;
  onUpdateProperty?: (property: Property) => void;
}

const TenantDetailView: React.FC<TenantDetailViewProps> = ({ property, onClose, onOpenProperty, onUpdateProperty }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'lease' | 'communications'>('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Message State
  const [isComposing, setIsComposing] = useState(false);
  const [messageText, setMessageText] = useState('');

  // Mock Tenant Documents (filtered from property docs in a real app)
  const tenantDocs = property.documents?.filter(d => 
    d.category === 'Legal' || d.subCategory === 'Tenant' || d.category === 'Applications'
  ) || [];

  const handleLeaseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateProperty) {
       const newDoc: PropertyDocument = {
          id: `doc-lease-${Date.now()}`,
          name: file.name,
          category: 'Legal',
          type: 'PDF',
          dateAdded: new Date().toISOString().split('T')[0],
          size: `${(file.size / 1024).toFixed(0)} KB`,
          subCategory: 'Tenant'
       };
       onUpdateProperty({
          ...property,
          documents: [...(property.documents || []), newDoc]
       });
       alert("Lease document uploaded successfully.");
    }
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = () => {
      if (!messageText.trim()) {
          alert("Please enter a message.");
          return;
      }
      alert(`Message sent to ${property.tenantName || 'Tenant'}:\n\n"${messageText}"\n\n(Logged to history)`);
      setMessageText('');
      setIsComposing(false);
      // In a real app, this would add to communication log via onUpdateProperty
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      
      {/* Slide-in Panel */}
      <div className="absolute inset-y-0 right-0 max-w-4xl w-full bg-slate-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 rounded-l-[3rem]">
        
        {/* Tenant Header */}
        <div className="bg-white px-10 py-8 border-b border-slate-200 rounded-tl-[3rem] flex justify-between items-start shrink-0">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-inner">
              {property.tenantName ? property.tenantName.charAt(0) : '?'}
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">Active Tenant</span>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">ID: {property.id.slice(-6)}</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{property.tenantName || 'Unknown Tenant'}</h2>
              <div className="flex items-center space-x-4 mt-2 text-sm font-medium text-slate-500">
                 <a href={`mailto:${property.tenantEmail}`} className="hover:text-emerald-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 00-2 2z" /></svg>
                    {property.tenantEmail || 'No Email'}
                 </a>
                 <a href={`tel:${property.tenantPhone}`} className="hover:text-emerald-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {property.tenantPhone || 'No Phone'}
                 </a>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
             <button onClick={() => { onClose(); onOpenProperty(property); }} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                View Property
             </button>
             <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-10 bg-white border-b border-slate-200 flex space-x-6 shrink-0">
           {['overview', 'lease', 'communications'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-colors ${activeTab === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
           ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8">
           
           {/* Current Residence Card (Always Visible Summary) */}
           <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center space-x-4">
                 <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Residence</p>
                    <h4 className="text-lg font-bold text-slate-900">{property.address}</h4>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rent Status</p>
                 <p className={`text-lg font-black ${property.status === 'Arrears' ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {property.status === 'Arrears' ? 'In Arrears' : 'Paid to Date'}
                 </p>
              </div>
           </div>

           {activeTab === 'overview' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Rent Stats */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                   <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-900">Lease Financials</h3>
                      <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
                   </div>
                   <div className="space-y-6">
                      <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                         <span className="text-sm font-medium text-slate-500">Rent Amount</span>
                         <span className="text-xl font-black text-slate-900">${property.rentAmount} <span className="text-xs font-bold text-slate-400">/{property.rentFrequency}</span></span>
                      </div>
                      <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                         <span className="text-sm font-medium text-slate-500">Bond Held</span>
                         <span className="text-xl font-black text-slate-900">${property.bondAmount || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-end">
                         <span className="text-sm font-medium text-slate-500">Paid To</span>
                         <span className="text-sm font-bold text-emerald-600">
                            {new Date().toLocaleDateString()}
                         </span>
                      </div>
                   </div>
                </div>

                {/* Dates */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                   <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-900">Key Dates</h3>
                      <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></span>
                   </div>
                   <div className="space-y-6">
                      <div>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Lease Commenced</p>
                         <p className="text-base font-bold text-slate-900">{property.leaseStart ? new Date(property.leaseStart).toLocaleDateString(undefined, {dateStyle: 'long'}) : 'N/A'}</p>
                      </div>
                      <div>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Lease Expiry</p>
                         <p className="text-base font-bold text-slate-900">{property.leaseEnd ? new Date(property.leaseEnd).toLocaleDateString(undefined, {dateStyle: 'long'}) : 'Periodic'}</p>
                      </div>
                      <div>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Last Inspection</p>
                         <p className="text-base font-bold text-slate-900">14 Mar 2024</p>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'lease' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    onChange={handleLeaseUpload}
                />
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                   <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-900">Lease Documents</h3>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-black uppercase text-indigo-600 hover:text-indigo-800 tracking-widest border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        Upload New
                      </button>
                   </div>
                   <div className="divide-y divide-slate-50">
                      {tenantDocs.length === 0 ? (
                         <div className="p-12 text-center text-slate-400 italic text-sm">No lease documents found.</div>
                      ) : (
                         tenantDocs.map(doc => (
                            <div key={doc.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                               <div className="flex items-center space-x-4">
                                  <div className="p-3 bg-red-50 text-red-500 rounded-xl">
                                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                  </div>
                                  <div>
                                     <p className="font-bold text-slate-900 text-sm">{doc.name}</p>
                                     <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wide">{doc.category} • {doc.dateAdded}</p>
                                  </div>
                               </div>
                               <button className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all">
                                  View
                               </button>
                            </div>
                         ))
                      )}
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'communications' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-center py-10">
                   <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                   </div>
                   <h3 className="text-xl font-bold text-slate-900">Communication Log</h3>
                   <p className="text-slate-500 mt-2 max-w-sm mx-auto mb-6">This feature tracks SMS, Emails, and Portal messages sent to {property.tenantName}.</p>
                   
                   {!isComposing ? (
                       <button 
                            onClick={() => setIsComposing(true)}
                            className="mt-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95"
                       >
                          Compose Message
                       </button>
                   ) : (
                       <div className="max-w-md mx-auto bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left animate-in fade-in slide-in-from-bottom-2">
                           <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">New Message</label>
                           <textarea 
                                autoFocus
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                className="w-full p-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none bg-white"
                                placeholder="Type your message here..."
                           />
                           <div className="flex gap-2 mt-4">
                               <button 
                                    onClick={() => setIsComposing(false)}
                                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50"
                               >
                                   Cancel
                               </button>
                               <button 
                                    onClick={handleSendMessage}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-md"
                               >
                                   Send Now
                               </button>
                           </div>
                       </div>
                   )}
                </div>
             </div>
           )}

        </div>
      </div>
    </div>
  );
};

export default TenantDetailView;
