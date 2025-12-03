import React, { useState, useEffect, useMemo } from 'react';
import { HeartPulse, Stethoscope, Activity, Search, Save, User, X, Plus, AlertCircle, Droplet, Thermometer, CheckCircle2, Clock } from 'lucide-react';
import { Student, HealthRecord, ClinicVisit, User as UserType } from '../types';
import { getStudents, getHealthRecord, saveHealthRecord, getClinicVisits, saveClinicVisit } from '../services/storageService';

interface ClinicManagerProps {
  schoolId: string;
  currentUser: UserType;
}

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const COMMON_CONDITIONS = ['الربو', 'السكري', 'فقر الدم', 'الصرع', 'ضعف السمع', 'ضعف النظر', 'حساسية الصدر', 'مرض القلب', 'نقص المناعة'];
const COMMON_ALLERGIES = ['البنسلين', 'المكسرات', 'البيض', 'السمك', 'الحليب', 'القمح', 'اللقاح', 'الغبار', 'لسعات الحشرات', 'اللاتكس'];

const ClinicManager: React.FC<ClinicManagerProps> = ({ schoolId, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'visits' | 'records'>('visits');
  const [students, setStudents] = useState<Student[]>([]);
  const [visits, setVisits] = useState<ClinicVisit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Visit Form
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [visitReason, setVisitReason] = useState('');
  const [visitTreatment, setVisitTreatment] = useState('');
  const [visitOutcome, setVisitOutcome] = useState<'returned_to_class' | 'sent_home' | 'hospital'>('returned_to_class');
  
  // Health Record Edit
  const [editingHealthRecord, setEditingHealthRecord] = useState<string | null>(null);
  const [tempHealthData, setTempHealthData] = useState<Partial<HealthRecord>>({});
  const [customCondition, setCustomCondition] = useState('');
  const [customAllergy, setCustomAllergy] = useState('');

  useEffect(() => {
    setStudents(getStudents(schoolId));
    setVisits(getClinicVisits(schoolId));
  }, [schoolId]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => s.name.includes(searchTerm) || s.grade.includes(searchTerm));
  }, [students, searchTerm]);

  // Stats
  const todayVisits = visits.filter(v => v.date === new Date().toISOString().split('T')[0]);
  const sentHomeCount = todayVisits.filter(v => v.outcome === 'sent_home').length;

  const handleLogVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !visitReason) return;

    const newVisit: ClinicVisit = {
      id: crypto.randomUUID(),
      schoolId,
      studentId: selectedStudentId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      reason: visitReason,
      treatment: visitTreatment,
      outcome: visitOutcome,
      nurseName: currentUser.name
    };

    saveClinicVisit(newVisit);
    setVisits([newVisit, ...visits]);
    setVisitReason('');
    setVisitTreatment('');
    setVisitOutcome('returned_to_class'); // Reset
    alert('تم تسجيل الزيارة');
  };

  const startEditHealthRecord = (studentId: string) => {
    const existing = getHealthRecord(studentId);
    setTempHealthData(existing || { studentId, chronicConditions: [], allergies: [], bloodType: '', emergencyContact: '' });
    setEditingHealthRecord(studentId);
  };

  const saveEditedHealthRecord = () => {
    if (editingHealthRecord && tempHealthData) {
      saveHealthRecord(tempHealthData as HealthRecord);
      setEditingHealthRecord(null);
    }
  };

  const toggleItem = (field: 'chronicConditions' | 'allergies', item: string) => {
    const currentList = (tempHealthData[field] as string[]) || [];
    if (currentList.includes(item)) {
      setTempHealthData({ ...tempHealthData, [field]: currentList.filter(i => i !== item) });
    } else {
      setTempHealthData({ ...tempHealthData, [field]: [...currentList, item] });
    }
  };

  const addCustomItem = (field: 'chronicConditions' | 'allergies', value: string, setter: (v: string) => void) => {
    if (value.trim()) {
      const currentList = (tempHealthData[field] as string[]) || [];
      if (!currentList.includes(value.trim())) {
        setTempHealthData({ ...tempHealthData, [field]: [...currentList, value.trim()] });
      }
      setter('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Stats */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
               <div className="bg-red-50 p-2 rounded-lg text-red-600"><HeartPulse size={28} /></div>
               <div>
                  <h2 className="text-2xl font-bold text-slate-800">العيادة المدرسية</h2>
                  <p className="text-sm text-slate-500">إدارة الملفات الصحية والزيارات</p>
               </div>
            </div>
            
            <div className="flex gap-4">
               <div className="text-center px-4 border-l border-slate-100">
                  <div className="text-sm text-slate-500">زيارات اليوم</div>
                  <div className="text-xl font-bold text-slate-800">{todayVisits.length}</div>
               </div>
               <div className="text-center px-4">
                  <div className="text-sm text-slate-500">خروج للمنزل</div>
                  <div className="text-xl font-bold text-amber-600">{sentHomeCount}</div>
               </div>
            </div>
         </div>

         <div className="flex bg-slate-100 p-1 rounded-lg mt-6 w-fit">
            <button onClick={() => setActiveTab('visits')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'visits' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
               <Stethoscope size={16} /> سجل الزيارات
            </button>
            <button onClick={() => setActiveTab('records')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'records' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
               <Activity size={16} /> الملفات الصحية
            </button>
         </div>
      </div>

      {activeTab === 'visits' ? (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* New Visit Form */}
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit sticky top-6">
               <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Plus size={20} className="text-red-500" /> 
                  تسجيل زيارة جديدة
               </h3>
               <form onSubmit={handleLogVisit} className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-600 mb-1">الطالب</label>
                     <select 
                        value={selectedStudentId} 
                        onChange={(e) => setSelectedStudentId(e.target.value)} 
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200" 
                        required
                     >
                        <option value="">اختر الطالب...</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-600 mb-1">سبب الزيارة</label>
                     <input 
                        type="text" 
                        value={visitReason} 
                        onChange={(e) => setVisitReason(e.target.value)} 
                        placeholder="مثال: صداع، ألم بطن..." 
                        className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200" 
                        required 
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-600 mb-1">الإجراء / العلاج</label>
                     <textarea 
                        value={visitTreatment} 
                        onChange={(e) => setVisitTreatment(e.target.value)} 
                        placeholder="مثال: إعطاء مسكن، راحة..." 
                        className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200 h-20 resize-none" 
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-600 mb-1">النتيجة</label>
                     <select 
                        value={visitOutcome} 
                        onChange={(e) => setVisitOutcome(e.target.value as any)} 
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200"
                     >
                        <option value="returned_to_class">عودة للفصل</option>
                        <option value="sent_home">خروج للمنزل</option>
                        <option value="hospital">نقل للمستشفى</option>
                     </select>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
                     <Save size={18} />
                     حفظ السجل
                  </button>
               </form>
            </div>

            {/* Visits Log */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
               <div className="p-4 bg-slate-50 font-bold border-b border-slate-200 flex justify-between items-center">
                  <span>سجل الزيارات</span>
                  <span className="text-xs text-slate-500 font-normal">{visits.length} زيارة مسجلة</span>
               </div>
               <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {visits.length > 0 ? visits.map(v => {
                     const s = students.find(st => st.id === v.studentId);
                     return (
                        <div key={v.id} className="p-4 hover:bg-slate-50 transition-colors">
                           <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold">
                                    {s?.name.charAt(0)}
                                 </div>
                                 <div>
                                    <div className="font-bold text-slate-800">{s?.name || 'غير معروف'}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                       <Clock size={10} />
                                       <span dir="ltr">{v.date} {v.time}</span>
                                    </div>
                                 </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                 v.outcome === 'returned_to_class' ? 'bg-green-100 text-green-700' :
                                 v.outcome === 'sent_home' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                              }`}>
                                 {v.outcome === 'returned_to_class' ? 'عودة للفصل' : v.outcome === 'sent_home' ? 'خروج للمنزل' : 'مستشفى'}
                              </span>
                           </div>
                           <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 border border-slate-100">
                              <span className="font-bold text-slate-900">السبب:</span> {v.reason}
                              {v.treatment && (
                                 <>
                                    <span className="mx-2 text-slate-300">|</span>
                                    <span className="font-bold text-slate-900">العلاج:</span> {v.treatment}
                                 </>
                              )}
                           </div>
                        </div>
                     );
                  }) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                        <CheckCircle2 size={48} className="mb-2 opacity-20" />
                        <p>لا توجد زيارات مسجلة حتى الآن</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      ) : (
         /* Health Records Tab */
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 min-h-[500px]">
            <div className="mb-6 relative max-w-md">
               <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                  type="text" 
                  placeholder="بحث عن طالب..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-200" 
               />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {filteredStudents.map(student => {
                  const record = getHealthRecord(student.id);
                  const isEditing = editingHealthRecord === student.id;
                  const hasConditions = record && (record.chronicConditions.length > 0 || record.allergies.length > 0);

                  return (
                     <div key={student.id} className={`border rounded-xl p-4 transition-all ${isEditing ? 'bg-red-50 border-red-200 shadow-md ring-1 ring-red-200' : 'bg-white hover:border-red-200'}`}>
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex items-center gap-2">
                              <div className="bg-slate-100 p-1.5 rounded-full"><User size={16} className="text-slate-600"/></div>
                              <div>
                                 <div className="font-bold text-slate-800">{student.name}</div>
                                 <div className="text-xs text-slate-500">{student.grade}</div>
                              </div>
                           </div>
                           <button 
                              onClick={() => isEditing ? saveEditedHealthRecord() : startEditHealthRecord(student.id)} 
                              className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-green-600 text-white hover:bg-green-700' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                           >
                              {isEditing ? <Save size={16}/> : <Activity size={16}/>}
                           </button>
                        </div>

                        {isEditing ? (
                           <div className="space-y-3 animate-fade-in">
                              <div className="grid grid-cols-2 gap-2">
                                 <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">فصيلة الدم</label>
                                    <select 
                                       value={tempHealthData.bloodType || ''} 
                                       onChange={(e) => setTempHealthData({...tempHealthData, bloodType: e.target.value})} 
                                       className="w-full text-xs p-1.5 border rounded bg-white outline-none"
                                    >
                                       <option value="">-</option>
                                       {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">رقم الطوارئ</label>
                                    <input 
                                       type="text" 
                                       value={tempHealthData.emergencyContact || ''} 
                                       onChange={(e) => setTempHealthData({...tempHealthData, emergencyContact: e.target.value})} 
                                       className="w-full text-xs p-1.5 border rounded bg-white outline-none" 
                                       dir="ltr"
                                    />
                                 </div>
                              </div>

                              {/* Conditions Edit */}
                              <div>
                                 <label className="text-[10px] font-bold text-slate-500 mb-1 block">أمراض مزمنة</label>
                                 <div className="flex flex-wrap gap-1 mb-2">
                                    {tempHealthData.chronicConditions?.map(c => (
                                       <span key={c} onClick={() => toggleItem('chronicConditions', c)} className="cursor-pointer bg-red-200 text-red-800 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 hover:bg-red-300">
                                          {c} <X size={8}/>
                                       </span>
                                    ))}
                                 </div>
                                 <div className="flex gap-1">
                                    <input 
                                       type="text" value={customCondition} onChange={e => setCustomCondition(e.target.value)} 
                                       className="flex-1 text-xs border rounded p-1" placeholder="إضافة..."
                                       onKeyDown={e => e.key === 'Enter' && addCustomItem('chronicConditions', customCondition, setCustomCondition)}
                                    />
                                    <button onClick={() => addCustomItem('chronicConditions', customCondition, setCustomCondition)} className="bg-red-100 text-red-600 p-1 rounded"><Plus size={14}/></button>
                                 </div>
                                 <div className="flex flex-wrap gap-1 mt-1">
                                    {COMMON_CONDITIONS.slice(0, 4).map(c => (
                                       <button key={c} onClick={() => toggleItem('chronicConditions', c)} className="text-[9px] border px-1 rounded hover:bg-slate-50">{c}</button>
                                    ))}
                                 </div>
                              </div>

                              {/* Allergies Edit */}
                              <div>
                                 <label className="text-[10px] font-bold text-slate-500 mb-1 block">حساسية</label>
                                 <div className="flex flex-wrap gap-1 mb-2">
                                    {tempHealthData.allergies?.map(c => (
                                       <span key={c} onClick={() => toggleItem('allergies', c)} className="cursor-pointer bg-amber-200 text-amber-800 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 hover:bg-amber-300">
                                          {c} <X size={8}/>
                                       </span>
                                    ))}
                                 </div>
                                 <div className="flex gap-1">
                                    <input 
                                       type="text" value={customAllergy} onChange={e => setCustomAllergy(e.target.value)} 
                                       className="flex-1 text-xs border rounded p-1" placeholder="إضافة..."
                                       onKeyDown={e => e.key === 'Enter' && addCustomItem('allergies', customAllergy, setCustomAllergy)}
                                    />
                                    <button onClick={() => addCustomItem('allergies', customAllergy, setCustomAllergy)} className="bg-amber-100 text-amber-600 p-1 rounded"><Plus size={14}/></button>
                                 </div>
                              </div>
                           </div>
                        ) : (
                           <div className="space-y-2">
                              <div className="flex justify-between text-xs text-slate-600 border-b border-slate-50 pb-2">
                                 <div>
                                    <span className="text-slate-400 ml-1">الدم:</span>
                                    <span className="font-mono font-bold">{record?.bloodType || '-'}</span>
                                 </div>
                                 <div>
                                    <span className="text-slate-400 ml-1">طوارئ:</span>
                                    <span className="font-mono" dir="ltr">{record?.emergencyContact || '-'}</span>
                                 </div>
                              </div>
                              
                              <div className="min-h-[40px]">
                                 {hasConditions ? (
                                    <div className="flex flex-wrap gap-1">
                                       {record?.chronicConditions?.map(c => (
                                          <span key={c} className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[10px] flex items-center gap-1">
                                             <Thermometer size={8} /> {c}
                                          </span>
                                       ))}
                                       {record?.allergies?.map(c => (
                                          <span key={c} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px] flex items-center gap-1">
                                             <AlertCircle size={8} /> {c}
                                          </span>
                                       ))}
                                    </div>
                                 ) : (
                                    <div className="text-xs text-slate-400 italic py-1">لا توجد سجلات مرضية</div>
                                 )}
                              </div>
                           </div>
                        )}
                     </div>
                  );
               })}
            </div>
         </div>
      )}
    </div>
  );
};

export default ClinicManager;