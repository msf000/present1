import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Save, Check, Search, Filter, CheckSquare, XCircle, Clock, CheckCircle2, FileText, MessageSquare, ChevronRight, ChevronLeft, RotateCcw, Sparkles, MessageCircle, List } from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStatus, AppSettings } from '../types';
import { saveAttendance, getRecordsByDate } from '../services/storageService';
import SmartAttendanceModal from './SmartAttendanceModal';

interface AttendanceSheetProps {
  students: Student[];
  onUpdate: () => void;
  settings?: AppSettings;
}

const AttendanceSheet: React.FC<AttendanceSheetProps> = ({ students, onUpdate, settings }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  // Smart Attendance State
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const uniqueGrades = useMemo(() => {
    const grades = new Set(students.map(s => s.grade));
    return Array.from(grades).sort();
  }, [students]);

  useEffect(() => {
    // Load existing records for the selected date
    const existing = getRecordsByDate(selectedDate);
    const newRecordsState: Record<string, AttendanceStatus> = {};
    const newNotesState: Record<string, string> = {};
    
    students.forEach(s => {
      const record = existing.find(r => r.studentId === s.id);
      // Default to Present if no record exists yet
      newRecordsState[s.id] = record ? record.status : AttendanceStatus.PRESENT;
      newNotesState[s.id] = record?.note || '';
    });

    setRecords(newRecordsState);
    setNotes(newNotesState);
    setSavedSuccess(false);
    setActiveNoteId(null);
  }, [selectedDate, students]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
    setSavedSuccess(false);
    
    // Automatically open note input if "Excused" is selected and no note exists
    if (status === AttendanceStatus.EXCUSED && !notes[studentId]) {
      setActiveNoteId(studentId);
    }
  };

  const handleNoteChange = (studentId: string, value: string) => {
    setNotes(prev => ({ ...prev, [studentId]: value }));
    setSavedSuccess(false);
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleSave = () => {
    const recordsToSave: AttendanceRecord[] = students.map(s => ({
      id: `${selectedDate}-${s.id}`,
      studentId: s.id,
      schoolId: s.schoolId,
      date: selectedDate,
      status: records[s.id] || AttendanceStatus.PRESENT,
      note: notes[s.id] || ''
    }));

    saveAttendance(recordsToSave);
    onUpdate();
    setSavedSuccess(true);
    setActiveNoteId(null);
    
    // Hide success message after 3 seconds
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSmartApply = (updates: { studentId: string; status: AttendanceStatus; note: string }[]) => {
    const newRecords = { ...records };
    const newNotes = { ...notes };
    
    updates.forEach(u => {
      newRecords[u.studentId] = u.status;
      if (u.note) newNotes[u.studentId] = u.note;
    });
    
    setRecords(newRecords);
    setNotes(newNotes);
    setSavedSuccess(false);
  };

  const sendWhatsApp = (student: Student, status: AttendanceStatus) => {
    if (!student.parentPhone) {
      alert(`عفواً، لا يوجد رقم هاتف مسجل لولي أمر الطالب ${student.name}. يرجى إضافته من قائمة الطلاب.`);
      return;
    }

    let message = '';
    const dateStr = new Date(selectedDate).toLocaleDateString('ar-EG');
    
    // Use template if available
    if (status === AttendanceStatus.ABSENT) {
      message = settings?.whatsappTemplates?.absent || `السلام عليكم ولي أمر الطالب {name}، نود إشعاركم بغياب ابنكم/ابنتكم عن المدرسة اليوم {date}. يرجى تزويدنا بسبب الغياب للاطمئنان.`;
    } else if (status === AttendanceStatus.LATE) {
      message = settings?.whatsappTemplates?.late || `السلام عليكم ولي أمر الطالب {name}، نود إشعاركم بتأخر ابنكم/ابنتكم عن الطابور الصباحي اليوم {date}. نأمل الحرص على الحضور مبكراً.`;
    } else {
      message = `السلام عليكم ولي أمر الطالب {name}.`;
    }

    // Replace variables
    message = message.replace(/{name}/g, student.name).replace(/{date}/g, dateStr);

    const url = `https://wa.me/${student.parentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.includes(searchTerm) || student.grade.includes(searchTerm);
      const matchesGrade = selectedGrade === 'all' || student.grade === selectedGrade;
      return matchesSearch && matchesGrade;
    });
  }, [students, searchTerm, selectedGrade]);

  const markAllDisplayedAsPresent = () => {
    const newRecords = { ...records };
    filteredStudents.forEach(student => {
      newRecords[student.id] = AttendanceStatus.PRESENT;
    });
    setRecords(newRecords);
    setSavedSuccess(false);
  };

  const currentStats = useMemo(() => {
    let present = 0, absent = 0, late = 0, excused = 0;
    filteredStudents.forEach(s => {
      const status = records[s.id];
      if (status === AttendanceStatus.ABSENT) absent++;
      else if (status === AttendanceStatus.LATE) late++;
      else if (status === AttendanceStatus.EXCUSED) excused++;
      else present++; // Default is present
    });
    return { present, absent, late, excused, total: filteredStudents.length };
  }, [records, filteredStudents]);

  // Absent students for summary modal (based on current filtered date)
  const absentStudentsList = useMemo(() => {
     return students.filter(s => {
        // Show all students who are marked absent or late for the selected date
        // Regardless of current view filter, so the admin sees the full picture for the day
        const status = records[s.id];
        return status === AttendanceStatus.ABSENT || status === AttendanceStatus.LATE;
     });
  }, [students, records]);

  if (students.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-slate-200">
        <p className="text-slate-500">الرجاء إضافة طلاب أولاً لتتمكن من تسجيل الحضور.</p>
      </div>
    );
  }

  // Helper to show readable date
  const readableDate = new Date(selectedDate).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6 pb-24 relative animate-fade-in">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
           {/* Date Picker with Navigation */}
           <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
             <div className="flex items-center gap-2 w-full sm:w-auto">
               <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                 <ChevronRight size={20} />
               </button>
               
               <div className="flex items-center gap-2 relative w-full sm:w-auto">
                 <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                 <input
                   type="date"
                   value={selectedDate}
                   onChange={(e) => setSelectedDate(e.target.value)}
                   className="w-full sm:w-40 pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-sm"
                 />
               </div>

               <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                 <ChevronLeft size={20} />
               </button>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
               <span className="text-slate-600 font-medium min-w-[120px] text-center bg-slate-50 px-3 py-2 rounded-lg text-sm border border-slate-100">
                 {readableDate}
               </span>
               <button 
                 onClick={goToToday}
                 className="flex items-center gap-1 text-xs text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors border border-indigo-100"
               >
                 <RotateCcw size={14} />
                 <span>اليوم</span>
               </button>
            </div>
          </div>
          
          <div className="flex w-full lg:w-auto gap-2 overflow-x-auto pb-1 lg:pb-0">
             <button
              onClick={() => setIsSmartModalOpen(true)}
              className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-bold transition-all shadow-md shadow-indigo-200"
              title="تسجيل ذكي باستخدام الذكاء الاصطناعي"
            >
              <Sparkles size={18} className="text-yellow-300" />
              <span className="text-sm">تسجيل ذكي</span>
            </button>
            
            <button
              onClick={() => setIsSummaryModalOpen(true)}
              className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-lg font-bold transition-all"
              title="عرض ملخص الغائبين وإرسال تنبيهات"
            >
              <List size={18} />
              <span className="text-sm">قائمة الغياب</span>
            </button>

            <button
              onClick={handleSave}
              className={`flex-shrink-0 flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                savedSuccess 
                  ? 'bg-green-600 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {savedSuccess ? <Check size={20} /> : <Save size={20} />}
              <span>{savedSuccess ? 'تم الحفظ' : 'حفظ'}</span>
            </button>
          </div>
        </div>
        
        <div className="relative w-full border-t border-slate-100 pt-4 flex flex-col md:flex-row gap-3">
           <div className="relative md:w-1/3">
             <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
              >
                <option value="all">كل الصفوف</option>
                {uniqueGrades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
           </div>
           
           <div className="relative md:w-2/3">
             <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
                type="text" 
                placeholder="بحث بالاسم..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
           </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-slate-600 font-medium">اسم الطالب</th>
              <th className="p-4 text-slate-600 font-medium text-center">حاضر</th>
              <th className="p-4 text-slate-600 font-medium text-center">متأخر</th>
              <th className="p-4 text-slate-600 font-medium text-center">بعذر</th>
              <th className="p-4 text-slate-600 font-medium text-center">غائب</th>
              <th className="p-4 text-slate-600 font-medium text-center w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
              const currentStatus = records[student.id];
              const hasNote = notes[student.id] && notes[student.id].trim().length > 0;
              const isNoteActive = activeNoteId === student.id;
              const isAbsentOrLate = currentStatus === AttendanceStatus.ABSENT || currentStatus === AttendanceStatus.LATE;

              return (
                <React.Fragment key={student.id}>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">
                    <div>{student.name}</div>
                    <div className="text-xs text-slate-500">{student.grade}</div>
                    {hasNote && !isNoteActive && (
                      <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <FileText size={10} />
                        <span className="truncate max-w-[150px]">{notes[student.id]}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <label className="cursor-pointer inline-flex items-center justify-center p-2 rounded-full hover:bg-green-50">
                      <input
                        type="radio"
                        name={`status-${student.id}`}
                        checked={currentStatus === AttendanceStatus.PRESENT}
                        onChange={() => handleStatusChange(student.id, AttendanceStatus.PRESENT)}
                        className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300 accent-green-600"
                      />
                    </label>
                  </td>
                  <td className="p-4 text-center">
                    <label className="cursor-pointer inline-flex items-center justify-center p-2 rounded-full hover:bg-amber-50">
                      <input
                        type="radio"
                        name={`status-${student.id}`}
                        checked={currentStatus === AttendanceStatus.LATE}
                        onChange={() => handleStatusChange(student.id, AttendanceStatus.LATE)}
                        className="w-5 h-5 text-amber-500 focus:ring-amber-500 border-gray-300 accent-amber-500"
                      />
                    </label>
                  </td>
                  <td className="p-4 text-center">
                    <label className="cursor-pointer inline-flex items-center justify-center p-2 rounded-full hover:bg-blue-50">
                      <input
                        type="radio"
                        name={`status-${student.id}`}
                        checked={currentStatus === AttendanceStatus.EXCUSED}
                        onChange={() => handleStatusChange(student.id, AttendanceStatus.EXCUSED)}
                        className="w-5 h-5 text-blue-500 focus:ring-blue-500 border-gray-300 accent-blue-500"
                      />
                    </label>
                  </td>
                  <td className="p-4 text-center">
                    <label className="cursor-pointer inline-flex items-center justify-center p-2 rounded-full hover:bg-red-50">
                      <input
                        type="radio"
                        name={`status-${student.id}`}
                        checked={currentStatus === AttendanceStatus.ABSENT}
                        onChange={() => handleStatusChange(student.id, AttendanceStatus.ABSENT)}
                        className="w-5 h-5 text-red-600 focus:ring-red-500 border-gray-300 accent-red-600"
                      />
                    </label>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {isAbsentOrLate && (
                        <button
                          onClick={() => sendWhatsApp(student, currentStatus)}
                          className="p-2 rounded-full text-green-500 hover:bg-green-50 transition-colors"
                          title="إرسال تنبيه واتساب"
                        >
                          <MessageCircle size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => setActiveNoteId(isNoteActive ? null : student.id)}
                        className={`p-2 rounded-full transition-colors ${
                          hasNote || isNoteActive ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                        }`}
                        title="إضافة ملاحظة"
                      >
                        <MessageSquare size={18} fill={hasNote ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </td>
                </tr>
                {isNoteActive && (
                  <tr className="bg-indigo-50/30 animate-fade-in">
                    <td colSpan={6} className="p-3 border-b border-indigo-100">
                      <div className="flex items-center gap-2 max-w-lg mx-auto">
                         <input
                           type="text"
                           value={notes[student.id] || ''}
                           onChange={(e) => handleNoteChange(student.id, e.target.value)}
                           placeholder="اكتب سبب العذر أو ملاحظة..."
                           className="flex-1 p-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                           autoFocus
                         />
                         <button 
                           onClick={() => setActiveNoteId(null)}
                           className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg"
                         >
                           <Check size={18} />
                         </button>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })
            ) : (
               <tr>
                 <td colSpan={6} className="p-8 text-center text-slate-400">لا توجد نتائج تطابق البحث</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Real-time Stats Footer */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-10 transition-transform animate-fade-in overflow-x-auto print:hidden">
        <div className="flex gap-6 mx-auto justify-center min-w-max">
           <div className="flex items-center gap-2 text-green-700 font-bold">
             <CheckCircle2 size={20} className="text-green-600" />
             <span className="hidden md:inline">حاضر:</span>
             <span className="text-xl">{currentStats.present}</span>
           </div>
           
           <div className="flex items-center gap-2 text-amber-700 font-bold">
             <Clock size={20} className="text-amber-600" />
             <span className="hidden md:inline">متأخر:</span>
             <span className="text-xl">{currentStats.late}</span>
           </div>

           <div className="flex items-center gap-2 text-blue-700 font-bold">
             <FileText size={20} className="text-blue-600" />
             <span className="hidden md:inline">بعذر:</span>
             <span className="text-xl">{currentStats.excused}</span>
           </div>

           <div className="flex items-center gap-2 text-red-700 font-bold">
             <XCircle size={20} className="text-red-600" />
             <span className="hidden md:inline">غائب:</span>
             <span className="text-xl">{currentStats.absent}</span>
           </div>

           <div className="w-px h-8 bg-slate-300 mx-2 hidden md:block"></div>

           <div className="hidden md:flex items-center gap-2 text-slate-600">
             <span>الإجمالي:</span>
             <span className="font-bold">{currentStats.total}</span>
           </div>
        </div>
      </div>

      {/* Smart Modal */}
      {isSmartModalOpen && (
        <SmartAttendanceModal 
          students={students}
          onClose={() => setIsSmartModalOpen(false)}
          onApply={handleSmartApply}
        />
      )}

      {/* Absence Summary Modal */}
      {isSummaryModalOpen && (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <List className="text-red-500" />
                     قائمة الغياب والتأخير ({absentStudentsList.length})
                  </h3>
                  <button onClick={() => setIsSummaryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                     <CheckCircle2 size={24} />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-2">
                  {absentStudentsList.length > 0 ? (
                     <div className="space-y-2">
                        {absentStudentsList.map(student => (
                           <div key={student.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                              <div>
                                 <div className="font-bold text-slate-800">{student.name}</div>
                                 <div className="text-xs text-slate-500 flex items-center gap-2">
                                    <span>{student.grade}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${records[student.id] === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                       {records[student.id] === AttendanceStatus.ABSENT ? 'غائب' : 'متأخر'}
                                    </span>
                                 </div>
                              </div>
                              {student.parentPhone ? (
                                 <button 
                                    onClick={() => sendWhatsApp(student, records[student.id])}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors"
                                 >
                                    <MessageCircle size={16} />
                                    <span>إرسال</span>
                                 </button>
                              ) : (
                                 <span className="text-xs text-slate-300">لا يوجد رقم</span>
                              )}
                           </div>
                        ))}
                     </div>
                  ) : (
                     <div className="p-8 text-center text-slate-400">
                        رائع! لا يوجد غياب أو تأخير مسجل اليوم.
                     </div>
                  )}
               </div>
               
               <div className="p-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-center">
                  تلميح: تأكد من السماح للنوافذ المنبثقة لفتح واتساب ويب.
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AttendanceSheet;