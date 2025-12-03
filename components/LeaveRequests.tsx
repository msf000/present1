import React, { useState, useMemo } from 'react';
import { LeaveRequest, Student, User } from '../types';
import { saveLeaveRequest, updateLeaveRequestStatus, getLeaveRequests } from '../services/storageService';
import { Calendar, CheckCircle2, XCircle, Clock, Plus, FileSignature, AlertCircle, ArrowRight } from 'lucide-react';

interface LeaveRequestsProps {
  students: Student[];
  currentUser: User;
  onUpdate: () => void;
  onRequestBack?: () => void;
}

const LeaveRequests: React.FC<LeaveRequestsProps> = ({ students, currentUser, onUpdate, onRequestBack }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>(getLeaveRequests(currentUser.schoolId));
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  
  // Create Request Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [requestReason, setRequestReason] = useState('');

  const refreshRequests = () => {
    setRequests(getLeaveRequests(currentUser.schoolId));
    onUpdate();
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !requestDate || !requestReason) return;

    if (!currentUser.schoolId) return;

    const newRequest: LeaveRequest = {
       id: crypto.randomUUID(),
       studentId: selectedStudentId,
       schoolId: currentUser.schoolId,
       date: requestDate,
       reason: requestReason,
       status: 'pending',
       requestDate: new Date().toISOString(),
       parentName: currentUser.name
    };

    saveLeaveRequest(newRequest);
    setIsModalOpen(false);
    setRequestReason('');
    refreshRequests();
    alert('تم إرسال طلب الاستئذان بنجاح');
  };

  const handleStatusUpdate = (id: string, status: 'approved' | 'rejected') => {
    if (confirm(status === 'approved' ? 'هل أنت متأكد من قبول الطلب؟ سيتم تسجيل غياب بعذر تلقائياً.' : 'هل أنت متأكد من رفض الطلب؟')) {
       updateLeaveRequestStatus(id, status);
       refreshRequests();
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (activeTab === 'pending') return req.status === 'pending';
      return req.status !== 'pending';
    }).sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [requests, activeTab]);

  const canApprove = ['admin', 'principal', 'vice_principal'].includes(currentUser.role);
  
  // Filter students for parent view
  const availableStudents = currentUser.role === 'parent' 
    ? students.filter(s => s.id === currentUser.relatedStudentId)
    : students;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          {onRequestBack && (
            <button onClick={onRequestBack} className="p-2 hover:bg-slate-200 rounded-full md:hidden">
              <ArrowRight size={20} />
            </button>
          )}
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileSignature className="text-indigo-600" />
            طلبات الاستئذان
          </h2>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>طلب استئذان جديد</span>
        </button>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button
           onClick={() => setActiveTab('pending')}
           className={`pb-3 px-4 text-sm font-bold transition-colors relative ${activeTab === 'pending' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
           طلبات قيد الانتظار
           {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
        </button>
        <button
           onClick={() => setActiveTab('history')}
           className={`pb-3 px-4 text-sm font-bold transition-colors relative ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
           سجل الطلبات السابقة
           {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map(request => {
             const student = students.find(s => s.id === request.studentId);
             return (
               <div key={request.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                           request.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                           request.status === 'approved' ? 'bg-green-100 text-green-600' :
                           'bg-red-100 text-red-600'
                        }`}>
                           {student ? student.name.charAt(0) : '?'}
                        </div>
                        <div>
                           <div className="font-bold text-slate-800">{student?.name || 'طالب غير معروف'}</div>
                           <div className="text-xs text-slate-500">{student?.grade}</div>
                        </div>
                     </div>
                     <div className={`px-2 py-1 rounded text-xs font-bold ${
                           request.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                           request.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                           'bg-red-50 text-red-700 border border-red-100'
                     }`}>
                        {request.status === 'pending' ? 'قيد الانتظار' :
                         request.status === 'approved' ? 'مقبول' : 'مرفوض'}
                     </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                     <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Calendar size={16} className="text-indigo-500" />
                        <span className="font-bold">تاريخ الغياب:</span>
                        <span>{request.date}</span>
                     </div>
                     <div className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded">
                        <span className="font-bold shrink-0">السبب:</span>
                        <span className="italic">"{request.reason}"</span>
                     </div>
                     <div className="text-xs text-slate-400 mt-2 flex justify-between">
                        <span>بواسطة: {request.parentName || 'ولي الأمر'}</span>
                        <span>{new Date(request.requestDate).toLocaleDateString('ar-EG')}</span>
                     </div>
                  </div>

                  {canApprove && request.status === 'pending' && (
                     <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button 
                           onClick={() => handleStatusUpdate(request.id, 'rejected')}
                           className="flex-1 flex items-center justify-center gap-1 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-bold"
                        >
                           <XCircle size={16} />
                           رفض
                        </button>
                        <button 
                           onClick={() => handleStatusUpdate(request.id, 'approved')}
                           className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors text-sm font-bold shadow-sm"
                        >
                           <CheckCircle2 size={16} />
                           موافقة
                        </button>
                     </div>
                  )}
               </div>
             );
          })
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400">
             <div className="bg-slate-50 p-4 rounded-full mb-3">
                <FileSignature size={32} />
             </div>
             <p>لا توجد طلبات {activeTab === 'pending' ? 'معلقة' : 'سابقة'} حالياً.</p>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-100 pb-2">تقديم طلب استئذان جديد</h3>
              
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">اسم الطالب</label>
                    <select
                       value={selectedStudentId}
                       onChange={(e) => setSelectedStudentId(e.target.value)}
                       className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                       required
                    >
                       <option value="">-- اختر الطالب --</option>
                       {availableStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                       ))}
                    </select>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ الغياب/الاستئذان</label>
                    <input 
                       type="date"
                       value={requestDate}
                       onChange={(e) => setRequestDate(e.target.value)}
                       className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                       required
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">سبب الاستئذان</label>
                    <textarea 
                       value={requestReason}
                       onChange={(e) => setRequestReason(e.target.value)}
                       className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                       placeholder="مثال: موعد طبي، ظروف عائلية..."
                       required
                    />
                 </div>
                 
                 <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2 text-xs text-blue-700">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <p>ملاحظة: عند الموافقة على الطلب، سيتم تسجيل حالة الطالب "غياب بعذر" تلقائياً في سجل الحضور.</p>
                 </div>

                 <div className="flex gap-3 pt-2">
                    <button
                       type="button"
                       onClick={() => setIsModalOpen(false)}
                       className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                       إلغاء
                    </button>
                    <button
                       type="submit"
                       className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition-colors"
                    >
                       إرسال الطلب
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;