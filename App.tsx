
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import LessonViewer from './components/LessonViewer';
import { googleSheetService } from './services/googleSheetService';
import { getUsers } from './services/adminService';
import { allTrainingModules } from './data/trainingData';
import type { View, UserProfile, Resource } from './types';
import { 
  MenuIcon, 
  UserIcon, 
  ExclamationCircleIcon, 
  BrainIcon, 
  LightningIcon, 
  CodeIcon, 
  CheckCircleIcon,
  DownloadIcon
} from './components/Icons';

const App: React.FC = () => {
  const [view, setView] = useState<View>({ type: 'dashboard' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userPlan, setUserPlan] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const initApp = async (useDemo: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      if (useDemo) {
        const localUsers = getUsers();
        const demoUser = localUsers.find(u => u.id === '1773984510') || localUsers[0];
        setCurrentUser(demoUser);
        setIsDemoMode(true);
        const mockResources: Resource[] = Object.values(allTrainingModules).flatMap(m => 
          m.lessons.map(l => ({
            id: l.title.replace(/\s+/g, '-').toLowerCase(),
            title: l.title,
            url: l.link || 'https://www.wikipedia.org',
            type: l.type,
            tags: [m.id],
            level: l.level as any,
            objective: l.objective,
            progress: { status: 'open', attempts: 0, score: 0 }
          }))
        );
        setUserPlan(mockResources); 
      } else {
        const user = await googleSheetService.login("hesham@tp.eg", "TpSkill2026!");
        setCurrentUser(user);
        const plan = await googleSheetService.fetchUserPlan(user.id);
        setUserPlan(Array.isArray(plan) ? plan : []);
        setIsDemoMode(false);
      }
    } catch (err) {
      console.error("Connection Fault:", err);
      setError((err as Error).message || "Registry Sync Failure");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  const refreshPlan = async () => {
    if (!currentUser || isDemoMode) return;
    try {
      const plan = await googleSheetService.fetchUserPlan(currentUser.id);
      setUserPlan(Array.isArray(plan) ? plan : []);
    } catch (err) {
      console.error("Refresh Error:", err);
    }
  };

  const handleNavigate = (newView: View) => {
    setView(newView);
    setIsSidebarOpen(false);
  };

  const renderContent = () => {
    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-tp-purple animate-pulse">
            <div className="w-20 h-20 bg-tp-navy rounded-[32px] flex items-center justify-center mb-8 shadow-2xl">
                <BrainIcon className="w-10 h-10 text-white" />
            </div>
            <p className="font-black uppercase tracking-[0.4em] text-[10px] text-tp-navy">TP Skillence • Language Academy</p>
            <div className="mt-8 flex gap-2">
                {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-tp-red rounded-full"></div>)}
            </div>
        </div>
    );

    if (error) {
      const isParsingError = error.includes("BACKEND_PARSING_ERROR");
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-fadeIn bg-gray-50">
          <div className="bg-white rounded-[64px] p-12 lg:p-16 max-w-7xl w-full shadow-2xl border-t-[20px] border-tp-red relative overflow-hidden">
            <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none">
                <BrainIcon className="w-[400px] h-[400px] text-tp-purple" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative z-10">
                <div className="lg:col-span-5 flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-16 h-16 bg-tp-red/10 rounded-3xl flex items-center justify-center text-tp-red">
                            <ExclamationCircleIcon className="w-8 h-8" />
                        </div>
                        <span className="text-xs font-black text-tp-red uppercase tracking-[0.5em]">System Logic Alert</span>
                    </div>
                    
                    <h2 className="text-5xl lg:text-6xl font-black text-tp-purple mb-10 uppercase tracking-tighter leading-[0.95]">
                        {isParsingError ? 'Registry Sync Error' : 'Database Connection Lost'}
                    </h2>
                    
                    <p className="text-gray-600 font-medium mb-12 leading-relaxed text-xl">
                        The Academy registry could not be synchronized. Verify your connection or consult the diagnostic tools.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6">
                        <button onClick={() => initApp(true)} className="flex-1 bg-tp-navy text-white px-10 py-6 rounded-[32px] font-black uppercase text-xs tracking-[0.3em] shadow-xl">Enter Sandbox</button>
                        <button onClick={() => window.location.reload()} className="flex-1 bg-white border-2 border-tp-purple text-tp-purple px-10 py-6 rounded-[32px] font-black uppercase text-xs tracking-[0.3em]">Retry Sync</button>
                    </div>
                </div>
                <div className="lg:col-span-7 bg-gray-50 rounded-[56px] p-10 border border-gray-100 flex flex-col shadow-inner">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-sm font-black text-tp-purple uppercase tracking-[0.3em]">Technical Solution</h3>
                    </div>
                    <pre className="bg-tp-navy text-blue-300 p-10 rounded-[40px] font-mono text-[11px] overflow-auto border border-white/10 leading-relaxed shadow-2xl h-[400px] custom-scrollbar">
{`// Universal Failsafe Google Script Snippet
function doPost(e) {
  var out = { success: false, message: "Handshake failed" };
  try {
    if (!e || !e.postData || !e.postData.contents) throw "Payload missing";
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var email = data.email;
    // Core Logic...
    out = { success: true, data: { status: 'open' } };
  } catch (err) {
    out.message = err.toString();
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}`}
                    </pre>
                </div>
            </div>
          </div>
        </div>
      );
    }

    if (!currentUser) return null;

    if (view.type === 'admin') return <AdminPanel onUpdateContent={refreshPlan} currentUser={currentUser} />;
    
    if (view.type === 'lesson') return (
        <LessonViewer 
            resource={view.resource} 
            uid={currentUser.id} 
            onClose={() => setView({ type: 'dashboard' })}
            onMasteryAchieved={refreshPlan}
        />
    );

    return (
        <Dashboard 
            user={currentUser} 
            resources={userPlan} 
            onNavigate={handleNavigate} 
            onOpenResource={(res) => setView({ type: 'lesson', resource: res })}
            isDemo={isDemoMode}
        />
    );
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#FBFBFF]">
      {isSidebarOpen && <div className="fixed inset-0 bg-tp-navy/80 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
      
      <Sidebar 
        modules={allTrainingModules} 
        currentView={view} 
        onNavigate={handleNavigate} 
        currentUser={currentUser}
        users={getUsers()} 
        onSwitchUser={(u) => { setCurrentUser(u); handleNavigate({type: 'dashboard'}); }}
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-12 relative lg:ml-72 transition-all">
        {isDemoMode && (
          <div className="fixed bottom-12 right-12 z-50 bg-tp-red text-white px-10 py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.5em] shadow-2xl animate-pulse">
            Active Offline Academy
          </div>
        )}

        <div className="flex items-center justify-between lg:hidden mb-12">
            <button onClick={() => setIsSidebarOpen(true)} className="p-5 bg-white shadow-2xl rounded-3xl text-tp-purple"><MenuIcon className="w-6 h-6" /></button>
            <p className="font-black text-tp-purple uppercase tracking-[0.4em] text-[10px]">Academy</p>
            <div className="w-16"></div>
        </div>

        {currentUser && (
          <div className="hidden lg:flex absolute top-12 right-12 items-center bg-white px-8 py-5 rounded-[40px] shadow-sm border border-gray-50 z-10 animate-fadeIn">
              <div className="w-14 h-14 bg-tp-navy text-white rounded-2xl mr-6 flex items-center justify-center shadow-xl"><UserIcon className="w-7 h-7" /></div>
              <div>
                  <p className="text-lg font-black text-tp-purple leading-tight">{currentUser.name}</p>
                  <span className="text-[10px] text-tp-red font-black uppercase tracking-[0.4em] mt-1.5 block">Role: {currentUser.role}</span>
              </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">{renderContent()}</div>
      </main>
    </div>
  );
};

export default App;
