import React, { useState, useMemo } from 'react';
import { ArrowRight, Calendar, User, BrainCircuit, FileText, Edit2, Save, X, Star, Medal, Clock, ShieldCheck, MessageSquare, Printer, ChevronLeft, ChevronRight, TrendingUp, Phone, FileWarning, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Student, AttendanceRecord, AttendanceStatus } from '../types';
import { analyzeStudentReport, generateSchoolLetter } from '../services/geminiService';
import { saveAttendance, updateStudent } from '../services/storageService';
import OfficialLetterModal from './OfficialLetterModal';

interface StudentHistoryProps {
  student: Student;
  allRecords: AttendanceRecord[];
  onBack: () => void;
  onUpdate: () => void;
}

const StudentHistory: React.FC<StudentHistoryProps> = ({ student, allRecords, onBack, onUpdate }) => {
  const [report, setReport] = useState<string>('');
  const [loadingReport, setLoadingReport] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);
  const [editNote, setEditNote] = useState<string>('');
  
  // Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(student.name);
  const [editGrade, setEditGrade] = useState(student.grade);
  const [editPhone, setEditPhone] = useState(student.parentPhone || '');

  // Calendar View State
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Letter Generation State
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [letterContent, setLetterContent] = useState('');
  const [letterType, setLetterType] = useState<'warning' | 'appreciation'>('warning');
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);

  const studentRecords = useMemo(() => {
    return allRecords
      .filter(r => r.studentId === student.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allRecords, student.id]);

  const stats = useMemo(() => {
    return {
      present: studentRecords.filter(r => r.status === AttendanceStatus.PRESENT).length,
      absent: studentRecords.filter(r => r.status === AttendanceStatus.ABSENT).length,
      late: studentRecords.filter(r => r.status === AttendanceStatus.LATE).length,
      excused: studentRecords.filter(r => r.status === AttendanceStatus.EXCUSED).length,
      total: studentRecords.length
    };
  }, [studentRecords]);

  // Excused is counted as present for the score calculation
  const attendanceRate = stats.total > 0 
    ? Math.round(((stats.present + stats.excused + (stats.late * 0.5)) / stats.total) * 100) 
    : 0;
  
  // Monthly Trend Data
  const trendData = useMemo(() => {
    const monthlyData: Record<string, { total: number, score: number }> = {};
    
    // Sort records ascending for the chart
    const sortedRecords = [...studentRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedRecords.forEach(record => {
      const monthKey = record.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, score: 0 };
      }
      
      monthlyData[monthKey].total += 1;
      
      if (record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.EXCUSED) {
        monthlyData[monthKey].score += 1;
      } else if (record.status === AttendanceStatus.LATE) {
        monthlyData[monthKey].score += 0.5;
      }
    });

    return Object.entries(monthlyData).map(([key, data]) => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return {
        name: date.toLocaleDateString('ar-EG', { month: 'short' }),
        rate: Math.round((data.score / data.total) * 100),
        fullDate: key
      };
    });
  }, [studentRecords]);

  // Calculate Badges
  const badges = useMemo(() => {
    const list = [];
    if (attendanceRate === 100 && stats.total > 5) {
        list.push({ icon: <Medal size={16} />, label: 'مثالي', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' });
    }
    if (attendanceRate >= 90 && attendanceRate < 100) {
        list.push({ icon: <Star size={16} />, label: 'متميز', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' });
    }
    if (stats.late === 0 && stats.total > 5) {
        list.push({ icon: <Clock size={16} />, label: 'منضبط', color: 'bg-green-100 text-green-700 border-green-200' });
    }
    if (stats.total > 20 && attendanceRate > 85) {
         list.push({ icon: <ShieldCheck size={16} />, label: 'مواظب', color: 'bg-blue-100 text-blue-700 border-blue-200' });
    }
    return list;
  }, [attendanceRate, stats]);

  // Calendar Logic
  const calendarData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days = [];
    // Add empty slots for days before the 1st
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const record = studentRecords.find(r => r.date === dateStr);
      days.push({ day: i, date: dateStr, record });
    }

    return days;
  }, [calendarDate, studentRecords]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCalendarDate(newDate);
  };

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    const result = await analyzeStudentReport(student, allRecords);
    setReport(result);
    setLoadingReport(false);
  };
  
  const handleGenerateLetter = async (type: 'warning' | 'appreciation') => {
    setIsGeneratingLetter(true);
    setLetterType(type);
    
    // Get absent dates for warning context
    const absentDates = studentRecords
      .filter(r => r.status === AttendanceStatus.ABSENT)
      .slice(0, 5) // Last 5 absences
      .map(r => r.date);

    const letter = await generateSchoolLetter(student.name, student.grade, type, { days: absentDates });
    setLetterContent(letter);
    setIsGeneratingLetter(false);
    setIsLetterModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEditClick = (record: AttendanceRecord) => {
    setEditingRecordId(record.id);
    setEditStatus(record.status);
    setEditNote(record.note || '');
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
  };

  const handleSaveEdit = (record: AttendanceRecord) => {
    const updatedRecord: AttendanceRecord = {
      ...record,
      status: editStatus,
      note: editNote
    };
    
    saveAttendance([updatedRecord]);
    setEditingRecordId(null);
    onUpdate(); 
  };

  const handleSaveProfile = () => {
    if (editName.trim() && editGrade.trim()) {
      updateStudent({
        ...student,
        name: editName,
        grade: editGrade,
        parentPhone: editPhone.trim()
      });
      setIsEditingProfile(false);
      onUpdate();
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch(status) {
      case AttendanceStatus.PRESENT: return 'bg-green-100 text-green-700 border-green-200';
      case AttendanceStatus.ABSENT: return 'bg-red-100 text-red-700 border-red-200';
      case AttendanceStatus.LATE: return 'bg-amber-100 text-amber-700 border-amber-200';
      case AttendanceStatus.EXCUSED: return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const getCalendarStatusClass = (status?: AttendanceStatus) => {
    switch(status) {
      case AttendanceStatus.PRESENT: return 'bg-green-500 text-white';
      case AttendanceStatus.ABSENT: return 'bg-red-500 text-white';
      case AttendanceStatus.LATE: return 'bg-amber-500 text-white';
      case AttendanceStatus.EXCUSED: return 'bg-blue-500 text-white';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  const getStatusText = (status: AttendanceStatus) => {
    switch(status) {
      case AttendanceStatus.PRESENT: return 'حاضر';
      case AttendanceStatus.ABSENT: return 'غائب';
      case AttendanceStatus.LATE: return 'متأخر';
      case AttendanceStatus.EXCUSED: return 'بعذر';
      default: return '-';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4">
      {/* Official Letter Modal */}
      <OfficialLetterModal 
        isOpen={isLetterModalOpen}
        onClose={() => setIsLetterModalOpen(false)}
        content={letterContent}
        studentName={student.name}
        type={letterType}
      />

      <div className="flex justify-between items-center print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowRight size={20} />
          <span>العودة للقائمة</span>
        </button>

        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Printer size={18} />
          <span>طباعة التقرير</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:shadow-none print:border-0 print:p-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6 mb-6 print:border-slate-300">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 print:bg-slate-100 print:text-slate-800 print:border-slate-300 shrink-0">
              <User size={32} />
            </div>
            
            <div className="flex-1">
              <div className="text-xs text-slate-400 mb-1 hidden print:block">تقرير حالة الطالب</div>
              
              {isEditingProfile ? (
                <div className="flex flex-col gap-2">
                   <input 
                     type="text" 
                     value={editName}
                     onChange={(e) => setEditName(e.target.value)}
                     className="font-bold text-lg border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   />
                   <div className="flex flex-wrap items-center gap-2">
                     <input 
                       type="text" 
                       value={editGrade}
                       onChange={(e) => setEditGrade(e.target.value)}
                       className="text-sm border border-indigo-300 rounded px-2 py-1 w-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                       placeholder="الصف"
                     />
                     <input 
                       type="text" 
                       value={editPhone}
                       onChange={(e) => setEditPhone(e.target.value)}
                       className="text-sm border border-indigo-300 rounded px-2 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                       placeholder="رقم الهاتف"
                       dir="ltr"
                     />
                     <button onClick={handleSaveProfile} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"><Save size={16}/></button>
                     <button onClick={() => setIsEditingProfile(false)} className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"><X size={16}/></button>
                   </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                      {student.name}
                      <button onClick={() => setIsEditingProfile(true)} className="text-slate-300 hover:text-indigo-500 print:hidden transition-colors"><Edit2 size={16} /></button>
                      <div className="flex gap-1 print:hidden">
                          {badges.map((b, i) => (
                              <span key={i} title={b.label} className={`p-1 rounded-full text-[10px] ${b.color} border`}>
                                  {b.icon}
                              </span>
                          ))}
                      </div>
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-slate-500">
                     <p>{student.grade}</p>
                     {student.parentPhone && (
                        <div className="flex items-center gap-1 text-sm bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                           <Phone size={12} />
                           <span dir="ltr">{student.parentPhone}</span>
                        </div>
                     )}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-4 text-center w-full md:w-auto">
            <div className="flex-1 md:flex-none px-6 py-3 bg-slate-50 rounded-lg border border-slate-100 print:bg-transparent print:border-slate-300">
              <p className="text-sm text-slate-500 mb-1">نسبة الحضور</p>
              <p className={`text-2xl font-bold ${attendanceRate >= 90 ? 'text-green-600' : attendanceRate >= 75 ? 'text-amber-500' : 'text-red-600'} print:text-black`}>
                {attendanceRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex justify-between items-center print:bg-white print:border-slate-200">
            <span className="text-green-700 font-medium print:text-slate-700">حضور</span>
            <span className="text-2xl font-bold text-green-700 print:text-slate-900">{stats.present}</span>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 flex justify-between items-center print:bg-white print:border-slate-200">
            <span className="text-amber-700 font-medium print:text-slate-700">تأخير</span>
            <span className="text-2xl font-bold text-amber-700 print:text-slate-900">{stats.late}</span>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center print:bg-white print:border-slate-200">
            <span className="text-blue-700 font-medium print:text-slate-700">بعذر</span>
            <span className="text-2xl font-bold text-blue-700 print:text-slate-900">{stats.excused}</span>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex justify-between items-center print:bg-white print:border-slate-200">
            <span className="text-red-700 font-medium print:text-slate-700">غياب</span>
            <span className="text-2xl font-bold text-red-700 print:text-slate-900">{stats.absent}</span>
          </div>
        </div>

        {/* --- Action Buttons (Letters) --- */}
        <div className="grid grid-cols-2 gap-4 mb-8 print:hidden">
           <button 
             onClick={() => handleGenerateLetter('warning')}
             disabled={isGeneratingLetter}
             className="p-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors disabled:opacity-50"
           >
             {isGeneratingLetter && letterType === 'warning' ? <div className="animate-spin w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full"></div> : <FileWarning size={20} />}
             <span>إنشاء خطاب إنذار</span>
           </button>
           <button 
             onClick={() => handleGenerateLetter('appreciation')}
             disabled={isGeneratingLetter}
             className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors disabled:opacity-50"
           >
             {isGeneratingLetter && letterType === 'appreciation' ? <div className="animate-spin w-4 h-4 border-2 border-indigo-700 border-t-transparent rounded-full"></div> : <Award size={20} />}
             <span>إنشاء شهادة شكر</span>
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-1">
          <div className="space-y-6">
            
            {/* Trend Chart (Visible only if there's enough data) */}
            {trendData.length > 1 && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 print:hidden">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <TrendingUp size={18} className="text-indigo-500" />
                    تطور مستوى الحضور
                 </h3>
                 <div className="h-48 w-full dir-ltr">
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{fontSize: 12}} />
                          <YAxis domain={[0, 100]} hide />
                          <RechartsTooltip 
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                             formatter={(value: number) => [`${value}%`, 'نسبة الحضور']}
                          />
                          <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                       </LineChart>
                    </ResponsiveContainer>
                 </div>
              </div>
            )}

            {/* Calendar Visualization */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 print:border-slate-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Calendar size={18} className="text-slate-500" />
                    التقويم الشهري
                  </h3>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 print:hidden">
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-200 rounded text-slate-600"><ChevronRight size={16} /></button>
                    <span className="text-sm font-medium w-24 text-center">{calendarDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-200 rounded text-slate-600"><ChevronLeft size={16} /></button>
                  </div>
                  <div className="hidden print:block text-sm font-medium">
                      {calendarDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map(day => (
                    <div key={day} className="text-xs text-slate-400 font-medium">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarData.map((data, idx) => (
                    <div 
                      key={idx} 
                      className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs font-medium relative group ${data ? getCalendarStatusClass(data.record?.status) : ''}`}
                    >
                      {data && (
                        <>
                          <span>{data.day}</span>
                          {data.record?.note && (
                            <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full -mr-0.5 -mt-0.5 border border-white"></div>
                          )}
                          {/* Tooltip */}
                          {data.record && (
                              <div className="hidden group-hover:block absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] p-2 rounded whitespace-nowrap z-10 pointer-events-none">
                                  {getStatusText(data.record.status)}
                                  {data.record.note && ` - ${data.record.note}`}
                              </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
            </div>

             <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
               <FileText size={20} className="text-slate-400" />
               سجل الحضور (الأحدث)
             </h3>
             <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden max-h-[300px] overflow-y-auto print:bg-transparent print:max-h-none print:overflow-visible">
               <table className="w-full text-right">
                 <thead className="bg-slate-100 text-slate-600 text-sm print:bg-slate-200 print:text-black">
                   <tr>
                     <th className="p-3 font-medium">التاريخ</th>
                     <th className="p-3 font-medium">الحالة</th>
                     <th className="p-3 font-medium">ملاحظات</th>
                     <th className="p-3 font-medium w-20 print:hidden"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                   {studentRecords.length > 0 ? studentRecords.map(record => (
                     <tr key={record.id} className="bg-white hover:bg-slate-50 print:bg-transparent">
                       <td className="p-3 text-slate-800 font-medium dir-ltr text-right">
                         {record.date}
                       </td>
                       <td className="p-3">
                         {editingRecordId === record.id ? (
                           <select 
                             value={editStatus} 
                             onChange={(e) => setEditStatus(e.target.value as AttendanceStatus)}
                             className="w-full p-1 border border-indigo-300 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                           >
                             <option value={AttendanceStatus.PRESENT}>حاضر</option>
                             <option value={AttendanceStatus.LATE}>متأخر</option>
                             <option value={AttendanceStatus.EXCUSED}>بعذر</option>
                             <option value={AttendanceStatus.ABSENT}>غائب</option>
                           </select>
                         ) : (
                           <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(record.status)} print:border-black print:bg-white print:text-black`}>
                             {getStatusText(record.status)}
                           </span>
                         )}
                       </td>
                       <td className="p-3">
                          {editingRecordId === record.id ? (
                             <input 
                               type="text"
                               value={editNote}
                               onChange={(e) => setEditNote(e.target.value)}
                               className="w-full p-1 border border-indigo-300 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                               placeholder="إضافة ملاحظة..."
                             />
                          ) : (
                            record.note ? (
                              <span className="text-sm text-slate-600 flex items-center gap-1">
                                <MessageSquare size={12} className="text-slate-400 print:hidden" />
                                {record.note}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">-</span>
                            )
                          )}
                       </td>
                       <td className="p-3 text-left print:hidden">
                         {editingRecordId === record.id ? (
                           <div className="flex items-center gap-1 justify-end">
                             <button onClick={() => handleSaveEdit(record)} className="p-1 text-green-600 hover:bg-green-100 rounded">
                               <Save size={16} />
                             </button>
                             <button onClick={handleCancelEdit} className="p-1 text-red-600 hover:bg-red-100 rounded">
                               <X size={16} />
                             </button>
                           </div>
                         ) : (
                           <button onClick={() => handleEditClick(record)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                             <Edit2 size={16} />
                           </button>
                         )}
                       </td>
                     </tr>
                   )) : (
                     <tr>
                       <td colSpan={4} className="p-4 text-center text-slate-400">لا يوجد سجلات حتى الآن</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>

          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
               <BrainCircuit size={20} className="text-indigo-500 print:hidden" />
               <FileText size={20} className="hidden print:block text-slate-600" />
               التقرير السلوكي
             </h3>
             
             <div className="flex-1 bg-gradient-to-br from-white to-indigo-50 rounded-xl border border-indigo-100 p-6 flex flex-col print:bg-white print:border-slate-200">
               {loadingReport ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-indigo-500 min-h-[200px]">
                   <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                   <p>جاري إنشاء التقرير...</p>
                 </div>
               ) : report ? (
                 <div className="flex-1 overflow-y-auto mb-4 prose prose-indigo max-w-none print:overflow-visible">
                   <div className="whitespace-pre-line text-slate-700 leading-relaxed text-sm print:text-black">
                     {report}
                   </div>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[200px] text-center p-4 print:hidden">
                   <FileText size={48} className="mb-4 opacity-20" />
                   <p>اضغط أدناه لتوليد تقرير أداء وسلوك للطالب باستخدام الذكاء الاصطناعي</p>
                 </div>
               )}
               
               <button 
                 onClick={handleGenerateReport}
                 disabled={loadingReport}
                 className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-md print:hidden"
               >
                 {report ? 'تحديث التقرير' : 'إنشاء تقرير الطالب'}
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentHistory;
