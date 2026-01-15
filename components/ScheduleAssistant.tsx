
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
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initial State Message
  useEffect(() => {
    if (!suggestTask && !assistantMessage) {
      setAssistantMessage("Ready. Click 'Analyze Day' for insights.");
    }
  }, [suggestTask]);

  // Handle Manual Task Suggestion Click
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

  // ... Voice Recording Logic (Standard) ...
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      const storedPermission = localStorage.getItem('8me_mic_enabled');
      if (storedPermission === 'false') {
        alert("Microphone access is disabled in Settings.");
        return;
      }
      if (storedPermission === null) {
        setShowPermissionModal(true);
        return;
      }
      await startRecording();
    }
  };

  const handlePermissionResponse = (granted: boolean) => {
    localStorage.setItem('8me_mic_enabled', String(granted));
    setShowPermissionModal(false);
    if (granted) startRecording();
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Browser API not supported");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          const scheduleContext = dayEvents.map(e => `${e.time} - ${e.title} (${e.propertyAddress})`).join('\n');
          const result = await processScheduleVoiceCommand(base64Audio, currentDate.toISOString().split('T')[0], scheduleContext);
          handleVoiceResult(result);
          setProcessing(false);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setAssistantMessage("Microphone access required for voice commands.");
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
    const result = await processScheduleTextCommand(inputText, currentDate.toISOString().split('T')[0], scheduleContext);
    handleVoiceResult(result);
    setProcessing(false);
    setInputText('');
  };

  const handleVoiceResult = (result: any) => {
    if (result.speechResponse) setAssistantMessage(result.speechResponse);

    if (result.intent === 'ADD_EVENT' && result.eventData) {
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
    } else if (result.intent === 'LIST_SCHEDULES') {
      const sorted = [...dayEvents].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      setScheduleList(sorted);
      setAssistantMessage(`Here is your schedule for today.`);
    } else if (result.intent === 'OPTIMIZE') {
      handleOptimize();
    } else if (result.intent === 'HISTORY') {
      setInputText(result.propertyKeywords || '');
      handleLookupHistory(result.propertyKeywords);
    }
  };

  const handleAnalyzeDay = async () => {
    if (dayEvents.length === 0) {
      setAssistantMessage("No events to analyze today.");
      return;
    }
    setProcessing(true);
    setAssistantMessage("Analyzing schedule...");
    try {
      const msg = await generateScheduleTips(dayEvents);
      setAssistantMessage(`Tip: ${msg}`);
    } catch (e) {
      setAssistantMessage("Could not generate tips at this time.");
    }
    setProcessing(false);
  };

  const handleOptimize = async () => {
    if (dayEvents.length < 2) {
        setAssistantMessage("Need at least 2 events to optimize route.");
        return;
    }
    setProcessing(true);
    setAssistantMessage("Analyzing route efficiency...");
    
    const orderedIds = await optimizeScheduleOrder(dayEvents);
    if (orderedIds && orderedIds.length > 0) {
        onReorderEvents(orderedIds);
        setAssistantMessage(`Route optimized! I've reordered ${orderedIds.length} stops.`);
    } else {
        setAssistantMessage("Route optimization unavailable (Quota or Error).");
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

  const handleDismissBubble = () => {
    if (onClearSuggestion) onClearSuggestion();
    setAssistantMessage("Ready.");
  };

  // --- REPORTING FEATURE (Microsoft Store Policy 11.16) ---
  const handleReportMessage = () => {
      const reason = prompt("Report Inappropriate Content\n\nPlease describe the issue with this AI response:");
      if (reason) {
          console.log("[Moderation] Message flagged:", assistantMessage, "Reason:", reason);
          alert("Thank you. This content has been flagged for moderation review.");
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
            <div className="shrink-0 relative">
              {isRecording && <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-75"></div>}
              <button onClick={toggleRecording} disabled={processing} className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${isRecording ? 'bg-rose-600 text-white' : 'bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-300'}`}>
                {processing ? (
                   <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                ) : isRecording ? (
                   <div className="w-4 h-4 bg-white rounded-sm animate-pulse" /> 
                ) : (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                )}
              </button>
            </div>

            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex-1 min-h-[60px] flex items-start relative group">
                 <div className="w-full pr-8">
                    <h5 className="text-[9px] font-black uppercase text-indigo-800 tracking-widest mb-1">{suggestTask ? `Advice for: ${suggestTask.type}` : 'AI Response'}</h5>
                    <div className="text-xs text-indigo-900 leading-relaxed font-medium whitespace-pre-line">
                        {assistantMessage || "Ready. Click 'Analyze Day' for insights."}
                    </div>
                 </div>
                 
                 {/* Action Buttons (Dismiss & Report) */}
                 {(suggestTask || (assistantMessage && !assistantMessage.startsWith('Ready'))) && (
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <button 
                            onClick={handleDismissBubble} 
                            className="text-indigo-300 hover:text-indigo-600 p-1 rounded-md hover:bg-indigo-100 transition-colors"
                            title="Dismiss Message"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <button 
                            onClick={handleReportMessage} 
                            className="text-indigo-300 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 transition-colors"
                            title="Report Inappropriate Content"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-11a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                        </button>
                    </div>
                 )}
            </div>
        </div>

        {/* Manual Control Buttons */}
        <div className="flex gap-2">
             <button onClick={handleAnalyzeDay} disabled={dayEvents.length === 0 || processing} className="flex-1 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold hover:bg-indigo-100 shadow-sm transition-all flex items-center justify-center gap-1 disabled:opacity-50">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               Analyze Day
             </button>
             <button onClick={handleOptimize} disabled={dayEvents.length < 2 || processing} className="flex-1 py-2 bg-white border border-indigo-100 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-50 shadow-sm transition-all flex items-center justify-center gap-1 disabled:opacity-50">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               Optimize Route
             </button>
        </div>

        <div className="relative">
            <input 
            type="text" 
            placeholder="Ask AI (e.g. 'Add inspection at 10am', 'Show history')..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <button onClick={handleTextSubmit} disabled={processing || !inputText} className="absolute right-1 top-1 p-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 disabled:opacity-50">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
        </div>
        
        {historyResult && (
            <div className="mt-2 p-3 bg-white border border-slate-200 rounded-xl max-h-40 overflow-y-auto relative group">
                <div className="flex justify-between items-center mb-2 sticky top-0 bg-white/90 backdrop-blur-sm pb-1 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">History / Suggestions</span>
                    <button onClick={() => setHistoryResult('')} className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-50 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="prose prose-sm text-xs text-slate-600">
                    {historyResult.split('\n').map((line, i) => <p key={i} className="mb-1">{line}</p>)}
                </div>
            </div>
        )}
      </div>

      {showPermissionModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setShowPermissionModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 text-center">
             <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
             </div>
             <h3 className="text-lg font-black text-slate-900 mb-2">Microphone Access</h3>
             <p className="text-sm text-slate-500 mb-6">The AI Assistant uses your microphone to listen to voice commands. Enable?</p>
             <div className="grid grid-cols-2 gap-3">
               <button onClick={() => handlePermissionResponse(false)} className="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200">Deny</button>
               <button onClick={() => handlePermissionResponse(true)} className="py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200">Allow</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleAssistant;
