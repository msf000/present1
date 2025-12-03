import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, MapPin, AlignLeft, Sparkles, Loader2 } from 'lucide-react';
import { SchoolEvent } from '../types';
import { getEvents, saveEvent, deleteEvent, saveEvents } from '../services/storageService';
import { suggestSchoolEvents } from '../services/geminiService';

interface SchoolCalendarProps {
  schoolId: string;
}

const EVENT_TYPES = {
  holiday: { label: 'إجازة', color: 'bg-red-100 text-red-700 border-red-200' },
  exam: { label: 'اختبار', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  activity: { label: 'نشاط', color: 'bg-green-100 text-green-700 border-green-200' },
  meeting: { label: 'اجتماع', color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

const SchoolCalendar: React.FC<SchoolCalendarProps> = ({ schoolId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<SchoolEvent[]>(getEvents(schoolId));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<keyof typeof EVENT_TYPES>('meeting');
  const [newEventDesc, setNewEventDesc] = useState('');
  
  // AI Suggestion State
  const [isSuggesting, setIsSuggesting] = useState(false);

  const refreshEvents = () => {
    setEvents(getEvents(schoolId));
  };

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Empty slots before first day
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, [currentDate]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setNewEventTitle('');
    setNewEventDesc('');
    setIsModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !newEventTitle) return;

    const event: SchoolEvent = {
      id: crypto.randomUUID(),
      schoolId,
      date: selectedDate,
      title: newEventTitle,
      type: newEventType,
      description: newEventDesc
    };

    saveEvent(event);
    setIsModalOpen(false);
    refreshEvents();
  };

  const handleDeleteEvent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا الحدث؟')) {
      deleteEvent(id);
      refreshEvents();
    }
  };

  const handleAiSuggest = async () => {
    setIsSuggesting(true);
    const monthName = currentDate.toLocaleDateString('ar-EG', { month: 'long' });
    const suggestions = await suggestSchoolEvents(monthName, "مدرسة عامة، نركز على الأنشطة والتحصيل العلمي");
    
    if (suggestions.length > 0) {
      const newEvents = suggestions.map((s: any) => ({
        id: crypto.randomUUID(),
        schoolId,
        date: s.date, // AI should return YYYY-MM-DD
        title: s.title,
        type: (['holiday', 'exam', 'activity', 'meeting'].includes(s.type) ? s.type : 'activity') as any,
        description: s.description
      }));
      
      saveEvents(newEvents);
      refreshEvents();
      alert(`تم إضافة ${newEvents.length} أحداث مقترحة للتقويم.`);
    } else {
      alert("لم يتمكن المساعد من اقتراح أحداث حالياً.");
    }
    setIsSuggesting(false);
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr);
  };

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
            <ChevronRight size={24} />
          </button>
          <h2 className="text-xl font-bold text-slate-800 min-w-[200px] text-center">
            {currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
            <ChevronLeft size={24} />
          </button>
        </div>

        <div className="flex gap-2">
           <button 
             onClick={handleAiSuggest}
             disabled={isSuggesting}
             className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-sm disabled:opacity-70"
           >
             {isSuggesting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="text-yellow-300" />}
             <span>اقتراح جدول ذكي</span>
           </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1 flex flex-col">
        <div className="grid grid-cols-7 mb-2 text-center border-b border-slate-100 pb-2">
          {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
            <div key={day} className="font-bold text-slate-500 text-sm">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-2">
          {daysInMonth.map((date, idx) => {
            if (!date) return <div key={idx} className="bg-slate-50/30 rounded-lg"></div>;
            
            const dayEvents = getEventsForDay(date);
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div 
                key={idx}
                onClick={() => handleDateClick(date)}
                className={`border rounded-lg p-2 relative group hover:border-indigo-300 transition-colors cursor-pointer flex flex-col gap-1 min-h-[100px] ${isToday ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}
              >
                <div className={`text-sm font-bold mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>
                  {date.getDate()}
                </div>
                
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      className={`text-[10px] px-1.5 py-1 rounded border truncate flex justify-between items-center group/event ${EVENT_TYPES[event.type].color}`}
                      title={event.title}
                    >
                      <span className="truncate">{event.title}</span>
                      <button 
                        onClick={(e) => handleDeleteEvent(event.id, e)}
                        className="hidden group-hover/event:block text-red-600 hover:bg-white/50 rounded p-0.5"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="bg-indigo-100 text-indigo-600 p-1 rounded-full">
                      <Plus size={14} />
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-100 pb-2">
              إضافة حدث جديد
              <span className="text-sm font-normal text-slate-500 block mt-1">{selectedDate}</span>
            </h3>
            
            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">عنوان الحدث</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="مثال: اختبار فيزياء"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">نوع الحدث</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(EVENT_TYPES) as Array<keyof typeof EVENT_TYPES>).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewEventType(type)}
                      className={`p-2 rounded-lg text-sm font-bold border transition-colors ${
                        newEventType === type 
                          ? EVENT_TYPES[type].color 
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {EVENT_TYPES[type].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تفاصيل إضافية</label>
                <textarea
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                  placeholder="ملاحظات حول الحدث..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition-colors"
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

export default SchoolCalendar;