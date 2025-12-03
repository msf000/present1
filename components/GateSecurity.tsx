import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, ScanLine, UserCheck, XCircle, CheckCircle, Clock, User, LogOut, RotateCcw } from 'lucide-react';
import { verifyGatePass, markGatePassUsed } from '../services/storageService';
import { LeaveRequest, Student } from '../types';

const GateSecurity: React.FC = () => {
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{ valid: boolean; request?: LeaveRequest; student?: Student; error?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Auto-focus input for barcode scanners
    const focusInterval = setInterval(() => {
       if (document.activeElement !== inputRef.current && !scanResult) {
          inputRef.current?.focus();
       }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, [scanResult]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const result = verifyGatePass(scanInput.trim());
    setScanResult(result);
    setScanInput('');
  };

  const handleConfirmExit = () => {
    if (scanResult?.request) {
       markGatePassUsed(scanResult.request.id);
       setSuccessMsg('تم تسجيل الخروج بنجاح!');
       setTimeout(() => {
          setSuccessMsg('');
          setScanResult(null);
          inputRef.current?.focus();
       }, 2000);
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setScanInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white animate-fade-in relative overflow-hidden rounded-xl">
       {/* Header */}
       <div className="p-6 border-b border-slate-700 bg-slate-800 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-500 p-2 rounded-lg">
                <ShieldCheck size={28} className="text-white" />
             </div>
             <div>
                <h1 className="text-2xl font-bold">بوابة الأمن الذكية</h1>
                <p className="text-slate-400 text-sm">نظام التحقق من تصاريح الخروج</p>
             </div>
          </div>
          <div className="text-right hidden md:block">
             <div className="text-xl font-mono font-bold">{new Date().toLocaleTimeString('en-US', {hour12: false})}</div>
             <div className="text-sm text-slate-400">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
       </div>

       {/* Main Content */}
       <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
          
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
             <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl"></div>
             <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
          </div>

          {!scanResult ? (
             <div className="w-full max-w-lg flex flex-col items-center z-10 space-y-8">
                <div className="w-40 h-40 border-4 border-dashed border-slate-600 rounded-2xl flex items-center justify-center animate-pulse">
                   <ScanLine size={64} className="text-slate-500" />
                </div>
                <h2 className="text-3xl font-bold text-center">بانتظار مسح التصريح...</h2>
                <p className="text-slate-400 text-center">يرجى توجيه رمز QR الموجود في تصريح الطالب إلى الماسح الضوئي</p>
                
                <form onSubmit={handleScan} className="w-full">
                   <input 
                      ref={inputRef}
                      type="text" 
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-center text-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                      placeholder="أدخل الرمز يدوياً إذا تعذر المسح"
                      autoFocus
                   />
                </form>
             </div>
          ) : (
             <div className="w-full max-w-2xl z-10">
                {successMsg ? (
                   <div className="bg-green-500 rounded-2xl p-12 text-center animate-fade-in shadow-2xl">
                      <CheckCircle size={80} className="mx-auto mb-6 text-white" />
                      <h2 className="text-4xl font-bold mb-2">تم تسجيل الخروج</h2>
                      <p className="text-green-100 text-xl">{successMsg}</p>
                   </div>
                ) : scanResult.valid ? (
                   <div className="bg-slate-800 rounded-2xl overflow-hidden border-2 border-green-500 shadow-2xl animate-fade-in">
                      <div className="bg-green-600 p-4 text-center">
                         <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                            <CheckCircle size={28} />
                            تصريح ساري المفعول
                         </h2>
                      </div>
                      
                      <div className="p-8">
                         <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div className="w-32 h-32 bg-slate-700 rounded-full flex items-center justify-center border-4 border-slate-600">
                               <User size={64} className="text-slate-400" />
                            </div>
                            
                            <div className="flex-1 space-y-4 w-full text-center md:text-right">
                               <div>
                                  <label className="text-slate-400 text-sm">الطالب</label>
                                  <div className="text-3xl font-bold text-white">{scanResult.student?.name}</div>
                                  <div className="text-indigo-400">{scanResult.student?.grade}</div>
                               </div>
                               
                               <div className="grid grid-cols-2 gap-4 bg-slate-700/50 p-4 rounded-xl">
                                  <div>
                                     <label className="text-slate-400 text-xs flex items-center gap-1"><Clock size={12}/> وقت الخروج المصرح</label>
                                     <div className="text-xl font-bold font-mono">{scanResult.request?.exitTime}</div>
                                  </div>
                                  <div>
                                     <label className="text-slate-400 text-xs flex items-center gap-1"><UserCheck size={12}/> المستلم (المرافق)</label>
                                     <div className="text-xl font-bold">{scanResult.request?.pickupPerson || 'ولي الأمر'}</div>
                                  </div>
                               </div>
                            </div>
                         </div>

                         <div className="mt-8 flex gap-4">
                            <button 
                               onClick={handleReset}
                               className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors"
                            >
                               إلغاء
                            </button>
                            <button 
                               onClick={handleConfirmExit}
                               className="flex-[2] py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-900/50 flex items-center justify-center gap-2 transition-colors"
                            >
                               <LogOut size={24} />
                               تأكيد الخروج والمغادرة
                            </button>
                         </div>
                      </div>
                   </div>
                ) : (
                   <div className="bg-slate-800 rounded-2xl overflow-hidden border-2 border-red-500 shadow-2xl animate-bounce">
                      <div className="bg-red-600 p-6 text-center">
                         <XCircle size={64} className="mx-auto mb-4 text-white" />
                         <h2 className="text-3xl font-bold text-white">تصريح غير صالح</h2>
                      </div>
                      <div className="p-8 text-center space-y-6">
                         <p className="text-xl text-slate-300">{scanResult.error}</p>
                         
                         <button 
                            onClick={handleReset}
                            className="w-full py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                         >
                            <RotateCcw size={20} />
                            مسح تصريح آخر
                         </button>
                      </div>
                   </div>
                )}
             </div>
          )}
       </div>
    </div>
  );
};

export default GateSecurity;