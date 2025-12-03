import { Student, AttendanceRecord, AttendanceStatus, AppSettings, User, School, SystemLog, LeaveRequest, SchoolEvent, BehaviorRecord, Subject, ClassSchedule, HealthRecord, ClinicVisit, VisitorRecord } from '../types';

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
  EVENTS: 'attendance_app_events',
  BEHAVIOR: 'attendance_app_behavior',
  SUBJECTS: 'attendance_app_subjects',
  SCHEDULES: 'attendance_app_schedules',
  HEALTH_RECORDS: 'attendance_app_health_records',
  CLINIC_VISITS: 'attendance_app_clinic_visits',
  VISITORS: 'attendance_app_visitors',
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
    }
  ];

  // 2. Create Users
  const users: User[] = [
    { id: 'u0', username: 'sysadmin', name: 'مدير النظام (Super Admin)', role: 'general_manager' },
    { id: 'u2', username: 'principal1', name: 'أ. خالد (مدير المستقبل)', role: 'principal', schoolId: 's1', managedSchoolIds: ['s1'] },
    { id: 'u4', username: 'teacher1', name: 'أ. محمد (معلم)', role: 'teacher', schoolId: 's1' },
    { id: 'u9', username: 'security1', name: 'حارس الأمن', role: 'security', schoolId: 's1' },
    { id: 'u10', username: 'nurse1', name: 'الممرضة سارة', role: 'nurse', schoolId: 's1' },
    { id: 'u6', username: 'parent', name: 'ولي أمر أحمد', role: 'parent', schoolId: 's1', relatedStudentId: '1' },
  ];

  // 3. Create Students
  const students: Student[] = [
    { id: '1', schoolId: 's1', name: 'أحمد محمد', grade: 'العاشر' },
    { id: '2', schoolId: 's1', name: 'سارة علي', grade: 'العاشر' },
    { id: '3', schoolId: 's1', name: 'خالد عمر', grade: 'الحادي عشر' },
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
       parentName: 'ولي أمر أحمد',
       type: 'absence'
    }
  ];

  // 6. Create Clinic Data
  const healthRecords: HealthRecord[] = [
    { studentId: '1', bloodType: 'O+', chronicConditions: ['ربو'], allergies: ['غبار'], emergencyContact: '0500000000' },
    { studentId: '2', bloodType: 'A-', chronicConditions: [], allergies: ['فول سوداني'], emergencyContact: '0555555555' }
  ];

  const clinicVisits: ClinicVisit[] = [
    { 
      id: 'v1', 
      schoolId: 's1', 
      studentId: '1', 
      date: today.toISOString().split('T')[0], 
      time: '09:30', 
      reason: 'صداع ودوار', 
      treatment: 'مسكن (Panadol) وراحة لمدة 15 دقيقة', 
      outcome: 'returned_to_class',
      nurseName: 'الممرضة سارة'
    }
  ];

  // 7. Create Visitor Data
  const visitors: VisitorRecord[] = [
    {
      id: 'vis1',
      schoolId: 's1',
      name: 'عبدالله العتيبي (ولي أمر)',
      idNumber: '1020304050',
      visitReason: 'مقابلة المدير',
      personToVisit: 'أ. خالد',
      checkInTime: new Date(today.getTime() - 3600000).toISOString(), // 1 hour ago
      status: 'active'
    },
    {
      id: 'vis2',
      schoolId: 's1',
      name: 'شركة الصيانة',
      visitReason: 'صيانة المكيفات',
      personToVisit: 'الإدارة',
      checkInTime: new Date(today.getTime() - 7200000).toISOString(), // 2 hours ago
      checkOutTime: new Date(today.getTime() - 3600000).toISOString(),
      status: 'completed'
    }
  ];

  localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(leaveRequests));
  localStorage.setItem(STORAGE_KEYS.HEALTH_RECORDS, JSON.stringify(healthRecords));
  localStorage.setItem(STORAGE_KEYS.CLINIC_VISITS, JSON.stringify(clinicVisits));
  localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(visitors));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ 
    attendanceThreshold: 75,
    classes: ['العاشر', 'الحادي عشر', 'الثاني عشر'] 
  }));
  
  addSystemLog('تهيئة النظام', 'تم إنشاء البيانات التجريبية للنظام', 'info');
};

// --- Basic Getters/Setters ---
export const getSchools = (): School[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHOOLS) || '[]');
export const saveSchool = (school: School) => {
  const schools = getSchools();
  const index = schools.findIndex(s => s.id === school.id);
  if (index >= 0) schools[index] = school; else schools.push(school);
  localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
};
export const getSchoolById = (id: string) => getSchools().find(s => s.id === id);
export const toggleSchoolSubscription = (schoolId: string) => {
  const schools = getSchools();
  const school = schools.find(s => s.id === schoolId);
  if (school) {
    school.isActive = !school.isActive;
    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
  }
};

export const getStudents = (schoolId?: string): Student[] => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
  return schoolId ? all.filter((s: Student) => s.schoolId === schoolId) : all;
};
export const saveStudent = (student: Student) => {
  const all = getStudents();
  const index = all.findIndex(s => s.id === student.id);
  if (index >= 0) all[index] = student; else all.push(student);
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(all));
};
export const saveStudents = (students: Student[]) => {
  const all = getStudents();
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([...all, ...students]));
};
export const updateStudent = (student: Student) => saveStudent(student);
export const deleteStudent = (id: string) => {
  const all = getStudents();
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(all.filter(s => s.id !== id)));
};

export const getAttendanceRecords = (schoolId?: string): AttendanceRecord[] => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS) || '[]');
  return schoolId ? all.filter((r: AttendanceRecord) => r.schoolId === schoolId) : all;
};
export const saveAttendance = (newRecords: AttendanceRecord[]) => {
  const all = getAttendanceRecords();
  const filtered = all.filter(r => !newRecords.some(nr => nr.studentId === r.studentId && nr.date === r.date));
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify([...filtered, ...newRecords]));
};
export const getRecordsByDate = (date: string, schoolId?: string) => getAttendanceRecords(schoolId).filter(r => r.date === date);

export const getLeaveRequests = (schoolId?: string): LeaveRequest[] => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEAVE_REQUESTS) || '[]');
  return schoolId ? all.filter((r: LeaveRequest) => r.schoolId === schoolId) : all;
};
export const saveLeaveRequest = (req: LeaveRequest) => {
  const all = getLeaveRequests();
  const idx = all.findIndex(r => r.id === req.id);
  if (idx >= 0) all[idx] = req; else all.push(req);
  localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(all));
};
export const updateLeaveRequestStatus = (id: string, status: 'approved' | 'rejected') => {
  const all = getLeaveRequests();
  const req = all.find(r => r.id === id);
  if (req) {
    req.status = status;
    localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(all));
    if (status === 'approved' && req.type === 'absence') {
       saveAttendance([{
         id: `${req.date}-${req.studentId}`,
         studentId: req.studentId,
         schoolId: req.schoolId,
         date: req.date,
         status: AttendanceStatus.EXCUSED,
         note: `استئذان: ${req.reason}`
       }]);
    }
  }
};

export const verifyGatePass = (qrCode: string) => {
  if (!qrCode.startsWith('GATEPASS:')) return { valid: false, error: 'رمز غير صالح' };
  const id = qrCode.split(':')[1];
  const req = getLeaveRequests().find(r => r.id === id);
  if (!req) return { valid: false, error: 'التصريح غير موجود' };
  if (req.status !== 'approved') return { valid: false, error: 'التصريح غير معتمد' };
  if (req.date !== new Date().toISOString().split('T')[0]) return { valid: false, error: 'تاريخ التصريح غير مطابق لليوم' };
  if (req.actualExitTime) return { valid: false, error: 'تم استخدام التصريح مسبقاً' };
  return { valid: true, request: req, student: getStudents().find(s => s.id === req.studentId) };
};
export const markGatePassUsed = (id: string) => {
  const all = getLeaveRequests();
  const req = all.find(r => r.id === id);
  if (req) {
    req.actualExitTime = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(all));
    addSystemLog('خروج', `خروج طالب بتصريح رقم ${id}`, 'success');
  }
};

// --- Clinic Logic ---
export const getHealthRecord = (studentId: string): HealthRecord | null => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.HEALTH_RECORDS) || '[]');
  return all.find((r: HealthRecord) => r.studentId === studentId) || null;
};
export const saveHealthRecord = (record: HealthRecord) => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.HEALTH_RECORDS) || '[]');
  const idx = all.findIndex((r: HealthRecord) => r.studentId === record.studentId);
  if (idx >= 0) all[idx] = record; else all.push(record);
  localStorage.setItem(STORAGE_KEYS.HEALTH_RECORDS, JSON.stringify(all));
};
export const getClinicVisits = (schoolId?: string, studentId?: string): ClinicVisit[] => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLINIC_VISITS) || '[]');
  let filtered = schoolId ? all.filter((v: ClinicVisit) => v.schoolId === schoolId) : all;
  if (studentId) filtered = filtered.filter((v: ClinicVisit) => v.studentId === studentId);
  return filtered.sort((a: ClinicVisit, b: ClinicVisit) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());
};
export const saveClinicVisit = (visit: ClinicVisit) => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLINIC_VISITS) || '[]');
  all.push(visit);
  localStorage.setItem(STORAGE_KEYS.CLINIC_VISITS, JSON.stringify(all));
  addSystemLog('عيادة', `زيارة عيادة للطالب ${visit.studentId}`, 'info');
};

// --- Visitor Logic ---
export const getVisitors = (schoolId: string): VisitorRecord[] => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.VISITORS) || '[]');
  return all.filter((v: VisitorRecord) => v.schoolId === schoolId);
};
export const saveVisitor = (visitor: VisitorRecord) => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.VISITORS) || '[]');
  const idx = all.findIndex((v: VisitorRecord) => v.id === visitor.id);
  if (idx >= 0) all[idx] = visitor; else all.push(visitor);
  localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(all));
};

// --- Other Services (Events, Behavior, Subjects, Schedule) ---
export const getEvents = (schoolId?: string): SchoolEvent[] => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
  return schoolId ? all.filter((e: SchoolEvent) => e.schoolId === schoolId) : all;
};
export const saveEvent = (e: SchoolEvent) => {
  const all = getEvents(); const idx = all.findIndex(ev => ev.id === e.id);
  if(idx >= 0) all[idx] = e; else all.push(e);
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(all));
};
export const deleteEvent = (id: string) => localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(getEvents().filter(e => e.id !== id)));
export const saveEvents = (evs: SchoolEvent[]) => localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([...getEvents(), ...evs]));

export const getBehaviorRecords = (studentId?: string, schoolId?: string): BehaviorRecord[] => {
  let all = JSON.parse(localStorage.getItem(STORAGE_KEYS.BEHAVIOR) || '[]');
  if(studentId) all = all.filter((r: BehaviorRecord) => r.studentId === studentId);
  if(schoolId) all = all.filter((r: BehaviorRecord) => r.schoolId === schoolId);
  return all;
};
export const saveBehaviorRecord = (r: BehaviorRecord) => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.BEHAVIOR) || '[]');
  all.push(r);
  localStorage.setItem(STORAGE_KEYS.BEHAVIOR, JSON.stringify(all));
};

export const getSubjects = (schoolId: string): Subject[] => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECTS) || '[]');
  return all.filter((s: Subject) => s.schoolId === schoolId);
};
export const saveSubject = (s: Subject) => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECTS) || '[]');
  all.push(s);
  localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(all));
};
export const deleteSubject = (id: string) => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECTS) || '[]');
  localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(all.filter((s: Subject) => s.id !== id)));
};

export const getSchedule = (schoolId: string, grade: string): ClassSchedule | null => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULES) || '[]');
  return all.find((s: ClassSchedule) => s.schoolId === schoolId && s.grade === grade) || null;
};
export const saveSchedule = (s: ClassSchedule) => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULES) || '[]');
  const idx = all.findIndex((sch: ClassSchedule) => sch.id === s.id);
  if(idx >= 0) all[idx] = s; else all.push(s);
  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(all));
};

// --- General ---
export const getSettings = (): AppSettings => JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{"attendanceThreshold":75}');
export const saveSettings = (s: AppSettings, schoolId?: string) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(s));
  if(schoolId && s.schoolName) {
    const schools = getSchools();
    const sc = schools.find(x => x.id === schoolId);
    if(sc) { sc.name = s.schoolName; localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools)); }
  }
};

export const getUsers = (): User[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
export const saveUser = (u: User) => {
  const all = getUsers(); const idx = all.findIndex(us => us.id === u.id);
  if(idx >= 0) all[idx] = u; else all.push(u);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(all));
};
export const deleteUser = (id: string) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(getUsers().filter(u => u.id !== id)));
export const getCurrentUser = (): User | null => JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
export const loginUser = (username: string) => {
  const users = getUsers();
  if(users.length === 0) generateMockData();
  const user = getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
  if(user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return { user };
  }
  return { user: null, error: 'Invalid username' };
};
export const logoutUser = () => { localStorage.removeItem(STORAGE_KEYS.CURRENT_USER); localStorage.removeItem(STORAGE_KEYS.IMPERSONATOR); };
export const getImpersonator = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.IMPERSONATOR) || 'null');
export const impersonateUser = (id: string) => {
  const user = getUsers().find(u => u.id === id);
  const current = getCurrentUser();
  if(user && current?.role === 'general_manager') {
    localStorage.setItem(STORAGE_KEYS.IMPERSONATOR, JSON.stringify(current));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return true;
  }
  return false;
};
export const stopImpersonation = () => {
  const imp = getImpersonator();
  if(imp) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(imp));
    localStorage.removeItem(STORAGE_KEYS.IMPERSONATOR);
    return true;
  }
  return false;
};

export const clearAllData = () => localStorage.clear();
export const createBackup = () => JSON.stringify(localStorage);
export const restoreBackup = (data: string) => {
  try {
    const json = JSON.parse(data);
    Object.keys(json).forEach(key => localStorage.setItem(key, json[key]));
    return true;
  } catch(e) { return false; }
};
export const exportToCSV = (students: Student[], records: AttendanceRecord[]) => {
  // Simple CSV export logic kept minimal for space
  const rows = [['Name', 'Grade', 'Date', 'Status']];
  records.forEach(r => {
    const s = students.find(st => st.id === r.studentId);
    if(s) rows.push([s.name, s.grade, r.date, r.status]);
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'export.csv'; a.click();
};
