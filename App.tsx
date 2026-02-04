
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import LessonViewer from './components/LessonViewer';
import LiveCoach from './components/LiveCoach';
import Login from './components/Login';
import { googleSheetService } from './services/googleSheetService';
import { shlService } from './services/shlService';
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
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const checkSession = async () => {
    setIsAuthChecking(true);
    const cachedUser = localStorage.getItem('tp_skillence_user_session');
    if (cachedUser) {
      try {
        const user = JSON.parse(cachedUser);
        setCurrentUser(user);
        await refreshPlan(user.id);
      } catch (e) {
        localStorage.removeItem('tp_skillence_user_session');
      }
    }
    setIsAuthChecking(false);
    setIsLoading(false);
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogin = async (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('tp_skillence_user_session', JSON.stringify(user));
    await refreshPlan(user.id);
    setIsDemoMode(false);
  };

  const handleImpersonate = async (user: UserProfile) => {
    setIsLoading(true);
    try {
      setCurrentUser(user);
      await refreshPlan(user.id);
      setView({ type: 'dashboard' });
    } catch (err) {
      alert("Failed to view profile: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterSandbox = () => {
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
    setIsLoading(false);
    setError(null);
  };

  const refreshPlan = async (uid?: string) => {
    const id = uid || currentUser?.id;
    if (!id || isDemoMode) return;
    try {
      const plan = await googleSheetService.fetchUserPlan(id);
      setUserPlan(Array.isArray(plan) ? plan : []);
    } catch (err) {
      console.error("Refresh Error:", err);
      if ((err as Error).message.includes("User not found")) {
        handleLogout();
      }
    }
  };

  const handleFileProcessed = async (file: File) => {
    setIsLoading(true);
    try {
      const { registration } = await shlService.processAndRegister(file);
      setCurrentUser(registration.userProfile);
      setUserPlan(registration.resources);
      localStorage.setItem('tp_skillence_user_session', JSON.stringify(registration.userProfile));
      setView({ type: 'dashboard' });
    } catch (err) {
      alert("Registration Failed: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tp_skillence_user_session');
    setCurrentUser(null);
    setUserPlan([]);
    setIsDemoMode(false);
    setView({ type: 'dashboard' });
  };

  const handleNavigate = (newView: View) => {
    setView(newView);
    setIsSidebarOpen(false);
  };

  const renderContent = () => {
    if (isLoading || isAuthChecking) return (
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

    if (!currentUser) {
      return <Login onLoginSuccess={handleLogin} onEnterSandbox={handleEnterSandbox} />;
    }

    // Role-Based Access Guards
    if (view.type === 'admin') {
      if (currentUser.role !== 'admin') {
        setView({ type: 'dashboard' });
        return null;
      }
      return <AdminPanel onUpdateContent={refreshPlan} currentUser={currentUser} onFileProcessed={handleFileProcessed} onImpersonate={handleImpersonate} />;
    }

    if (view.type === 'live-coach') {
      if (currentUser.role !== 'coach' && currentUser.role !== 'admin') {
        setView({ type: 'dashboard' });
        return null;
      }
      return <LiveCoach onClose={() => setView({ type: 'dashboard' })} currentUser={currentUser} onImpersonate={handleImpersonate} />;
    }
    
    if (view.type === 'lesson') return (
        <LessonViewer 
            resource={view.resource} 
            uid={currentUser.id} 
            onClose={() => setView({ type: 'dashboard' })}
            onMasteryAchieved={() => refreshPlan()}
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
      {currentUser && (
        <>
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
            onLogout={handleLogout}
          />
        </>
      )}

      <main className={`flex-1 overflow-y-auto ${currentUser ? 'p-4 md:p-12 relative lg:ml-72 transition-all' : ''}`}>
        {isDemoMode && currentUser && (
          <div className="fixed bottom-12 right-12 z-50 bg-tp-red text-white px-10 py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.5em] shadow-2xl animate-pulse">
            Active Offline Academy
          </div>
        )}

        {currentUser && (
          <div className="flex items-center justify-between lg:hidden mb-12">
              <button onClick={() => setIsSidebarOpen(true)} className="p-5 bg-white shadow-2xl rounded-3xl text-tp-purple"><MenuIcon className="w-6 h-6" /></button>
              <p className="font-black text-tp-purple uppercase tracking-[0.4em] text-[10px]">Academy</p>
              <div className="w-16"></div>
          </div>
        )}

        {currentUser && view.type !== 'live-coach' && (
          <div className="hidden lg:flex absolute top-12 right-12 items-center bg-white px-8 py-5 rounded-[40px] shadow-sm border border-gray-100 z-10 animate-fadeIn">
              <div className="w-14 h-14 bg-tp-navy text-white rounded-2xl mr-6 flex items-center justify-center shadow-xl"><UserIcon className="w-7 h-7" /></div>
              <div>
                  <p className="text-lg font-black text-tp-purple leading-tight">{currentUser.name}</p>
                  <span className="text-[10px] text-tp-red font-black uppercase tracking-[0.4em] mt-1.5 block">Role: {currentUser.role}</span>
              </div>
          </div>
        )}

        <div className={`${currentUser ? 'max-w-7xl mx-auto' : 'h-full'}`}>{renderContent()}</div>
      </main>
    </div>
  );
};

export default App;
