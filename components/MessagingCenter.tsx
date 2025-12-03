import React, { useState, useMemo } from 'react';
import { Send, Users, Sparkles, Filter, MessageCircle, Copy, Check, Megaphone, Loader2 } from 'lucide-react';
import { Student } from '../types';
import { generateBroadcastMessage } from '../services/geminiService';

interface MessagingCenterProps {
  students: Student[];
}

const MessagingCenter: React.FC<MessagingCenterProps> = ({ students }) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [draftTopic, setDraftTopic] = useState('');
  const [draftTone, setDraftTone] = useState<'formal' | 'friendly' | 'urgent'>('formal');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const uniqueGrades = useMemo(() => {
    const grades = new Set(students.map(s => s.grade));
    return Array.from(grades).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return selectedGrade === 'all' 
      ? students 
      : students.filter(s => s.grade === selectedGrade);
  }, [students, selectedGrade]);

  const handleGenerate = async () => {
    if (!draftTopic) return;
    setIsGenerating(true);
    const audience = selectedGrade === 'all' ? 'جميع أولياء الأمور' : `أولياء أمور طلاب الصف ${selectedGrade}`;
    const result = await generateBroadcastMessage(draftTopic, audience, draftTone);
    if (result) setGeneratedMessage(result);
    setIsGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendToStudent = (student: Student) => {
    if (!student.parentPhone) return;
    const msg = generatedMessage.replace(/{name}/g, student.name);
    const url = `https://wa.me/${student.parentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
           <Megaphone size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">مركز الرسائل الذكي</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left: Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col gap-6">
           <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                 <Filter size={16} />
                 تحديد الجمهور
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">كل الطلاب ({students.length})</option>
                {uniqueGrades.map(grade => (
                  <option key={grade} value={grade}>الصف {grade}</option>
                ))}
              </select>
              <div className="mt-2 text-xs text-slate-500">
                 سيتم إرسال الرسالة إلى {filteredStudents.length} مستلم.
              </div>
           </div>

           <div className="flex-1 flex flex-col">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                 <Sparkles size={16} className="text-purple-500" />
                 صياغة المحتوى (AI)
              </label>
              <textarea 
                 value={draftTopic}
                 onChange={(e) => setDraftTopic(e.target.value)}
                 className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none text-sm mb-3"
                 placeholder="اكتب موضوع الرسالة باختصار... (مثال: تذكير بموعد مجلس الآباء غداً، أو تهنئة باليوم الوطني)"
              />
              
              <div className="flex gap-2 mb-4">
                 {(['formal', 'friendly', 'urgent'] as const).map(tone => (
                    <button
                       key={tone}
                       onClick={() => setDraftTone(tone)}
                       className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                          draftTone === tone 
                             ? 'bg-purple-50 border-purple-300 text-purple-700' 
                             : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                       }`}
                    >
                       {tone === 'formal' ? 'رسمي' : tone === 'friendly' ? 'ودود' : 'عاجل'}
                    </button>
                 ))}
              </div>

              <button 
                 onClick={handleGenerate}
                 disabled={isGenerating || !draftTopic}
                 className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                 {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                 توليد الرسالة
              </button>
           </div>
        </div>

        {/* Right: Preview & Sending */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
           <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">معاينة الرسالة</h3>
              <button 
                 onClick={handleCopy}
                 disabled={!generatedMessage}
                 className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 disabled:opacity-50"
              >
                 {copied ? <Check size={14} /> : <Copy size={14} />}
                 {copied ? 'تم النسخ' : 'نسخ النص'}
              </button>
           </div>
           
           <div className="p-4 bg-slate-50/50">
              <textarea 
                 value={generatedMessage}
                 onChange={(e) => setGeneratedMessage(e.target.value)}
                 className="w-full h-40 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 leading-relaxed resize-none bg-white shadow-sm"
                 placeholder="النص المقترح سيظهر هنا..."
              />
           </div>

           <div className="flex-1 overflow-y-auto p-4 border-t border-slate-100">
              <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
                 <Users size={16} />
                 قائمة المستلمين ({filteredStudents.length})
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {filteredStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors group">
                       <div>
                          <div className="font-bold text-sm text-slate-800">{student.name}</div>
                          <div className="text-xs text-slate-400">{student.grade}</div>
                       </div>
                       
                       {student.parentPhone ? (
                          <button 
                             onClick={() => sendToStudent(student)}
                             disabled={!generatedMessage}
                             className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 rounded-md text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                             <MessageCircle size={14} />
                             إرسال
                          </button>
                       ) : (
                          <span className="text-xs text-slate-300 bg-slate-100 px-2 py-1 rounded">لا يوجد رقم</span>
                       )}
                    </div>
                 ))}
                 {filteredStudents.length === 0 && (
                    <div className="col-span-full py-8 text-center text-slate-400">
                       لا يوجد طلاب مطابقين للتصفية الحالية.
                    </div>
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default MessagingCenter;