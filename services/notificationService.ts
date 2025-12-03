import { AppNotification, User, School, AttendanceStatus } from '../types';
import { getStudents, getAttendanceRecords, getLeaveRequests, getSettings } from './storageService';

export const getNotificationsForUser = (user: User, school?: School): AppNotification[] => {
  const notifications: AppNotification[] = [];
  const today = new Date().toISOString().split('T')[0];
  const settings = getSettings();
  
  // 1. Subscription Warning (For Principals/Admins)
  if ((user.role === 'principal' || user.role === 'admin') && school) {
    const endDate = new Date(school.subscriptionEndDate);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 30 && diffDays > 0) {
      notifications.push({
        id: 'sub-warn',
        title: 'تنبيه الاشتراك',
        message: `سينتهي اشتراك المدرسة خلال ${diffDays} يوم. يرجى التجديد لضمان استمرار الخدمة.`,
        date: new Date().toISOString(),
        type: 'warning',
        read: false
      });
    } else if (diffDays <= 0) {
      notifications.push({
        id: 'sub-expired',
        title: 'اشتراك منتهي',
        message: 'لقد انتهت فترة اشتراك المدرسة. يرجى التواصل مع الإدارة فوراً.',
        date: new Date().toISOString(),
        type: 'danger',
        read: false
      });
    }
  }

  // 2. Pending Leave Requests (Admin/Principal/Vice/Teacher)
  if (['principal', 'admin', 'vice_principal', 'teacher'].includes(user.role) && user.schoolId) {
    const leaves = getLeaveRequests(user.schoolId);
    const pendingCount = leaves.filter(l => l.status === 'pending').length;
    
    if (pendingCount > 0) {
       notifications.push({
          id: 'pending-leaves',
          title: 'طلبات استئذان معلقة',
          message: `يوجد ${pendingCount} طلب استئذان بانتظار الموافقة.`,
          date: new Date().toISOString(),
          type: 'info',
          read: false
       });
    }
  }

  // 3. At-Risk Students Analysis (Admin/Principal/Vice)
  if (['principal', 'admin', 'vice_principal'].includes(user.role) && user.schoolId) {
    const students = getStudents(user.schoolId);
    const records = getAttendanceRecords(user.schoolId);
    const threshold = settings.attendanceThreshold || 75;
    
    let riskCount = 0;
    
    students.forEach(s => {
       const sRecords = records.filter(r => r.studentId === s.id);
       if (sRecords.length < 3) return; // Need some data to calculate risk
       
       const present = sRecords.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.EXCUSED).length;
       const late = sRecords.filter(r => r.status === AttendanceStatus.LATE).length;
       
       // Calculate rate (consistent with other parts of the app)
       const rate = Math.round(((present + (late * 0.5)) / sRecords.length) * 100);
       
       if (rate < threshold) riskCount++;
    });

    if (riskCount > 0) {
       notifications.push({
          id: 'risk-students',
          title: 'تنبيه الحضور',
          message: `يوجد ${riskCount} طالب تجاوزوا حد الغياب المسموح (${threshold}%). يرجى مراجعة القوائم.`,
          date: new Date().toISOString(),
          type: 'warning',
          read: false
       });
    }
  }

  // 4. Consecutive Absence (For Teachers/Principals)
  if (['principal', 'teacher'].includes(user.role) && user.schoolId) {
    const students = getStudents(user.schoolId);
    const records = getAttendanceRecords(user.schoolId);
    
    // Check last 3 days
    let consecutiveAbsentNames: string[] = [];
    
    students.forEach(s => {
       // Get last 3 records for this student sorted by date desc
       const sRecords = records
          .filter(r => r.studentId === s.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3);
       
       if (sRecords.length === 3 && sRecords.every(r => r.status === AttendanceStatus.ABSENT)) {
          consecutiveAbsentNames.push(s.name);
       }
    });

    if (consecutiveAbsentNames.length > 0) {
       notifications.push({
          id: 'consecutive-absence',
          title: 'غياب متواصل',
          message: `الطلاب التاليين تغيبوا لـ 3 أيام متتالية: ${consecutiveAbsentNames.slice(0, 3).join(', ')}${consecutiveAbsentNames.length > 3 ? '...' : ''}`,
          date: new Date().toISOString(),
          type: 'danger',
          read: false
       });
    }
  }

  // 5. Parent Notifications
  if (user.role === 'parent' && user.relatedStudentId && user.schoolId) {
     const records = getAttendanceRecords(user.schoolId);
     // Check today's status
     const todayRecord = records.find(r => r.studentId === user.relatedStudentId && r.date === today);
     
     if (todayRecord) {
        if (todayRecord.status === AttendanceStatus.ABSENT) {
           notifications.push({
              id: `absent-${today}`,
              title: 'تسجيل غياب',
              message: 'تم تسجيل ابنكم غائباً اليوم. يرجى تقديم عذر إن وجد.',
              date: today,
              type: 'danger',
              read: false
           });
        } else if (todayRecord.status === AttendanceStatus.LATE) {
           notifications.push({
              id: `late-${today}`,
              title: 'تسجيل تأخير',
              message: 'تم تسجيل ابنكم متأخراً عن الطابور الصباحي اليوم.',
              date: today,
              type: 'warning',
              read: false
           });
        }
     }
  }

  // Always return sorted by date (newest first)
  return notifications.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};