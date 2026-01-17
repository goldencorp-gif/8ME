
import React, { useState } from 'react';
import { MaintenanceTask, Property } from '../types';
import { prioritizeMaintenance } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';

interface MaintenanceProps {
  tasks: MaintenanceTask[];
  properties: Property[];
  onAddTask: (task: MaintenanceTask) => void;
  onUpdateTask: (task: MaintenanceTask) => void;
}

const Maintenance: React.FC<MaintenanceProps> = ({ tasks, properties, onAddTask, onUpdateTask }) => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  
  const [formData, setFormData] = useState({
    propertyId: '',
    issue: '',
    priority: 'Medium' as MaintenanceTask['priority'],
    requestDate: new Date().toISOString().split('T')[0]
  });

  const columns: MaintenanceTask['status'][] = ['New', 'Quote', 'In Progress', 'Completed'];

  const inputClass = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-bold text-slate-900";

  // ACCESS CONTROL: Block Trial/Demo Users
  if (user?.plan === 'Trial') {
      return (
          <div className="max-w-4xl mx-auto py-24 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4">Feature Locked</h2>
              <p className="text-slate-500 max-w-lg mx-auto mb-8">
                  The Maintenance Hub is a premium feature available to subscribed clients only. <br/><br/>
                  Demo accounts are limited to Dashboard, Properties, Schedule, and Tenants views.
              </p>
          </div>
      );
  }

  const handleAiPriority = async () => {
    if (!formData.issue) return;
    setLoadingAi(true);
    const suggestedPriority = await prioritizeMaintenance(formData.issue);
    // FIX: Type assertion to ensure state compatibility
    setFormData(prev => ({ ...prev, priority: suggestedPriority as MaintenanceTask['priority'] }));
    setLoadingAi(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find(p => p.id === formData.propertyId);
    if (!prop) return;

    const newTask: MaintenanceTask = {
      id: `M-${Date.now()}`,
      propertyId: prop.id,
      propertyAddress: prop.address,
      issue: formData.issue,
      priority: formData.priority,
      status: 'New',
      requestDate: formData.requestDate
    };

    onAddTask(newTask);
    setIsModalOpen(false);
    setFormData({ propertyId: '', issue: '', priority: 'Medium', requestDate: new Date().toISOString().split('T')[0] });
  };

  const moveTask = (task: MaintenanceTask, direction: 'forward' | 'backward') => {
    const currentIndex = columns.indexOf(task.status);
    const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex >= 0 && newIndex < columns.length) {
      onUpdateTask({ ...task, status: columns[newIndex] });
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Urgent': return 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Maintenance Hub</h2>
          <p className="text-slate-500">Track repairs, quotes, and work orders across the portfolio.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Log Request
        </button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-[1000px] h-full">
          {columns.map(col => (
            <div key={col} className="flex-1 flex flex-col min-h-[500px]">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs">{col}</h3>
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  {tasks.filter(t => t.status === col).length}
                </span>
              </div>
              
              <div className={`flex-1 rounded-[2rem] p-4 space-y-4 border ${col === 'Completed' ? 'bg-slate-50 border-slate-100' : 'bg-slate-100/50 border-slate-200/50'}`}>
                {tasks.filter(t => t.status === col).map(task => (
                  <div key={task.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{new Date(task.requestDate).toLocaleDateString('en-AU', {month: 'short', day: 'numeric'})}</span>
                    </div>
                    
                    <h4 className="font-bold text-slate-900 text-sm mb-1 leading-snug">{task.propertyAddress}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{task.issue}</p>
                    
                    <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={() => moveTask(task, 'backward')} 
                         disabled={col === 'New'}
                         className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 disabled:opacity-0"
                       >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                       </button>
                       <span className="text-[9px] font-bold text-slate-300 uppercase">Move</span>
                       <button 
                         onClick={() => moveTask(task, 'forward')}
                         disabled={col === 'Completed'}
                         className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 disabled:opacity-0"
                       >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                       </button>
                    </div>
                  </div>
                ))}
                {tasks.filter(t => t.status === col).length === 0 && (
                  <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center">
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Empty</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-bold text-slate-900">Log Maintenance</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>

             <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Affected Property</label>
                  <select 
                    required
                    value={formData.propertyId}
                    onChange={(e) => setFormData({...formData, propertyId: e.target.value})}
                    className={inputClass}
                  >
                    <option value="">Select Asset...</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Issue Description</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="e.g. Hot water system leaking in garage"
                    value={formData.issue}
                    onChange={(e) => setFormData({...formData, issue: e.target.value})}
                    onBlur={handleAiPriority} // Trigger AI on blur
                    className={inputClass}
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center">
                    <svg className="w-3 h-3 mr-1 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H10a1 1 0 110-2h1V3a1 1 0 011-1zM6 8a1 1 0 011 1v2h2a1 1 0 110 2H7v2a1 1 0 11-2 0v-2H3a1 1 0 110-2h2V9a1 1 0 011-1zM18 14a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" /></svg>
                    AI will auto-detect priority when you finish typing
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Priority Level</label>
                    {loadingAi ? (
                      <div className="h-[46px] w-full bg-slate-100 rounded-xl animate-pulse flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-400">Analyzing Risk...</span>
                      </div>
                    ) : (
                      <select 
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                        className={inputClass}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reported Date</label>
                    <input 
                      type="date" 
                      value={formData.requestDate}
                      onChange={(e) => setFormData({...formData, requestDate: e.target.value})}
                      className={inputClass}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={!formData.propertyId || !formData.issue}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none"
                >
                  Create Work Order
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
