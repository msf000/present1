import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, LogOut, Clock, Printer, X, CheckCircle } from 'lucide-react';
import { VisitorRecord } from '../types';
import { getVisitors, saveVisitor } from '../services/storageService';

interface VisitorLogProps {
  schoolId: string;
}

const VisitorLog: React.FC<VisitorLogProps> = ({ schoolId }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorId, setVisitorId] = useState('');
  const [visitReason, setVisitReason] = useState('');
  const [badgeVisitor, setBadgeVisitor] = useState<VisitorRecord | null>(null);

  useEffect(() => {
    setVisitors(getVisitors(schoolId));
  }, [schoolId]);

  const activeVisitors = useMemo(() => visitors.filter(v => v.status === 'active'), [visitors]);
  const historyVisitors = useMemo(() => visitors.filter(v => v.status === 'completed').sort((a,b) => b.checkInTime.localeCompare(a.checkInTime)), [visitors]);

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName) return;
    const newVisitor: VisitorRecord = {
      id: crypto.randomUUID(), schoolId, name: visitorName, idNumber: visitorId, visitReason, 
      checkInTime: new Date().toISOString(), status: 'active'
    };
    saveVisitor(newVisitor);
    setVisitors([...visitors, newVisitor]);
    setVisitorName(''); setVisitorId(''); setVisitReason(''); setIsModalOpen(false);
    setBadgeVisitor(newVisitor);
  };

  const handleCheckOut = (v: VisitorRecord) => {
    if (confirm('تسجيل خروج؟')) {
      const updated = { ...v, status: 'completed' as const, checkOutTime: new Date().toISOString() };
      saveVisitor(updated);
      setVisitors(visitors.map(x => x.id === v.id ? updated : x));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
         <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><UserPlus size={28} /></div>
            <h2 className="text-2xl font-bold text-slate-800">سجل الزوار</h2>
         </div>
         <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
            <UserPlus size={20} /> تسجيل دخول
         </button>
      </div>

      <div className="flex border-b">
         <button onClick={() => setActiveTab('active')} className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>زوار حاليون</button>
         <button onClick={() => setActiveTab('history')} className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>السجل السابق</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
         <table className="w-full text-right">
            <thead className="bg-slate-50 border-b">
               <tr><th className="p-4">الاسم</th><th className="p-4">السبب</th><th className="p-4">وقت الدخول</th><th className="p-4">إجراءات</th></tr>
            </thead>
            <tbody className="divide-y">
               {(activeTab === 'active' ? activeVisitors : historyVisitors).map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                     <td className="p-4 font-bold">{v.name} <span className="text-xs text-slate-400 block">{v.idNumber}</span></td>
                     <td className="p-4">{v.visitReason}</td>
                     <td className="p-4 font-mono text-sm">{new Date(v.checkInTime).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</td>
                     <td className="p-4 flex gap-2">
                        {v.status === 'active' ? (
                           <>
                              <button onClick={() => setBadgeVisitor(v)} className="p-2 text-blue-600 bg-blue-50 rounded"><Printer size={18}/></button>
                              <button onClick={() => handleCheckOut(v)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">خروج</button>
                           </>
                        ) : <span className="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> مغادر</span>}
                     </td>
                  </tr>
               ))}
               {(activeTab === 'active' ? activeVisitors : historyVisitors).length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">لا توجد بيانات</td></tr>}
            </tbody>
         </table>
      </div>

      {isModalOpen && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
               <h3 className="text-xl font-bold mb-4">تسجيل زائر</h3>
               <form onSubmit={handleCheckIn} className="space-y-4">
                  <input type="text" value={visitorName} onChange={e => setVisitorName(e.target.value)} placeholder="اسم الزائر" className="w-full p-2 border rounded" required />
                  <input type="text" value={visitorId} onChange={e => setVisitorId(e.target.value)} placeholder="رقم الهوية" className="w-full p-2 border rounded" />
                  <input type="text" value={visitReason} onChange={e => setVisitReason(e.target.value)} placeholder="سبب الزيارة" className="w-full p-2 border rounded" required />
                  <div className="flex gap-2">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded">إلغاء</button>
                     <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded font-bold">تسجيل</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {badgeVisitor && (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-sm rounded-xl overflow-hidden print-container">
               <div className="bg-slate-800 text-white p-4 flex justify-between print:hidden">
                  <h3>بطاقة زائر</h3><button onClick={() => setBadgeVisitor(null)}><X/></button>
               </div>
               <div className="p-8 text-center border-b-4 border-blue-600">
                  <h1 className="text-3xl font-black mb-6">زائر</h1>
                  <div className="text-2xl font-bold mb-2">{badgeVisitor.name}</div>
                  <div className="text-slate-600 mb-6">{badgeVisitor.visitReason}</div>
                  <div className="bg-slate-100 p-4 rounded text-xl font-mono font-bold">{new Date(badgeVisitor.checkInTime).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</div>
               </div>
               <div className="p-4 print:hidden"><button onClick={() => window.print()} className="w-full py-2 bg-blue-600 text-white rounded font-bold">طباعة</button></div>
            </div>
         </div>
      )}
    </div>
  );
};

export default VisitorLog;