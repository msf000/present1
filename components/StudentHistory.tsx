import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight, User, HeartPulse, Activity, FileText, Printer, Edit2, Save, X, Plus, AlertCircle, Droplet, Thermometer, Stethoscope } from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStatus, HealthRecord } from '../types';
import { getHealthRecord, getClinicVisits, saveHealthRecord } from '../services/storageService';

interface StudentHistoryProps {
  student: Student;
  allRecords: AttendanceRecord[];
  onBack: () => void;
  onUpdate: () => void;
}

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const COMMON_CONDITIONS = ['الربو', 'السكري', 'فقر الدم', 'الصرع', 'ضعف السمع', 'ضعف النظر', 'حساسية الصدر', 'مرض القلب', 'نقص المناعة'];
const COMMON_ALLERGIES = ['البنسلين', 'المكسرات', 'البيض', 'السمك', 'الحليب', 'القمح', 'اللقاح', 'الغبار', 'لسعات الحشرات', 'اللاتكس'];

const StudentHistory: React.FC<StudentHistoryProps> = ({ student, allRecords, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'health'>('overview');
  const [isEditingHealth, setIsEditingHealth] = useState(false);
  const [healthForm, setHealthForm] = useState<Partial<HealthRecord>>({});
  
  // Custom inputs state for manual entry
  const [customCondition, setCustomCondition] = useState('');
  const [customAllergy, setCustomAllergy] = useState('');

  // Health Data
  const healthRecord = useMemo(() => getHealthRecord(student.id), [student.id, isEditingHealth]); // Refresh when editing closes
  const clinicVisits = useMemo(() => getClinicVisits(student.schoolId, student.id), [student.id]);

  useEffect(() => {
    if (healthRecord) {
      setHealthForm(healthRecord);
    } else {
      setHealthForm({
        studentId: student.id,
        bloodType: '',
        emergencyContact: '',
        chronicConditions: [],
        allergies: [],
        notes: ''
      });
    }
  }, [healthRecord, student.id]);

  const studentRecords = useMemo(() => {
    return allRecords.filter(r => r.studentId === student.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allRecords, student.id]);

  const stats = useMemo(() => {
    return {
      present: studentRecords.filter(r => r.status === AttendanceStatus.PRESENT).length,
      absent: studentRecords.filter(r => r.status === AttendanceStatus.ABSENT).length,
      late: studentRecords.filter(r => r.status === AttendanceStatus.LATE).length,
      excused: studentRecords.filter(r => r.status === AttendanceStatus.EXCUSED).length,
    };
  }, [studentRecords]);

  const attendanceRate = studentRecords.length > 0 
    ? Math.round(((stats.present + stats.excused + (stats.late * 0.5)) / studentRecords.length) * 100) 
    : 0;

  const handleSaveHealth = () => {
    saveHealthRecord({
      ...healthForm,
      studentId: student.id,
      // Ensure we always save arrays
      chronicConditions: Array.isArray(healthForm.chronicConditions) ? healthForm.chronicConditions : [],
      allergies: Array.isArray(healthForm.allergies) ? healthForm.allergies : []
    } as HealthRecord);
    setIsEditingHealth(false);
    onUpdate();
  };

  // Helper to toggle items in arrays
  const toggleItem = (field: 'chronicConditions' | 'allergies', item: string) => {
    const currentList = (healthForm[field] as string[]) || [];
    if (currentList.includes(item)) {
      setHealthForm({ ...healthForm, [field]: currentList.filter(i => i !== item) });
    } else {
      setHealthForm({ ...healthForm, [field]: [...currentList, item] });
    }
  };

  // Helper to add custom item
  const addCustomItem = (field: 'chronicConditions' | 'allergies', value: string, setter: (v: string) => void) => {
    if (value.trim()) {
      const currentList = (healthForm[field] as string[]) || [];
      if (!currentList.includes(value.trim())) {
        setHealthForm({ ...healthForm, [field]: [...currentList, value.trim()] });
      }
      setter('');
    }
  };

  // Function to print specifically the medical report
  const printMedicalReport = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>تقرير طبي - ${student.name}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
              .section { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
              .section h3 { margin-top: 0; color: #c0392b; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              .label { font-weight: bold; color: #555; }
              .tag { display: inline-block; background: #eee; padding: 2px 8px; border-radius: 4px; margin: 2px; font-size: 0.9em; }
              .alert { color: red; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>تقرير الحالة الصحية للطالب</h1>
              <h2>${student.name} - ${student.grade}</h2>
            </div>
            <div class="section">
              <h3>البيانات الأساسية</h3>
              <div class="grid">
                <div><span class="label">فصيلة الدم:</span> ${healthRecord?.bloodType || 'غير محدد'}</div>
                <div><span class="label">رقم الطوارئ:</span> ${healthRecord?.emergencyContact || 'غير متوفر'}</div>
              </div>
            </div>
            <div class="section">
              <h3>التنبيهات الطبية</h3>
              <div class="label">الأمراض المزمنة:</div>
              <div>${healthRecord?.chronicConditions?.map(c => `<span class="tag">${c}</span>`).join(' ') || 'لا يوجد'}</div>
              <br/>
              <div class="label">الحساسية:</div>
              <div>${healthRecord?.allergies?.map(c => `<span class="tag alert">${c}</span>`).join(' ') || 'لا يوجد'}</div>
            </div>
            <div class="section">
              <h3>سجل العيادة (آخر 5 زيارات)</h3>
              <table style="width:100%; text-align: right; border-collapse: collapse;">
                <thead><tr style="background:#f9f9f9"><th>التاريخ</th><th>السبب</th><th>الإجراء</th></tr></thead>
                <tbody>
                  ${clinicVisits.slice(0, 5).map(v => `
                    <tr>
                      <td style="border-bottom:1px solid #eee; padding:8px">${v.date}</td>
                      <td style="border-bottom:1px solid #eee; padding:8px">${v.reason}</td>
                      <td style="border-bottom:1px solid #eee; padding:8px">${v.treatment}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    }
  };

  const hasHighRisk = healthRecord && (healthRecord.chronicConditions.length > 0 || healthRecord.allergies.length > 0);

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600">
          <ArrowRight size={20} /> <span>عودة</span>
        </button>
        <div className="flex gap-2">
           {activeTab === 'health' && (
              <button onClick={printMedicalReport} className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded shadow-sm hover:bg-red-100 transition-colors">
                 <HeartPulse size={18} /> <span>طباعة تقرير طبي</span>
              </button>
           )}
           <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border px-4 py-2 rounded shadow-sm hover:bg-slate-50 transition-colors">
              <Printer size={18} /> <span>طباعة الملف</span>
           </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex justify-between items-center border-b pb-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
               <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><User size={32} /></div>
               {hasHighRisk && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full border-2 border-white" title="تنبيه صحي">
                     <HeartPulse size={12} />
                  </div>
               )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{student.name}</h2>
              <p className="text-slate-500">{student.grade}</p>
            </div>
          </div>
          <div className="text-center bg-slate-50 px-6 py-3 rounded-lg border">
             <p className="text-sm text-slate-500">الحضور</p>
             <p className="text-2xl font-bold text-indigo-600">{attendanceRate}%</p>
          </div>
        </div>

        <div className="flex border-b mb-6 print:hidden">
           <button onClick={() => setActiveTab('overview')} className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>الحضور والسلوك</button>
           <button onClick={() => setActiveTab('health')} className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'health' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>الملف الصحي</button>
        </div>

        {activeTab === 'overview' && (
           <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-green-50 p-4 rounded border border-green-100"><span className="text-green-700 block mb-1">حضور</span><span className="text-2xl font-bold text-green-800">{stats.present}</span></div>
              <div className="bg-red-50 p-4 rounded border border-red-100"><span className="text-red-700 block mb-1">غياب</span><span className="text-2xl font-bold text-red-800">{stats.absent}</span></div>
              <div className="bg-amber-50 p-4 rounded border border-amber-100"><span className="text-amber-700 block mb-1">تأخير</span><span className="text-2xl font-bold text-amber-800">{stats.late}</span></div>
              <div className="bg-blue-50 p-4 rounded border border-blue-100"><span className="text-blue-700 block mb-1">بعذر</span><span className="text-2xl font-bold text-blue-800">{stats.excused}</span></div>
           </div>
        )}

        {activeTab === 'health' && (
           <div className="space-y-6">
              {/* Health Record Card */}
              <div className="bg-red-50 border border-red-100 rounded-xl p-6 relative">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 text-red-800">
                       <HeartPulse size={24} /> <h3 className="font-bold text-lg">بيانات صحية</h3>
                    </div>
                    {!isEditingHealth ? (
                       <button 
                          onClick={() => setIsEditingHealth(true)}
                          className="flex items-center gap-1 text-xs bg-white text-red-600 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors shadow-sm"
                       >
                          <Edit2 size={14} /> تعديل
                       </button>
                    ) : (
                       <div className="flex gap-2">
                          <button onClick={() => setIsEditingHealth(false)} className="p-1.5 bg-white text-slate-500 rounded border hover:bg-slate-50"><X size={16}/></button>
                          <button onClick={handleSaveHealth} className="p-1.5 bg-green-600 text-white rounded border border-green-700 hover:bg-green-700"><Save size={16}/></button>
                       </div>
                    )}
                 </div>

                 {isEditingHealth ? (
                    <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
                       {/* Blood Type & Contact */}
                       <div className="space-y-4">
                          <div>
                             <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><Droplet size={12}/> فصيلة الدم</label>
                             <select 
                                value={healthForm.bloodType || ''} 
                                onChange={(e) => setHealthForm({...healthForm, bloodType: e.target.value})}
                                className="w-full p-2 border rounded bg-white focus:ring-2 focus:ring-red-300 outline-none"
                             >
                                <option value="">غير محدد</option>
                                {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                             </select>
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-slate-600 mb-1">رقم الطوارئ</label>
                             <input 
                                type="text" 
                                value={healthForm.emergencyContact || ''} 
                                onChange={(e) => setHealthForm({...healthForm, emergencyContact: e.target.value})}
                                className="w-full p-2 border rounded bg-white focus:ring-2 focus:ring-red-300 outline-none"
                                placeholder="05xxxxxxxx"
                                dir="ltr"
                             />
                          </div>
                       </div>

                       {/* Conditions */}
                       <div className="md:col-span-2 space-y-4 border-t border-red-200 pt-4">
                          {/* Chronic Conditions Section */}
                          <div>
                             <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                                <Thermometer size={14} /> أمراض مزمنة / حالات صحية
                             </label>
                             
                             {/* Selected Items */}
                             <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                                {healthForm.chronicConditions?.map((c, i) => (
                                   <span key={i} className="bg-white border border-red-200 text-red-800 px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-sm animate-fade-in">
                                      {c}
                                      <button onClick={() => toggleItem('chronicConditions', c)} className="hover:text-red-600"><X size={12}/></button>
                                   </span>
                                ))}
                             </div>

                             {/* Quick Add */}
                             <div className="mb-2">
                                <span className="text-[10px] text-slate-500 mb-1 block">اختر من القائمة:</span>
                                <div className="flex flex-wrap gap-2">
                                   {COMMON_CONDITIONS.map((c) => (
                                      <button 
                                         key={c} 
                                         onClick={() => toggleItem('chronicConditions', c)}
                                         className={`px-2 py-1 rounded text-xs border transition-colors ${
                                            healthForm.chronicConditions?.includes(c) 
                                               ? 'bg-red-200 border-red-300 text-red-900 opacity-50 cursor-default' 
                                               : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                                         }`}
                                         disabled={healthForm.chronicConditions?.includes(c)}
                                      >
                                         {c} +
                                      </button>
                                   ))}
                                </div>
                             </div>

                             {/* Manual Add */}
                             <div className="flex gap-2 max-w-sm mt-2">
                                <input 
                                   type="text" 
                                   value={customCondition}
                                   onChange={(e) => setCustomCondition(e.target.value)}
                                   placeholder="أضف حالة أخرى..."
                                   className="flex-1 p-1.5 text-xs border rounded focus:ring-1 focus:ring-red-300 outline-none"
                                   onKeyDown={(e) => e.key === 'Enter' && addCustomItem('chronicConditions', customCondition, setCustomCondition)}
                                />
                                <button onClick={() => addCustomItem('chronicConditions', customCondition, setCustomCondition)} className="bg-red-100 hover:bg-red-200 text-red-700 p-1.5 rounded"><Plus size={16}/></button>
                             </div>
                          </div>

                          {/* Allergies Section */}
                          <div>
                             <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                                <AlertCircle size={14} /> حساسية
                             </label>
                             
                             {/* Selected Items */}
                             <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                                {healthForm.allergies?.map((c, i) => (
                                   <span key={i} className="bg-white border border-amber-200 text-amber-800 px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-sm animate-fade-in">
                                      {c}
                                      <button onClick={() => toggleItem('allergies', c)} className="hover:text-amber-600"><X size={12}/></button>
                                   </span>
                                ))}
                             </div>

                             {/* Quick Add */}
                             <div className="mb-2">
                                <span className="text-[10px] text-slate-500 mb-1 block">اختر من القائمة:</span>
                                <div className="flex flex-wrap gap-2">
                                   {COMMON_ALLERGIES.map((c) => (
                                      <button 
                                         key={c} 
                                         onClick={() => toggleItem('allergies', c)}
                                         className={`px-2 py-1 rounded text-xs border transition-colors ${
                                            healthForm.allergies?.includes(c) 
                                               ? 'bg-amber-200 border-amber-300 text-amber-900 opacity-50 cursor-default' 
                                               : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                                         }`}
                                         disabled={healthForm.allergies?.includes(c)}
                                      >
                                         {c} +
                                      </button>
                                   ))}
                                </div>
                             </div>

                             {/* Manual Add */}
                             <div className="flex gap-2 max-w-sm mt-2">
                                <input 
                                   type="text" 
                                   value={customAllergy}
                                   onChange={(e) => setCustomAllergy(e.target.value)}
                                   placeholder="أضف حساسية أخرى..."
                                   className="flex-1 p-1.5 text-xs border rounded focus:ring-1 focus:ring-amber-300 outline-none"
                                   onKeyDown={(e) => e.key === 'Enter' && addCustomItem('allergies', customAllergy, setCustomAllergy)}
                                />
                                <button onClick={() => addCustomItem('allergies', customAllergy, setCustomAllergy)} className="bg-amber-100 hover:bg-amber-200 text-amber-700 p-1.5 rounded"><Plus size={16}/></button>
                             </div>
                          </div>
                       </div>
                    </div>
                 ) : (
                    healthRecord ? (
                       <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded shadow-sm border border-red-100">
                             <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Droplet size={12}/> فصيلة الدم</div>
                             <div className="font-bold text-lg font-mono text-red-700">{healthRecord.bloodType || '-'}</div>
                          </div>
                          <div className="bg-white p-3 rounded shadow-sm border border-red-100">
                             <div className="text-xs text-slate-500 mb-1">رقم الطوارئ</div>
                             <div className="font-bold text-lg font-mono text-slate-800" dir="ltr">{healthRecord.emergencyContact || '-'}</div>
                          </div>
                          <div className="bg-white p-3 rounded shadow-sm border border-red-100">
                             <div className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Thermometer size={12}/> أمراض مزمنة</div>
                             {healthRecord.chronicConditions && healthRecord.chronicConditions.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                   {healthRecord.chronicConditions.map((c, i) => (
                                      <span key={i} className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-bold">{c}</span>
                                   ))}
                                </div>
                             ) : <span className="text-sm text-slate-400">لا يوجد</span>}
                          </div>
                          <div className="bg-white p-3 rounded shadow-sm border border-red-100">
                             <div className="text-xs text-slate-500 mb-2 flex items-center gap-1"><AlertCircle size={12}/> حساسية</div>
                             {healthRecord.allergies && healthRecord.allergies.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                   {healthRecord.allergies.map((c, i) => (
                                      <span key={i} className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold">{c}</span>
                                   ))}
                                </div>
                             ) : <span className="text-sm text-slate-400">لا يوجد</span>}
                          </div>
                       </div>
                    ) : (
                       <div className="text-center py-8 text-slate-500 text-sm bg-white/50 rounded-lg">
                          <AlertCircle size={32} className="mx-auto mb-2 text-red-200" />
                          <p>لا يوجد ملف صحي لهذا الطالب.</p>
                          <button onClick={() => setIsEditingHealth(true)} className="mt-3 text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 mx-auto transition-colors shadow-sm">
                             <Plus size={14}/> إنشاء ملف صحي
                          </button>
                       </div>
                    )
                 )}
              </div>

              {/* Clinic Visits Log */}
              <div>
                 <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800"><Stethoscope size={20} className="text-blue-600"/> سجل زيارات العيادة</h3>
                 <div className="border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-right bg-white">
                       <thead className="bg-slate-50 text-sm font-bold text-slate-600"><tr><th className="p-3">التاريخ</th><th className="p-3">السبب</th><th className="p-3">العلاج</th><th className="p-3">النتيجة</th></tr></thead>
                       <tbody className="divide-y">
                          {clinicVisits.map(v => (
                             <tr key={v.id} className="hover:bg-slate-50">
                                <td className="p-3 text-sm">
                                   <div dir="ltr" className="font-mono font-bold text-slate-700">{v.date}</div>
                                   <div className="text-xs text-slate-400" dir="ltr">{v.time}</div>
                                </td>
                                <td className="p-3 font-bold text-slate-800">{v.reason}</td>
                                <td className="p-3 text-sm text-slate-600">{v.treatment || '-'}</td>
                                <td className="p-3">
                                   <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                      v.outcome === 'returned_to_class' ? 'bg-green-100 text-green-700' :
                                      v.outcome === 'sent_home' ? 'bg-amber-100 text-amber-700' :
                                      'bg-red-100 text-red-700'
                                   }`}>
                                      {v.outcome === 'returned_to_class' ? 'عودة للفصل' : 
                                       v.outcome === 'sent_home' ? 'خروج للمنزل' : 'مستشفى'}
                                   </span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                    {clinicVisits.length === 0 && <div className="p-8 text-center text-slate-400 bg-white">لا توجد زيارات مسجلة</div>}
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default StudentHistory;