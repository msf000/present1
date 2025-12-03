import React, { useState, useRef } from 'react';
import { Sparkles, Check, X, AlertCircle, Mic, Square, Loader2, Camera, Upload, Image as ImageIcon, ScanLine, RotateCcw } from 'lucide-react';
import { Student, AttendanceStatus } from '../types';
import { parseSmartAttendance, processVoiceAttendance, processImageAttendance } from '../services/geminiService';

interface SmartAttendanceModalProps {
  students: Student[];
  onClose: () => void;
  onApply: (updates: { studentId: string; status: AttendanceStatus; note: string }[]) => void;
}

type Tab = 'voice' | 'camera';

const SmartAttendanceModal: React.FC<SmartAttendanceModalProps> = ({ students, onClose, onApply }) => {
  const [activeTab, setActiveTab] = useState<Tab>('voice');
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [results, setResults] = useState<{ studentId: string; status: AttendanceStatus; note: string }[] | null>(null);
  
  // Camera & Image State
  const [capturedImage, setCapturedImage] = useState<string | null>(null); // base64
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- Voice Logic ---
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioAnalyze(audioBlob);
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

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("لا يمكن الوصول للكاميرا.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Analysis ---
  const validateAndSetResults = (updates: any[]) => {
    const validUpdates = updates.filter((u: any) => 
      students.some(s => s.id === u.studentId) && 
      ['present', 'absent', 'late', 'excused'].includes(u.status)
    );
    setResults(validUpdates);
  };

  const handleAnalyzeText = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    try {
      const updates = await parseSmartAttendance(inputText, students);
      validateAndSetResults(updates);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء التحليل.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAudioAnalyze = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const updates = await processVoiceAttendance(base64Audio, audioBlob.type, students);
        validateAndSetResults(updates);
        setIsAnalyzing(false);
      };
    } catch (error) {
      setIsAnalyzing(false);
      alert("حدث خطأ أثناء معالجة الصوت.");
    }
  };

  const handleImageAnalyze = async () => {
    if (!capturedImage) return;
    setIsAnalyzing(true);
    try {
      const base64Image = capturedImage.split(',')[1];
      const updates = await processImageAttendance(base64Image, 'image/jpeg', students);
      validateAndSetResults(updates);
    } catch (error) {
      alert("فشل تحليل الصورة.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (results) {
      onApply(results);
      onClose();
    }
  };

  const resetAll = () => {
    setResults(null);
    setCapturedImage(null);
    setInputText('');
    stopCamera();
  };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || 'غير معروف';

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'present': return { text: 'حاضر', color: 'bg-green-100 text-green-700' };
      case 'absent': return { text: 'غائب', color: 'bg-red-100 text-red-700' };
      case 'late': return { text: 'متأخر', color: 'bg-amber-100 text-amber-700' };
      case 'excused': return { text: 'بعذر', color: 'bg-blue-100 text-blue-700' };
      default: return { text: status, color: 'bg-gray-100' };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shrink-0">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="text-yellow-300" />
              تسجيل الحضور الذكي
            </h3>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
          <p className="text-indigo-100 text-sm">
            اختر الوسيلة المناسبة لتسجيل الحضور بسرعة
          </p>
        </div>

        {/* Tabs */}
        {!results && (
          <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
            <button 
              onClick={() => { setActiveTab('voice'); stopCamera(); }}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'voice' ? 'bg-white text-indigo-600 border-t-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Mic size={18} />
              صوتي / نصي
            </button>
            <button 
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'camera' ? 'bg-white text-indigo-600 border-t-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <ScanLine size={18} />
              ماسح الكشوف
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {!results ? (
            <div className="space-y-6">
              
              {/* === VOICE TAB === */}
              {activeTab === 'voice' && (
                <>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-center">
                     {isRecording ? (
                        <div className="flex flex-col items-center gap-2">
                           <div className="relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <button 
                                 onClick={stopRecording}
                                 className="relative rounded-full p-4 bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
                              >
                                 <Square size={24} fill="currentColor" />
                              </button>
                           </div>
                           <p className="text-red-600 font-bold text-sm animate-pulse">جاري الاستماع...</p>
                        </div>
                     ) : (
                        <div className="flex flex-col items-center gap-2">
                           <button 
                              onClick={startRecording}
                              disabled={isAnalyzing}
                              className="rounded-full p-4 bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm group"
                           >
                              <Mic size={28} className="group-hover:scale-110 transition-transform" />
                           </button>
                           <p className="text-indigo-900 font-medium text-sm">اضغط للتسجيل الصوتي</p>
                        </div>
                     )}
                  </div>

                  <div className="flex items-center gap-4">
                     <div className="h-px bg-slate-200 flex-1"></div>
                     <span className="text-slate-400 text-xs">أو اكتب النص</span>
                     <div className="h-px bg-slate-200 flex-1"></div>
                  </div>

                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full h-32 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-slate-700 placeholder:text-slate-400 text-sm"
                    placeholder="مثال: أحمد محمد حاضر، وسارة علي غائبة..."
                  />
                </>
              )}

              {/* === CAMERA TAB === */}
              {activeTab === 'camera' && (
                <div className="flex flex-col gap-4">
                   {capturedImage ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video flex items-center justify-center">
                         <img src={capturedImage} alt="Captured" className="max-w-full max-h-full" />
                         <button 
                           onClick={() => setCapturedImage(null)}
                           className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                         >
                           <RotateCcw size={18} />
                         </button>
                      </div>
                   ) : isCameraActive ? (
                      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                         <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                         <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                            <button onClick={capturePhoto} className="p-4 bg-white rounded-full shadow-lg border-4 border-slate-200">
                               <div className="w-4 h-4 bg-slate-800 rounded-full"></div>
                            </button>
                            <button onClick={stopCamera} className="absolute right-4 bottom-2 p-2 bg-black/50 text-white rounded-full">
                               <X size={20} />
                            </button>
                         </div>
                      </div>
                   ) : (
                      <div className="grid grid-cols-2 gap-4">
                         <button 
                           onClick={startCamera}
                           className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors text-indigo-600"
                         >
                            <Camera size={32} />
                            <span className="font-bold text-sm">استخدام الكاميرا</span>
                         </button>
                         <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600"
                         >
                            <Upload size={32} />
                            <span className="font-bold text-sm">رفع صورة</span>
                         </button>
                         <input 
                           type="file" 
                           ref={fileInputRef} 
                           className="hidden" 
                           accept="image/*"
                           onChange={handleFileUpload} 
                         />
                      </div>
                   )}
                   
                   <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2 text-xs text-blue-700">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <p>قم بتصوير كشف الحضور الورقي أو السبورة. تأكد من وضوح الأسماء والعلامات (✓ أو ✕).</p>
                   </div>
                </div>
              )}

            </div>
          ) : (
            // Results View
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <h4 className="font-bold text-slate-800">النتائج المستخرجة ({results.length})</h4>
                 <button onClick={resetAll} className="text-sm text-indigo-600 hover:underline">
                   إعادة المحاولة
                 </button>
               </div>
               
               {results.length > 0 ? (
                 <div className="space-y-2">
                   {results.map((item, idx) => {
                     const statusStyle = getStatusLabel(item.status);
                     return (
                       <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                         <div className="flex items-center gap-3">
                           <div className={`px-2 py-1 rounded text-xs font-bold ${statusStyle.color}`}>
                             {statusStyle.text}
                           </div>
                           <div>
                             <div className="font-bold text-slate-800">{getStudentName(item.studentId)}</div>
                             {item.note && <div className="text-xs text-slate-500">"{item.note}"</div>}
                           </div>
                         </div>
                         <Check size={16} className="text-green-500" />
                       </div>
                     );
                   })}
                 </div>
               ) : (
                 <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                   <AlertCircle className="mx-auto text-amber-500 mb-2" size={32} />
                   <p className="text-slate-600 font-medium">لم يتم التعرف على أي أسماء!</p>
                   <p className="text-xs text-slate-400 mt-1">تأكد من وضوح الصورة أو الصوت.</p>
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
          {!results ? (
            <button
              onClick={activeTab === 'voice' ? handleAnalyzeText : handleImageAnalyze}
              disabled={isAnalyzing || isRecording || (activeTab === 'voice' && !inputText.trim()) || (activeTab === 'camera' && !capturedImage)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>جاري التحليل...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>تحليل {activeTab === 'voice' ? 'النص' : 'الصورة'}</span>
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={resetAll}
                className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-3 rounded-lg font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleApply}
                disabled={results.length === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Check size={20} />
                <span>اعتماد ({results.length})</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartAttendanceModal;