import React, { useState } from 'react';
import { GraduationCap, LogIn, User, Lock, ArrowRight, AlertTriangle } from 'lucide-react';
import { User as UserType } from '../types';
import { loginUser } from '../services/storageService';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('الرجاء إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    // Attempt Login
    const { user, error: loginError } = loginUser(username);
    
    if (user) {
      onLogin(user);
    } else {
      setError(loginError || 'اسم المستخدم غير صحيح.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <GraduationCap size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">نظام متابعة الحضور الذكي</h1>
          <p className="text-indigo-100">سجل دخولك للمتابعة</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-medium border border-red-100 flex items-center justify-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="أدخل اسم المستخدم"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <span>تسجيل الدخول</span>
              <ArrowRight size={20} />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-center text-xs text-slate-500 mb-4">حسابات تجريبية:</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setUsername('sysadmin'); setPassword('123'); }} className="text-xs bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg transition-colors font-bold border border-slate-700">
                مدير النظام (sysadmin)
              </button>
              <button onClick={() => { setUsername('principal1'); setPassword('123'); }} className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg transition-colors font-bold border border-indigo-100">
                مدير مدرسة 1 (فعال)
              </button>
              <button onClick={() => { setUsername('principal2'); setPassword('123'); }} className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg transition-colors font-bold border border-red-100">
                مدير مدرسة 2 (متوقف)
              </button>
              <button onClick={() => { setUsername('teacher1'); setPassword('123'); }} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg transition-colors">
                معلم مدرسة 1
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
