
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Worksheet from './components/Worksheet';
import AdminPanel from './components/AdminPanel';
import type { View, UserProgress, UserProfile, Module, ActivityLog } from './types';
import { allTrainingModules } from './data/trainingData';
import { getUserProgress, saveUserProgress, initialProgress } from './services/progressService';
import { submitToSheet } from './services/googleSheetService';
import { getUsers, getCustomLessons } from './services/adminService';
import { UserIcon } from './components/Icons';

const App: React.FC = () => {
  const [view, setView] = useState<View>({ type: 'dashboard' });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<UserProgress>(initialProgress);
  
  const [activeModules, setActiveModules] = useState<{ [id: string]: Module }>(allTrainingModules);

  useEffect(() => {
    const loadedUsers = getUsers();
    setUsers(loadedUsers);
    if (loadedUsers.length > 0) {
        setCurrentUser(loadedUsers[0]);
    }
  }, []);

  useEffect(() => {
      if (currentUser) {
          const userProg = getUserProgress(currentUser.id);
          setProgress(userProg);
      }
  }, [currentUser]);

  const loadContent = () => {
    const customLessons = getCustomLessons();
    const updatedModules = { ...allTrainingModules };

    Object.keys(updatedModules).forEach(key => {
        updatedModules[key] = {
            ...updatedModules[key],
            lessons: [...updatedModules[key].lessons]
        };
    });

    Object.keys(customLessons).forEach(moduleId => {
        if (updatedModules[moduleId]) {
            const relevantLessons = customLessons[moduleId].filter(lesson => 
                !lesson.assignedTo || (currentUser && lesson.assignedTo === currentUser.id)
            );
            
            updatedModules[moduleId].lessons = [
                ...updatedModules[moduleId].lessons,
                ...relevantLessons
            ];
        }
    });
    
    if (currentUser && currentUser.role !== 'admin') {
        const filteredModules: { [id: string]: Module } = {};
        currentUser.assignedModules.forEach(mid => {
            if (updatedModules[mid]) {
                filteredModules[mid] = updatedModules[mid];
            }
        });
        setActiveModules(filteredModules);
    } else {
        setActiveModules(updatedModules);
    }
  };

  useEffect(() => {
    loadContent();
  }, [currentUser]);

  const handleNavigate = (newView: View) => {
    setView(newView);
  };

  const handleToggleLesson = (lessonTitle: string) => {
    if (!currentUser) return;

    const newProgress = (prev: UserProgress) => {
      const isCompleted = prev.completedLessons.includes(lessonTitle);
      const newCompletedLessons = isCompleted 
          ? prev.completedLessons.filter(t => t !== lessonTitle)
          : [...prev.completedLessons, lessonTitle];

      let newHistory = prev.activityHistory || [];
      if (!isCompleted) {
          const newActivity: ActivityLog = {
              date: new Date().toISOString(),
              type: 'lesson',
              itemId: lessonTitle
          };
          newHistory = [...newHistory, newActivity];
      }

      if (!isCompleted) { 
          Object.values(activeModules).forEach((module: Module) => {
              const allLessonTitles = module.lessons.map(l => l.title);
              const wasComplete = allLessonTitles.every(title => prev.completedLessons.includes(title));
              const isNowComplete = allLessonTitles.every(title => newCompletedLessons.includes(title));
              
              if (!wasComplete && isNowComplete) {
                  submitToSheet({
                      type: 'MODULE_COMPLETION',
                      title: module.title,
                      score: '100%',
                      userId: currentUser.id
                  });
              }
          });
      }

      const updated = {
        ...prev,
        completedLessons: newCompletedLessons,
        activityHistory: newHistory
      };
      
      saveUserProgress(currentUser.id, updated);
      return updated;
    };

    setProgress(newProgress);
  };

  const handleQuizComplete = (quizId: string, score: number) => {
    if (!currentUser) return;

    const newProgress = (prev: UserProgress) => {
        const newActivity: ActivityLog = {
            date: new Date().toISOString(),
            type: 'quiz',
            itemId: quizId,
            score: score
        };

        const updated: UserProgress = {
            ...prev,
            quizScores: {
                ...prev.quizScores,
                [quizId]: score
            },
            activityHistory: [
                ...(prev.activityHistory || []),
                newActivity
            ]
        };
        saveUserProgress(currentUser.id, updated);
        return updated;
    };

    setProgress(newProgress);

    submitToSheet({
        type: 'QUIZ_COMPLETION',
        title: quizId.replace('_', ' ').toUpperCase(),
        score: `${score}%`,
        userId: currentUser.id
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        modules={activeModules} 
        currentView={view} 
        onNavigate={handleNavigate}
        currentUser={currentUser}
        users={users}
        onSwitchUser={setCurrentUser}
      />
      <main className="flex-1 overflow-y-auto p-10 relative custom-scrollbar">
        {/* User Badge - TP Branded */}
        <div className="absolute top-8 right-10 flex items-center bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl border border-white/50 z-10 transition-all hover:shadow-2xl hover:scale-105">
             <div className="w-10 h-10 bg-tp-purple/5 p-2 rounded-xl mr-4 text-tp-purple flex items-center justify-center">
                <UserIcon />
             </div>
             <div>
                 <p className="text-sm font-black text-tp-purple">{currentUser?.name || 'Coach'}</p>
                 <div className="flex items-center space-x-2">
                     <span className="text-[10px] text-white bg-tp-red px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{currentUser?.role}</span>
                     <span className="text-[10px] text-gray-500 font-bold">{currentUser?.languageLevel}</span>
                 </div>
             </div>
        </div>

        <div className="mt-4">
            {view.type === 'admin' && currentUser?.role === 'admin' ? (
                <AdminPanel 
                    users={users} 
                    setUsers={setUsers} 
                    modules={allTrainingModules}
                    onUpdateContent={loadContent}
                />
            ) : (
                <Worksheet 
                    modules={activeModules}
                    view={view} 
                    onNavigate={handleNavigate}
                    progress={progress}
                    onToggleLesson={handleToggleLesson}
                    onQuizComplete={handleQuizComplete}
                />
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
