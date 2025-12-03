import React, { useState } from 'react';
import { X, Star, AlertTriangle, Check, BookOpen, UserCheck, Heart, Zap, Frown, PhoneOff, Trash2 } from 'lucide-react';
import { Student, BehaviorRecord, User } from '../types';
import { saveBehaviorRecord, getCurrentUser } from '../services/storageService';

interface BehaviorModalProps {
  student: Student;
  onClose: () => void;
  onSave: () => void;
}

const BehaviorModal: React.FC<BehaviorModalProps> = ({ student, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'positive' | 'negative'>('positive');
  const [reason, setReason] = useState('');
  const [customPoints, setCustomPoints] = useState<number | ''>('');
  
  const positiveBehaviors = [
    { label: 'مشاركة فعالة', points: 5, icon: <Zap size={20} /> },
    { label: 'حل الواجبات', points: 3, icon: <BookOpen size={20} /> },
    { label: 'مساعدة الزملاء', points: 3, icon: <Heart size={20} /> },
    { label: 'انضباط والتزام', points: 4, icon: <UserCheck size={20} /> },
    { label: 'نظافة وترتيب', points: 2, icon: <Star size={20} /> },
  ];

  const negativeBehaviors = [
    { label: 'إزعاج في الفصل', points: -2, icon: <Frown size={20} /> },
    { label: 'عدم حل الواجب', points: -2, icon: <BookOpen size={20} /> },
    { label: 'استخدام الهاتف', points: -5, icon: <PhoneOff size={20} /> },
    { label: 'مخالفة الزي', points: -3, icon: <UserCheck size={20} /> },
    { label: 'تأخر عن الحصة', points: -1, icon: <ClockIcon size={20} /> },
  ];

  const handleQuickSelect = (label: string, points: number) => {
    setReason(label);
    setCustomPoints(Math.abs(points));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = getCurrentUser();
    
    if (!reason || !customPoints || !currentUser) return;

    const points = activeTab === 'positive' ? Number(customPoints) : -Number(customPoints);

    const record: BehaviorRecord = {
      id: crypto.randomUUID(),
      studentId: student.id,
      schoolId: student.schoolId,
      type: activeTab,
      category: activeTab === 'positive' ? 'academic' : 'discipline', // Simplified
      reason,
      points,
      date: new Date().toISOString().split('T')[0],
      recordedBy: currentUser.name
    };

    saveBehaviorRecord(record);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        
        {/* Header */}
        <div className={`p-6 text-white flex justify-between items-start ${activeTab === 'positive' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-pink-600'}`}>
           <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                 {activeTab === 'positive' ? <Star className="text-yellow-300" /> : <AlertTriangle className="text-white" />}
                 تقييم سلوك الطالب
              </h2>
              <p className="text-white/90 text-sm mt-1">{student.name} - {student.grade}</p>
           </div>
           <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X size={24} />
           </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
           <button 
             onClick={() => { setActiveTab('positive'); setReason(''); setCustomPoints(''); }}
             className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'positive' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-slate-500 hover:bg-slate-50'}`}
           >
             سلوك إيجابي (تميز)
           </button>
           <button 
             onClick={() => { setActiveTab('negative'); setReason(''); setCustomPoints(''); }}
             className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'negative' ? 'text-red-600 border-b-2 border-red-600 bg-red-50' : 'text-slate-500 hover:bg-slate-50'}`}
           >
             سلوك سلبي (مخالفة)
           </button>
        </div>

        {/* Body */}
        <div className="p-6">
           <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 mb-2 block">خيارات سريعة</label>
              <div className="grid grid-cols-2 gap-2">
                 {(activeTab === 'positive' ? positiveBehaviors : negativeBehaviors).map((item, idx) => (
                    <button
                       key={idx}
                       onClick={() => handleQuickSelect(item.label, item.points)}
                       className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all text-right ${
                          reason === item.label 
                             ? (activeTab === 'positive' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-red-100 border-red-300 text-red-800')
                             : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                       }`}
                    >
                       <div className={`p-1.5 rounded-full ${activeTab === 'positive' ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                          {item.icon}
                       </div>
                       <span>{item.label}</span>
                       <span className="mr-auto font-bold ltr">{activeTab === 'positive' ? '+' : ''}{item.points}</span>
                    </button>
                 ))}
              </div>
           </div>

           <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-100">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">سبب / وصف السلوك</label>
                 <input 
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="مثال: مساعدة في تنظيم الفصل..."
                    required
                 />
              </div>
              
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">النقاط ({activeTab === 'positive' ? 'إضافة' : 'خصم'})</label>
                 <input 
                    type="number"
                    value={customPoints}
                    onChange={(e) => setCustomPoints(Number(e.target.value))}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="0"
                    min="1"
                    max="100"
                    required
                 />
              </div>

              <button 
                 type="submit"
                 className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 ${activeTab === 'positive' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                 <Check size={20} />
                 حفظ السلوك
              </button>
           </form>
        </div>
      </div>
    </div>
  );
};

// Helper Icon
const ClockIcon = ({ size }: { size: number }) => (
   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

export default BehaviorModal;