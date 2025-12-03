import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, ClipboardCheck, GraduationCap, Database, Settings as SettingsIcon, Menu, X, FileBarChart, LogOut, UserCircle, EyeOff, Bell, Calendar as CalendarIcon, Clock, ScanBarcode, FileSignature } from 'lucide-react';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AttendanceSheet from './components/AttendanceSheet';
import StudentHistory from './components/StudentHistory';
import MonthlyReport from './components/MonthlyReport';
import Settings from './components/Settings';
import Login from './components/Login';
import SystemAdminDashboard from './components/SystemAdminDashboard';
import KioskMode from './components/KioskMode';
import LeaveRequests from './components/LeaveRequests';
import AiAssistant from './components/AiAssistant';
import { getStudents, getAttendanceRecords, generateMockData, getSettings, getCurrentUser, logoutUser, getSchoolById, getImpersonator, stopImpersonation, getLeaveRequests } from './services/storageService';
import { getNotificationsForUser } from './services/notificationService';
import { Student, AttendanceRecord, AppSettings, User, AppNotification } from './types';

type View = 'dashboard' | 'students' | 'attendance' | 'reports' | 'student-detail' | 'settings' | 'kiosk' | 'leave-requests';

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
  
  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [subscriptionWarning, setSubscriptionWarning] = useState<{daysLeft: number} | null>(null);
  
  // Leave Requests Badge
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);

  useEffect(() => {
    // Check for logged in user
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    
    // Check if we are in impersonation mode
    const adminUser = getImpersonator();
    if (adminUser) {
      setImpersonator(adminUser);
    }
  }, []);

  const loadData = () => {
    // Load data specific to the user's school context
    if (currentUser && currentUser.role !== 'general_manager') {
       const schoolId = currentUser.schoolId;
       
       if (schoolId) {
         setStudents(getStudents(schoolId));
         setRecords(getAttendanceRecords(schoolId));
         
         // Load Leave Requests count
         const leaves = getLeaveRequests(schoolId);
         setPendingLeavesCount(leaves.filter(l => l.status === 'pending').length);
         
         const school = getSchoolById(schoolId);
         if (school) {
             setCurrentSchoolName(school.name);
             
             // Check subscription warning
             const endDate = new Date(school.subscriptionEndDate);
             const now = new Date();
             const diffTime = endDate.getTime() - now.getTime();
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             
             if (diffDays <= 30 && diffDays > 0) {
                 setSubscriptionWarning({ daysLeft: diffDays });
             } else {
                 setSubscriptionWarning(null);
             }

             // Load notifications
             const notifs = getNotificationsForUser(currentUser, school);
             setNotifications(notifs);
         }
       }
    }
    
    setSettings(getSettings());
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
      
      // Role-based initial view
      if (currentUser.role === 'parent' || currentUser.role === 'student') {
        const student = getStudents(currentUser.schoolId).find(s => s.id === currentUser.relatedStudentId);
        if (student) {
          setSelectedStudent(student);
          setCurrentView('student-detail');
        } else {
          setCurrentView('dashboard');
        }
      } else {
        setCurrentView('dashboard');
      }
    }
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setCurrentView('dashboard');
    setSelectedStudent(null);
    setImpersonator(null);
    setNotifications([]);
  };
  
  const handleStopImpersonation = () => {
    stopImpersonation();
    window.location.reload();
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setCurrentView('student-detail');
    setIsSidebarOpen(false);
  };

  const handleBackToStudents = () => {
    if (currentUser?.role === 'parent' || currentUser?.role === 'student') {
      return; 
    }
    setSelectedStudent(null);
    setCurrentView('students');
  };

  const handleNavClick = (view: View) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  // Permission Logic
  const canViewDashboard = ['admin', 'principal', 'vice_principal', 'teacher', 'staff'].includes(currentUser?.role || '');
  const canTakeAttendance = ['admin', 'principal', 'vice_principal', 'teacher'].includes(currentUser?.role || '');
  const canViewReports = ['admin', 'principal', 'vice_principal', 'staff'].includes(currentUser?.role || '');
  const canManageStudents = ['admin', 'principal', 'vice_principal', 'staff', 'teacher'].includes(currentUser?.role || '');
  const canManageSettings = ['admin', 'principal'].includes(currentUser?.role || '');

  // 1. Render Login if not authenticated
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // 2. Render System Admin Dashboard if role is 'general_manager'
  if (currentUser.role === 'general_manager') {
    return <SystemAdminDashboard onLogout={handleLogout} />;
  }

  // 3. Render Kiosk Mode
  if (currentView === 'kiosk' && currentUser.schoolId) {
    return (
      <KioskMode 
        students={students}
        currentSchoolId={currentUser.schoolId}
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  // 4. Render Standard School Dashboard for Principals/Teachers/etc.
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-tajawal relative">
      
      {/* Impersonation Banner */}
      {impersonator && (
         <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white h-10 flex items-center justify-center gap-4 text-sm font-bold shadow-md print:hidden">
            <span>⚠️ وضع المشاهدة: أنت تتصفح النظام حالياً باسم {currentUser.name}</span>
            <button 
              onClick={handleStopImpersonation}
              className="bg-white text-amber-600 px-3 py-1 rounded-full text-xs hover:bg-amber-50 transition-colors flex items-center gap-1 shadow-sm"
            >
              <EyeOff size={14} />
              إيقاف وعودة للإدارة
            </button>
         </div>
      )}

      {/* Subscription Warning Banner */}
      {subscriptionWarning && !impersonator && (
         <div className="fixed bottom-0 left-0 right-0 z-[55] bg-slate-800 text-white p-3 flex flex-col sm:flex-row items-center justify-center gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)] print:hidden">
            <div className="flex items-center gap-2">
               <Clock className="text-amber-400" size={20} />
               <span className="font-bold">تنبيه الاشتراك:</span>
               <span>متبقي {subscriptionWarning.daysLeft} يوم على انتهاء اشتراك المدرسة.</span>
            </div>
            <button className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-1.5 rounded font-bold text-sm transition-colors">
               تجديد الآن
            </button>
         </div>
      )}

      {/* Mobile Header */}
      <div className={`md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky z-20 shadow-md print:hidden ${impersonator ? 'top-10' : 'top-0'}`}>
        <div className="flex items-center gap-2">
          <div className="bg-indigo-500 p-1.5 rounded-lg">
            <GraduationCap size={20} className="text-white" />
          </div>
          <h1 className="font-bold truncate max-w-[150px]">{currentSchoolName}</h1>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative p-1">
                <Bell size={20} />
                {notifications.some(n => !n.read) && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>}
            </button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1">
               {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden print:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-40 w-64 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen print:hidden
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        ${impersonator ? 'md:mt-10' : ''}
      `}>
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <div className="bg-indigo-500 p-2 rounded-lg">
            <GraduationCap size={24} className="text-white" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold truncate">{currentSchoolName}</h1>
            <div className="flex flex-col">
              <p className="text-xs text-slate-400 truncate font-bold">{currentUser.name}</p>
              <p className="text-[10px] text-indigo-400 truncate uppercase tracking-wider">{currentUser.role === 'principal' ? 'مدير المدرسة' : currentUser.role}</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {canViewDashboard && (
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === 'dashboard' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard size={20} />
              <span>لوحة التحكم</span>
            </button>
          )}
          
          {canTakeAttendance && (
            <button
              onClick={() => handleNavClick('attendance')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === 'attendance' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ClipboardCheck size={20} />
              <span>تسجيل الحضور</span>
            </button>
          )}

          {/* Leave Requests Menu Item */}
          <button
            onClick={() => handleNavClick('leave-requests')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              currentView === 'leave-requests' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
               <FileSignature size={20} />
               <span>طلبات الاستئذان</span>
            </div>
            {pendingLeavesCount > 0 && ['admin', 'principal', 'vice_principal'].includes(currentUser.role) && (
               <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingLeavesCount}
               </span>
            )}
          </button>

          {canViewReports && (
            <button
              onClick={() => handleNavClick('reports')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === 'reports' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileBarChart size={20} />
              <span>التقارير الشهرية</span>
            </button>
          )}

          {canManageStudents && (
            <button
              onClick={() => handleNavClick('students')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                (currentView === 'students' || currentView === 'student-detail')
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users size={20} />
              <span>الطلاب</span>
            </button>
          )}

           {(currentUser.role === 'parent' || currentUser.role === 'student') && (
            <button
              onClick={() => setCurrentView('student-detail')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === 'student-detail'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UserCircle size={20} />
              <span>{currentUser.role === 'student' ? 'سجلي الشخصي' : 'سجل ابني'}</span>
            </button>
          )}

          {canManageSettings && (
            <div className="pt-4 mt-4 border-t border-slate-700">
              <button
                onClick={() => handleNavClick('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentView === 'settings' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <SettingsIcon size={20} />
                <span>الإعدادات والبيانات</span>
              </button>
            </div>
          )}

          {/* Kiosk Mode Button - Only for Admins/Principals */}
          {(currentUser.role === 'principal' || currentUser.role === 'admin' || currentUser.role === 'teacher') && (
            <div className="pt-4 mt-4 border-t border-slate-700">
               <button
                  onClick={() => handleNavClick('kiosk')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
               >
                  <ScanBarcode size={20} />
                  <span>وضع الكشك (Kiosk)</span>
               </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-2">
           {canManageSettings && (
             <button 
               onClick={() => { generateMockData(); window.location.reload(); }}
               className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-300 py-2 border border-slate-700 rounded hover:bg-slate-800 transition-colors"
             >
               <Database size={14} />
               إعادة تعيين البيانات
             </button>
           )}
           
           <button 
             onClick={handleLogout}
             className="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 py-2 border border-slate-700 rounded hover:bg-slate-800 transition-colors"
           >
             <LogOut size={16} />
             تسجيل الخروج
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen w-full print:p-0 print:h-auto print:overflow-visible ${impersonator ? 'md:mt-10' : ''} ${subscriptionWarning && !impersonator ? 'pb-20' : ''}`}>
        
        {/* Desktop Header */}
        <header className="mb-8 hidden md:flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
          <h2 className="text-2xl font-bold text-slate-800">
            {currentView === 'dashboard' && 'نظرة عامة'}
            {currentView === 'students' && 'إدارة الطلاب'}
            {currentView === 'student-detail' && 'ملف الطالب'}
            {currentView === 'attendance' && 'سجل الحضور اليومي'}
            {currentView === 'reports' && 'تقارير الحضور الشهرية'}
            {currentView === 'settings' && 'الإعدادات'}
            {currentView === 'leave-requests' && 'نظام الاستئذان'}
          </h2>
          <div className="flex items-center gap-4">
             {/* Notification Bell */}
             <div className="relative">
                <button 
                   onClick={() => setIsNotifOpen(!isNotifOpen)}
                   className="p-2 bg-white rounded-full border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors shadow-sm"
                >
                   <Bell size={20} />
                   {notifications.some(n => !n.read) && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>
                
                {/* Notification Dropdown */}
                {isNotifOpen && (
                   <>
                     <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)}></div>
                     <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-fade-in">
                        <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                           <h3 className="font-bold text-slate-700 text-sm">التنبيهات</h3>
                           <button onClick={() => setNotifications(prev => prev.map(n => ({...n, read: true})))} className="text-xs text-indigo-600 hover:underline">
                              تحديد الكل كمقروء
                           </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                           {notifications.length > 0 ? notifications.map(notif => (
                              <div key={notif.id} className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-indigo-50/40' : ''}`}>
                                 <div className="flex items-start gap-3">
                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${notif.type === 'danger' ? 'bg-red-500' : notif.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                    <div>
                                       <h4 className={`text-sm font-bold ${!notif.read ? 'text-slate-800' : 'text-slate-600'}`}>{notif.title}</h4>
                                       <p className="text-xs text-slate-500 mt-1">{notif.message}</p>
                                       <p className="text-[10px] text-slate-400 mt-2 text-left" dir="ltr">{new Date(notif.date).toLocaleDateString()}</p>
                                    </div>
                                 </div>
                              </div>
                           )) : (
                              <div className="p-8 text-center text-slate-400 text-sm">لا توجد تنبيهات جديدة</div>
                           )}
                        </div>
                     </div>
                   </>
                )}
             </div>

             <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                <UserCircle size={16} className="text-indigo-600" />
                <span className="font-medium">{currentUser.name}</span>
             </div>
             <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 text-sm text-slate-600 flex items-center gap-2">
               <CalendarIcon size={14} className="text-slate-400" />
               {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
             </div>
          </div>
        </header>

        {currentView === 'dashboard' && canViewDashboard && (
          <Dashboard 
            students={students} 
            records={records} 
            settings={{...settings, schoolName: currentSchoolName}} // Override school name from settings with actual school object name
            onNavigate={handleNavClick}
          />
        )}
        
        {currentView === 'students' && canManageStudents && (
          <StudentList 
            students={students} 
            records={records}
            attendanceThreshold={settings.attendanceThreshold}
            currentSchoolId={currentUser?.schoolId}
            onUpdate={loadData} 
            onSelectStudent={handleSelectStudent}
            availableClasses={settings.classes} // Pass classes here
            schoolName={currentSchoolName}
          />
        )}
        
        {currentView === 'student-detail' && selectedStudent && (
          <StudentHistory 
            student={selectedStudent} 
            allRecords={records} 
            onBack={handleBackToStudents}
            onUpdate={loadData}
          />
        )}
        
        {currentView === 'attendance' && canTakeAttendance && <AttendanceSheet students={students} onUpdate={loadData} settings={settings} />}
        
        {currentView === 'reports' && canViewReports && <MonthlyReport students={students} records={records} />}
        
        {currentView === 'leave-requests' && (
           <LeaveRequests 
              students={students} 
              currentUser={currentUser} 
              onUpdate={loadData}
              onRequestBack={() => setCurrentView('dashboard')}
           />
        )}

        {currentView === 'settings' && canManageSettings && (
          <Settings 
            settings={{...settings, schoolName: currentSchoolName}} 
            onUpdate={loadData} 
            // Pass the current school ID to allow updating the global school record
            currentSchoolId={currentUser.schoolId}
          />
        )}
        
        {/* Render AI Assistant only if not in Kiosk mode */}
        {currentView !== 'kiosk' && currentUser.role !== 'general_manager' && (
           <AiAssistant students={students} records={records} currentUser={currentUser} />
        )}

      </main>
    </div>
  );
}

export default App;
