
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import CoachPanel from './components/CoachPanel'; // New
import LessonViewer from './components/LessonViewer';
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
  ExitIcon
} from './components/Icons';

const App: React.FC = () => {
  const [view, setView] = useState<View>({ type: 'dashboard' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [originalUser, setOriginalUser] = useState<UserProfile | null>(null);
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
      if (!originalUser && currentUser) {
        setOriginalUser(currentUser);
      }
      setCurrentUser(targetUser);
      await refreshPlan(targetUser.id);
      setView({ type: 'dashboard' });
      setIsSidebarOpen(false);
    } catch (err) {
      alert("Profile switch failed.");
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
      alert("Session restore failed.");
    } finally {
      setIsLoading(false);
    }
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
        <BrainIcon className="w-10 h-10 mb-8" />
        <p className="font-black uppercase tracking-widest text-xs">Syncing Academy Node...</p>
      </div>
    );

    if (!currentUser) return <Login onLoginSuccess={handleLogin} onEnterSandbox={() => {}} />;

    if (view.type === 'admin') {
      return <AdminPanel onUpdateContent={refreshPlan} currentUser={currentUser} onImpersonate={handleImpersonate} />;
    }

    if (view.type === 'live-coach') {
      // Security Guard: Restrict access to Admins only during testing phase
      if (currentUser.role !== 'admin') {
        setView({ type: 'dashboard' });
        return null;
      }
      return <CoachPanel onUpdateContent={refreshPlan} currentUser={currentUser} onImpersonate={handleImpersonate} />;
    }
    
    if (view.type === 'lesson') return (
      <LessonViewer resource={view.resource} uid={currentUser.id} onClose={() => setView({ type: 'dashboard' })} onMasteryAchieved={refreshPlan} />
    );

    return <Dashboard user={currentUser} resources={userPlan} onNavigate={handleNavigate} onOpenResource={(res) => setView({ type: 'lesson', resource: res })} />;
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#FBFBFF]">
      {currentUser && (
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
      )}

      <main className={`flex-1 overflow-y-auto ${currentUser ? 'relative lg:ml-72 transition-all' : ''}`}>
        {originalUser && (
          <div className="sticky top-0 z-[60] bg-amber-500 text-white px-6 py-3 shadow-lg flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-3">
              <UserIcon className="w-4 h-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Viewing as <span className="underline">{currentUser?.name}</span>
              </p>
            </div>
            <button 
              onClick={handleExitImpersonation}
              className="bg-tp-navy text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-tp-navy transition-all flex items-center gap-2"
            >
              <ExitIcon className="w-3.5 h-3.5" /> Return to Hub
            </button>
          </div>
        )}

        <div className={`${currentUser ? 'p-4 md:p-12' : ''}`}>
          {currentUser && (
            <div className="flex items-center justify-between lg:hidden mb-12">
              <button onClick={() => setIsSidebarOpen(true)} className="p-5 bg-white shadow-2xl rounded-3xl text-tp-purple"><MenuIcon className="w-6 h-6" /></button>
            </div>
          )}
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;
