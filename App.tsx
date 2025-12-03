import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, ClipboardCheck, GraduationCap, Database, Settings as SettingsIcon, Menu, X, FileBarChart, LogOut, UserCircle, EyeOff, Bell, Calendar as CalendarIcon, Clock, ScanBarcode, FileSignature, Megaphone, ShieldCheck, Trophy, CalendarDays, HeartPulse, UserPlus, Check, ChevronDown } from 'lucide-react';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AttendanceSheet from './components/AttendanceSheet';
import StudentHistory from './components/StudentHistory';
import MonthlyReport from './components/MonthlyReport';
import Settings from './components/Settings';
import Login from './components/Login';
import SystemAdminDashboard from './components/SystemAdminDashboard';
import KioskMode from './components/KioskMode';
import GateSecurity from './components/GateSecurity';
import LeaveRequests from './components/LeaveRequests';
import AiAssistant from './components/AiAssistant';
import MessagingCenter from './components/MessagingCenter';
import SchoolCalendar from './components/SchoolCalendar';
import Leaderboard from './components/Leaderboard';
import Timetable from './components/Timetable';
import ClinicManager from './components/ClinicManager';
import VisitorLog from './components/VisitorLog';
import { getStudents, getAttendanceRecords, generateMockData, getSettings, getCurrentUser, logoutUser, getSchoolById, getImpersonator, stopImpersonation, getLeaveRequests, saveUser } from './services/storageService';
import { getNotificationsForUser } from './services/notificationService';
import { Student, AttendanceRecord, AppSettings, User, AppNotification } from './types';

type View = 'dashboard' | 'students' | 'attendance' | 'reports' | 'student-detail' | 'settings' | 'kiosk' | 'gate-security' | 'leave-requests' | 'messaging' | 'calendar' | 'leaderboard' | 'timetable' | 'clinic' | 'visitors';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [impersonator, setImpersonator] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ attendanceThreshold: 75 });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentSchoolName, setCurrentSchoolName] = useState<string>('مدرستي');
  
  // Notification & Profile State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', username: '' });
  const [subscriptionWarning, setSubscriptionWarning] = useState<{daysLeft: number} | null>(null);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);

  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);
    const adminUser = getImpersonator();
    if (adminUser) setImpersonator(adminUser);
    
    // Close notifications when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = () => {
    if (currentUser && currentUser.role !== 'general_manager') {
       const schoolId = currentUser.schoolId;
       if (schoolId) {
         setStudents(getStudents(schoolId));
         setRecords(getAttendanceRecords(schoolId));
         const leaves = getLeaveRequests(schoolId);
         setPendingLeavesCount(leaves.filter(l => l.status === 'pending').length);
         const school = getSchoolById(schoolId);
         if (school) {
             setCurrentSchoolName(school.name);
             const endDate = new Date(school.subscriptionEndDate);
             const diffDays = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
             if (diffDays <= 30 && diffDays > 0) setSubscriptionWarning({ daysLeft: diffDays });
             else setSubscriptionWarning(null);
             setNotifications(getNotificationsForUser(currentUser, school));
         }
       }
    }
    setSettings(getSettings());
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
      if ((currentUser.role === 'parent' || currentUser.role === 'student') && currentUser.relatedStudentId) {
        const student = getStudents(currentUser.schoolId).find(s => s.id === currentUser.relatedStudentId);
        if (student) { setSelectedStudent(student); setCurrentView('student-detail'); }
      }
    }
  }, [currentUser]);

  const handleLogin = (user: User) => setCurrentUser(user);
  const handleLogout = () => { logoutUser(); setCurrentUser(null); setCurrentView('dashboard'); setSelectedStudent(null); setImpersonator(null); };
  const handleStopImpersonation = () => { stopImpersonation(); window.location.reload(); };
  const handleSelectStudent = (student: Student) => { setSelectedStudent(student); setCurrentView('student-detail'); setIsSidebarOpen(false); };
  const handleNavClick = (view: View) => { setCurrentView(view); setIsSidebarOpen(false); };

  const handleOpenProfile = () => {
    if (currentUser) {
      setProfileForm({ name: currentUser.name, username: currentUser.username });
      setIsProfileModalOpen(true);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser && profileForm.name && profileForm.username) {
      const updatedUser = { ...currentUser, name: profileForm.name, username: profileForm.username };
      saveUser(updatedUser);
      setCurrentUser(updatedUser);
      // Update in localStorage if it's the current session
      localStorage.setItem('attendance_app_current_user', JSON.stringify(updatedUser));
      setIsProfileModalOpen(false);
      alert('تم تحديث الملف الشخصي بنجاح');
    }
  };

  if (!currentUser) return <Login onLogin={handleLogin} />;
  if (currentUser.role === 'general_manager') return <SystemAdminDashboard onLogout={handleLogout} />;
  if (currentView === 'kiosk' && currentUser.schoolId) return <KioskMode students={students} currentSchoolId={currentUser.schoolId} onBack={() => setCurrentView('dashboard')} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-tajawal relative">
      {impersonator && <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white h-10 flex items-center justify-center gap-4 text-sm font-bold shadow-md print:hidden"><span>⚠️ وضع المشاهدة: أنت تتصفح النظام حالياً باسم {currentUser.name}</span><button onClick={handleStopImpersonation} className="bg-white text-amber-600 px-3 py-1 rounded-full text-xs hover:bg-amber-50 flex items-center gap-1"><EyeOff size={14} /> إيقاف</button></div>}
      
      {/* Mobile Header */}
      <div className={`md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky z-20 shadow-md print:hidden ${impersonator ? 'top-10' : 'top-0'}`}>
        <div className="flex items-center gap-2"><GraduationCap size={20} /><h1 className="font-bold truncate max-w-[150px]">{currentSchoolName}</h1></div>
        <div className="flex items-center gap-3">
           <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative">
              <Bell size={20} />
              {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
           </button>
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}><Menu size={24} /></button>
        </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 right-0 z-40 w-64 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform md:translate-x-0 md:static md:h-screen print:hidden ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} ${impersonator ? 'md:mt-10' : ''}`}>
        <div className="p-6 border-b border-slate-700 flex items-center gap-3"><GraduationCap size={24} className="text-indigo-400" /><div><h1 className="text-lg font-bold truncate w-40">{currentSchoolName}</h1><p className="text-xs text-slate-400">{currentUser.role === 'principal' ? 'مدير المدرسة' : 'المستخدم الحالي'}</p></div></div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {['admin', 'principal', 'vice_principal', 'teacher', 'staff'].includes(currentUser.role) && <button onClick={() => handleNavClick('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === 'dashboard' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><LayoutDashboard size={20} /><span>لوحة التحكم</span></button>}
          {['admin', 'principal', 'vice_principal', 'teacher'].includes(currentUser.role) && <button onClick={() => handleNavClick('attendance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === 'attendance' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><ClipboardCheck size={20} /><span>الحضور</span></button>}
          {currentUser.schoolId && <button onClick={() => handleNavClick('calendar')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === 'calendar' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><CalendarIcon size={20} /><span>التقويم</span></button>}
          {currentUser.schoolId && <button onClick={() => handleNavClick('timetable')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === 'timetable' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><CalendarDays size={20} /><span>الجدول</span></button>}
          
          {currentUser.schoolId && <button onClick={() => handleNavClick('clinic')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === 'clinic' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><HeartPulse size={20} /><span>العيادة</span></button>}
          {currentUser.schoolId && <button onClick={() => handleNavClick('visitors')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === 'visitors' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><UserPlus size={20} /><span>الزوار</span></button>}

          <button onClick={() => handleNavClick('leave-requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === 'leave-requests' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><FileSignature size={20} /><span>الاستئذان</span> {pendingLeavesCount > 0 && <span className="bg-red-500 text-xs px-2 rounded-full">{pendingLeavesCount}</span>}</button>
          
          {['admin', 'principal', 'vice_principal', 'staff', 'teacher'].includes(currentUser.role) && <button onClick={() => handleNavClick('students')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === 'students' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Users size={20} /><span>الطلاب</span></button>}
          
          {['admin', 'principal', 'vice_principal', 'staff', 'teacher'].includes(currentUser.role) && <button onClick={() => handleNavClick('messaging')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === 'messaging' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Megaphone size={20} /><span>الرسائل</span></button>}

          {(currentUser.role === 'parent' || currentUser.role === 'student') && <button onClick={() => setCurrentView('student-detail')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === 'student-detail' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><UserCircle size={20} /><span>الملف الشخصي</span></button>}
          
          {['admin', 'principal'].includes(currentUser.role) && <div className="pt-4 mt-4 border-t border-slate-700"><button onClick={() => handleNavClick('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentView === 'settings' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><SettingsIcon size={20} /><span>الإعدادات</span></button></div>}
        </nav>
        <div className="p-4 border-t border-slate-700"><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 py-2 border border-slate-700 rounded hover:bg-slate-800"><LogOut size={16} /> خروج</button></div>
      </aside>

      <main className={`flex-1 p-4 md:p-8 overflow-y-auto h-screen ${impersonator ? 'md:mt-10' : ''}`}>
        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center mb-8 print:hidden">
           <div>
              <h2 className="text-2xl font-bold text-slate-800">
                 {currentView === 'dashboard' ? 'لوحة التحكم' : 
                  currentView === 'students' ? 'إدارة الطلاب' :
                  currentView === 'clinic' ? 'العيادة المدرسية' :
                  currentView === 'visitors' ? 'سجل الزوار' :
                  currentView === 'calendar' ? 'التقويم المدرسي' :
                  currentView === 'attendance' ? 'تسجيل الحضور' : 
                  'النظام المدرسي'}
              </h2>
              <p className="text-slate-500 text-sm">أهلاً بك، {currentUser.name}</p>
           </div>
           
           <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                 <button 
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="p-2.5 bg-white text-slate-600 rounded-full hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm border border-slate-200"
                 >
                    <Bell size={20} />
                    {notifications.length > 0 && (
                       <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                 </button>

                 {isNotifOpen && (
                    <div className="absolute top-12 left-0 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in">
                       <div className="p-3 border-b border-slate-100 bg-slate-50 font-bold text-sm text-slate-700">التنبيهات</div>
                       <div className="max-h-80 overflow-y-auto">
                          {notifications.length > 0 ? (
                             notifications.map((n, i) => (
                                <div key={i} className="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3">
                                   <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'danger' ? 'bg-red-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                   <div>
                                      <div className="font-bold text-sm text-slate-800">{n.title}</div>
                                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                                      <div className="text-[10px] text-slate-400 mt-1">{new Date(n.date).toLocaleDateString('ar-EG')}</div>
                                   </div>
                                </div>
                             ))
                          ) : (
                             <div className="p-8 text-center text-slate-400 text-sm">لا توجد تنبيهات جديدة</div>
                          )}
                       </div>
                    </div>
                 )}
              </div>

              {/* User Profile */}
              <button 
                 onClick={handleOpenProfile}
                 className="flex items-center gap-3 pl-4 pr-2 py-1.5 bg-white rounded-full shadow-sm border border-slate-200 hover:border-indigo-200 transition-all group"
              >
                 <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    {currentUser.name.charAt(0)}
                 </div>
                 <div className="text-right hidden lg:block">
                    <div className="text-xs font-bold text-slate-700 group-hover:text-indigo-600">{currentUser.name}</div>
                    <div className="text-[10px] text-slate-400">{currentUser.role === 'principal' ? 'مدير' : 'مستخدم'}</div>
                 </div>
                 <ChevronDown size={14} className="text-slate-400" />
              </button>
           </div>
        </div>

        {/* --- Modules --- */}
        {currentView === 'dashboard' && ['admin', 'principal', 'vice_principal', 'teacher', 'staff'].includes(currentUser.role) && <Dashboard students={students} records={records} settings={{...settings, schoolName: currentSchoolName}} onNavigate={handleNavClick} />}
        {currentView === 'students' && <StudentList students={students} records={records} attendanceThreshold={settings.attendanceThreshold} currentSchoolId={currentUser.schoolId} onUpdate={loadData} onSelectStudent={handleSelectStudent} availableClasses={settings.classes} schoolName={currentSchoolName} />}
        {currentView === 'student-detail' && selectedStudent && <StudentHistory student={selectedStudent} allRecords={records} onBack={() => currentUser.role === 'parent' ? null : handleNavClick('students')} onUpdate={loadData} />}
        {currentView === 'attendance' && <AttendanceSheet students={students} onUpdate={loadData} settings={settings} />}
        {currentView === 'reports' && <MonthlyReport students={students} records={records} />}
        {currentView === 'leave-requests' && <LeaveRequests students={students} currentUser={currentUser} onUpdate={loadData} onRequestBack={() => setCurrentView('dashboard')} />}
        {currentView === 'messaging' && <MessagingCenter students={students} />}
        {currentView === 'calendar' && <SchoolCalendar schoolId={currentUser.schoolId!} />}
        {currentView === 'timetable' && <Timetable schoolId={currentUser.schoolId!} currentUser={currentUser} classes={settings.classes || []} />}
        {currentView === 'clinic' && <ClinicManager schoolId={currentUser.schoolId!} currentUser={currentUser} />}
        {currentView === 'visitors' && <VisitorLog schoolId={currentUser.schoolId!} />}
        {currentView === 'leaderboard' && <Leaderboard students={students} schoolName={currentSchoolName} />}
        {currentView === 'gate-security' && <GateSecurity />}
        {currentView === 'settings' && <Settings settings={{...settings, schoolName: currentSchoolName}} onUpdate={loadData} currentSchoolId={currentUser.schoolId} />}
        {currentView !== 'kiosk' && currentView !== 'gate-security' && currentUser.role !== 'general_manager' && <AiAssistant students={students} records={records} currentUser={currentUser} />}
      </main>

      {/* Profile Modal */}
      {isProfileModalOpen && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
               <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-lg text-slate-800">تعديل الملف الشخصي</h3>
                  <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
               </div>
               
               <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="flex flex-col items-center mb-4">
                     <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold mb-2">
                        {currentUser.name.charAt(0)}
                     </div>
                     <span className="text-xs text-slate-500">{currentUser.role}</span>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل</label>
                     <input 
                        type="text" 
                        value={profileForm.name} 
                        onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">اسم المستخدم</label>
                     <input 
                        type="text" 
                        value={profileForm.username} 
                        onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-500 cursor-not-allowed"
                        disabled
                        title="لا يمكن تغيير اسم المستخدم"
                     />
                  </div>
                  
                  <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                     <Check size={18} />
                     حفظ التغييرات
                  </button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}

export default App;