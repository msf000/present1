import { Student, AttendanceRecord, AttendanceStatus, AppSettings, User, School, SystemLog, LeaveRequest } from '../types';

const STORAGE_KEYS = {
  SCHOOLS: 'attendance_app_schools',
  STUDENTS: 'attendance_app_students',
  RECORDS: 'attendance_app_records',
  SETTINGS: 'attendance_app_settings',
  USERS: 'attendance_app_users',
  CURRENT_USER: 'attendance_app_current_user',
  LOGS: 'attendance_app_logs',
  IMPERSONATOR: 'attendance_app_impersonator',
  LEAVE_REQUESTS: 'attendance_app_leave_requests',
};

// --- Helper for Logging ---
export const addSystemLog = (action: string, details: string, type: 'info' | 'warning' | 'danger' | 'success') => {
  const currentUser = getCurrentUser();
  const userName = currentUser ? currentUser.name : 'System/Guest';
  
  const newLog: SystemLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action,
    user: userName,
    details,
    date: new Date().toISOString(),
    type
  };
  
  const existingLogsStr = localStorage.getItem(STORAGE_KEYS.LOGS);
  const existingLogs: SystemLog[] = existingLogsStr ? JSON.parse(existingLogsStr) : [];
  
  // Keep only last 200 logs to save space
  const updatedLogs = [newLog, ...existingLogs].slice(0, 200);
  
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updatedLogs));
};

export const getSystemActivityLogs = (): SystemLog[] => {
  const data = localStorage.getItem(STORAGE_KEYS.LOGS);
  if (data) return JSON.parse(data);

  // Return some initial logs if empty
  return [];
};

// --- Mock data generator ---
export const generateMockData = () => {
  // 1. Create Schools
  const schools: School[] = [
    { 
      id: 's1', 
      name: 'مدرسة المستقبل النموذجية', 
      isActive: true, 
      principalId: 'u2', 
      subscriptionEndDate: '2025-12-31',
      studentCount: 3
    },
    { 
      id: 's2', 
      name: 'مدرسة الرواد الأهلية', 
      isActive: false, // Inactive subscription
      principalId: 'u8', 
      subscriptionEndDate: '2023-01-01',
      studentCount: 2
    },
    { 
      id: 's3', 
      name: 'مدارس النخبة العالمية', 
      isActive: true, 
      principalId: '', 
      subscriptionEndDate: '2026-06-30',
      studentCount: 0
    }
  ];

  // 2. Create Users
  const users: User[] = [
    // System Level
    { id: 'u0', username: 'sysadmin', name: 'مدير النظام (Super Admin)', role: 'general_manager' },
    
    // School 1 Users
    { id: 'u2', username: 'principal1', name: 'أ. خالد (مدير المستقبل)', role: 'principal', schoolId: 's1', managedSchoolIds: ['s1'] },
    { id: 'u4', username: 'teacher1', name: 'أ. محمد (معلم)', role: 'teacher', schoolId: 's1' },
    
    // School 2 Users
    { id: 'u8', username: 'principal2', name: 'أ. فهد (مدير الرواد)', role: 'principal', schoolId: 's2', managedSchoolIds: ['s2'] },

    // Parents/Students
    { id: 'u6', username: 'parent', name: 'ولي أمر أحمد', role: 'parent', schoolId: 's1', relatedStudentId: '1' },
  ];

  // 3. Create Students
  const students: Student[] = [
    // School 1 Students
    { id: '1', schoolId: 's1', name: 'أحمد محمد', grade: 'العاشر' },
    { id: '2', schoolId: 's1', name: 'سارة علي', grade: 'العاشر' },
    { id: '3', schoolId: 's1', name: 'خالد عمر', grade: 'الحادي عشر' },
    
    // School 2 Students
    { id: '4', schoolId: 's2', name: 'ليلى حسن', grade: 'الثاني عشر' },
    { id: '5', schoolId: 's2', name: 'عمر يوسف', grade: 'العاشر' },
  ];

  // 4. Create Records
  const records: AttendanceRecord[] = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const day = date.getDay();
    if (day === 5 || day === 6) continue;

    students.forEach(student => {
      records.push({
        id: `${dateStr}-${student.id}`,
        studentId: student.id,
        schoolId: student.schoolId,
        date: dateStr,
        status: Math.random() > 0.8 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
        note: ''
      });
    });
  }

  // 5. Create Leave Requests
  const leaveRequests: LeaveRequest[] = [
    {
       id: 'lr1',
       studentId: '1',
       schoolId: 's1',
       date: today.toISOString().split('T')[0],
       reason: 'ظروف صحية طارئة',
       status: 'pending',
       requestDate: today.toISOString(),
       parentName: 'ولي أمر أحمد'
    },
    {
       id: 'lr2',
       studentId: '2',
       schoolId: 's1',
       date: new Date(today.getTime() - 86400000).toISOString().split('T')[0],
       reason: 'موعد أسنان',
       status: 'approved',
       requestDate: new Date(today.getTime() - 172800000).toISOString(),
       parentName: 'والدة سارة'
    }
  ];

  localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(leaveRequests));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ 
    attendanceThreshold: 75,
    classes: ['العاشر', 'الحادي عشر', 'الثاني عشر'] 
  }));
  
  // Initial Log
  addSystemLog('تهيئة النظام', 'تم إنشاء البيانات التجريبية للنظام', 'info');
};

// --- School Management (For System Admin) ---
export const getSchools = (): School[] => {
  const data = localStorage.getItem(STORAGE_KEYS.SCHOOLS);
  return data ? JSON.parse(data) : [];
};

export const saveSchool = (school: School) => {
  const schools = getSchools();
  const index = schools.findIndex(s => s.id === school.id);
  
  let actionDetails = '';
  if (index >= 0) {
    schools[index] = school;
    actionDetails = `تحديث بيانات مدرسة: ${school.name}`;
  } else {
    schools.push(school);
    actionDetails = `إضافة مدرسة جديدة: ${school.name}`;
  }
  
  localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
  addSystemLog(index >= 0 ? 'تعديل مدرسة' : 'إضافة مدرسة', actionDetails, 'info');
};

export const toggleSchoolSubscription = (schoolId: string) => {
  const schools = getSchools();
  const school = schools.find(s => s.id === schoolId);
  if (school) {
    school.isActive = !school.isActive;
    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
    
    addSystemLog(
        'تغيير حالة اشتراك', 
        `تم ${school.isActive ? 'تفعيل' : 'إيقاف'} اشتراك مدرسة: ${school.name}`, 
        school.isActive ? 'info' : 'warning'
    );
  }
};

export const getSchoolById = (id: string): School | undefined => {
  return getSchools().find(s => s.id === id);
};

// --- Student Management (Filtered by School) ---

export const getStudents = (schoolId?: string): Student[] => {
  const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  let allStudents: Student[] = data ? JSON.parse(data) : [];
  
  if (schoolId) {
    return allStudents.filter(s => s.schoolId === schoolId);
  }
  return allStudents;
};

export const saveStudent = (student: Student) => {
  const allStudents = getStudents(); // Get all to save properly
  const index = allStudents.findIndex(s => s.id === student.id);
  
  let updatedStudents = [...allStudents];
  if (index >= 0) {
    updatedStudents[index] = student;
  } else {
    updatedStudents.push(student);
  }
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));
};

export const saveStudents = (newStudents: Student[]) => {
  const allStudents = getStudents();
  const updatedStudents = [...allStudents, ...newStudents];
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));
};

export const updateStudent = (updatedStudent: Student) => {
  saveStudent(updatedStudent);
};

export const deleteStudent = (id: string) => {
  const allStudents = getStudents();
  const student = allStudents.find(s => s.id === id);
  const filtered = allStudents.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(filtered));
  
  if (student) {
     const user = getCurrentUser();
     if (user && (user.role === 'principal' || user.role === 'admin')) {
        // Log deletion
     }
  }
};

// --- Attendance Management (Filtered by School) ---

export const getAttendanceRecords = (schoolId?: string): AttendanceRecord[] => {
  const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
  let allRecords: AttendanceRecord[] = data ? JSON.parse(data) : [];
  
  if (schoolId) {
    return allRecords.filter(r => r.schoolId === schoolId);
  }
  return allRecords;
};

export const saveAttendance = (newRecords: AttendanceRecord[]) => {
  const allRecords = getAttendanceRecords();
  // Filter out records that are being replaced (same student, same date)
  const filteredRecords = allRecords.filter(
    r => !newRecords.some(nr => nr.studentId === r.studentId && nr.date === r.date)
  );
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify([...filteredRecords, ...newRecords]));
};

export const getRecordsByDate = (date: string, schoolId?: string): AttendanceRecord[] => {
  const records = getAttendanceRecords(schoolId);
  return records.filter(r => r.date === date);
};

// --- Leave Requests Management ---
export const getLeaveRequests = (schoolId?: string): LeaveRequest[] => {
  const data = localStorage.getItem(STORAGE_KEYS.LEAVE_REQUESTS);
  let allRequests: LeaveRequest[] = data ? JSON.parse(data) : [];
  
  if (schoolId) {
    return allRequests.filter(r => r.schoolId === schoolId);
  }
  return allRequests;
};

export const saveLeaveRequest = (request: LeaveRequest) => {
  const allRequests = getLeaveRequests(); // Get all
  const index = allRequests.findIndex(r => r.id === request.id);
  
  let updatedRequests = [...allRequests];
  if (index >= 0) {
    updatedRequests[index] = request;
  } else {
    updatedRequests.push(request);
  }
  
  localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(updatedRequests));
  
  if (index === -1) {
     addSystemLog('طلب استئذان', `تم تقديم طلب استئذان جديد للطالب ID: ${request.studentId}`, 'info');
  }
};

export const updateLeaveRequestStatus = (id: string, status: 'approved' | 'rejected') => {
   const requests = getLeaveRequests();
   const request = requests.find(r => r.id === id);
   
   if (request) {
      request.status = status;
      // Save updated list
      const updatedRequests = requests.map(r => r.id === id ? request : r);
      localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(updatedRequests));
      
      // If approved, automatically create an attendance record
      if (status === 'approved') {
         const newRecord: AttendanceRecord = {
            id: `${request.date}-${request.studentId}`,
            studentId: request.studentId,
            schoolId: request.schoolId,
            date: request.date,
            status: AttendanceStatus.EXCUSED,
            note: `استئذان: ${request.reason}`
         };
         saveAttendance([newRecord]);
         addSystemLog('الموافقة على استئذان', `تم الموافقة على طلب استئذان وتسجيل عذر للطالب`, 'success');
      } else {
         addSystemLog('رفض استئذان', `تم رفض طلب استئذان`, 'warning');
      }
      return true;
   }
   return false;
};


// --- Settings ---
export const getSettings = (): AppSettings => {
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  const settings = data ? JSON.parse(data) : { attendanceThreshold: 75 };
  
  // Ensure defaults for templates if they don't exist
  if (!settings.whatsappTemplates) {
    settings.whatsappTemplates = {
      absent: 'السلام عليكم ولي أمر الطالب/ة {name}، نفيدكم بغياب ابنكم/ابنتكم عن المدرسة اليوم {date}. يرجى تزويدنا بسبب الغياب للاطمئنان.',
      late: 'السلام عليكم ولي أمر الطالب/ة {name}، نفيدكم بتأخر ابنكم/ابنتكم عن الطابور الصباحي اليوم {date}. نأمل الحرص على الحضور مبكراً.'
    };
  }
  
  return settings;
};

export const saveSettings = (settings: AppSettings, schoolId?: string) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  
  if (schoolId && settings.schoolName) {
    const schools = getSchools();
    const schoolIndex = schools.findIndex(s => s.id === schoolId);
    if (schoolIndex >= 0) {
      if (schools[schoolIndex].name !== settings.schoolName) {
        schools[schoolIndex].name = settings.schoolName;
        localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
        addSystemLog('تحديث بيانات المدرسة', `تم تغيير اسم المدرسة إلى: ${settings.schoolName}`, 'warning');
      }
    }
  }

  addSystemLog('تحديث إعدادات', 'تم تحديث إعدادات النظام', 'info');
};

// --- Backups (Global) ---
export const createBackup = () => {
  const data = {
    schools: getSchools(),
    students: getStudents(),
    records: getAttendanceRecords(),
    settings: getSettings(),
    users: getUsers(),
    leaveRequests: getLeaveRequests(),
    backupDate: new Date().toISOString(),
    version: '2.0'
  };
  addSystemLog('نسخ احتياطي', 'تم إنشاء نسخة احتياطية من النظام', 'info');
  return JSON.stringify(data);
};

export const restoreBackup = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    if (data.schools) localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(data.schools));
    if (data.students) localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(data.students));
    if (data.records) localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(data.records));
    if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    if (data.users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users));
    if (data.leaveRequests) localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(data.leaveRequests));
    
    addSystemLog('استعادة نسخة', 'تم استعادة النظام من نسخة احتياطية', 'danger');
    return true;
  } catch (e) {
    console.error('Failed to restore backup', e);
    return false;
  }
};

export const clearAllData = () => {
  localStorage.clear();
};

export const exportToCSV = (students: Student[], records: AttendanceRecord[]) => {
  const csvRows = [];
  csvRows.push(['الاسم', 'الصف', 'التاريخ', 'الحالة', 'ملاحظات'].join(','));

  records.forEach(record => {
    const student = students.find(s => s.id === record.studentId);
    if (student) {
      const statusText = 
        record.status === AttendanceStatus.PRESENT ? 'حاضر' :
        record.status === AttendanceStatus.ABSENT ? 'غائب' :
        record.status === AttendanceStatus.LATE ? 'متأخر' : 'بعذر';
        
      csvRows.push([
        `"${student.name}"`,
        `"${student.grade}"`,
        record.date,
        statusText,
        `"${record.note || ''}"`
      ].join(','));
    }
  });

  const csvContent = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- User Auth & Management ---
export const getUsers = (): User[] => {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  return data ? JSON.parse(data) : [];
};

export const saveUser = (user: User) => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  
  let actionStr = '';
  if (index >= 0) {
    users[index] = user;
    actionStr = `تحديث بيانات المستخدم: ${user.name}`;
  } else {
    users.push(user);
    actionStr = `إضافة مستخدم جديد: ${user.name}`;
  }
  
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  addSystemLog(index >= 0 ? 'تعديل مستخدم' : 'إضافة مستخدم', actionStr, 'info');
};

export const deleteUser = (userId: string) => {
   const users = getUsers();
   const userToDelete = users.find(u => u.id === userId);
   const filtered = users.filter(u => u.id !== userId);
   localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filtered));
   
   if (userToDelete) {
      addSystemLog('حذف مستخدم', `تم حذف المستخدم: ${userToDelete.name} (${userToDelete.username})`, 'danger');
   }
};

export const getImpersonator = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.IMPERSONATOR);
  return data ? JSON.parse(data) : null;
};

export const impersonateUser = (userId: string): boolean => {
  const users = getUsers();
  const targetUser = users.find(u => u.id === userId);
  const currentUser = getCurrentUser();

  if (targetUser && currentUser && currentUser.role === 'general_manager') {
    localStorage.setItem(STORAGE_KEYS.IMPERSONATOR, JSON.stringify(currentUser));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(targetUser));
    
    addSystemLog('دخول كـ (Impersonation)', `قام ${currentUser.name} بالدخول بحساب: ${targetUser.name}`, 'warning');
    return true;
  }
  return false;
};

export const stopImpersonation = () => {
  const impersonator = getImpersonator();
  if (impersonator) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(impersonator));
    localStorage.removeItem(STORAGE_KEYS.IMPERSONATOR);
    return true;
  }
  return false;
};

export const loginUser = (username: string): { user: User | null, error?: string } => {
  const users = getUsers();
  let user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!user && users.length === 0) {
    generateMockData();
    const newUsers = getUsers();
    user = newUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  if (user) {
    if (user.role !== 'general_manager' && user.schoolId) {
      const school = getSchoolById(user.schoolId);
      if (school && !school.isActive) {
        return { user: null, error: 'عذراً، اشتراك هذه المدرسة غير مفعل. يرجى مراجعة إدارة النظام.' };
      }
    }

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    if (user.role === 'general_manager') {
       addSystemLog('تسجيل دخول', `تسجيل دخول بواسطة: ${user.name}`, 'info');
    }
    return { user };
  }
  return { user: null, error: 'اسم المستخدم غير صحيح' };
};

export const logoutUser = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(STORAGE_KEYS.IMPERSONATOR);
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
};