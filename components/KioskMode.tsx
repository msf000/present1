import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CheckCircle2, QrCode, User, Volume2, VolumeX, Maximize, Minimize, Clock } from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStatus } from '../types';
import { saveAttendance, getRecordsByDate } from '../services/storageService';
import { generateSpeech, playRawAudio } from '../services/geminiService';

interface KioskModeProps {
  students: Student[];
  currentSchoolId: string;
  onBack: () => void;
}

const KioskMode: React.FC<KioskModeProps> = ({ students, currentSchoolId, onBack }) => {
  const [inputVal, setInputVal] = useState('');
  const [lastScanned, setLastScanned] = useState<{ student: Student, time: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount and keep focus
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
    
    const interval = setInterval(() => {
       if (document.activeElement !== inputRef.current && inputRef.current) {
         // Optionally force focus back if not editing something else
         // inputRef.current.focus(); 
       }
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  const playSuccessSound = async (name: string) => {
    if (!soundEnabled) return;
    
    // 1. Immediate Beep for feedback
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);

    // 2. High-quality AI Voice Greeting
    try {
       const greetingText = `أهلاً بك يا ${name}`;
       const audioBase64 = await generateSpeech(greetingText);
       if (audioBase64) {
          await playRawAudio(audioBase64);
       }
    } catch (e) {
       console.error("Speech error", e);
    }
  };

  const playErrorSound = () => {
    if (!soundEnabled) return;
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const scannedId = inputVal.trim();
    
    if (!scannedId) return;

    const student = students.find(s => s.id === scannedId || s.id === scannedId.replace(/[^a-zA-Z0-9-]/g, '')); // Robust cleaning
    
    if (student) {
       // Mark as present
       const today = new Date().toISOString().split('T')[0];
       const newRecord: AttendanceRecord = {
          id: `${today}-${student.id}`,
          studentId: student.id,
          schoolId: currentSchoolId,
          date: today,
          status: AttendanceStatus.PRESENT,
          note: 'تسجيل ذاتي (Kiosk)'
       };
       
       saveAttendance([newRecord]);
       
       setLastScanned({
         student,
         time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
       });
       setErrorMsg(null);
       playSuccessSound(student.name.split(' ')[0]);
    } else {
       setErrorMsg(`لم يتم العثور على طالب بالرقم: ${scannedId}`);
       setLastScanned(null);
       playErrorSound();
    }
    
    setInputVal('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col font-tajawal animate-fade-in">
       {/* Header */}
       <div className="p-4 flex justify-between items-center bg-slate-800 shadow-md">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
             <ArrowLeft size={24} />
             <span>خروج</span>
          </button>
          
          <h1 className="text-xl font-bold flex items-center gap-2">
             <QrCode className="text-indigo-400" />
             نظام الحضور الذكي (Kiosk Mode)
          </h1>
          
          <div className="flex items-center gap-3">
             <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-colors">
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
             </button>
             <button onClick={toggleFullScreen} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-colors">
                {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
             </button>
          </div>
       </div>

       {/* Main Area */}
       <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 w-full max-w-2xl text-center space-y-8">
             
             {/* Clock Widget */}
             <div className="flex flex-col items-center mb-8">
               <div className="text-5xl font-bold font-mono tracking-wider text-white drop-shadow-lg">
                  {currentTime.toLocaleTimeString('en-US', {hour12: false})}
               </div>
               <div className="text-lg text-slate-400 mt-2 flex items-center gap-2">
                  <Clock size={16} />
                  {currentTime.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
               </div>
             </div>

             {/* Status Display */}
             <div className={`transition-all duration-500 transform ${lastScanned ? 'scale-100 opacity-100' : 'scale-95 opacity-0 absolute pointer-events-none'}`}>
                {lastScanned && (
                   <div className="bg-green-500 rounded-3xl p-8 shadow-2xl shadow-green-900/50 flex flex-col items-center animate-fade-in">
                      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-green-600 mb-4 shadow-lg">
                         <CheckCircle2 size={48} strokeWidth={3} />
                      </div>
                      <h2 className="text-3xl font-bold mb-2">أهلاً، {lastScanned.student.name}</h2>
                      <div className="text-green-100 text-lg flex items-center gap-4">
                         <span className="bg-green-600/30 px-3 py-1 rounded-full">{lastScanned.student.grade}</span>
                         <span>{lastScanned.time}</span>
                      </div>
                      <p className="mt-6 text-sm text-green-100/80">تم تسجيل حضورك بنجاح</p>
                   </div>
                )}
             </div>

             {/* Idle / Input State */}
             <div className={`transition-all duration-500 ${lastScanned ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                 <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-3xl p-12 flex flex-col items-center">
                    <div className="w-32 h-32 bg-slate-700 rounded-2xl flex items-center justify-center mb-6 border-2 border-dashed border-slate-500 animate-pulse">
                       <QrCode size={64} className="text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-200 mb-2">امسح بطاقة الطالب</h2>
                    <p className="text-slate-400">يرجى تقريب رمز QR من القارئ لتسجيل الحضور</p>
                 </div>
             </div>

             {/* Error Message */}
             {errorMsg && (
                <div className="bg-red-500/90 text-white px-6 py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 animate-bounce">
                   <User size={24} />
                   <span className="font-bold">{errorMsg}</span>
                </div>
             )}

             {/* Hidden Input for Scanner */}
             <form onSubmit={handleScan} className="opacity-0 absolute top-0 left-0 h-0 w-0 overflow-hidden">
                <input 
                   ref={inputRef}
                   type="text" 
                   value={inputVal}
                   onChange={(e) => setInputVal(e.target.value)}
                   autoComplete="off"
                   autoFocus
                />
                <button type="submit">Scan</button>
             </form>

             <p className="text-slate-500 text-sm mt-8">
               نصيحة: تأكد من أن المؤشر نشط داخل الصفحة لاستقبال بيانات الماسح الضوئي.
             </p>
          </div>
       </div>
    </div>
  );
};

export default KioskMode;