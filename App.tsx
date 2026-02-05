
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
  BrainIcon, 
  ExitIcon,
  XIcon
} from './components/Icons';

const App: React.FC = () => {
  const [view, setView] = useState<View>({ type: 'dashboard' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [originalUser, setOriginalUser] = useState<UserProfile | null>(null); // Sandbox State
  const [userPlan, setUserPlan] = useState<Resource[]>([]);
  const [globalUsers, setGlobalUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const checkSession = async () => {
    setIsAuthChecking(true);
    const cachedUser = localStorage.getItem('tp_skillence_user_session');
    if (cachedUser) {
      try {
        const user = JSON.parse(cachedUser);
        setCurrentUser(user);
        await refreshPlan(user.id);
        if (user.role === 'admin' || user.role === 'coach') {
          loadGlobalUsers();
        }
      } catch (e) {
        localStorage.removeItem('tp_skillence_user_session');
      }
    }
    setIsAuthChecking(false);
    setIsLoading(false);
  };

  const loadGlobalUsers = async () => {
    try {
      const users = await googleSheetService.fetchAllUsers();
      setGlobalUsers(Array.isArray(users) ? users : []);
    } catch (e) {
      console.error("Failed to load global users for sidebar:", e);
      setGlobalUsers([]);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogin = async (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('tp_skillence_user_session', JSON.stringify(user));
    await refreshPlan(user.id);
    if (user.role === 'admin' || user.role === 'coach') {
      loadGlobalUsers();
    }
  };

  const handleImpersonate = async (targetUser: UserProfile) => {
    setIsLoading(true);
    try {
      // If we aren't already impersonating, save the real user
      if (!originalUser && currentUser) {
        setOriginalUser(currentUser);
      }
      
      setCurrentUser(targetUser);
      await refreshPlan(targetUser.id);
      setView({ type: 'dashboard' });
      setIsSidebarOpen(false);
    } catch (err) {
      alert("Failed to view profile: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExitImpersonation = async () => {
    if (!originalUser) return;
    setIsLoading(true);
    try {
      setCurrentUser(originalUser);
      await refreshPlan(originalUser.id);
      setOriginalUser(null);
      setView({ type: 'dashboard' });
    } catch (err) {
      alert("Failed to restore session: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterSandbox = () => {
    const localUsers = getUsers();
    const demoUser = localUsers.length > 0 ? localUsers[0] : {
      id: 'demo-guest',
      name: 'Guest User',
      role: 'agent',
      languageLevel: 'B1',
      rosterId: 'demo'
    } as UserProfile;

    setCurrentUser(demoUser);
    
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
  };

  const refreshPlan = async (uid?: string) => {
    const id = uid || currentUser?.id;
    if (!id) return;
    try {
      const plan = await googleSheetService.fetchUserPlan(id);
      setUserPlan(Array.isArray(plan) ? plan : []);
    } catch (err) {
      console.error("Refresh Error:", err);
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
    setOriginalUser(null);
    setUserPlan([]);
    setGlobalUsers([]);
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
        </div>
    );

    if (!currentUser) {
      return <Login onLoginSuccess={handleLogin} onEnterSandbox={handleEnterSandbox} />;
    }

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
            users={globalUsers} 
            onSwitchUser={handleImpersonate}
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)}
            onLogout={handleLogout}
          />
        </>
      )}

      <main className={`flex-1 overflow-y-auto ${currentUser ? 'relative lg:ml-72 transition-all' : ''}`}>
        {/* SANDBOX MODE BANNER */}
        {originalUser && (
          <div className="sticky top-0 z-[60] bg-amber-500 text-white px-6 py-3 shadow-lg flex items-center justify-between border-b border-amber-600/20 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <UserIcon className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest">
                Sandbox Mode: Viewing as <span className="underline underline-offset-4">{currentUser?.name}</span>
              </p>
            </div>
            <button 
              onClick={handleExitImpersonation}
              className="bg-tp-navy text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-tp-navy transition-all flex items-center gap-2"
            >
              <ExitIcon className="w-3.5 h-3.5" />
              Exit Impersonation
            </button>
          </div>
        )}

        <div className={`${currentUser ? 'p-4 md:p-12' : ''}`}>
          {currentUser && (
            <div className="flex items-center justify-between lg:hidden mb-12">
                <button onClick={() => setIsSidebarOpen(true)} className="p-5 bg-white shadow-2xl rounded-3xl text-tp-purple"><MenuIcon className="w-6 h-6" /></button>
                <p className="font-black text-tp-purple uppercase tracking-[0.4em] text-[10px]">Academy</p>
                <div className="w-16"></div>
            </div>
          )}

          {currentUser && view.type !== 'live-coach' && (
            <div className={`hidden lg:flex absolute right-12 items-center bg-white px-8 py-5 rounded-[40px] shadow-sm border border-gray-100 z-10 animate-fadeIn ${originalUser ? 'top-20' : 'top-12'}`}>
                <div className="w-14 h-14 bg-tp-navy text-white rounded-2xl mr-6 flex items-center justify-center shadow-xl"><UserIcon className="w-7 h-7" /></div>
                <div>
                    <p className="text-lg font-black text-tp-purple leading-tight">{currentUser.name}</p>
                    <span className="text-[10px] text-tp-red font-black uppercase tracking-[0.4em] mt-1.5 block">Role: {currentUser.role}</span>
                </div>
            </div>
          )}

          <div className={`${currentUser ? 'max-w-7xl mx-auto' : 'h-full'}`}>{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;
