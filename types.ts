export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
}

export interface School {
  id: string;
  name: string;
  isActive: boolean;
  principalId: string;
  subscriptionEndDate: string;
  studentCount: number;
}

export interface Student {
  id: string;
  schoolId: string;
  name: string;
  grade: string;
  parentPhone?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  schoolId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  schoolId: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  parentName?: string;
  type: 'absence' | 'early_exit';
  exitTime?: string;
  pickupPerson?: string;
  actualExitTime?: string;
}

export interface BehaviorRecord {
  id: string;
  studentId: string;
  schoolId: string;
  type: 'positive' | 'negative';
  category: string;
  reason: string;
  points: number;
  date: string;
  recordedBy: string;
}

export interface Subject {
  id: string;
  schoolId: string;
  name: string;
  color: string;
  teacherName?: string;
}

export interface ClassSchedule {
  id: string;
  schoolId: string;
  grade: string;
  schedule: {
    [day: string]: { 
      [period: number]: string;
    }
  };
}

// --- Health Types ---
export interface HealthRecord {
  studentId: string;
  bloodType?: string;
  chronicConditions: string[]; // e.g. ['Asthma', 'Diabetes']
  allergies: string[];
  emergencyContact?: string;
  notes?: string;
}

export interface ClinicVisit {
  id: string;
  schoolId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  reason: string;
  treatment: string; // Action taken
  outcome: 'returned_to_class' | 'sent_home' | 'hospital';
  nurseName?: string;
}

// --- Visitor Types ---
export interface VisitorRecord {
  id: string;
  schoolId: string;
  name: string;
  idNumber?: string;
  visitReason: string;
  personToVisit?: string;
  checkInTime: string; // ISO String
  checkOutTime?: string; // ISO String
  status: 'active' | 'completed';
}

export interface SchoolEvent {
  id: string;
  schoolId: string;
  title: string;
  date: string;
  type: 'holiday' | 'exam' | 'activity' | 'meeting';
  description?: string;
}

export interface DailyStat {
  date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export interface AppSettings {
  attendanceThreshold: number;
  schoolName?: string;
  classes?: string[];
  whatsappTemplates?: {
    absent: string;
    late: string;
  };
}

export type UserRole = 'general_manager' | 'admin' | 'principal' | 'vice_principal' | 'staff' | 'teacher' | 'parent' | 'student' | 'nurse' | 'security';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  schoolId?: string;
  relatedStudentId?: string;
  managedSchoolIds?: string[];
}

export interface SystemLog {
  id: string;
  action: string;
  user: string;
  details: string;
  date: string;
  type: 'info' | 'warning' | 'danger' | 'success';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  read: boolean;
}