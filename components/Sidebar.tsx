
import React from 'react';
import { quizzes } from '../data/trainingData';
import { DashboardIcon, WorksheetIcon, AdminIcon, UserIcon } from './Icons';
import type { View, Module, UserProfile } from '../types';

interface SidebarProps {
  modules: { [id: string]: Module };
  currentView: View;
  onNavigate: (view: View) => void;
  currentUser: UserProfile | null;
  users: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
}

const NavItem: React.FC<{
  view: View,
  currentView: View,
  onNavigate: (view: View) => void,
  children: React.ReactNode
}> = ({ view, currentView, onNavigate, children }) => {
  
  const isActive = JSON.stringify(view) === JSON.stringify(currentView);
  
  return (
    <li className="mb-1.5 px-3">
      <button
        onClick={() => onNavigate(view)}
        className={`flex items-center w-full py-2.5 px-4 rounded-xl transition-all duration-200 text-left ${
          isActive
            ? 'bg-tp-red text-white font-semibold shadow-lg shadow-tp-red/20 translate-x-1'
            : 'bg-transparent text-gray-400 hover:bg-white/10 hover:text-white'
        }`}
      >
        {children}
      </button>
    </li>
  );
};

const TPLogo = ({ className = "w-10 h-10", color = "currentColor" }: { className?: string, color?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M42.2 24.3c-2.8 0-5.1 0.3-6.9 0.8v10.9h6.9v10.7h-6.9v23.2c0 3.7 0.8 5.7 3.3 5.7 1.3 0 2.4-0.3 3.5-0.9v10.3c-1.9 0.7-4.3 1.1-7.1 1.1-3.6 0-6.5-1-8.5-3.1-2-2.1-3-5.2-3-9.4V46.7H15V36h8.4V25.1c0-10.4 6.2-16.1 18.8-16.1 3.5 0 6.6 0.4 9.1 1.1v10c-2.3-0.5-5.3-0.8-9.1-0.8zM85 36c0-4.9-1.6-9.1-4.7-12.7C77.2 19.7 72.8 18 67 18c-6.2 0-11 2.3-14.3 6.9V19.1h-11V86h11V57.6c3.2 4.4 7.9 6.6 13.9 6.6 5.8 0 10.4-1.9 13.8-5.6C83.4 54.8 85 49.5 85 43V36zm-11 6.3c0 4.1-1.1 7.4-3.4 9.8-2.3 2.5-5.4 3.7-9.4 3.7-4 0-7.3-1.4-9.8-4.2V32.4c2.5-3 5.9-4.5 10.1-4.5 4.1 0 7.2 1.3 9.4 3.8 2.2 2.5 3.3 6 3.3 10.6v0z" />
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ modules, currentView, onNavigate, currentUser, users, onSwitchUser }) => {
  return (
    <div className="w-72 bg-tp-purple text-white flex flex-col h-full shadow-2xl z-20">
      <div className="flex flex-col items-center justify-center pt-10 pb-6 border-b border-white/10 cursor-pointer group" onClick={() => onNavigate({ type: 'dashboard' })}>
        <div className="relative mb-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <TPLogo className="w-12 h-12" color="#2E0854" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-tp-red rounded-full border-4 border-tp-purple flex items-center justify-center shadow-lg">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>
        <h1 className="text-sm font-bold tracking-[0.1em] text-white/90">TELEPERFORMANCE</h1>
        <p className="text-[10px] text-tp-red font-bold uppercase tracking-[0.2em] mt-1">EGYPT • SKILLENCE</p>
      </div>
      
      {/* User Switcher Section */}
      <div className="px-6 py-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
            <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-2 block">Active User</label>
            <div className="relative">
                <select 
                    className="w-full bg-tp-purple/50 text-white text-sm border border-white/10 rounded-lg px-3 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-tp-red transition-all cursor-pointer"
                    value={currentUser?.id || ''}
                    onChange={(e) => {
                        const selected = users.find(u => u.id === e.target.value);
                        if (selected) {
                            onSwitchUser(selected);
                            onNavigate({ type: 'dashboard' });
                        }
                    }}
                >
                    {users.map(u => (
                        <option key={u.id} value={u.id} className="bg-tp-purple">
                            {u.name}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-tp-red">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        <ul>
          <NavItem view={{ type: 'dashboard' }} currentView={currentView} onNavigate={onNavigate}>
            <DashboardIcon />
            <span className="ml-3">Training Dashboard</span>
          </NavItem>
          
          {currentUser?.role === 'admin' && (
             <NavItem view={{ type: 'admin' }} currentView={currentView} onNavigate={onNavigate}>
                <AdminIcon />
                <span className="ml-3">Admin Panel</span>
             </NavItem>
          )}
        </ul>

        <div className="mt-8 mb-4 px-6">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Learning Tracks</h2>
        </div>
        
        <ul>
            {Object.values(modules).length > 0 ? (
                Object.values(modules).map((module: Module) => (
                    <NavItem key={module.id} view={{ type: 'module', moduleId: module.id }} currentView={currentView} onNavigate={onNavigate}>
                        <div className="text-tp-red opacity-80">{module.icon}</div>
                        <span className="ml-3">{module.title}</span>
                    </NavItem>
                ))
            ) : (
                <li className="px-6 text-xs text-gray-500 italic">No modules assigned.</li>
            )}
        </ul>
        
        <div className="mt-8 mb-4 px-6">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Performance Checks</h2>
        </div>
        
        <ul>
            {quizzes.map(quiz => (
                 <NavItem key={quiz.id} view={{ type: 'quiz', quizId: quiz.id }} currentView={currentView} onNavigate={onNavigate}>
                    <WorksheetIcon className="w-5 h-5 opacity-60" />
                    <span className="ml-3">{quiz.title}</span>
                 </NavItem>
            ))}
        </ul>
      </nav>

      <div className="p-6 mt-auto">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-center">
              <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Internal Training Program</p>
                  <p className="text-xs text-white/60">Teleperformance Egypt &copy; 2025</p>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Sidebar;
