
import React, { useState, useEffect } from 'react';
// Added UserPerformanceData to imports
import type { UserProfile, Module, Lesson, UserProgress, UserCredentials, UserPerformanceData } from '../types';
import { ResourceType } from '../types';
// Fix: Added getRosters to the imported functions from adminService
import { saveUsers, addCustomLesson, getCustomLessons, removeCustomLesson, getRosters } from '../services/adminService';
import { getAllUsersProgress, initialProgress } from '../services/progressService';
import { RESULTS_SHEET_URL } from '../services/googleSheetService';
import { generatePersonalizedAssignment } from '../services/geminiService';
import UserUploader from './admin/UserUploader';
import { TrashIcon, PlusIcon, UserIcon, AdminIcon, TableIcon, ClipboardListIcon, BrainIcon, DownloadIcon, TrendingUpIcon, ChartBarIcon, LightningIcon, BadgeIcon, XIcon, CheckCircleIcon, TargetIcon } from './Icons';

interface AdminPanelProps {
  users: UserProfile[];
  setUsers: (users: UserProfile[]) => void;
  modules: { [id: string]: Module };
  onUpdateContent: () => void;
  currentUser: UserProfile;
}

const CredentialModal: React.FC<{ 
  credentials: UserCredentials; 
  userName: string; 
  onClose: () => void 
}> = ({ credentials, userName, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-tp-navy/60 backdrop-blur-md animate-fadeIn">
    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-tp-purple via-tp-red to-tp-purple"></div>
      
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
          <CheckCircleIcon filled />
        </div>
        <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all">
          <XIcon />
        </button>
      </div>

      <h3 className="text-2xl font-black text-tp-purple mb-2 uppercase tracking-tight">Onboarding Complete</h3>
      <p className="text-gray-700 text-base font-medium mb-8">
        Account created for <span className="text-tp-purple font-black">{userName}</span>. Share these access credentials immediately:
      </p>

      <div className="space-y-4 mb-8">
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <p className="text-xs font-black text-gray-700 uppercase tracking-widest mb-1">Temporary ID</p>
          <p className="text-lg font-black text-tp-purple font-mono">{credentials.tempId}</p>
        </div>
        <div className="bg-tp-purple/5 p-4 rounded-2xl border border-tp-purple/10">
          <p className="text-xs font-black text-tp-purple/80 uppercase tracking-widest mb-1">Access Code</p>
          <p className="text-2xl font-black text-tp-red font-mono tracking-widest">{credentials.accessCode}</p>
        </div>
      </div>

      <button 
        onClick={onClose}
        className="w-full bg-tp-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:bg-tp-purple transition-all"
      >
        Done & Sync Registry
      </button>
    </div>
  </div>
);

const RadarChart: React.FC<{ data: Record<string, number> }> = ({ data }) => {
    const size = 200;
    const center = size / 2;
    const radius = 70;
    const metrics = Object.keys(data);
    const angleStep = (Math.PI * 2) / metrics.length;

    const getCoordinates = (value: number, index: number) => {
        const angle = index * angleStep - Math.PI / 2;
        const r = (value / 100) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    const points = metrics.map((m, i) => {
        const { x, y } = getCoordinates(data[m], i);
        return `${x},${y}`;
    }).join(' ');

    const backgroundPoints = metrics.map((m, i) => {
        const { x, y } = getCoordinates(100, i);
        return `${x},${y}`;
    }).join(' ');

    const midPoints = metrics.map((m, i) => {
        const { x, y } = getCoordinates(50, i);
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
            <polygon points={backgroundPoints} fill="none" stroke="#e2e8f0" strokeWidth="1" />
            <polygon points={midPoints} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />
            {metrics.map((m, i) => {
                const { x, y } = getCoordinates(100, i);
                return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
            })}
            <polygon points={points} fill="rgba(46, 8, 84, 0.2)" stroke="#2E0854" strokeWidth="2" />
            {metrics.map((m, i) => {
                const { x, y } = getCoordinates(120, i);
                return (
                    <text 
                        key={i} 
                        x={x} 
                        y={y} 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        className="text-xs fill-gray-700 font-black uppercase tracking-tighter"
                    >
                        {m}
                    </text>
                );
            })}
        </svg>
    );
};

const AdminPanel: React.FC<AdminPanelProps> = ({ users, setUsers, modules, onUpdateContent, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'content' | 'analysis' | 'dashboard'>('users');
  const [globalRosterFilter, setGlobalRosterFilter] = useState('all');
  const [globalCoachFilter, setGlobalCoachFilter] = useState('all');
  const [selectedModule, setSelectedModule] = useState(Object.keys(modules)[0]);
  const [newLesson, setNewLesson] = useState<Partial<Lesson>>({ title: '', type: ResourceType.Read, level: 'B1' });
  const [customLessonsList, setCustomLessonsList] = useState<{ [moduleId: string]: Lesson[] }>(getCustomLessons());
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<string | null>(null);
  const [showRosterModal, setShowRosterModal] = useState<string | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState<{ creds: UserCredentials, name: string } | null>(null);

  const rosters = getRosters();
  const allCoaches = users.filter(u => u.role === 'coach');

  const getVisibleUsers = () => {
      if (currentUser.role === 'admin') {
          return users.filter(u => {
              const rosterMatch = globalRosterFilter === 'all' || u.rosterId === globalRosterFilter;
              const coachMatch = globalCoachFilter === 'all' || u.assignedCoachId === globalCoachFilter;
              return rosterMatch && coachMatch;
          });
      }
      if (currentUser.role === 'coach') {
          return users.filter(u => (u.rosterId === currentUser.rosterId || u.assignedCoachId === currentUser.id) && u.id !== currentUser.id);
      }
      return [currentUser];
  };

  const visibleUsers = getVisibleUsers();
  const agentUsers = visibleUsers.filter(u => u.role === 'agent');

  useEffect(() => {
    if (!selectedProfileId && agentUsers.length > 0) setSelectedProfileId(agentUsers[0].id);
  }, [agentUsers, selectedProfileId]);

  const refreshContent = () => {
      onUpdateContent();
      setCustomLessonsList(getCustomLessons());
  };

  const allUserProgress = getAllUsersProgress();

  const handleUserCreated = (newUser: UserProfile) => {
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    if (newUser.generatedCredentials) setShowOnboardingModal({ creds: newUser.generatedCredentials, name: newUser.name });
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Delete this agent profile? All progress will be lost.')) {
        const updatedUsers = users.filter(u => u.id !== id);
        setUsers(updatedUsers);
        saveUsers(updatedUsers);
    }
  };

  // Fix: Implemented handleAssignCoach to update the assigned coach of a user
  const handleAssignCoach = (userId: string, coachId: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, assignedCoachId: coachId === 'none' ? undefined : coachId };
      }
      return u;
    });
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
  };

  // Fix: Implemented handleAssignRoster to update the roster of a user and close the modal
  const handleAssignRoster = (userId: string, rosterId: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, rosterId };
      }
      return u;
    });
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    setShowRosterModal(null);
  };

  const handleAiAutoAssign = async (user: UserProfile) => {
      setIsAiLoading(user.id);
      try {
          const result = await generatePersonalizedAssignment(user, Object.values(modules));
          const updatedUsers = users.map(u => {
              if (u.id === user.id) return { ...u, assignedModules: result.recommendedModuleIds };
              return u;
          });
          setUsers(updatedUsers);
          saveUsers(updatedUsers);
          alert(`AI Strategy Recommendation:\n\n${result.reasoning}`);
      } catch (err) {
          alert("AI analysis failed. Please try again.");
      } finally {
          setIsAiLoading(null);
      }
  };

  const handleDeleteLesson = (moduleId: string, lessonTitle: string) => {
    if (confirm('Remove this custom material?')) {
        removeCustomLesson(moduleId, lessonTitle);
        refreshContent();
    }
  };

  const toggleModuleForUser = (userId: string, moduleId: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        const isAssigned = u.assignedModules.includes(moduleId);
        const newModules = isAssigned ? u.assignedModules.filter(id => id !== moduleId) : [...u.assignedModules, moduleId];
        return { ...u, assignedModules: newModules };
      }
      return u;
    });
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
  };

  const calculateTeamStats = () => {
      const statsGroup = visibleUsers.filter(u => u.performanceData && u.id !== currentUser.id);
      if (statsGroup.length === 0) return null;

      const avgMetric = (metric: keyof UserPerformanceData) => 
        Math.round(statsGroup.reduce((acc, c) => acc + ((c.performanceData?.[metric] as number) || 0), 0) / statsGroup.length);

      const allScores = statsGroup.map(c => {
          const s = Object.values(c.performanceData || {}).filter(v => typeof v === 'number') as number[];
          return { name: c.name, score: Math.round(s.reduce((a, b) => a + b, 0) / s.length) };
      });

      const metrics: (keyof UserPerformanceData)[] = ['writing', 'fluency', 'grammar', 'listening', 'pronunciation', 'understanding', 'analytical'];

      return {
          avgScore: Math.round(allScores.reduce((a, b) => a + b.score, 0) / allScores.length),
          count: statsGroup.length,
          radarData: {
              'Writing': avgMetric('writing'),
              'Grammar': avgMetric('grammar'),
              'Listening': avgMetric('listening'),
              'Oral': Math.round((avgMetric('fluency') + avgMetric('pronunciation')) / 2),
              'Analytical': avgMetric('analytical')
          },
          proficiency: {
              'Language Mechanics': Math.round((avgMetric('grammar') + avgMetric('pronunciation')) / 2),
              'Comprehension': Math.round((avgMetric('listening') + avgMetric('understanding')) / 2),
              'Written Comm': avgMetric('writing'),
              'Analytical': avgMetric('analytical')
          } as Record<string, number>
      };
  };

  const getModuleProgress = (userId: string, moduleId: string) => {
      const userProgress = allUserProgress[userId] || initialProgress;
      const mod = modules[moduleId];
      if (!mod) return 0;
      const total = mod.lessons.length;
      if (total === 0) return 0;
      const completed = mod.lessons.filter(l => userProgress.completedLessons.includes(l.title)).length;
      return Math.round((completed / total) * 100);
  };

  const teamStats = calculateTeamStats();
  const selectedAgent = agentUsers.find(u => u.id === selectedProfileId);

  return (
    <div className="bg-white rounded-3xl shadow-xl p-4 md:p-8 max-w-6xl mx-auto border border-gray-100">
      {showOnboardingModal && (
        <CredentialModal 
          userName={showOnboardingModal.name}
          credentials={showOnboardingModal.creds}
          onClose={() => setShowOnboardingModal(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-tp-purple text-white rounded-2xl flex items-center justify-center shadow-lg"><AdminIcon /></div>
            <div className="ml-4">
                <h1 className="text-xl md:text-2xl font-black text-tp-purple tracking-tight">Team Command</h1>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">{currentUser.role.toUpperCase()} View • {currentUser.name}</p>
            </div>
          </div>
          
          {currentUser.role === 'admin' && (
              <div className="flex gap-2 w-full sm:w-auto">
                  <select value={globalRosterFilter} onChange={(e) => setGlobalRosterFilter(e.target.value)} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-tp-red">
                      <option value="all">All Rosters</option>
                      {rosters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <select value={globalCoachFilter} onChange={(e) => setGlobalCoachFilter(e.target.value)} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-tp-red">
                      <option value="all">All Coaches</option>
                      {allCoaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
              </div>
          )}
      </div>

      <div className="flex border-b border-gray-100 mb-8 overflow-x-auto gap-6 md:gap-8 pb-1 no-scrollbar">
        <button onClick={() => setActiveTab('users')} className={`pb-3 font-bold text-xs md:text-sm uppercase tracking-widest flex items-center transition-all ${activeTab === 'users' ? 'text-tp-purple border-b-4 border-tp-red' : 'text-gray-500'}`}>
            <UserIcon /> <span className="ml-3">Agents</span>
        </button>
        <button onClick={() => setActiveTab('dashboard')} className={`pb-3 font-bold text-xs md:text-sm uppercase tracking-widest flex items-center transition-all ${activeTab === 'dashboard' ? 'text-tp-purple border-b-4 border-tp-red' : 'text-gray-500'}`}>
            <ChartBarIcon /> <span className="ml-3">Team Analytics</span>
        </button>
        {currentUser.role === 'admin' && (
            <button onClick={() => setActiveTab('analysis')} className={`pb-3 font-bold text-xs md:text-sm uppercase tracking-widest flex items-center transition-all ${activeTab === 'analysis' ? 'text-tp-purple border-b-4 border-tp-red' : 'text-gray-500'}`}>
                    <BrainIcon /> <span className="ml-3">Strategy Hub</span>
            </button>
        )}
        <button onClick={() => setActiveTab('content')} className={`pb-3 font-bold text-xs md:text-sm uppercase tracking-widest flex items-center transition-all ${activeTab === 'content' ? 'text-tp-purple border-b-4 border-tp-red' : 'text-gray-500'}`}>
            <ClipboardListIcon /> <span className="ml-3">Curriculum</span>
        </button>
      </div>

      {activeTab === 'dashboard' && teamStats && (
          <div className="animate-fadeIn space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-tp-purple/5 p-6 rounded-3xl border border-tp-purple/10">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-widest">Team Avg Score</p>
                      <p className="text-4xl font-black text-tp-purple">{teamStats.avgScore}%</p>
                  </div>
                  <div className="bg-tp-red/5 p-6 rounded-3xl border border-tp-red/10">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-widest">Active Headcount</p>
                      <p className="text-4xl font-black text-tp-red">{teamStats.count}</p>
                  </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
                    <h3 className="w-full font-black text-xs uppercase text-tp-purple mb-4">Competency Map</h3>
                    <RadarChart data={teamStats.radarData} />
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="font-black text-xs uppercase text-tp-purple mb-8">Performance Vectors</h3>
                    <div className="space-y-6">
                        {Object.entries(teamStats.proficiency).map(([skill, val]) => (
                            <div key={skill}>
                                <div className="flex justify-between text-xs font-black uppercase mb-2"><span>{skill}</span><span>{val}%</span></div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div className="h-full bg-tp-purple transition-all duration-1000" style={{ width: `${val}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-8 animate-fadeIn">
          <UserUploader currentUser={currentUser} onUserCreated={handleUserCreated} />
          
          <div className="flex justify-between items-center px-2">
            <h2 className="text-xl font-black text-tp-purple uppercase tracking-tight">Active Team Roster ({visibleUsers.length})</h2>
          </div>

          <div className="grid gap-4">
            {visibleUsers.map(user => (
                <div key={user.id} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-tp-purple/5 rounded-2xl flex items-center justify-center text-tp-purple flex-shrink-0"><UserIcon /></div>
                            <div className="ml-4">
                                <h3 className="font-black text-lg text-tp-purple leading-tight">{user.name}</h3>
                                <div className="text-xs text-gray-700 font-bold uppercase tracking-widest flex flex-wrap gap-2 mt-1">
                                    <span className="bg-tp-red text-white px-1.5 py-0.5 rounded text-xs">{user.role}</span>
                                    <span>{user.languageLevel}</span>
                                    <span className="text-tp-purple">R: {rosters.find(r => r.id === user.rosterId)?.name || user.rosterId}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {currentUser.role === 'admin' && (
                                <button onClick={() => setShowRosterModal(user.id)} className="flex-1 bg-tp-purple/5 text-tp-purple text-xs font-black uppercase px-4 py-2.5 rounded-xl border border-tp-purple/10">Move Roster</button>
                            )}
                            <button onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)} className="flex-1 text-xs font-black uppercase text-tp-purple border border-tp-purple/10 rounded-xl px-4 py-2.5">
                                {expandedUserId === user.id ? 'Hide Details' : 'Manage Tracks'}
                            </button>
                            <button onClick={() => handleDeleteUser(user.id)} className="text-gray-500 hover:text-tp-red p-2 transition-colors">
                                <TrashIcon />
                            </button>
                        </div>
                    </div>

                    {expandedUserId === user.id && (
                        <div className="mt-6 pt-6 border-t border-gray-50 animate-fadeIn space-y-6">
                            {currentUser.role === 'admin' && (
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-widest mb-2 block">Assigned Coach</label>
                                    <select 
                                        value={user.assignedCoachId || 'none'} 
                                        onChange={(e) => handleAssignCoach(user.id, e.target.value)}
                                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs w-full sm:w-64"
                                    >
                                        <option value="none">Unassigned</option>
                                        {allCoaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.values(modules).map((mod: Module) => {
                                    const isAssigned = user.assignedModules.includes(mod.id);
                                    return (
                                        <div key={mod.id} className={`p-4 rounded-xl border transition-all ${isAssigned ? 'border-tp-purple/20 bg-tp-purple/[0.02]' : 'border-gray-100 opacity-50'}`}>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center min-w-0">
                                                    <span className="text-tp-purple mr-2 opacity-70 scale-75">{mod.icon}</span>
                                                    <span className="font-bold text-tp-purple text-sm truncate">{mod.title}</span>
                                                </div>
                                                <button onClick={() => toggleModuleForUser(user.id, mod.id)} className={`w-8 h-4 flex items-center rounded-full p-1 transition-all ${isAssigned ? 'bg-tp-red' : 'bg-gray-300'}`}>
                                                    <div className={`bg-white w-2 h-2 rounded-full transform transition-all ${isAssigned ? 'translate-x-4' : ''}`}></div>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ))}
          </div>
        </div>
      )}

      {showRosterModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-tp-navy/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
                  <h3 className="text-xl font-black text-tp-purple mb-6 uppercase tracking-tight">Relocate Agent</h3>
                  <div className="space-y-2 mb-8">
                      {rosters.map(r => (
                          <button key={r.id} onClick={() => handleAssignRoster(showRosterModal, r.id)} className="w-full text-left p-4 rounded-xl border border-gray-100 hover:bg-tp-purple/5 hover:border-tp-purple/30 transition-all font-bold text-sm text-gray-800">{r.name}</button>
                      ))}
                  </div>
                  <button onClick={() => setShowRosterModal(null)} className="w-full text-gray-500 font-bold uppercase text-xs">Cancel</button>
              </div>
          </div>
      )}

      {activeTab === 'analysis' && currentUser.role === 'admin' && (
          <div className="space-y-6 md:space-y-8 animate-fadeIn">
              <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
                  <div className="w-full lg:w-1/3 space-y-3">
                      <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest mb-4">Select Agent Profile</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 overflow-y-auto lg:max-h-[60vh] pr-1 custom-scrollbar">
                          {agentUsers.filter(u => u.performanceData).map((data) => (
                              <button
                                  key={data.id}
                                  onClick={() => setSelectedProfileId(data.id)}
                                  className={`w-full text-left p-4 md:p-5 rounded-2xl border transition-all flex justify-between items-center ${selectedProfileId === data.id ? 'bg-tp-purple text-white border-tp-purple shadow-xl shadow-tp-purple/20' : 'bg-white border-gray-100 hover:border-tp-purple/30'}`}
                              >
                                  <div className="truncate mr-3">
                                      <p className="font-black text-base tracking-tight truncate">{data.name}</p>
                                      <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${selectedProfileId === data.id ? 'text-white/80' : 'text-gray-500'}`}>{data.performanceData?.testDate}</p>
                                  </div>
                                  <div className={`text-xs font-black px-2 py-1 rounded-lg uppercase flex-shrink-0 ${selectedProfileId === data.id ? 'bg-tp-red text-white' : 'bg-tp-purple/5 text-tp-purple'}`}>
                                      {data.languageLevel}
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="w-full lg:w-2/3 bg-gray-50/50 rounded-3xl p-4 md:p-8 border border-gray-100 min-h-[400px]">
                      {selectedAgent && selectedAgent.performanceData ? (
                          <div>
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                                  <div>
                                      <h2 className="text-2xl md:text-3xl font-black text-tp-purple tracking-tight">{selectedAgent.name}</h2>
                                      <p className="text-gray-700 text-xs md:text-sm font-black uppercase tracking-widest mt-1">ID: {selectedAgent.id} • Roster: {selectedAgent.rosterId}</p>
                                  </div>
                                  <button className="w-full sm:w-auto bg-tp-purple text-white px-5 py-3 rounded-xl shadow-xl shadow-tp-purple/20 hover:bg-tp-navy transition-all flex items-center justify-center text-xs font-black uppercase tracking-widest min-h-[44px]">
                                      <LightningIcon />
                                      <span className="ml-3">Manual Override</span>
                                  </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-8">
                                  {Object.entries(selectedAgent.performanceData).filter(([key]) => typeof selectedAgent.performanceData?.[key as keyof UserPerformanceData] === 'number').map(([key, score]) => (
                                      <div key={key} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                          <div className="flex justify-between mb-2">
                                              <span className="text-xs font-black text-gray-700 uppercase tracking-widest truncate mr-2">{key}</span>
                                              <span className={`text-xs font-black uppercase tracking-widest ${(score as number) < 60 ? 'text-tp-red' : 'text-green-700'}`}>{score as number}%</span>
                                          </div>
                                          <div className="w-full bg-gray-100 rounded-full h-2">
                                              <div className={`h-full rounded-full transition-all duration-700 ${(score as number) < 60 ? 'bg-tp-red' : 'bg-green-600'}`} style={{ width: `${score}%` }}></div>
                                          </div>
                                      </div>
                                  ))}
                              </div>

                              <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
                                  <h4 className="font-black text-tp-purple uppercase text-xs md:text-sm tracking-widest mb-4 flex items-center">
                                      <BadgeIcon className="w-6 h-6 text-tp-red mr-3" />
                                      Strategic Vector
                                  </h4>
                                  <p className="text-sm md:text-base text-gray-700 leading-relaxed mb-6 font-medium">
                                      Skillence AI recommends a <span className="text-tp-red font-black">20-Hour Targeted Strategy</span> to calibrate performance gaps identified in the evaluation.
                                  </p>
                                  <button className="w-full bg-tp-red text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs md:text-sm shadow-xl shadow-tp-red/20 min-h-[50px]">
                                      Apply Strategy
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                             <BrainIcon className="w-12 h-12 opacity-20 mb-4" />
                             <p className="font-black uppercase tracking-widest text-xs">Select an agent for Logic Analysis</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'content' && (
          <div className="space-y-6 md:space-y-8 animate-fadeIn">
              <div className="glass-card p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="font-black text-tp-purple uppercase text-sm md:text-base tracking-widest mb-6">Material Deployment</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
                      <div className="space-y-2">
                          <label className="text-xs font-black text-gray-700 uppercase tracking-widest">Target Track</label>
                          <select 
                            value={selectedModule} 
                            onChange={(e) => setSelectedModule(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm min-h-[44px] focus:ring-2 focus:ring-tp-purple outline-none"
                          >
                              {Object.values(modules).map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                          </select>
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-black text-gray-700 uppercase tracking-widest">Lesson Title</label>
                          <input 
                              type="text" 
                              value={newLesson.title} 
                              onChange={(e) => setNewLesson({...newLesson, title: e.target.value})}
                              placeholder="e.g. Call Logic"
                              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm min-h-[44px] focus:ring-2 focus:ring-tp-purple outline-none"
                          />
                      </div>
                  </div>
                  <button 
                      onClick={() => addCustomLesson(selectedModule, { title: newLesson.title!, type: newLesson.type!, level: newLesson.level!, duration: '15 min' })}
                      className="w-full bg-tp-purple text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-tp-purple/20 min-h-[50px] transition-all hover:bg-tp-navy"
                  >
                      Deploy Content
                  </button>
              </div>

              <div className="space-y-6">
                   <h3 className="font-black text-gray-700 uppercase text-xs md:text-sm tracking-widest px-2">Custom Curriculum</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                       {Object.entries(customLessonsList).map(([mid, lessons]) => (
                           <div key={mid} className="bg-white border border-gray-100 rounded-2xl p-5">
                               <div className="flex items-center mb-4">
                                   <div className="w-8 h-8 bg-tp-purple/5 rounded-lg flex items-center justify-center text-tp-purple mr-3 flex-shrink-0 scale-90">
                                       {modules[mid]?.icon || <ClipboardListIcon />}
                                   </div>
                                   <h4 className="font-black text-tp-purple text-base truncate">{modules[mid]?.title}</h4>
                               </div>
                               <div className="space-y-2">
                                   {lessons.map((l, i) => (
                                       <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                           <div className="truncate mr-3">
                                               <p className="text-sm font-bold text-gray-800 truncate">{l.title}</p>
                                               <p className="text-xs font-black text-tp-red uppercase tracking-widest">{l.type}</p>
                                           </div>
                                           <button 
                                               onClick={() => handleDeleteLesson(mid, l.title)}
                                               className="text-gray-500 hover:text-tp-red p-2 transition-colors"
                                           >
                                               <TrashIcon />
                                           </button>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       ))}
                   </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
