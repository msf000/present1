
export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
}

export interface School {
  id: string;
  name: string;
  isActive: boolean; // Subscription status
  principalId: string; // The user ID of the school manager
  subscriptionEndDate: string;
  studentCount: number;
}

export interface Student {
  id: string;
  schoolId: string; // Link student to a specific school
  name: string;
  grade: string;
  parentPhone?: string; // Contact number for WhatsApp
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  schoolId: string; // Useful for quick filtering
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  schoolId: string;
  date: string; // The date of absence
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string; // When the request was made
  parentName?: string;
  type: 'absence' | 'early_exit'; // New field
  exitTime?: string; // Required if type is early_exit
  pickupPerson?: string; // Name of person picking up the student
}

export interface SchoolEvent {
  id: string;
  schoolId: string;
  title: string;
  date: string; // YYYY-MM-DD
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
  classes?: string[]; // Defined list of grades/classes
  whatsappTemplates?: {
    absent: string;
    late: string;
  };
}

// User Roles
export type UserRole = 'general_manager' | 'admin' | 'principal' | 'vice_principal' | 'staff' | 'teacher' | 'parent' | 'student';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  schoolId?: string; // Users belong to a school (except general_manager)
  relatedStudentId?: string;
  managedSchoolIds?: string[]; // For principals who manage multiple schools
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