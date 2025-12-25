
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Worksheet from './components/Worksheet';
import AdminPanel from './components/AdminPanel';
import LessonViewer from './components/LessonViewer';
import type { View, UserProgress, UserProfile, Module, ActivityLog, Lesson } from './types';
import { allTrainingModules } from './data/trainingData';
import { getUserProgress, saveUserProgress, initialProgress } from './services/progressService';
import { submitToSheet } from './services/googleSheetService';
import { getUsers, getCustomLessons } from './services/adminService';
import { UserIcon, MenuIcon, ChartBarIcon, DashboardIcon } from './components/Icons';

const App: React.FC = () => {
  const [view, setView] = useState<View>({ type: 'dashboard' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<UserProgress>(initialProgress);
  const [activeModules, setActiveModules] = useState<{ [id: string]: Module }>(allTrainingModules);

  // Coach Persona Toggle: 'team' or 'personal'
  const [coachMode, setCoachMode] = useState<'team' | 'personal'>('team');

  useEffect(() => {
    const loadedUsers = getUsers();
    setUsers(loadedUsers);
    if (loadedUsers.length > 0) setCurrentUser(loadedUsers[0]);
  }, []);

  useEffect(() => {
      if (currentUser) {
          setProgress(getUserProgress(currentUser.id));
          // Reset coach mode to 'team' when switching to a coach user
          if (currentUser.role === 'coach') setCoachMode('team');
      }
  }, [currentUser]);

  const loadContent = () => {
    const customLessons = getCustomLessons();
    const updatedModules = { ...allTrainingModules };

    Object.keys(updatedModules).forEach(key => {
        updatedModules[key] = { ...updatedModules[key], lessons: [...updatedModules[key].lessons] };
    });

    Object.keys(customLessons).forEach(moduleId => {
        if (updatedModules[moduleId]) {
            const relevantLessons = customLessons[moduleId].filter(lesson => 
                !lesson.assignedTo || (currentUser && lesson.assignedTo === currentUser.id)
            );
            updatedModules[moduleId].lessons = [...updatedModules[moduleId].lessons, ...relevantLessons];
        }
    });
    
    if (currentUser && currentUser.role === 'agent') {
        const filteredModules: { [id: string]: Module } = {};
        currentUser.assignedModules.forEach(mid => { if (updatedModules[mid]) filteredModules[mid] = updatedModules[mid]; });
        setActiveModules(filteredModules);
    } else {
        setActiveModules(updatedModules);
    }
  };

  useEffect(() => { loadContent(); }, [currentUser]);

  const handleNavigate = (newView: View) => {
    setView(newView);
    setIsSidebarOpen(false);
  };

  const handleToggleLesson = (lessonTitle: string) => {
    if (!currentUser) return;
    const newProgress = (prev: UserProgress) => {
      const isCompleted = prev.completedLessons.includes(lessonTitle);
      const newCompletedLessons = isCompleted ? prev.completedLessons.filter(t => t !== lessonTitle) : [...prev.completedLessons, lessonTitle];
      const updated = { ...prev, completedLessons: newCompletedLessons };
      saveUserProgress(currentUser.id, updated);
      return updated;
    };
    setProgress(newProgress);
  };

  const handleQuizComplete = (quizId: string, score: number) => {
    if (!currentUser) return;
    const newProgress = (prev: UserProgress) => {
        const updated: UserProgress = { ...prev, quizScores: { ...prev.quizScores, [quizId]: score } };
        saveUserProgress(currentUser.id, updated);
        return updated;
    };
    setProgress(newProgress);
    submitToSheet({ type: 'QUIZ_COMPLETION', title: quizId.toUpperCase(), score: `${score}%`, userId: currentUser.id });
  };

  const handleOpenLesson = (lesson: Lesson) => {
      const currentModuleId = view.type === 'module' ? view.moduleId : undefined;
      setView({ type: 'lesson', lesson, fromModuleId: currentModuleId });
  };

  // Decide what view to render based on user role and coach mode
  const renderMainContent = () => {
      if (!currentUser) return null;

      if (view.type === 'admin') {
          return (
              <AdminPanel 
                  users={users} setUsers={setUsers} 
                  modules={allTrainingModules} 
                  onUpdateContent={loadContent} 
                  currentUser={currentUser} 
              />
          );
      }

      if (currentUser.role === 'coach' && coachMode === 'team') {
          return (
            <AdminPanel 
                users={users} setUsers={setUsers} 
                modules={allTrainingModules} 
                onUpdateContent={loadContent} 
                currentUser={currentUser} 
            />
          );
      }

      return (
          <Worksheet 
              modules={activeModules} view={view} 
              onNavigate={handleNavigate} progress={progress}
              onToggleLesson={handleToggleLesson} onQuizComplete={handleQuizComplete}
              onOpenLesson={handleOpenLesson}
          />
      );
  };

  return (
    <div className="flex min-h-screen overflow-hidden relative">
      {isSidebarOpen && <div className="fixed inset-0 bg-tp-navy/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <Sidebar 
        modules={activeModules} currentView={view} 
        onNavigate={handleNavigate} currentUser={currentUser}
        users={users} onSwitchUser={setCurrentUser}
        isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-10 relative custom-scrollbar lg:ml-72">
        {/* Mobile Header */}
        <div className="flex items-center justify-between lg:hidden mb-6 bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-white/50">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-tp-purple hover:bg-tp-purple/5 rounded-xl transition-colors"><MenuIcon /></button>
            <div className="text-center"><p className="text-xs font-black text-tp-purple uppercase tracking-[0.2em]">Skillence</p></div>
            <div className="w-10" />
        </div>

        {/* View Switcher for Coach */}
        {currentUser?.role === 'coach' && (
            <div className="flex justify-center mb-8">
                <div className="bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm flex gap-2">
                    <button 
                        onClick={() => { setCoachMode('team'); handleNavigate({type: 'dashboard'}); }}
                        className={`flex items-center px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${coachMode === 'team' ? 'bg-tp-purple text-white shadow-lg' : 'text-gray-600 hover:text-tp-purple'}`}
                    >
                        <ChartBarIcon className="w-4 h-4 mr-2" /> Team Dashboard
                    </button>
                    <button 
                        onClick={() => { setCoachMode('personal'); handleNavigate({type: 'dashboard'}); }}
                        className={`flex items-center px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${coachMode === 'personal' ? 'bg-tp-red text-white shadow-lg' : 'text-gray-600 hover:text-tp-red'}`}
                    >
                        <DashboardIcon className="w-4 h-4 mr-2" /> My Learning
                    </button>
                </div>
            </div>
        )}

        {view.type === 'lesson' && <LessonViewer lesson={view.lesson} onComplete={() => { handleToggleLesson(view.lesson.title); handleNavigate(view.fromModuleId ? { type: 'module', moduleId: view.fromModuleId } : { type: 'dashboard' }); }} onClose={() => handleNavigate(view.fromModuleId ? { type: 'module', moduleId: view.fromModuleId } : { type: 'dashboard' })} />}

        <div className="hidden lg:flex absolute top-8 right-10 items-center bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl border border-white/50 z-10 transition-all hover:shadow-2xl">
             <div className="w-10 h-10 bg-tp-purple/5 p-2 rounded-xl mr-4 text-tp-purple flex items-center justify-center"><UserIcon /></div>
             <div>
                 <p className="text-sm font-black text-tp-purple">{currentUser?.name}</p>
                 <div className="flex items-center space-x-2"><span className="text-xs text-white bg-tp-red px-1.5 py-0.5 rounded font-bold uppercase">{currentUser?.role}</span></div>
             </div>
        </div>

        <div className="mt-4 max-w-7xl mx-auto">{renderMainContent()}</div>
      </main>
    </div>
  );
};

export default App;
