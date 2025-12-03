import React from 'react';
import { X, Printer, ShieldCheck, Clock, Calendar, User, School } from 'lucide-react';
import { LeaveRequest, Student } from '../types';

interface GatePassModalProps {
  request: LeaveRequest;
  student: Student;
  onClose: () => void;
  schoolName: string;
}

const GatePassModal: React.FC<GatePassModalProps> = ({ request, student, onClose, schoolName }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative print:shadow-none print:w-full print:h-full print:fixed print:inset-0 print:rounded-none">
        
        {/* Ticket Top - Tear Effect */}
        <div className="bg-slate-900 text-white p-6 relative print:bg-white print:text-black print:border-b-2 print:border-black">
           <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm print:hidden">
                    <School size={24} />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold">{schoolName}</h2>
                    <p className="text-xs text-slate-300 print:text-slate-600">إدارة شؤون الطلاب</p>
                 </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white print:hidden">
                 <X size={24} />
              </button>
           </div>
           
           <div className="mt-6 flex justify-between items-end">
              <h1 className="text-3xl font-bold text-yellow-400 print:text-black">تصريح خروج طالب</h1>
              <div className="text-right">
                 <p className="text-xs text-slate-400 print:text-slate-600">رقم التصريح</p>
                 <p className="font-mono font-bold text-lg">#{request.id.slice(0, 6).toUpperCase()}</p>
              </div>
           </div>
        </div>

        {/* Ticket Body */}
        <div className="p-8 bg-slate-50 flex-1 relative print:bg-white">
           {/* Watermark */}
           <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <ShieldCheck size={200} />
           </div>

           <div className="relative z-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1"><User size={12}/> الطالب</label>
                    <div className="font-bold text-lg text-slate-800">{student.name}</div>
                    <div className="text-sm text-slate-600">{student.grade}</div>
                 </div>
                 <div className="text-left">
                    <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1 justify-end"><Calendar size={12}/> التاريخ</label>
                    <div className="font-bold text-lg text-slate-800 dir-ltr">{request.date}</div>
                 </div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-4"></div>

              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:border-black print:shadow-none">
                 <div>
                    <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1"><Clock size={12}/> وقت الخروج</label>
                    <div className="font-bold text-2xl text-indigo-600 print:text-black">{request.exitTime}</div>
                 </div>
                 <div className="text-left">
                    <label className="block text-xs text-slate-500 mb-1">المستلم (المرافق)</label>
                    <div className="font-bold text-slate-800">{request.pickupPerson || 'ولي الأمر'}</div>
                 </div>
              </div>

              <div className="flex justify-between items-center mt-8">
                 <div className="text-center">
                    <p className="text-xs text-slate-400 mb-2">ختم الإدارة</p>
                    <div className="w-24 h-24 border-2 border-slate-300 rounded-full flex items-center justify-center text-slate-300 text-xs rotate-12">
                       معتمد رقمياً
                    </div>
                 </div>
                 <div>
                    <img 
                       src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=GATEPASS:${request.id}`} 
                       alt="QR Code" 
                       className="w-24 h-24 border border-slate-200 rounded-lg p-1"
                    />
                 </div>
              </div>
           </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 print:hidden">
           <button 
             onClick={handlePrint}
             className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-200"
           >
             <Printer size={20} />
             طباعة التصريح
           </button>
        </div>
      </div>
    </div>
  );
};

export default GatePassModal;