import { AppNotification, User, School } from '../types';

export const getNotificationsForUser = (user: User, school?: School): AppNotification[] => {
  const notifications: AppNotification[] = [];
  const today = new Date().toISOString();

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
        date: today,
        type: 'warning',
        read: false
      });
    } else if (diffDays <= 0) {
      notifications.push({
        id: 'sub-expired',
        title: 'اشتراك منتهي',
        message: 'لقد انتهت فترة اشتراك المدرسة. يرجى التواصل مع الإدارة فوراً.',
        date: today,
        type: 'danger',
        read: false
      });
    }
  }

  // 2. System Announcement (For Everyone)
  notifications.push({
    id: 'sys-welcome',
    title: 'تحديث جديد 2.1',
    message: 'تم إضافة ميزة التحليل الذكي وسجلات النشاط. استكشف المميزات الجديدة!',
    date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    type: 'info',
    read: true
  });

  // 3. Attendance Alert (Mock)
  if (user.role === 'principal' || user.role === 'teacher') {
    notifications.push({
      id: 'att-alert',
      title: 'تقرير الغياب',
      message: 'تم تسجيل نسبة غياب مرتفعة في الصف العاشر اليوم.',
      date: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
      type: 'warning',
      read: false
    });
  }

  return notifications;
};
