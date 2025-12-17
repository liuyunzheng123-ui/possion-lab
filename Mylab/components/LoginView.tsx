import React, { useState } from 'react';
import { GraduationCap, ArrowRight, Lock, Activity } from 'lucide-react';

interface LoginViewProps {
  onLogin: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would validate credentials here.
    // For this demo, we just allow access.
    onLogin();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration - Animated Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 z-0"></div>
      
      <div className="absolute inset-0 overflow-hidden z-0 opacity-30">
         <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-600 rounded-full blur-[100px] mix-blend-screen animate-pulse duration-[4s]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-indigo-600 rounded-full blur-[100px] mix-blend-screen animate-pulse duration-[6s]" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Main Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-2xl shadow-2xl max-w-md w-full relative z-10 animate-fade-in-up">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-lg shadow-blue-500/30 mb-6 transform hover:scale-105 transition-transform duration-500">
            <Activity className="text-white w-10 h-10" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2 text-center tracking-tight">Poisson ARCH 实验室</h1>
          <p className="text-blue-200/80 text-sm text-center font-light tracking-wide">
            稀有事件仿真与大偏差理论研究平台
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">研究员 ID / 访问码</label>
            <div className="relative group">
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3.5 px-4 pl-11 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all group-hover:bg-slate-800/80"
                placeholder="Guest Researcher"
              />
              <div className="absolute left-3.5 top-3.5 text-slate-500 group-hover:text-blue-400 transition-colors">
                <Lock size={18} />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full group relative overflow-hidden bg-white text-slate-900 font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-100/50 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
            <div className="flex items-center justify-center gap-2 relative z-10">
              <span>进入仿真平台</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
            Advanced Monte Carlo Simulation System
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};