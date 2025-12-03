import React, { useState, useMemo } from 'react';
import { Trophy, Medal, Star, Crown, Filter, Share2, Award, TrendingUp } from 'lucide-react';
import { Student, BehaviorRecord } from '../types';
import { getBehaviorRecords } from '../services/storageService';

interface LeaderboardProps {
  students: Student[];
  schoolName: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ students, schoolName }) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');

  const uniqueGrades = useMemo(() => {
    const grades = new Set(students.map(s => s.grade));
    return Array.from(grades).sort();
  }, [students]);

  // Calculate scores
  const rankedStudents = useMemo(() => {
    const behaviorRecords = getBehaviorRecords();
    
    const studentsWithScores = students.map(student => {
      const studentRecords = behaviorRecords.filter(r => r.studentId === student.id);
      // Base score 100, add points
      const score = studentRecords.reduce((acc, curr) => acc + curr.points, 100);
      const positiveCount = studentRecords.filter(r => r.type === 'positive').length;
      
      return {
        ...student,
        score,
        positiveCount,
        lastBadge: positiveCount > 5 ? 'متميز' : positiveCount > 10 ? 'قائد' : null
      };
    });

    // Filter
    const filtered = selectedGrade === 'all' 
      ? studentsWithScores 
      : studentsWithScores.filter(s => s.grade === selectedGrade);

    // Sort
    return filtered.sort((a, b) => b.score - a.score);
  }, [students, selectedGrade]);

  const top3 = rankedStudents.slice(0, 3);
  const rest = rankedStudents.slice(3, 20); // Show up to 20

  const getRankStyle = (index: number) => {
    switch(index) {
      case 0: return { bg: 'bg-yellow-100', border: 'border-yellow-300', icon: <Crown size={32} className="text-yellow-600" />, color: 'text-yellow-800' };
      case 1: return { bg: 'bg-slate-100', border: 'border-slate-300', icon: <Medal size={28} className="text-slate-500" />, color: 'text-slate-700' };
      case 2: return { bg: 'bg-orange-50', border: 'border-orange-200', icon: <Medal size={28} className="text-orange-600" />, color: 'text-orange-800' };
      default: return { bg: 'bg-white', border: 'border-slate-100', icon: null, color: 'text-slate-800' };
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-indigo-900 to-purple-900 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
            <div className="absolute top-[-50%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white blur-3xl"></div>
            <div className="absolute bottom-[-50%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500 blur-3xl"></div>
         </div>

         <div className="relative z-10 flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
               <Trophy size={40} className="text-yellow-300" />
            </div>
            <div>
               <h1 className="text-3xl font-bold mb-1">لوحة الشرف والمنافسة</h1>
               <p className="text-indigo-200">{schoolName}</p>
            </div>
         </div>

         <div className="relative z-10 w-full md:w-auto">
            <div className="flex items-center bg-white/10 rounded-xl p-1 backdrop-blur-sm border border-white/20">
               <div className="px-3 text-white/70">
                  <Filter size={18} />
               </div>
               <select 
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="bg-transparent text-white border-none outline-none p-2 w-full md:w-48 font-bold cursor-pointer [&>option]:text-slate-900"
               >
                  <option value="all">كل الصفوف</option>
                  {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
               </select>
            </div>
         </div>
      </div>

      {/* Podium Section (Top 3) */}
      {top3.length > 0 ? (
         <div className="flex flex-col md:flex-row justify-center items-end gap-4 md:gap-8 min-h-[300px] px-4">
            {/* 2nd Place */}
            {top3[1] && (
               <div className="order-2 md:order-1 w-full md:w-1/3 max-w-[280px] flex flex-col items-center animate-fade-in" style={{animationDelay: '0.2s'}}>
                  <div className="relative mb-4">
                     <div className="w-24 h-24 rounded-full border-4 border-slate-300 bg-white shadow-lg flex items-center justify-center text-2xl font-bold text-slate-500 relative z-10 overflow-hidden">
                        {top3[1].name.charAt(0)}
                     </div>
                     <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-300 shadow-sm whitespace-nowrap">
                        المركز الثاني
                     </div>
                  </div>
                  <div className="bg-white w-full rounded-t-2xl p-6 shadow-lg border-t-4 border-slate-300 text-center relative mt-4 h-[220px] flex flex-col justify-between">
                     <div>
                        <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{top3[1].name}</h3>
                        <p className="text-slate-500 text-sm mb-2">{top3[1].grade}</p>
                     </div>
                     <div className="text-3xl font-black text-slate-700 bg-slate-50 rounded-xl py-2 dir-ltr">
                        {top3[1].score}
                     </div>
                  </div>
               </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
               <div className="order-1 md:order-2 w-full md:w-1/3 max-w-[320px] flex flex-col items-center z-10 animate-fade-in">
                  <div className="relative mb-4">
                     <Crown size={48} className="text-yellow-400 absolute -top-10 left-1/2 -translate-x-1/2 drop-shadow-lg animate-bounce" />
                     <div className="w-32 h-32 rounded-full border-4 border-yellow-400 bg-white shadow-xl flex items-center justify-center text-4xl font-bold text-yellow-600 relative z-10 overflow-hidden">
                        {top3[0].name.charAt(0)}
                     </div>
                     <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-bold border border-yellow-200 shadow-md whitespace-nowrap">
                        المركز الأول
                     </div>
                  </div>
                  <div className="bg-gradient-to-b from-yellow-50 to-white w-full rounded-t-2xl p-8 shadow-xl border-t-4 border-yellow-400 text-center relative mt-4 h-[260px] flex flex-col justify-between transform md:-translate-y-4">
                     <div>
                        <h3 className="font-bold text-xl text-slate-800 line-clamp-1">{top3[0].name}</h3>
                        <p className="text-yellow-600/80 font-medium mb-2">{top3[0].grade}</p>
                        <div className="flex justify-center gap-1 my-2">
                           <Star size={16} className="text-yellow-400 fill-yellow-400" />
                           <Star size={16} className="text-yellow-400 fill-yellow-400" />
                           <Star size={16} className="text-yellow-400 fill-yellow-400" />
                        </div>
                     </div>
                     <div className="text-5xl font-black text-yellow-600 drop-shadow-sm dir-ltr">
                        {top3[0].score}
                     </div>
                  </div>
               </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
               <div className="order-3 w-full md:w-1/3 max-w-[280px] flex flex-col items-center animate-fade-in" style={{animationDelay: '0.4s'}}>
                  <div className="relative mb-4">
                     <div className="w-24 h-24 rounded-full border-4 border-orange-300 bg-white shadow-lg flex items-center justify-center text-2xl font-bold text-orange-500 relative z-10 overflow-hidden">
                        {top3[2].name.charAt(0)}
                     </div>
                     <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-200 text-orange-800 px-3 py-1 rounded-full text-xs font-bold border border-orange-300 shadow-sm whitespace-nowrap">
                        المركز الثالث
                     </div>
                  </div>
                  <div className="bg-white w-full rounded-t-2xl p-6 shadow-lg border-t-4 border-orange-300 text-center relative mt-4 h-[200px] flex flex-col justify-between">
                     <div>
                        <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{top3[2].name}</h3>
                        <p className="text-slate-500 text-sm mb-2">{top3[2].grade}</p>
                     </div>
                     <div className="text-3xl font-black text-orange-800 bg-orange-50 rounded-xl py-2 dir-ltr">
                        {top3[2].score}
                     </div>
                  </div>
               </div>
            )}
         </div>
      ) : (
         <div className="text-center py-12 text-slate-400">
            لا توجد بيانات كافية لعرض لوحة الشرف
         </div>
      )}

      {/* Rest of the list */}
      {rest.length > 0 && (
         <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 text-slate-700 font-bold">
               <TrendingUp size={20} className="text-indigo-600" />
               باقي المتصدرين
            </div>
            <div className="divide-y divide-slate-100">
               {rest.map((student, idx) => (
                  <div key={student.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                     <div className="w-8 h-8 flex items-center justify-center font-bold text-slate-400 bg-slate-100 rounded-full text-sm">
                        {idx + 4}
                     </div>
                     <div className="flex-1">
                        <div className="font-bold text-slate-800">{student.name}</div>
                        <div className="text-xs text-slate-500">{student.grade}</div>
                     </div>
                     <div className="flex items-center gap-2">
                        {student.lastBadge && (
                           <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                              {student.lastBadge}
                           </span>
                        )}
                        <div className="font-bold text-indigo-600 text-lg w-12 text-center dir-ltr">
                           {student.score}
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}
    </div>
  );
};

export default Leaderboard;