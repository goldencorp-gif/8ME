
import React, { useState, useRef, useEffect } from 'react';
import { CalendarEvent } from '../types';
import { processScheduleVoiceCommand, optimizeScheduleOrder, generateScheduleTips, summarizePropertyHistory } from '../services/geminiService';

interface ScheduleAssistantProps {
  currentDate: Date;
  dayEvents: CalendarEvent[];
  allHistoryEvents: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onReorderEvents: (orderedIds: string[]) => void;
}

const ScheduleAssistant: React.FC<ScheduleAssistantProps> = ({ 
  currentDate, 
  dayEvents, 
  allHistoryEvents,
  onAddEvent, 
  onReorderEvents 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState<string>('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyResult, setHistoryResult] = useState('');
  const [scheduleList, setScheduleList] = useState<CalendarEvent[] | null>(null);
  
  // Permission State
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Generate a fresh tip when the day's events change
    if (dayEvents.length > 0) {
      generateScheduleTips(dayEvents).then(msg => setAssistantMessage(`Tip: ${msg}`));
    } else {
        setAssistantMessage("Day is clear. I'm ready to help organize your schedule.");
    }
  }, [dayEvents]);

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      // Check Permissions before starting
      const storedPermission = localStorage.getItem('8me_mic_enabled');
      
      if (storedPermission === 'false') {
        alert("Microphone access is disabled in Settings. Please go to Settings > Device Permissions to enable it.");
        return;
      }

      if (storedPermission === null) {
        // First time use - show custom prompt
        setShowPermissionModal(true);
        return;
      }

      // If granted (storedPermission === 'true'), proceed
      await startRecording();
    }
  };

  const handlePermissionResponse = (granted: boolean) => {
    localStorage.setItem('8me_mic_enabled', String(granted));
    setShowPermissionModal(false);
    if (granted) {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          // Prepare context of current schedule for the AI
          const scheduleContext = dayEvents.map(e => `${e.time} - ${e.title} (${e.propertyAddress})`).join('\n');
          
          const result = await processScheduleVoiceCommand(
            base64Audio, 
            currentDate.toISOString().split('T')[0],
            scheduleContext
          );
          
          handleVoiceResult(result);
          setProcessing(false);
        };
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setAssistantMessage("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const checkConflict = (time: string): boolean => {
    if (!time) return false;
    const [newHour, newMin] = time.split(':').map(Number);
    const newTimeVal = newHour * 60 + newMin;

    return dayEvents.some(evt => {
      if (!evt.time) return false;
      const [exHour, exMin] = evt.time.split(':').map(Number);
      const exTimeVal = exHour * 60 + exMin;
      // Simple conflict check: assume 1 hour blocks. Check if start time is within 60 mins of existing event
      return Math.abs(newTimeVal - exTimeVal) < 60;
    });
  };

  const handleVoiceResult = (result: any) => {
    // Show AI conversational response if available
    if (result.speechResponse) {
      setAssistantMessage(result.speechResponse);
    }

    if (result.intent === 'ADD_EVENT' && result.eventData) {
      const isConflict = checkConflict(result.eventData.time);
      
      if (isConflict) {
        setAssistantMessage(`⚠️ Conflict detected at ${result.eventData.time}. Please suggest an alternate time.`);
        // Play a small error sound or vibration if on mobile could be added here
      } else {
        const evt: CalendarEvent = {
          id: `voice-${Date.now()}`,
          title: result.eventData.title || 'New Event',
          date: result.eventData.date || currentDate.toISOString().split('T')[0],
          time: result.eventData.time || '09:00',
          type: result.eventData.type || 'Viewing',
          propertyAddress: result.eventData.address,
          description: result.eventData.description
        };
        onAddEvent(evt);
        setAssistantMessage(`Scheduled "${evt.title}" at ${evt.time}.`);
      }
    } else if (result.intent === 'LIST_SCHEDULES') {
      const sorted = [...dayEvents].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      setScheduleList(sorted);
      setAssistantMessage(`Here is your schedule for today.`);
    } else if (result.intent === 'OPTIMIZE') {
      handleOptimize();
    } else if (result.intent === 'HISTORY') {
      setHistoryQuery(result.propertyKeywords || '');
      handleLookupHistory(result.propertyKeywords);
    } else if (result.intent === 'UNKNOWN') {
      // Fallback message already set via speechResponse usually, but ensure fallback
      if (!result.speechResponse) setAssistantMessage("Sorry, I didn't quite catch that.");
    }
  };

  const handleOptimize = async () => {
    if (dayEvents.length < 2) return;
    setProcessing(true);
    const orderedIds = await optimizeScheduleOrder(dayEvents);
    onReorderEvents(orderedIds);
    setProcessing(false);
    setAssistantMessage("Schedule optimized for travel efficiency.");
  };

  const handleLookupHistory = async (query?: string) => {
    const q = query || historyQuery;
    if (!q) return;
    setProcessing(true);
    const summary = await summarizePropertyHistory(q, allHistoryEvents);
    setHistoryResult(summary);
    setProcessing(false);
  };

  return (
    <div className="bg-gradient-to-b from-indigo-50 to-white rounded-[2.5rem] border border-indigo-100 shadow-xl overflow-hidden flex flex-col h-full">
      <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
        <div>
           <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             Schedule AI
           </h3>
           <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest">Intelligent Assistant</p>
        </div>
      </div>

      <div className="p-6 space-y-8 flex-1 overflow-y-auto">
        
        {/* Voice Command Section */}
        <div className="text-center space-y-4">
           <div className="relative inline-block">
              {isRecording && (
                 <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-75"></div>
              )}
              <button
                onClick={toggleRecording}
                disabled={processing}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isRecording ? 'bg-rose-600 text-white' : 'bg-white text-indigo-600 border-4 border-indigo-50'}`}
              >
                {processing ? (
                   <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                ) : isRecording ? (
                   <div className="w-8 h-8 bg-white rounded-sm animate-pulse" /> // Stop Icon
                ) : (
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                )}
              </button>
           </div>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
             {isRecording ? "Listening... Click to Stop" : processing ? "Thinking..." : "Tap to Speak"}
           </p>
        </div>

        {/* AI Response Bubble */}
        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 min-h-[80px] flex items-center">
             <div className="flex items-start gap-3 w-full">
                <div className="bg-white p-1.5 rounded-lg text-indigo-600 shadow-sm shrink-0">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
                <div>
                   <h5 className="text-[10px] font-black uppercase text-indigo-800 tracking-widest mb-1">AI Response</h5>
                   <p className="text-xs text-indigo-900 leading-relaxed font-medium">{assistantMessage}</p>
                </div>
             </div>
        </div>

        <hr className="border-indigo-50" />

        {/* Schedule List (Visible when asked) */}
        {scheduleList && (
          <div className="space-y-2">
             <h4 className="text-xs font-black uppercase text-indigo-900 tracking-widest mb-2">Today's Agenda</h4>
             <div className="bg-white border border-slate-200 rounded-xl p-2 max-h-40 overflow-y-auto">
               {scheduleList.length === 0 ? (
                 <p className="text-xs text-slate-400 text-center py-4">No events found.</p>
               ) : (
                 scheduleList.map((evt, i) => (
                   <div key={i} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg text-xs border-b border-slate-50 last:border-0">
                      <span className="font-bold text-slate-700 w-12">{evt.time}</span>
                      <span className="truncate flex-1 font-medium text-slate-600">{evt.title}</span>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}

        {/* Actions */}
        <div>
           <h4 className="text-xs font-black uppercase text-indigo-900 tracking-widest mb-3">Quick Actions</h4>
           <div className="grid grid-cols-2 gap-2">
             <button 
               onClick={handleOptimize}
               disabled={dayEvents.length < 2 || processing}
               className="py-3 bg-white border border-indigo-100 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-50 shadow-sm transition-all flex items-center justify-center gap-1 disabled:opacity-50"
             >
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               Optimize
             </button>
             <button 
               onClick={() => setScheduleList(null)} // Clear list to reset view
               className="py-3 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 shadow-sm transition-all"
             >
               Clear View
             </button>
           </div>
        </div>

        {/* History Lookup */}
        <div>
           <h4 className="text-xs font-black uppercase text-indigo-900 tracking-widest mb-3">Property History</h4>
           <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Search Address..."
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button 
                onClick={() => handleLookupHistory()}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
           </div>
           {historyResult && (
             <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                <div className="prose prose-sm text-xs text-slate-600">
                   {historyResult.split('\n').map((line, i) => <p key={i} className="mb-1">{line}</p>)}
                </div>
             </div>
           )}
        </div>

      </div>

      {/* Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setShowPermissionModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 text-center">
             <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
             </div>
             <h3 className="text-lg font-black text-slate-900 mb-2">Microphone Access</h3>
             <p className="text-sm text-slate-500 mb-6">
               The AI Assistant uses your microphone to listen to voice commands and dictate notes. Do you want to enable this feature?
             </p>
             <div className="grid grid-cols-2 gap-3">
               <button 
                 onClick={() => handlePermissionResponse(false)}
                 className="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200"
               >
                 Deny
               </button>
               <button 
                 onClick={() => handlePermissionResponse(true)}
                 className="py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200"
               >
                 Allow Access
               </button>
             </div>
             <p className="text-[10px] text-slate-400 mt-4">You can change this later in Settings.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleAssistant;
