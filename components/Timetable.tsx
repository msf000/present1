import React, { useState, useEffect, useMemo } from 'react';
import { CalendarDays, Filter, Plus, BookOpen, User, Trash2, Save, Printer } from 'lucide-react';
import { Subject, ClassSchedule, User as UserType } from '../types';
import { getSubjects, saveSubject, deleteSubject, getSchedule, saveSchedule } from '../services/storageService';

interface TimetableProps {
  schoolId: string;
  currentUser: UserType;
  classes: string[]; // From settings
}

const Timetable: React.FC<TimetableProps> = ({ schoolId, currentUser, classes }) => {
  const [selectedGrade, setSelectedGrade] = useState<string>(classes.length > 0 ? classes[0] : '');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedule, setSchedule] = useState<ClassSchedule['schedule']>({});
  
  // Subject Management State
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTeacher, setNewSubjectTeacher] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#3b82f6');
  
  // Cell Edit State
  const [editingCell, setEditingCell] = useState<{ day: string, period: number } | null>(null);

  const canEdit = ['admin', 'principal', 'vice_principal'].includes(currentUser.role);
  const weekDays = ['0', '1', '2', '3', '4']; // Sunday to Thursday (index based on mock data logic usually, but let's map them)
  const dayNames: Record<string, string> = { '0': 'الأحد', '1': 'الإثنين', '2': 'الثلاثاء', '3': 'الأربعاء', '4': 'الخميس' };
  const periods = [1, 2, 3, 4, 5, 6, 7];

  useEffect(() => {
    setSubjects(getSubjects(schoolId));
  }, [schoolId]);

  useEffect(() => {
    if (selectedGrade) {
      const savedSchedule = getSchedule(schoolId, selectedGrade);
      setSchedule(savedSchedule ? savedSchedule.schedule : {});
    }
  }, [schoolId, selectedGrade]);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const newSubject: Subject = {
      id: crypto.randomUUID(),
      schoolId,
      name: newSubjectName,
      teacherName: newSubjectTeacher,
      color: newSubjectColor
    };

    saveSubject(newSubject);
    setSubjects([...subjects, newSubject]);
    setNewSubjectName('');
    setNewSubjectTeacher('');
  };

  const handleDeleteSubject = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المادة؟ سيتم إزالتها من جميع الجداول.')) {
      deleteSubject(id);
      setSubjects(subjects.filter(s => s.id !== id));
    }
  };

  const handleAssignSubject = (subjectId: string) => {
    if (editingCell) {
      const { day, period } = editingCell;
      const updatedSchedule = { ...schedule };
      
      if (!updatedSchedule[day]) updatedSchedule[day] = {};
      updatedSchedule[day][period] = subjectId;
      
      setSchedule(updatedSchedule);
      
      // Auto-save schedule
      saveSchedule({
        id: `${schoolId}-${selectedGrade}`,
        schoolId,
        grade: selectedGrade,
        schedule: updatedSchedule
      });
      
      setEditingCell(null);
    }
  };

  const handleClearCell = (day: string, period: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    
    const updatedSchedule = { ...schedule };
    if (updatedSchedule[day]) {
      delete updatedSchedule[day][period];
      setSchedule(updatedSchedule);
      saveSchedule({
        id: `${schoolId}-${selectedGrade}`,
        schoolId,
        grade: selectedGrade,
        schedule: updatedSchedule
      });
    }
  };

  const getSubjectById = (id: string) => subjects.find(s => s.id === id);

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <CalendarDays size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">الجدول الدراسي</h2>
            <p className="text-xs text-slate-500">إدارة الحصص وتوزيع المواد</p>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
             <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer font-bold"
              >
                {classes.length > 0 ? classes.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                )) : <option value="" disabled>يرجى إضافة صفوف من الإعدادات</option>}
              </select>
           </div>
           
           <button 
             onClick={() => window.print()}
             className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
           >
             <Printer size={18} />
             <span className="hidden md:inline">طباعة</span>
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Sidebar: Subjects (Only for admins/teachers) */}
        {canEdit && (
          <div className="w-full lg:w-80 flex flex-col gap-6 print:hidden">
             {/* Add Subject Form */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                   <Plus size={18} className="text-indigo-600" />
                   إضافة مادة جديدة
                </h3>
                <form onSubmit={handleAddSubject} className="space-y-3">
                   <div>
                      <input 
                         type="text" 
                         value={newSubjectName}
                         onChange={(e) => setNewSubjectName(e.target.value)}
                         placeholder="اسم المادة (مثال: رياضيات)"
                         className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                         required
                      />
                   </div>
                   <div>
                      <input 
                         type="text" 
                         value={newSubjectTeacher}
                         onChange={(e) => setNewSubjectTeacher(e.target.value)}
                         placeholder="اسم المعلم (اختياري)"
                         className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                   </div>
                   <div className="flex items-center gap-2">
                      <input 
                         type="color" 
                         value={newSubjectColor}
                         onChange={(e) => setNewSubjectColor(e.target.value)}
                         className="h-9 w-9 p-0 border-0 rounded cursor-pointer"
                      />
                      <span className="text-xs text-slate-500">لون التمييز</span>
                   </div>
                   <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">
                      إضافة
                   </button>
                </form>
             </div>

             {/* Subjects List */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex-1 overflow-y-auto">
                <h3 className="font-bold text-slate-800 mb-3">المواد المتاحة</h3>
                <div className="space-y-2">
                   {subjects.map(subject => (
                      <div 
                        key={subject.id} 
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group"
                        onClick={() => editingCell && handleAssignSubject(subject.id)}
                      >
                         <div className="flex items-center gap-3">
                            <div className="w-3 h-10 rounded-full" style={{ backgroundColor: subject.color }}></div>
                            <div>
                               <div className="font-bold text-sm text-slate-800">{subject.name}</div>
                               {subject.teacherName && <div className="text-xs text-slate-500 flex items-center gap-1"><User size={10}/> {subject.teacherName}</div>}
                            </div>
                         </div>
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}
                           className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <Trash2 size={16} />
                         </button>
                      </div>
                   ))}
                   {subjects.length === 0 && (
                      <p className="text-center text-slate-400 text-sm py-4">لا توجد مواد مضافة بعد</p>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* Timetable Grid */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
           {/* Periods Header */}
           <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50">
              <div className="p-4 font-bold text-slate-500 text-center border-l border-slate-200">اليوم / الحصة</div>
              {periods.map(p => (
                 <div key={p} className="p-4 font-bold text-slate-700 text-center border-l border-slate-200 bg-slate-100">
                    {p}
                 </div>
              ))}
           </div>

           {/* Days Rows */}
           <div className="flex-1 overflow-y-auto">
              {weekDays.map(day => (
                 <div key={day} className="grid grid-cols-8 min-h-[100px] border-b border-slate-100">
                    <div className="p-4 font-bold text-slate-700 flex items-center justify-center bg-slate-50 border-l border-slate-200">
                       {dayNames[day]}
                    </div>
                    {periods.map(period => {
                       const subjectId = schedule[day]?.[period];
                       const subject = subjectId ? getSubjectById(subjectId) : null;
                       const isEditing = editingCell?.day === day && editingCell?.period === period;

                       return (
                          <div 
                             key={`${day}-${period}`}
                             className={`relative p-2 border-l border-slate-100 flex flex-col items-center justify-center transition-all ${
                                canEdit ? 'cursor-pointer hover:bg-slate-50' : ''
                             } ${isEditing ? 'ring-2 ring-indigo-500 bg-indigo-50 z-10' : ''}`}
                             onClick={() => canEdit && setEditingCell({ day, period })}
                          >
                             {subject ? (
                                <div className="w-full h-full rounded-lg p-2 flex flex-col items-center justify-center text-center gap-1 shadow-sm transition-transform hover:scale-[1.02]" style={{ backgroundColor: `${subject.color}15`, border: `1px solid ${subject.color}40` }}>
                                   <div className="font-bold text-sm" style={{ color: subject.color }}>{subject.name}</div>
                                   {subject.teacherName && (
                                      <div className="text-[10px] text-slate-500 truncate w-full">{subject.teacherName}</div>
                                   )}
                                   {canEdit && (
                                      <button 
                                         onClick={(e) => handleClearCell(day, period, e)}
                                         className="absolute top-1 left-1 text-slate-400 hover:text-red-500 p-1 bg-white/80 rounded-full"
                                      >
                                         <Trash2 size={12} />
                                      </button>
                                   )}
                                </div>
                             ) : (
                                canEdit && <div className="text-slate-200"><Plus size={24} /></div>
                             )}
                             
                             {/* Floating Popup for selection */}
                             {isEditing && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-20 p-2 animate-fade-in print:hidden">
                                   <div className="text-xs font-bold text-slate-500 mb-2 px-2">اختر المادة:</div>
                                   <div className="max-h-48 overflow-y-auto space-y-1">
                                      {subjects.map(s => (
                                         <button
                                            key={s.id}
                                            onClick={(e) => { e.stopPropagation(); handleAssignSubject(s.id); }}
                                            className="w-full text-right px-2 py-1.5 hover:bg-slate-50 rounded text-sm flex items-center gap-2"
                                         >
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                                            <span className="truncate">{s.name}</span>
                                         </button>
                                      ))}
                                   </div>
                                </div>
                             )}
                          </div>
                       );
                    })}
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Timetable;