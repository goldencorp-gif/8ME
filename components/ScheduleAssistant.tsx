
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
  const [tip, setTip] = useState<string>('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyResult, setHistoryResult] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Generate a fresh tip when the day's events change
    if (dayEvents.length > 0) {
      generateScheduleTips(dayEvents).then(setTip);
    } else {
        setTip("Day is clear. Good time for admin tasks!");
    }
  }, [dayEvents]);

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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' }); // Gemini accepts mp3 mime for blob generally or raw
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          const result = await processScheduleVoiceCommand(base64Audio, currentDate.toISOString().split('T')[0]);
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
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceResult = (result: any) => {
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
      alert(`AI: Scheduled "${evt.title}"`);
    } else if (result.intent === 'OPTIMIZE') {
      handleOptimize();
    } else if (result.intent === 'HISTORY') {
      setHistoryQuery(result.propertyKeywords || '');
      handleLookupHistory(result.propertyKeywords);
    } else {
      alert("AI: Sorry, I didn't quite catch that command.");
    }
  };

  const handleOptimize = async () => {
    if (dayEvents.length < 2) return;
    setProcessing(true);
    const orderedIds = await optimizeScheduleOrder(dayEvents);
    onReorderEvents(orderedIds);
    setProcessing(false);
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
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={processing}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isRecording ? 'bg-rose-600 text-white' : 'bg-white text-indigo-600 border-4 border-indigo-50'}`}
              >
                {processing ? (
                   <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                ) : (
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                )}
              </button>
           </div>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
             {isRecording ? "Listening..." : processing ? "Thinking..." : "Hold to Speak"}
           </p>
           <p className="text-[10px] text-slate-400 italic">"Schedule inspection at 5 Ocean St tomorrow 2pm"</p>
        </div>

        <hr className="border-indigo-50" />

        {/* Sorting */}
        <div>
           <h4 className="text-xs font-black uppercase text-indigo-900 tracking-widest mb-3">Daily Optimization</h4>
           <button 
             onClick={handleOptimize}
             disabled={dayEvents.length < 2 || processing}
             className="w-full py-3 bg-white border border-indigo-100 text-indigo-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-50 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
             Smart Sort Route
           </button>
        </div>

        {/* Tips */}
        {tip && (
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
             <div className="flex items-start gap-3">
                <div className="bg-white p-1.5 rounded-lg text-indigo-600 shadow-sm">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                   <h5 className="text-[10px] font-black uppercase text-indigo-800 tracking-widest mb-1">AI Insight</h5>
                   <p className="text-xs text-indigo-900 leading-relaxed font-medium">"{tip}"</p>
                </div>
             </div>
          </div>
        )}

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
    </div>
  );
};

export default ScheduleAssistant;
