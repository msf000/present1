import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, CheckCircle, XCircle, Clock, BrainCircuit, FileDown, AlertTriangle, Star, PieChart as PieChartIcon, FileText, Activity, Filter, ArrowRight, ClipboardCheck, Medal, Trophy, FileSignature, Lightbulb, Calendar as CalendarIcon, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStatus, DailyStat, AppSettings, SchoolEvent } from '../types';
import { analyzeAttendance, generateDailyInsight } from '../services/geminiService';
import { exportToCSV, getLeaveRequests, getCurrentUser, getEvents, getBehaviorRecords } from '../services/storageService';

interface DashboardProps {
  students: Student[];
  records: AttendanceRecord[];
  settings: AppSettings;
  onNavigate: (view: any) => void;
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6']; // Green, Red, Amber, Blue

const Dashboard: React.FC<DashboardProps> = ({ students, records, settings, onNavigate }) => {
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [dailyInsight, setDailyInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<SchoolEvent[]>([]);
  
  // Behavior Stats
  const [behaviorStats, setBehaviorStats] = useState({ positive: 0, negative: 0 });
  const [topBehaviorStudent, setTopBehaviorStudent] = useState<{name: string, score: number} | null>(null);

  // Filter Logic
  const uniqueGrades = useMemo(() => {
    const grades = new Set(students.map(s => s.grade));
    return Array.from(grades).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return selectedGrade === 'all' 
      ? students 
      : students.filter(s => s.grade === selectedGrade);
  }, [students, selectedGrade]);

  const filteredRecords = useMemo(() => {
    const studentIds = new Set(filteredStudents.map(s => s.id));
    return records.filter(r => studentIds.has(r.studentId));
  }, [records, filteredStudents]);

  // Grade Performance Data (New)
  const gradePerformanceData = useMemo(() => {
    return uniqueGrades.map(grade => {
      const gradeStudents = students.filter(s => s.grade === grade);
      const gradeRecords = records.filter(r => gradeStudents.some(s => s.id === r.studentId));
      
      const total = gradeRecords.length;
      if (total === 0) return { name: grade, attendance: 0 };
      
      const present = gradeRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
      const excused = gradeRecords.filter(r => r.status === AttendanceStatus.EXCUSED).length;
      const late = gradeRecords.filter(r => r.status === AttendanceStatus.LATE).length;
      
      const rate = Math.round(((present + excused + (late * 0.5)) / total) * 100);
      return { name: grade, attendance: rate };
    });
  }, [students, records, uniqueGrades]);

  useEffect(() => {
    // Calculate last 7 days stats based on filtered data
    const last7Days: DailyStat[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayRecords = filteredRecords.filter(r => r.date === dateStr);
      last7Days.push({
        date: dateStr,
        present: dayRecords.filter(r => r.status === AttendanceStatus.PRESENT).length,
        absent: dayRecords.filter(r => r.status === AttendanceStatus.ABSENT).length,
        late: dayRecords.filter(r => r.status === AttendanceStatus.LATE).length,
        excused: dayRecords.filter(r => r.status === AttendanceStatus.EXCUSED).length,
      });
    }
    setStats(last7Days);

    // Get Pending Leaves & Events
    const user = getCurrentUser();
    if (user?.schoolId) {
       const allLeaves = getLeaveRequests(user.schoolId);
       setPendingLeaves(allLeaves.filter(l => l.status === 'pending').length);
       
       // Get upcoming events
       const allEvents = getEvents(user.schoolId);
       const today = new Date().toISOString().split('T')[0];
       const upcoming = allEvents
          .filter(e => e.date >= today)
          .sort((a,b) => a.date.localeCompare(b.date))
          .slice(0, 3);
       setUpcomingEvents(upcoming);

       // Get Behavior Stats
       const allBehaviors = getBehaviorRecords(undefined, user.schoolId);
       const todayBehaviors = allBehaviors.filter(b => b.date === today);
       setBehaviorStats({
          positive: todayBehaviors.filter(b => b.type === 'positive').length,
          negative: todayBehaviors.filter(b => b.type === 'negative').length
       });

       // Find Top Student
       if (allBehaviors.length > 0) {
          const studentScores: Record<string, number> = {};
          allBehaviors.forEach(b => {
             studentScores[b.studentId] = (studentScores[b.studentId] || 100) + b.points;
          });
          const topStudentId = Object.keys(studentScores).reduce((a, b) => studentScores[a] > studentScores[b] ? a : b);
          const topStudent = students.find(s => s.id === topStudentId);
          if (topStudent) {
             setTopBehaviorStudent({ name: topStudent.name, score: studentScores[topStudentId] });
          }
       }
    }
  }, [filteredRecords, students]);

  useEffect(() => {
    // Load Daily Insight once
    const loadInsight = async () => {
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = filteredRecords.filter(r => r.date === today);
      if (todayRecords.length > 0 && !dailyInsight) {
         const summary = {
           present: todayRecords.filter(r => r.status === AttendanceStatus.PRESENT).length,
           absent: todayRecords.filter(r => r.status === AttendanceStatus.ABSENT).length,
           late: todayRecords.filter(r => r.status === AttendanceStatus.LATE).length,
           excused: todayRecords.filter(r => r.status === AttendanceStatus.EXCUSED).length,
         };
         const insight = await generateDailyInsight(summary);
         if (insight) setDailyInsight(insight);
      }
    };
    loadInsight();
  }, [filteredRecords]);

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    // Send filtered data to AI for context-aware analysis
    const result = await analyzeAttendance(filteredStudents, filteredRecords);
    setAiAnalysis(result);
    setLoadingAi(false);
  };
  
  const handleExport = () => {
    exportToCSV(filteredStudents, filteredRecords);
  };

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = filteredRecords.filter(r => r.date === today);
  const presentCount = todayRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
  const absentCount = todayRecords.filter(r => r.status === AttendanceStatus.ABSENT).length;
  const lateCount = todayRecords.filter(r => r.status === AttendanceStatus.LATE).length;
  const excusedCount = todayRecords.filter(r => r.status === AttendanceStatus.EXCUSED).length;

  const pieData = [
    { name: 'حاضر', value: presentCount },
    { name: 'غائب', value: absentCount },
    { name: 'متأخر', value: lateCount },
    { name: 'بعذر', value: excusedCount },
  ];

  // Only show pie if there is data
  const hasTodayData = todayRecords.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Daily Insight Widget */}
      {dailyInsight && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg flex items-start gap-3 relative overflow-hidden">
           <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
             <Lightbulb className="text-yellow-300" size={24} />
           </div>
           <div className="flex-1 relative z-10">
              <h3 className="font-bold text-sm opacity-90 mb-1">رؤية اليوم الذكية</h3>
              <p className="text-sm md:text-base font-medium leading-relaxed">{dailyInsight}</p>
           </div>
           <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        </div>
      )}

      {/* Header Actions & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        {/* Quick Actions */}
        <div className="flex gap-2">
           <button 
             onClick={() => onNavigate('attendance')}
             className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
           >
             <ClipboardCheck size={18} />
             <span>تسجيل حضور</span>
           </button>
           <button 
             onClick={() => onNavigate('students')}
             className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
           >
             <Users size={18} />
             <span>الطلاب</span>
           </button>
        </div>

        {/* Filters & Export */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:flex-none">
             <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <select
                value={selectedGrade}
                onChange={(e) => { setSelectedGrade(e.target.value); setAiAnalysis(''); }}
                className="w-full md:w-48 pl-4 pr-10 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
              >
                <option value="all">كل الصفوف</option>
                {uniqueGrades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
           </div>
           
           <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white text-slate-700 hover:text-green-700 border border-slate-300 hover:border-green-300 px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <FileDown size={18} />
            <span className="hidden sm:inline">تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* Events Widget */}
        <div 
          onClick={() => onNavigate('calendar')}
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <div className="p-3 bg-pink-50 rounded-full text-pink-600 mb-2">
            <CalendarIcon size={24} />
          </div>
          <p className="text-sm text-slate-500">الأحداث القادمة</p>
          <p className="text-xl font-bold text-slate-800">{upcomingEvents.length}</p>
        </div>

        {/* Pending Leaves Card */}
        <div 
          onClick={() => onNavigate('leave-requests')}
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center cursor-pointer hover:border-indigo-300 transition-colors relative overflow-hidden"
        >
          {pendingLeaves > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping m-2"></div>}
          <div className="p-3 bg-purple-50 rounded-full text-purple-600 mb-2">
            <FileSignature size={24} />
          </div>
          <p className="text-sm text-slate-500">طلبات الاستئذان</p>
          <p className={`text-xl font-bold ${pendingLeaves > 0 ? 'text-red-600' : 'text-slate-800'}`}>
             {pendingLeaves > 0 ? `${pendingLeaves} معلق` : 'لا يوجد'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
          <div className="p-3 bg-green-50 rounded-full text-green-600 mb-2">
            <CheckCircle size={24} />
          </div>
          <p className="text-sm text-slate-500">حضور اليوم</p>
          <p className="text-xl font-bold text-green-600">{presentCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
           <div className="p-3 bg-amber-50 rounded-full text-amber-600 mb-2">
            <Clock size={24} />
          </div>
          <p className="text-sm text-slate-500">تأخير اليوم</p>
          <p className="text-xl font-bold text-amber-600">{lateCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
          <div className="p-3 bg-blue-50 rounded-full text-blue-600 mb-2">
            <FileText size={24} />
          </div>
          <p className="text-sm text-slate-500">بعذر اليوم</p>
          <p className="text-xl font-bold text-blue-600">{excusedCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
          <div className="p-3 bg-red-50 rounded-full text-red-600 mb-2">
            <XCircle size={24} />
          </div>
          <p className="text-sm text-slate-500">غياب اليوم</p>
          <p className="text-xl font-bold text-red-600">{absentCount}</p>
        </div>
      </div>

      {/* Events & Behavior Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Upcoming Events List */}
         {upcomingEvents.length > 0 && (
            <div className="bg-gradient-to-r from-pink-50 to-white border border-pink-100 rounded-xl p-4">
               <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <CalendarIcon size={18} className="text-pink-500" />
                  الأحداث القادمة
               </h3>
               <div className="space-y-2">
                  {upcomingEvents.map(event => (
                     <div key={event.id} className="bg-white p-3 rounded-lg border border-pink-100 flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${
                           event.type === 'holiday' ? 'bg-red-400' : 
                           event.type === 'exam' ? 'bg-amber-400' : 'bg-blue-400'
                        }`}></div>
                        <div>
                           <div className="font-bold text-sm text-slate-800">{event.title}</div>
                           <div className="text-xs text-slate-500" dir="ltr">{event.date}</div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {/* Behavior Summary */}
         <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between" onClick={() => onNavigate('leaderboard')}>
            <h3 className="font-bold text-slate-800 mb-3 flex items-center justify-between">
               <span className="flex items-center gap-2"><Trophy size={18} className="text-yellow-500" /> ملخص السلوك اليوم</span>
               <span className="text-xs text-indigo-600 cursor-pointer hover:underline">عرض اللوحة</span>
            </h3>
            
            <div className="flex gap-4 mb-4">
               <div className="flex-1 bg-green-50 rounded-lg p-3 text-center border border-green-100">
                  <div className="text-green-600 mb-1 flex justify-center"><ThumbsUp size={20} /></div>
                  <div className="text-2xl font-bold text-green-700">{behaviorStats.positive}</div>
                  <div className="text-xs text-green-600">إيجابي</div>
               </div>
               <div className="flex-1 bg-red-50 rounded-lg p-3 text-center border border-red-100">
                  <div className="text-red-600 mb-1 flex justify-center"><ThumbsDown size={20} /></div>
                  <div className="text-2xl font-bold text-red-700">{behaviorStats.negative}</div>
                  <div className="text-xs text-red-600">سلبي</div>
               </div>
            </div>

            {topBehaviorStudent && (
               <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className="bg-yellow-100 p-1.5 rounded-full"><Star size={16} className="text-yellow-600" /></div>
                     <div>
                        <div className="text-xs text-yellow-800 font-bold">نجم السلوك</div>
                        <div className="text-sm font-bold text-slate-800">{topBehaviorStudent.name}</div>
                     </div>
                  </div>
                  <div className="text-xl font-black text-yellow-600 dir-ltr">{topBehaviorStudent.score}</div>
               </div>
            )}
         </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200 min-h-[350px]">
          <h3 className="font-bold text-slate-800 mb-4">إحصائيات الأيام السبعة الماضية {selectedGrade !== 'all' && `(${selectedGrade})`}</h3>
          <div className="h-64 w-full" style={{ direction: 'ltr' }}>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={stats}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="date" tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                 <YAxis />
                 <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                 <Legend wrapperStyle={{ paddingTop: '20px' }} />
                 <Bar dataKey="present" name="حضور" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                 <Bar dataKey="excused" name="بعذر" stackId="a" fill="#3b82f6" />
                 <Bar dataKey="late" name="تأخير" stackId="a" fill="#f59e0b" />
                 <Bar dataKey="absent" name="غياب" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart & Today's Summary */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[350px]">
           <h3 className="font-bold text-slate-800 mb-4">ملخص اليوم {selectedGrade !== 'all' && `(${selectedGrade})`}</h3>
           {hasTodayData ? (
              <div className="flex-1 min-h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="text-center">
                     <div className="text-2xl font-bold text-slate-800">{presentCount}</div>
                     <div className="text-xs text-slate-500">حاضر</div>
                   </div>
                </div>
              </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
               <PieChartIcon size={48} className="mb-2 opacity-20" />
               <p>لم يتم تسجيل حضور اليوم بعد</p>
             </div>
           )}
           {/* Legend */}
           <div className="grid grid-cols-2 gap-2 mt-4">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-slate-600">{d.name}: {d.value}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
      
      {/* Grade Performance Chart (New) */}
      {selectedGrade === 'all' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 min-h-[300px]">
          <h3 className="font-bold text-slate-800 mb-4">نسبة الحضور حسب الصف (الإجمالي)</h3>
          <div className="h-64 w-full" style={{ direction: 'ltr' }}>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={gradePerformanceData} layout="vertical" margin={{ left: 40, right: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                 <XAxis type="number" domain={[0, 100]} />
                 <YAxis dataKey="name" type="category" width={100} />
                 <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [`${value}%`, 'نسبة الحضور']} />
                 <Bar dataKey="attendance" name="نسبة الحضور" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* AI Analysis Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-white p-6 rounded-xl border border-indigo-100 shadow-sm print:hidden">
        <div className="flex items-start gap-4">
          <div className="bg-white p-3 rounded-full shadow-sm text-indigo-600 hidden md:block">
            <BrainCircuit size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                <BrainCircuit size={20} className="md:hidden text-indigo-600" />
                المساعد الذكي للمدير {selectedGrade !== 'all' && `(${selectedGrade})`}
            </h3>
            {aiAnalysis ? (
              <div className="prose prose-indigo max-w-none">
                <p className="whitespace-pre-line text-slate-700 leading-relaxed text-sm md:text-base">{aiAnalysis}</p>
              </div>
            ) : (
              <p className="text-slate-500 text-sm md:text-base">اضغط على الزر لتحليل بيانات الحضور وكشف الأنماط الخفية وتقديم النصائح بناءً على الغيابات والأعذار المسجلة.</p>
            )}
            <button 
              onClick={handleAiAnalysis} 
              disabled={loadingAi}
              className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {loadingAi ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> : <BrainCircuit size={18} />}
              <span>{aiAnalysis ? 'تحديث التحليل' : 'تحليل البيانات الآن'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;