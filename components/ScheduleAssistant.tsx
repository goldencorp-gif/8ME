
import React, { useState, useRef, useEffect } from 'react';
import { CalendarEvent } from '../types';
import { processScheduleVoiceCommand, processScheduleTextCommand, optimizeScheduleOrder, generateScheduleTips, summarizePropertyHistory, generateTaskSuggestions } from '../services/geminiService';

interface ScheduleAssistantProps {
  currentDate: Date;
  dayEvents: CalendarEvent[];
  allHistoryEvents: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onReorderEvents: (orderedIds: string[]) => void;
  suggestTask?: CalendarEvent | null;
  onClearSuggestion?: () => void;
}

const ScheduleAssistant: React.FC<ScheduleAssistantProps> = ({ 
  currentDate, 
  dayEvents, 
  allHistoryEvents,
  onAddEvent, 
  onReorderEvents,
  suggestTask,
  onClearSuggestion
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [historyResult, setHistoryResult] = useState('');
  const [scheduleList, setScheduleList] = useState<CalendarEvent[] | null>(null);
  
  // Permission State
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Effect to generate daily tip or reset message
  useEffect(() => {
    if (dayEvents.length > 0 && !suggestTask) {
      generateScheduleTips(dayEvents).then(msg => setAssistantMessage(`Tip: ${msg}`));
    } else if (!suggestTask) {
      setAssistantMessage("Day is clear. I'm ready to help organize your schedule.");
    }
  }, [dayEvents, suggestTask]);

  // Effect to handle Task Suggestion
  useEffect(() => {
    if (suggestTask) {
      setProcessing(true);
      setAssistantMessage(`Generating suggestions for "${suggestTask.title}"...`);
      generateTaskSuggestions(
        suggestTask.title, 
        suggestTask.type, 
        suggestTask.description || '', 
        suggestTask.propertyAddress || ''
      ).then(text => {
         setAssistantMessage(`${text}`);
         setProcessing(false);
      });
    }
  }, [suggestTask]);

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
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser API not supported");
      }

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
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      // Improved Error Handling for UI
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setAssistantMessage("Mic Access Denied: Please allow microphone permissions in your browser settings (lock icon in address bar) to use voice commands.");
      } else if (err.message === "Browser API not supported") {
        setAssistantMessage("Microphone not supported in this browser context.");
      } else {
        setAssistantMessage("Could not access microphone. Please check system settings.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!inputText.trim()) return;
    
    setProcessing(true);
    const scheduleContext = dayEvents.map(e => `${e.time} - ${e.title} (${e.propertyAddress})`).join('\n');
    
    const result = await processScheduleTextCommand(
        inputText,
        currentDate.toISOString().split('T')[0],
        scheduleContext
    );
    
    handleVoiceResult(result); // Re-use the same handler for result processing
    setProcessing(false);
    setInputText('');
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
      setInputText(result.propertyKeywords || '');
      handleLookupHistory(result.propertyKeywords);
    } else if (result.intent === 'UNKNOWN') {
      if (!result.speechResponse) setAssistantMessage("Sorry, I didn't quite catch that.");
    }
  };

  const handleOptimize = async () => {
    if (dayEvents.length < 2) return;
    setProcessing(true);
    setAssistantMessage("Analyzing route efficiency...");
    
    try {
        const orderedIds = await optimizeScheduleOrder(dayEvents);
        if (orderedIds && orderedIds.length > 0) {
            onReorderEvents(orderedIds);
            setAssistantMessage(`Route optimized! I've reordered ${orderedIds.length} stops for better flow.`);
        } else {
            setAssistantMessage("I couldn't find a better route for these locations.");
        }
    } catch (e: any) {
        console.error(e);
        if (e.message && (e.message.includes('API_KEY') || e.status === 400 || e.status === 403)) {
            setAssistantMessage("Error: API Key invalid or missing. Please check your configuration.");
        } else if (e.status === 429) {
            setAssistantMessage("Service busy (429). Please try again in a moment.");
        } else {
            setAssistantMessage("Sorry, I encountered an issue optimizing the route.");
        }
    }
    setProcessing(false);
  };

  const handleLookupHistory = async (query?: string) => {
    const q = query || inputText;
    if (!q) return;
    setProcessing(true);
    const summary = await summarizePropertyHistory(q, allHistoryEvents);
    setHistoryResult(summary);
    setProcessing(false);
  };

  const handleDownloadList = () => {
    if (!scheduleList || scheduleList.length === 0) return;

    const headers = "Time,Title,Type,Address,Description\n";
    const rows = scheduleList.map(evt => {
      const clean = (str?: string) => `"${(str || '').replace(/"/g, '""')}"`;
      return `${clean(evt.time)},${clean(evt.title)},${clean(evt.type)},${clean(evt.propertyAddress)},${clean(evt.description)}`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Schedule_Export_${currentDate.toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDismissBubble = () => {
    if (onClearSuggestion) {
        onClearSuggestion();
    }
    // Also try to reset message to default tip if applicable
    if (!suggestTask) {
        generateScheduleTips(dayEvents).then(msg => setAssistantMessage(`Tip: ${msg}`));
    }
  };

  return (
    <div className="bg-gradient-to-b from-indigo-50 to-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden flex flex-col mb-4">
      <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
        <div>
           <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             Schedule AI
           </h3>
        </div>
        <div className="flex items-center gap-2">
           {suggestTask && <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-bold">Suggesting...</span>}
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
        
        <div className="flex items-start gap-4">
            {/* Voice Command Button - Compact */}
            <div className="shrink-0 relative">
              {isRecording && (
                 <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-75"></div>
              )}
              <button
                onClick={toggleRecording}
                disabled={processing}
                className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${isRecording ? 'bg-rose-600 text-white' : 'bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-300'}`}
              >
                {processing ? (
                   <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                ) : isRecording ? (
                   <div className="w-4 h-4 bg-white rounded-sm animate-pulse" /> 
                ) : (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                )}
              </button>
            </div>

            {/* AI Response Bubble */}
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex-1 min-h-[60px] flex items-start relative group">
                 <div className="w-full pr-5">
                    <h5 className="text-[9px] font-black uppercase text-indigo-800 tracking-widest mb-1">{suggestTask ? `Advice for: ${suggestTask.type}` : 'AI Response'}</h5>
                    <div className="text-xs text-indigo-900 leading-relaxed font-medium whitespace-pre-line">
                        {assistantMessage || "Ready to assist."}
                    </div>
                 </div>
                 {/* Close Button for Suggestions */}
                 {(suggestTask || (assistantMessage && !assistantMessage.startsWith('Tip') && assistantMessage !== "Ready to assist.")) && (
                    <button 
                        onClick={handleDismissBubble}
                        className="absolute top-2 right-2 text-indigo-300 hover:text-indigo-600 p-1 rounded-md hover:bg-indigo-100 transition-colors"
                        title="Dismiss Suggestion"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                 )}
            </div>
        </div>

        {/* Schedule List (Visible when asked) */}
        {scheduleList && (
          <div className="space-y-2">
             <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-black uppercase text-indigo-900 tracking-widest">Today's Agenda</h4>
                <div className="flex items-center gap-2">
                    {scheduleList.length > 0 && (
                      <button 
                        onClick={handleDownloadList}
                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-white px-2 py-1 rounded-md border border-indigo-100 shadow-sm"
                        title="Download as CSV"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export
                      </button>
                    )}
                    <button 
                        onClick={() => setScheduleList(null)}
                        className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                        title="Close List"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
             </div>
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

        {/* Compact Actions Row */}
        <div className="flex gap-2">
             <button 
               onClick={handleOptimize}
               disabled={dayEvents.length < 2 || processing}
               className="flex-1 py-2 bg-white border border-indigo-100 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-50 shadow-sm transition-all flex items-center justify-center gap-1 disabled:opacity-50"
             >
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               Optimize Route
             </button>
        </div>

        {/* Text Input / History Lookup */}
        <div className="relative">
            <input 
            type="text" 
            placeholder="Ask AI (e.g. 'Add inspection at 10am', 'Show history')..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <button 
            onClick={handleTextSubmit}
            disabled={processing || !inputText}
            className="absolute right-1 top-1 p-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 disabled:opacity-50"
            >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
        </div>
        
        {historyResult && (
            <div className="mt-2 p-3 bg-white border border-slate-200 rounded-xl max-h-40 overflow-y-auto relative group">
                <div className="flex justify-between items-center mb-2 sticky top-0 bg-white/90 backdrop-blur-sm pb-1 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">History / Suggestions</span>
                    <button 
                        onClick={() => setHistoryResult('')}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-50 transition-colors"
                        title="Dismiss"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="prose prose-sm text-xs text-slate-600">
                    {historyResult.split('\n').map((line, i) => <p key={i} className="mb-1">{line}</p>)}
                </div>
            </div>
        )}

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
