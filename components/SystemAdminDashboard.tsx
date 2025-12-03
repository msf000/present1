import React, { useState, useEffect } from 'react';
import { School, User, UserRole, SystemLog } from '../types';
import { getSchools, saveSchool, toggleSchoolSubscription, getUsers, saveUser, deleteUser, getSystemActivityLogs, impersonateUser, getStudents } from '../services/storageService';
import { Building2, Power, Users, Plus, Edit2, Search, Calendar, Database, Trash2, UserCog, UserCircle, Briefcase, Activity, BarChart3, LogIn, ExternalLink, RefreshCw, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface SystemAdminDashboardProps {
  onLogout: () => void;
}

type Tab = 'dashboard' | 'schools' | 'users' | 'logs';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

const SystemAdminDashboard: React.FC<SystemAdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  
  // Modals & Search
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedSchoolDetails, setSelectedSchoolDetails] = useState<School | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // School Form State
  const [schoolFormData, setSchoolFormData] = useState<Partial<School>>({
    name: '',
    subscriptionEndDate: '',
    isActive: true,
  });
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);

  // User Form State
  const [userFormData, setUserFormData] = useState<Partial<User>>({
    name: '',
    username: '',
    role: 'principal',
    schoolId: '',
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]); // Reload data when tab changes to get fresh logs

  const loadData = () => {
    // Dynamically calculate student counts for accuracy
    const allStudents = getStudents();
    const loadedSchools = getSchools().map(school => ({
      ...school,
      studentCount: allStudents.filter(s => s.schoolId === school.id).length
    }));
    
    setSchools(loadedSchools);
    setUsers(getUsers());
    setLogs(getSystemActivityLogs());
  };

  // --- Actions ---
  const handleToggleSchoolStatus = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    toggleSchoolSubscription(id);
    loadData();
    // Update selected details if open
    if (selectedSchoolDetails && selectedSchoolDetails.id === id) {
      setSelectedSchoolDetails(prev => prev ? ({...prev, isActive: !prev.isActive}) : null);
    }
  };

  const handleRenewSubscription = (id: string) => {
    const school = schools.find(s => s.id === id);
    if (school) {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        saveSchool({
            ...school,
            isActive: true,
            subscriptionEndDate: nextYear.toISOString().split('T')[0]
        });
        loadData();
        setSelectedSchoolDetails(null);
        alert(`تم تجديد اشتراك ${school.name} لمدة عام بنجاح.`);
    }
  };

  const handleImpersonate = (userId: string) => {
      if(confirm('هل أنت متأكد من الدخول بحساب هذا المستخدم؟ سيتم تسجيل خروجك كمدير للنظام.')) {
          if (impersonateUser(userId)) {
              window.location.reload();
          }
      }
  };

  // --- CRUD Handlers ---
  const handleOpenAddSchool = () => {
    setSchoolFormData({ 
      name: '', 
      subscriptionEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      isActive: true 
    });
    setEditingSchoolId(null);
    setIsSchoolModalOpen(true);
  };

  const handleEditSchool = (school: School, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    setSchoolFormData({
      name: school.name,
      subscriptionEndDate: school.subscriptionEndDate,
      isActive: school.isActive
    });
    setEditingSchoolId(school.id);
    setIsSchoolModalOpen(true);
  };

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = editingSchoolId || `s${Date.now()}`;
    const existingSchool = schools.find(s => s.id === schoolId);

    const schoolToSave: School = {
      id: schoolId,
      name: schoolFormData.name || '',
      isActive: schoolFormData.isActive ?? true,
      principalId: existingSchool?.principalId || '', 
      studentCount: existingSchool?.studentCount || 0,
      subscriptionEndDate: schoolFormData.subscriptionEndDate || new Date().toISOString().split('T')[0]
    };
    
    saveSchool(schoolToSave);
    setIsSchoolModalOpen(false);
    loadData();
  };

  const handleOpenAddUser = () => {
    setUserFormData({ name: '', username: '', role: 'principal', schoolId: '' });
    setEditingUserId(null);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setUserFormData({ name: user.name, username: user.username, role: user.role, schoolId: user.schoolId || '' });
    setEditingUserId(user.id);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      deleteUser(id);
      loadData();
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const userId = editingUserId || `u${Date.now()}`;
    const userToSave: User = {
      id: userId,
      name: userFormData.name || '',
      username: userFormData.username || '',
      role: userFormData.role as UserRole,
      schoolId: userFormData.schoolId || undefined,
    };
    saveUser(userToSave);
    setIsUserModalOpen(false);
    loadData();
  };

  // --- Analytics Data ---
  const schoolStudentData = schools.map(s => ({
    name: s.name.split(' ').slice(0, 2).join(' '), // Short name
    students: s.studentCount
  }));

  const subscriptionStatusData = [
    { name: 'نشط', value: schools.filter(s => s.isActive).length },
    { name: 'منتهي', value: schools.filter(s => !s.isActive).length },
  ];

  // --- Filtering ---
  const filteredSchools = schools.filter(s => s.name.includes(searchTerm));
  const filteredUsers = users.filter(u => 
    (u.name.includes(searchTerm) || u.username.includes(searchTerm)) && 
    u.role !== 'general_manager'
  );

  return (
    <div className="min-h-screen bg-slate-100 font-tajawal pb-12">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <Database size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">لوحة تحكم مدير النظام</h1>
              <p className="text-xs text-slate-400">إدارة المدارس والاشتراكات والمستخدمين</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            تسجيل خروج
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        
        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-8 overflow-x-auto">
           {[
             { id: 'dashboard', label: 'نظرة عامة', icon: BarChart3 },
             { id: 'schools', label: 'المدارس والاشتراكات', icon: Building2 },
             { id: 'users', label: 'المستخدمين', icon: Users },
             { id: 'logs', label: 'سجل النشاطات', icon: Activity },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as Tab)}
               className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                 activeTab === tab.id 
                 ? 'bg-indigo-600 text-white shadow-md' 
                 : 'text-slate-600 hover:bg-slate-50'
               }`}
             >
               <tab.icon size={18} />
               <span>{tab.label}</span>
             </button>
           ))}
        </div>

        {/* --- VIEW: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
           <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 {/* KPI Cards */}
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Building2 size={24} /></div>
                      <span className="text-xs font-bold text-slate-400">المدارس</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{schools.length}</div>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Power size={24} /></div>
                      <span className="text-xs font-bold text-slate-400">اشتراكات نشطة</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{schools.filter(s => s.isActive).length}</div>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Users size={24} /></div>
                      <span className="text-xs font-bold text-slate-400">إجمالي الطلاب</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{schools.reduce((acc,s) => acc + (s.studentCount || 0), 0)}</div>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><UserCog size={24} /></div>
                      <span className="text-xs font-bold text-slate-400">مدراء النظام</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{users.filter(u => u.role === 'principal' || u.role === 'admin').length}</div>
                 </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">توزيع الطلاب حسب المدارس</h3>
                    <div className="h-80 w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={schoolStudentData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="students" name="عدد الطلاب" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                 </div>
                 
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">حالة الاشتراكات</h3>
                    <div className="flex-1 relative">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={subscriptionStatusData}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="value"
                           >
                             {subscriptionStatusData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                             ))}
                           </Pie>
                           <Tooltip />
                           <Legend verticalAlign="bottom" height={36} />
                         </PieChart>
                       </ResponsiveContainer>
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="text-center">
                           <div className="text-2xl font-bold text-slate-800">{Math.round((schools.filter(s => s.isActive).length / schools.length) * 100) || 0}%</div>
                           <div className="text-xs text-slate-500">مفعل</div>
                         </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {/* --- VIEW: LOGS --- */}
        {activeTab === 'logs' && (
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in flex flex-col max-h-[600px]">
              <div className="p-6 border-b border-slate-200 shrink-0">
                 <h2 className="text-xl font-bold text-slate-800">سجل نشاطات النظام</h2>
                 <p className="text-sm text-slate-500">آخر العمليات التي تمت على المنصة</p>
              </div>
              <div className="divide-y divide-slate-100 overflow-y-auto">
                 {logs.length > 0 ? logs.map((log) => (
                    <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                       <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${log.type === 'danger' ? 'bg-red-500' : log.type === 'warning' ? 'bg-amber-500' : log.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                       <div className="flex-1">
                          <div className="flex justify-between items-start">
                             <span className="font-bold text-slate-800">{log.action}</span>
                             <span className="text-xs text-slate-400 whitespace-nowrap mr-2" dir="ltr">{new Date(log.date).toLocaleString('ar-EG')}</span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{log.details}</p>
                          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 bg-slate-100 w-fit px-2 py-1 rounded">
                             <UserCircle size={12} />
                             {log.user}
                          </div>
                       </div>
                    </div>
                 )) : (
                   <div className="p-8 text-center text-slate-400">لا توجد سجلات نشاط</div>
                 )}
              </div>
           </div>
        )}

        {/* --- VIEW: SCHOOLS / USERS (Shared Search & List Logic) --- */}
        {(activeTab === 'schools' || activeTab === 'users') && (
          <div className="animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full md:w-96">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    placeholder={activeTab === 'schools' ? "بحث عن مدرسة..." : "بحث عن مستخدم..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                  />
                </div>
                <button 
                  onClick={activeTab === 'schools' ? handleOpenAddSchool : handleOpenAddUser}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-colors w-full md:w-auto justify-center"
                >
                  <Plus size={20} />
                  <span>{activeTab === 'schools' ? 'إضافة مدرسة جديدة' : 'إضافة مستخدم جديد'}</span>
                </button>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                {activeTab === 'schools' ? (
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-4 text-slate-600 font-bold">اسم المدرسة</th>
                        <th className="p-4 text-slate-600 font-bold">حالة الاشتراك</th>
                        <th className="p-4 text-slate-600 font-bold">انتهاء الاشتراك</th>
                        <th className="p-4 text-slate-600 font-bold">عدد الطلاب</th>
                        <th className="p-4 text-slate-600 font-bold text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSchools.length > 0 ? filteredSchools.map(school => (
                        <tr 
                          key={school.id} 
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedSchoolDetails(school)}
                        >
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{school.name}</div>
                            <div className="text-xs text-slate-400">ID: {school.id}</div>
                          </td>
                          <td className="p-4">
                            <button 
                              onClick={(e) => handleToggleSchoolStatus(school.id, e)}
                              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 w-fit cursor-pointer transition-colors ${
                                school.isActive 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              <Power size={12} />
                              {school.isActive ? 'نشط' : 'متوقف'}
                            </button>
                          </td>
                          <td className="p-4 text-slate-600 font-medium">
                             <div className="flex items-center gap-2">
                               <Calendar size={16} className="text-slate-400" />
                               <span dir="ltr">{school.subscriptionEndDate}</span>
                             </div>
                          </td>
                          <td className="p-4 text-slate-600 font-bold">
                            {school.studentCount || 0}
                          </td>
                          <td className="p-4 flex justify-center gap-2">
                            <button 
                              onClick={(e) => handleEditSchool(school, e)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="تعديل البيانات"
                            >
                              <Edit2 size={18} />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">لا توجد مدارس</td></tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-4 text-slate-600 font-bold">الاسم</th>
                        <th className="p-4 text-slate-600 font-bold">اسم المستخدم</th>
                        <th className="p-4 text-slate-600 font-bold">الدور</th>
                        <th className="p-4 text-slate-600 font-bold">المدرسة المرتبطة</th>
                        <th className="p-4 text-slate-600 font-bold text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.length > 0 ? filteredUsers.map(user => {
                        const userSchool = schools.find(s => s.id === user.schoolId);
                        return (
                          <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                                   <UserCircle size={20} />
                                </div>
                                <span className="font-bold text-slate-800">{user.name}</span>
                              </div>
                            </td>
                            <td className="p-4 text-slate-600 font-mono text-sm">{user.username}</td>
                            <td className="p-4">
                               <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold border border-slate-200">
                                 {user.role === 'principal' ? 'مدير مدرسة' : user.role === 'teacher' ? 'معلم' : user.role}
                               </span>
                            </td>
                            <td className="p-4 text-slate-600">
                              {userSchool ? (
                                <div className="flex items-center gap-2 text-indigo-700">
                                   <Building2 size={14} />
                                   <span className="text-sm font-medium">{userSchool.name}</span>
                                </div>
                              ) : <span className="text-slate-400 text-xs">- غير مرتبط -</span>}
                            </td>
                            <td className="p-4 flex justify-center gap-2">
                              <button 
                                onClick={() => handleImpersonate(user.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="الدخول كـ (Impersonate)"
                              >
                                <LogIn size={18} />
                              </button>
                              <button 
                                onClick={() => handleEditUser(user)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="تعديل"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="حذف"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">لا يوجد مستخدمين</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
             </div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* School Details Modal */}
      {selectedSchoolDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
             <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
               <div>
                 <h2 className="text-2xl font-bold mb-1">{selectedSchoolDetails.name}</h2>
                 <div className="flex items-center gap-4 text-slate-300 text-sm">
                   <span>ID: {selectedSchoolDetails.id}</span>
                   <span className="flex items-center gap-1"><Calendar size={14}/> ينتهي: {selectedSchoolDetails.subscriptionEndDate}</span>
                 </div>
               </div>
               <button onClick={() => setSelectedSchoolDetails(null)} className="text-slate-400 hover:text-white transition-colors">
                 <X size={28} />
               </button>
             </div>
             
             <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-8">
                   <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                      <div className="text-sm text-slate-500 mb-1">حالة الاشتراك</div>
                      <div className={`font-bold ${selectedSchoolDetails.isActive ? 'text-green-600' : 'text-red-600'}`}>
                         {selectedSchoolDetails.isActive ? 'نشط' : 'متوقف'}
                      </div>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                      <div className="text-sm text-slate-500 mb-1">الطلاب</div>
                      <div className="font-bold text-slate-800">{selectedSchoolDetails.studentCount || 0}</div>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                      <div className="text-sm text-slate-500 mb-1">المستخدمين</div>
                      <div className="font-bold text-slate-800">
                        {users.filter(u => u.schoolId === selectedSchoolDetails.id).length}
                      </div>
                   </div>
                </div>
                
                <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">إجراءات سريعة</h3>
                <div className="flex flex-wrap gap-3">
                   <button 
                     onClick={() => handleToggleSchoolStatus(selectedSchoolDetails.id)}
                     className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition-colors ${selectedSchoolDetails.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                   >
                     <Power size={18} />
                     {selectedSchoolDetails.isActive ? 'إيقاف الاشتراك' : 'تفعيل الاشتراك'}
                   </button>
                   
                   <button 
                     onClick={() => handleRenewSubscription(selectedSchoolDetails.id)}
                     className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors"
                   >
                     <RefreshCw size={18} />
                     تجديد لمدة عام
                   </button>

                   <button 
                     onClick={() => handleEditSchool(selectedSchoolDetails)}
                     className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-bold transition-colors"
                   >
                     <Edit2 size={18} />
                     تعديل البيانات
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Add/Edit School Modal */}
      {isSchoolModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-100 pb-2">
              {editingSchoolId ? 'تعديل بيانات المدرسة' : 'إضافة مدرسة جديدة'}
            </h3>
            <form onSubmit={handleSaveSchool} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">اسم المدرسة</label>
                <input
                  type="text"
                  value={schoolFormData.name}
                  onChange={(e) => setSchoolFormData({...schoolFormData, name: e.target.value})}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="مثال: مدارس النخبة العالمية"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ انتهاء الاشتراك</label>
                <input
                  type="date"
                  value={schoolFormData.subscriptionEndDate}
                  onChange={(e) => setSchoolFormData({...schoolFormData, subscriptionEndDate: e.target.value})}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                 <input 
                    type="checkbox"
                    id="isActive"
                    checked={schoolFormData.isActive}
                    onChange={(e) => setSchoolFormData({...schoolFormData, isActive: e.target.checked})}
                    className="w-5 h-5 accent-indigo-600 rounded"
                 />
                 <label htmlFor="isActive" className="text-slate-700 font-medium cursor-pointer">الاشتراك مفعل</label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsSchoolModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition-colors shadow-md"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-100 pb-2">
              {editingUserId ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
            </h3>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({...userFormData, name: e.target.value})}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="مثال: أ. محمد أحمد"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">اسم المستخدم (للدخول)</label>
                <input
                  type="text"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({...userFormData, username: e.target.value})}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="username"
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الدور / الصلاحية</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({...userFormData, role: e.target.value as UserRole})}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="principal">مدير مدرسة</option>
                  <option value="vice_principal">وكيل مدرسة</option>
                  <option value="teacher">معلم</option>
                  <option value="admin">مسؤول تقني (مدرسة)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المدرسة التابع لها</label>
                <select
                  value={userFormData.schoolId}
                  onChange={(e) => setUserFormData({...userFormData, schoolId: e.target.value})}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  required
                >
                  <option value="">-- اختر المدرسة --</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">يجب ربط المدير أو المعلم بمدرسة محددة.</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition-colors shadow-md"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAdminDashboard;
