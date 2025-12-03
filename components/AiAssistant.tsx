import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Sparkles, Loader2, Minimize2, Mic, Square, StopCircle, Volume2, Globe } from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStatus, User as UserType } from '../types';
import { streamAssistantMessage, transcribeAudio, generateSpeech, playRawAudio } from '../services/geminiService';
import { GenerateContentResponse } from "@google/genai";

interface AiAssistantProps {
  students: Student[];
  records: AttendanceRecord[];
  currentUser: UserType;
}

interface GroundingChunk {
  web?: { uri: string; title: string };
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: GroundingChunk[];
}

const AiAssistant: React.FC<AiAssistantProps> = ({ students, records, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: `أهلاً بك يا ${currentUser.name}. أنا مساعدك الذكي، كيف يمكنني مساعدتك اليوم في إدارة الحضور والطلاب؟` }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlayingId, setIsPlayingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

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
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        try {
           const reader = new FileReader();
           reader.readAsDataURL(audioBlob);
           reader.onloadend = async () => {
              const base64Audio = (reader.result as string).split(',')[1];
              const text = await transcribeAudio(base64Audio, audioBlob.type);
              if (text) {
                 setInput(prev => (prev ? prev + ' ' + text : text));
              }
              setIsTranscribing(false);
           };
        } catch (error) {
           console.error("Transcription error", error);
           setIsTranscribing(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("لا يمكن الوصول للميكروفون.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePlayTTS = async (text: string, msgId: string) => {
    if (isPlayingId === msgId) return; // Prevent double play
    setIsPlayingId(msgId);
    
    try {
      const audioBase64 = await generateSpeech(text);
      if (audioBase64) {
        await playRawAudio(audioBase64);
      }
    } catch (e) {
      console.error(e);
    } finally {
      // Small delay before resetting state to allow animation to finish
      setTimeout(() => setIsPlayingId(null), 1000); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Prepare context
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = records.filter(r => r.date === today);
      
      const context = {
        currentUser: currentUser.name,
        today: today,
        totalStudents: students.length,
        todayStats: {
          present: todayRecords.filter(r => r.status === AttendanceStatus.PRESENT).length,
          absent: todayRecords.filter(r => r.status === AttendanceStatus.ABSENT).length,
          late: todayRecords.filter(r => r.status === AttendanceStatus.LATE).length,
          excused: todayRecords.filter(r => r.status === AttendanceStatus.EXCUSED).length,
        },
        absentStudentsNames: todayRecords
          .filter(r => r.status === AttendanceStatus.ABSENT)
          .map(r => students.find(s => s.id === r.studentId)?.name)
          .filter(Boolean),
      };

      const resultStream = await streamAssistantMessage(userMsg.text, context);
      
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '' }]);
      
      let fullText = '';
      let groundingSources: GroundingChunk[] = [];

      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullText += c.text;
        }
        if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
           groundingSources = [...groundingSources, ...c.candidates[0].groundingMetadata.groundingChunks];
        }
        
        setMessages(prev => prev.map(m => 
          m.id === botMsgId ? { ...m, text: fullText, sources: groundingSources } : m
        ));
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 left-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2 ${
          isOpen ? 'bg-red-500 hover:bg-red-600 rotate-90' : 'bg-indigo-600 hover:bg-indigo-700 animate-bounce-slow'
        } text-white`}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} className="text-yellow-300" />}
        {!isOpen && <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap hidden md:inline-block">المساعد الذكي</span>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 z-50 w-full max-w-sm md:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fade-in origin-bottom-left h-[500px] max-h-[80vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">المساعد الذكي</h3>
                <p className="text-[10px] text-indigo-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  متصل (Gemini AI + Search)
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <Minimize2 size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="flex flex-col gap-1 max-w-[85%]">
                   <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                     msg.role === 'user' 
                       ? 'bg-indigo-600 text-white rounded-tr-none' 
                       : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none'
                   }`}>
                     {msg.text}
                   </div>
                   
                   {/* Sources */}
                   {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                      <div className="bg-slate-100 p-2 rounded-lg text-[10px] text-slate-600 flex flex-wrap gap-2">
                         <span className="font-bold flex items-center gap-1"><Globe size={10} /> المصادر:</span>
                         {msg.sources.map((s, i) => s.web ? (
                            <a key={i} href={s.web.uri} target="_blank" rel="noreferrer" className="underline hover:text-indigo-600 truncate max-w-[150px]">
                               {s.web.title}
                            </a>
                         ) : null)}
                      </div>
                   )}

                   {msg.role === 'model' && msg.text && (
                     <button 
                       onClick={() => handlePlayTTS(msg.text, msg.id)}
                       disabled={isPlayingId !== null}
                       className="self-end p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex items-center gap-1 text-xs"
                     >
                       <Volume2 size={14} className={isPlayingId === msg.id ? "animate-pulse text-indigo-600" : ""} />
                       <span className="sr-only">استماع</span>
                     </button>
                   )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex items-center gap-1">
                   <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                   <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                   <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0 items-center">
             {isRecording ? (
                <button
                   type="button"
                   onClick={stopRecording}
                   className="p-3 bg-red-100 text-red-600 rounded-full hover:bg-red-200 animate-pulse transition-colors"
                >
                   <Square size={20} fill="currentColor" />
                </button>
             ) : (
                <button
                   type="button"
                   onClick={startRecording}
                   disabled={isTyping || isTranscribing}
                   className="p-3 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                   <Mic size={20} />
                </button>
             )}
             
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isTranscribing ? "جاري تحويل الصوت..." : "اكتب رسالتك هنا..."}
              disabled={isTranscribing || isRecording}
              className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-70"
            />
            
            <button 
              type="submit" 
              disabled={!input.trim() || isTyping || isRecording || isTranscribing}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-colors flex items-center justify-center"
            >
              {(isTyping || isTranscribing) ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="rtl:-rotate-180" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AiAssistant;