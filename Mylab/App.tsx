act, { useState } from 'react';
import { BookText, BarChart3, GraduationCap, LogOut } from 'lucide-react';
import { SimulationView } from './components/SimulationView';
import ResearchView from './components/ResearchView';
import { LoginView } from './components/LoginView';

enum Tab {
  RESEARCH = 'RESEARCH',
  SIMULATION = 'SIMULATION'
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.RESEARCH);

  // If not authenticated, show the Login/Landing page
  if (!isAuthenticated) {
    return <LoginView onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
                <GraduationCap className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
                  PoissonARCH 研究助手
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">大偏差与重要性采样 (Large Deviations & IS) 探索</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
                <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab(Tab.RESEARCH)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                      activeTab === Tab.RESEARCH
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    <BookText size={18} />
                    <span className="hidden sm:inline">研究现状</span>
                  </button>
                  <button
                    onClick={() => setActiveTab(Tab.SIMULATION)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                      activeTab === Tab.SIMULATION
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    <BarChart3 size={18} />
                    <span className="hidden sm:inline">仿真实验室</span>
                  </button>
                </nav>
                
                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                <button 
                    onClick={() => setIsAuthenticated(false)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex items-center gap-2"
                    title="退出实验室"
                >
                    <LogOut size={20} />
                </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === Tab.RESEARCH ? (
          <div className="fade-in">
             <ResearchView />
          </div>
        ) : (
          <div className="fade-in h-[calc(100vh-140px)]">
             <SimulationView />
          </div>
        )}
      </main>
      
      <style>{`
        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;