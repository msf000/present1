import React, { useState, useMemo } from 'react';
import { LeaveRequest, Student, User } from '../types';
import { saveLeaveRequest, updateLeaveRequestStatus, getLeaveRequests, getSettings } from '../services/storageService';
import { Calendar, CheckCircle2, XCircle, Clock, Plus, FileSignature, AlertCircle, ArrowRight, LogOut, Ticket } from 'lucide-react';
import GatePassModal from './GatePassModal';

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
  const [requestType, setRequestType] = useState<'absence' | 'early_exit'>('absence');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [requestReason, setRequestReason] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [pickupPerson, setPickupPerson] = useState('');

  // Gate Pass Modal
  const [passRequest, setPassRequest] = useState<LeaveRequest | null>(null);

  const refreshRequests = () => {
    setRequests(getLeaveRequests(currentUser.schoolId));
    onUpdate();
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !requestDate || !requestReason) return;
    if (requestType === 'early_exit' && !exitTime) return;

    if (!currentUser.schoolId) return;

    const newRequest: LeaveRequest = {
       id: crypto.randomUUID(),
       studentId: selectedStudentId,
       schoolId: currentUser.schoolId,
       date: requestDate,
       reason: requestReason,
       status: 'pending',
       requestDate: new Date().toISOString(),
       parentName: currentUser.name,
       type: requestType,
       exitTime: requestType === 'early_exit' ? exitTime : undefined,
       pickupPerson: requestType === 'early_exit' ? pickupPerson : undefined
    };

    saveLeaveRequest(newRequest);
    setIsModalOpen(false);
    setRequestReason('');
    setExitTime('');
    setPickupPerson('');
    refreshRequests();
    alert('تم إرسال الطلب بنجاح');
  };

  const handleStatusUpdate = (id: string, status: 'approved' | 'rejected') => {
    if (confirm(status === 'approved' ? 'هل أنت متأكد من قبول الطلب؟' : 'هل أنت متأكد من رفض الطلب؟')) {
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
  const settings = getSettings();
  
  // Filter students for parent view
  const availableStudents = currentUser.role === 'parent' 
    ? students.filter(s => s.id === currentUser.relatedStudentId)
    : students;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gate Pass Modal */}
      {passRequest && (
         <GatePassModal 
            request={passRequest}
            student={students.find(s => s.id === passRequest.studentId)!}
            onClose={() => setPassRequest(null)}
            schoolName={settings.schoolName || 'المدرسة'}
         />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          {onRequestBack && (
            <button onClick={onRequestBack} className="p-2 hover:bg-slate-200 rounded-full md:hidden">
              <ArrowRight size={20} />
            </button>
          )}
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileSignature className="text-indigo-600" />
            طلبات الاستئذان والخروج
          </h2>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>طلب جديد</span>
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
             const isEarlyExit = request.type === 'early_exit';
             return (
               <div key={request.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden">
                  {/* Type Indicator */}
                  <div className={`absolute top-0 right-0 left-0 h-1 ${isEarlyExit ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
                  
                  <div className="flex justify-between items-start mb-3 mt-2">
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                           request.status === 'pending' ? 'bg-gray-100 text-gray-600' :
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
                           request.status === 'pending' ? 'bg-gray-100 text-gray-600' :
                           request.status === 'approved' ? 'bg-green-50 text-green-700' :
                           'bg-red-50 text-red-700'
                     }`}>
                        {request.status === 'pending' ? 'قيد الانتظار' :
                         request.status === 'approved' ? 'مقبول' : 'مرفوض'}
                     </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                     <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded-lg">
                        {isEarlyExit ? <LogOut size={16} className="text-amber-600" /> : <Calendar size={16} className="text-indigo-600" />}
                        <span className="font-bold">{isEarlyExit ? 'خروج مبكر' : 'غياب يوم كامل'}</span>
                     </div>
                     
                     <div className="text-sm space-y-1 px-1">
                        <div className="flex justify-between">
                           <span className="text-slate-500">التاريخ:</span>
                           <span className="font-medium">{request.date}</span>
                        </div>
                        {isEarlyExit && (
                           <>
                              <div className="flex justify-between">
                                 <span className="text-slate-500">وقت الخروج:</span>
                                 <span className="font-bold text-amber-600 dir-ltr">{request.exitTime}</span>
                              </div>
                              <div className="flex justify-between">
                                 <span className="text-slate-500">المستلم:</span>
                                 <span className="font-medium">{request.pickupPerson || '-'}</span>
                              </div>
                           </>
                        )}
                     </div>

                     <div className="text-sm text-slate-600 italic border-r-2 border-slate-300 pr-2">
                        "{request.reason}"
                     </div>
                  </div>

                  {request.status === 'approved' && isEarlyExit && (
                     <button
                        onClick={() => setPassRequest(request)}
                        className="w-full mb-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
                     >
                        <Ticket size={16} />
                        عرض تصريح الخروج
                     </button>
                  )}

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
              <h3 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-100 pb-2">طلب جديد</h3>
              
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                 <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                    <button
                       type="button"
                       onClick={() => setRequestType('absence')}
                       className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${requestType === 'absence' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                    >
                       غياب يوم كامل
                    </button>
                    <button
                       type="button"
                       onClick={() => setRequestType('early_exit')}
                       className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${requestType === 'early_exit' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500'}`}
                    >
                       خروج مبكر
                    </button>
                 </div>

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
                    <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ {requestType === 'absence' ? 'الغياب' : 'الخروج'}</label>
                    <input 
                       type="date"
                       value={requestDate}
                       onChange={(e) => setRequestDate(e.target.value)}
                       className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                       required
                    />
                 </div>

                 {requestType === 'early_exit' && (
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">وقت الخروج</label>
                          <input 
                             type="time"
                             value={exitTime}
                             onChange={(e) => setExitTime(e.target.value)}
                             className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                             required
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">المستلم (الشخص)</label>
                          <input 
                             type="text"
                             value={pickupPerson}
                             onChange={(e) => setPickupPerson(e.target.value)}
                             placeholder="مثال: الوالد"
                             className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                       </div>
                    </div>
                 )}

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">السبب</label>
                    <textarea 
                       value={requestReason}
                       onChange={(e) => setRequestReason(e.target.value)}
                       className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                       placeholder="مثال: موعد طبي، ظروف عائلية..."
                       required
                    />
                 </div>
                 
                 <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2 text-xs text-blue-700">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <p>
                       {requestType === 'absence' 
                          ? 'ملاحظة: عند الموافقة، سيتم تسجيل حالة الطالب "غياب بعذر" تلقائياً.' 
                          : 'ملاحظة: سيتم إصدار تصريح خروج رقمي عند الموافقة.'}
                    </p>
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