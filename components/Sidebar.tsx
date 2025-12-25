
import React from 'react';
import { quizzes } from '../data/trainingData';
import { getRosters } from '../services/adminService';
import { DashboardIcon, WorksheetIcon, AdminIcon, UserIcon, XIcon } from './Icons';
import type { View, Module, UserProfile } from '../types';

interface SidebarProps {
  modules: { [id: string]: Module };
  currentView: View;
  onNavigate: (view: View) => void;
  currentUser: UserProfile | null;
  users: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
  isOpen: boolean;
  onClose: () => void;
}

const NavItem: React.FC<{ view: View, currentView: View, onNavigate: (view: View) => void, children: React.ReactNode }> = ({ view, currentView, onNavigate, children }) => {
  const isActive = JSON.stringify(view) === JSON.stringify(currentView);
  return (
    <li className="mb-1.5 px-3">
      <button onClick={() => onNavigate(view)} className={`flex items-center w-full py-3 md:py-2.5 px-4 rounded-xl transition-all duration-200 text-left min-h-[48px] ${isActive ? 'bg-tp-red text-white font-semibold shadow-lg shadow-tp-red/20 translate-x-1' : 'bg-transparent text-white/80 hover:bg-white/10 hover:text-white'}`}>
        {children}
      </button>
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ modules, currentView, onNavigate, currentUser, users, onSwitchUser, isOpen, onClose }) => {
  const rosters = getRosters();
  
  return (
    <div className={`fixed inset-y-0 left-0 w-72 bg-tp-purple text-white flex flex-col h-full shadow-2xl z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-20 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="lg:hidden absolute top-4 right-4"><button onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-full"><XIcon /></button></div>

      <div className="flex flex-col items-center justify-center pt-10 pb-6 border-b border-white/10" onClick={() => onNavigate({ type: 'dashboard' })}>
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-4"><span className="text-tp-purple font-black text-2xl">TP</span></div>
        <h1 className="text-sm font-bold tracking-[0.1em] text-white/90 uppercase">Teleperformance</h1>
        <p className="text-xs text-tp-red font-bold uppercase tracking-[0.2em] mt-1">Egypt • Skillence</p>
      </div>
      
      <div className="px-6 py-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <label className="text-xs text-gray-100 uppercase font-bold tracking-widest mb-2 block">Impersonate Profile</label>
            <div className="relative">
              <select 
                  className="w-full bg-tp-purple/50 text-white text-sm border border-white/10 rounded-lg px-3 py-3 appearance-none outline-none focus:ring-2 focus:ring-tp-red min-h-[44px]"
                  value={currentUser?.id || ''}
                  onChange={(e) => {
                      const selected = users.find(u => u.id === e.target.value);
                      if (selected) { onSwitchUser(selected); onNavigate({ type: 'dashboard' }); }
                  }}
              >
                  {users.map(u => (
                      <option key={u.id} value={u.id} className="bg-tp-purple">
                          {u.name} ({rosters.find(r => r.id === u.rosterId)?.name.split(' ')[0] || 'N/A'})
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
            <span className="ml-3">Dashboard</span>
          </NavItem>
          
          {(currentUser?.role === 'admin' || currentUser?.role === 'coach') && (
             <NavItem view={{ type: 'admin' }} currentView={currentView} onNavigate={onNavigate}>
                <AdminIcon />
                <span className="ml-3">Admin Panel</span>
             </NavItem>
          )}
        </ul>

        <div className="mt-8 mb-4 px-6"><h2 className="text-xs font-bold text-white/60 uppercase tracking-[0.2em]">Learning Tracks</h2></div>
        <ul>
            {Object.values(modules).map((module: Module) => (
                <NavItem key={module.id} view={{ type: 'module', moduleId: module.id }} currentView={currentView} onNavigate={onNavigate}>
                    <div className="text-tp-red opacity-80">{module.icon}</div>
                    <span className="ml-3">{module.title}</span>
                </NavItem>
            ))}
        </ul>
        
        <div className="mt-8 mb-4 px-6"><h2 className="text-xs font-bold text-white/60 uppercase tracking-[0.2em]">Performance</h2></div>
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
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <p className="text-xs text-white/80 font-bold uppercase">Internal Training Program</p>
              <p className="text-sm text-white/50">Teleperformance Egypt &copy; 2025</p>
          </div>
      </div>
    </div>
  );
};

export default Sidebar;
