
import React, { useState, useEffect } from 'react';
import type { UserProfile, Module, Lesson, UserProgress, UserCredentials, UserPerformanceData, Roster } from '../types';
import { ResourceType } from '../types';
import { saveUsers, getRosters, saveRosters, addCustomLesson, getCustomLessons, removeCustomLesson } from '../services/adminService';
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

const RadarChart: React.FC<{ data: Record<string, number> }> = ({ data }) => {
    const size = 200;
    const center = size / 2;
    const radius = 70;
    const metrics = Object.keys(data);
    const angleStep = (Math.PI * 2) / metrics.length;
    const getCoordinates = (value: number, index: number) => {
        const angle = angleStep * index - Math.PI / 2;
        const r = (value / 100) * radius;
        return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
    };
    const points = metrics.map((m, i) => { const { x, y } = getCoordinates(data[m], i); return `${x},${y}`; }).join(' ');
    const backgroundPoints = metrics.map((m, i) => { const { x, y } = getCoordinates(100, i); return `${x},${y}`; }).join(' ');
    return (
        <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
            <polygon points={backgroundPoints} fill="none" stroke="#e2e8f0" strokeWidth="1" />
            <polygon points={points} fill="rgba(46, 8, 84, 0.2)" stroke="#2E0854" strokeWidth="2" />
            {metrics.map((m, i) => {
                const { x, y } = getCoordinates(120, i);
                return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-[8px] fill-gray-500 font-black uppercase tracking-tighter">{m}</text>;
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
  const [showRosterModal, setShowRosterModal] = useState<string | null>(null); // UserId to move roster
  const [showOnboardingModal, setShowOnboardingModal] = useState<{ creds: UserCredentials, name: string } | null>(null);

  const rosters = getRosters();
  const allCoaches = users.filter(u => u.role === 'coach');

  // Enforce visibility logic based on role
  const getVisibleUsers = () => {
      if (currentUser.role === 'admin') {
          return users.filter(u => {
              const rosterMatch = globalRosterFilter === 'all' || u.rosterId === globalRosterFilter;
              const coachMatch = globalCoachFilter === 'all' || u.assignedCoachId === globalCoachFilter;
              return rosterMatch && coachMatch;
          });
      }
      if (currentUser.role === 'coach') {
          // Coach sees agents in their roster OR agents assigned to them directly
          return users.filter(u => (u.rosterId === currentUser.rosterId || u.assignedCoachId === currentUser.id) && u.id !== currentUser.id);
      }
      return [currentUser];
  };

  const visibleUsers = getVisibleUsers();
  const agentUsers = visibleUsers.filter(u => u.role === 'agent');

  useEffect(() => {
    if (!selectedProfileId && agentUsers.length > 0) setSelectedProfileId(agentUsers[0].id);
  }, [agentUsers, selectedProfileId]);

  const allUserProgress = getAllUsersProgress();

  const handleUserCreated = (newUser: UserProfile) => {
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    if (newUser.generatedCredentials) setShowOnboardingModal({ creds: newUser.generatedCredentials, name: newUser.name });
  };

  const handleAssignRoster = (userId: string, rosterId: string) => {
      const updatedUsers = users.map(u => u.id === userId ? { ...u, rosterId } : u);
      setUsers(updatedUsers);
      saveUsers(updatedUsers);
      setShowRosterModal(null);
  };

  const handleAssignCoach = (userId: string, coachId: string) => {
      const updatedUsers = users.map(u => u.id === userId ? { ...u, assignedCoachId: coachId === 'none' ? undefined : coachId } : u);
      setUsers(updatedUsers);
      saveUsers(updatedUsers);
  };

  const handleToggleModule = (userId: string, moduleId: string) => {
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
      // Exclude Coach's own data from team analytics
      const statsGroup = visibleUsers.filter(u => u.performanceData && u.id !== currentUser.id);
      if (statsGroup.length === 0) return null;

      const avgMetric = (metric: keyof UserPerformanceData) => 
        Math.round(statsGroup.reduce((acc, c) => acc + ((c.performanceData?.[metric] as number) || 0), 0) / statsGroup.length);

      const allScores = statsGroup.map(c => {
          const s = Object.values(c.performanceData || {}).filter(v => typeof v === 'number') as number[];
          return { name: c.name, score: Math.round(s.reduce((a, b) => a + b, 0) / s.length) };
      });

      const metrics: (keyof UserPerformanceData)[] = ['writing', 'fluency', 'grammar', 'listening', 'pronunciation', 'understanding', 'analytical'];
      const metricAvgs = metrics.map(m => ({ name: m, val: avgMetric(m) }));

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

  const teamStats = calculateTeamStats();
  const selectedAgent = agentUsers.find(u => u.id === selectedProfileId);

  return (
    <div className="bg-white rounded-3xl shadow-xl p-4 md:p-8 max-w-6xl mx-auto border border-gray-100">
      {/* Credential Modal for new users */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-tp-navy/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
                <h3 className="text-xl font-black text-tp-purple mb-4 uppercase">Onboarding Sync Complete</h3>
                <p className="text-sm text-gray-500 mb-6">User <span className="font-bold">{showOnboardingModal.name}</span> created. Credentials:</p>
                <div className="space-y-4 mb-6">
                    <div className="bg-gray-100 p-4 rounded-xl"><p className="text-[10px] font-black text-gray-400 uppercase">Temp ID</p><p className="font-mono text-lg">{showOnboardingModal.creds.tempId}</p></div>
                    <div className="bg-tp-purple/5 p-4 rounded-xl"><p className="text-[10px] font-black text-tp-purple uppercase">Code</p><p className="font-mono text-2xl text-tp-red">{showOnboardingModal.creds.accessCode}</p></div>
                </div>
                <button onClick={() => setShowOnboardingModal(null)} className="w-full bg-tp-navy text-white py-3 rounded-xl font-black uppercase text-xs">Done</button>
            </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-tp-purple text-white rounded-2xl flex items-center justify-center shadow-lg"><AdminIcon /></div>
            <div className="ml-4">
                <h1 className="text-xl md:text-2xl font-black text-tp-purple tracking-tight">Team Command</h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{currentUser.role.toUpperCase()} View • {currentUser.name}</p>
            </div>
          </div>
          
          {/* Global Filter Bar for Admin */}
          {currentUser.role === 'admin' && (
              <div className="flex gap-2 w-full sm:w-auto">
                  <select value={globalRosterFilter} onChange={(e) => setGlobalRosterFilter(e.target.value)} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none">
                      <option value="all">All Rosters</option>
                      {rosters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <select value={globalCoachFilter} onChange={(e) => setGlobalCoachFilter(e.target.value)} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none">
                      <option value="all">All Coaches</option>
                      {allCoaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
              </div>
          )}
      </div>

      <div className="flex border-b border-gray-100 mb-8 overflow-x-auto gap-6 md:gap-8 pb-1 no-scrollbar">
        <button onClick={() => setActiveTab('users')} className={`pb-3 font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center transition-all ${activeTab === 'users' ? 'text-tp-purple border-b-4 border-tp-red' : 'text-gray-400'}`}>
            <UserIcon /> <span className="ml-3">Agents</span>
        </button>
        <button onClick={() => setActiveTab('dashboard')} className={`pb-3 font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center transition-all ${activeTab === 'dashboard' ? 'text-tp-purple border-b-4 border-tp-red' : 'text-gray-400'}`}>
            <ChartBarIcon /> <span className="ml-3">Team Analytics</span>
        </button>
        {currentUser.role === 'admin' && (
            <button onClick={() => setActiveTab('analysis')} className={`pb-3 font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center transition-all ${activeTab === 'analysis' ? 'text-tp-purple border-b-4 border-tp-red' : 'text-gray-400'}`}>
                    <BrainIcon /> <span className="ml-3">Strategy Hub</span>
            </button>
        )}
        <button onClick={() => setActiveTab('content')} className={`pb-3 font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center transition-all ${activeTab === 'content' ? 'text-tp-purple border-b-4 border-tp-red' : 'text-gray-400'}`}>
            <ClipboardListIcon /> <span className="ml-3">Curriculum</span>
        </button>
      </div>

      {activeTab === 'dashboard' && teamStats && (
          <div className="animate-fadeIn space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-tp-purple/5 p-6 rounded-3xl border border-tp-purple/10">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Avg Score</p>
                      <p className="text-4xl font-black text-tp-purple">{teamStats.avgScore}%</p>
                  </div>
                  <div className="bg-tp-red/5 p-6 rounded-3xl border border-tp-red/10">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Headcount</p>
                      <p className="text-4xl font-black text-tp-red">{teamStats.count}</p>
                  </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
                    <h3 className="w-full font-black text-[10px] uppercase text-tp-purple mb-4">Competency Map</h3>
                    <RadarChart data={teamStats.radarData} />
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="font-black text-[10px] uppercase text-tp-purple mb-8">Performance Vectors</h3>
                    <div className="space-y-6">
                        {Object.entries(teamStats.proficiency).map(([skill, val]) => (
                            <div key={skill}>
                                <div className="flex justify-between text-[10px] font-black uppercase mb-2"><span>{skill}</span><span>{val}%</span></div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
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
            <h2 className="text-lg font-black text-tp-purple uppercase tracking-tight">Active Team Roster ({visibleUsers.length})</h2>
          </div>

          <div className="grid gap-4">
            {visibleUsers.map(user => (
                <div key={user.id} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-tp-purple/5 rounded-2xl flex items-center justify-center text-tp-purple flex-shrink-0"><UserIcon /></div>
                            <div className="ml-4">
                                <h3 className="font-black text-lg text-tp-purple leading-tight">{user.name}</h3>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex flex-wrap gap-2 mt-1">
                                    <span className="bg-tp-red text-white px-1.5 py-0.5 rounded text-[8px]">{user.role}</span>
                                    <span>{user.languageLevel}</span>
                                    <span className="text-tp-purple">R: {rosters.find(r => r.id === user.rosterId)?.name || user.rosterId}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {currentUser.role === 'admin' && (
                                <button onClick={() => setShowRosterModal(user.id)} className="flex-1 bg-tp-purple/5 text-tp-purple text-[10px] font-black uppercase px-4 py-2.5 rounded-xl border border-tp-purple/10">Move Roster</button>
                            )}
                            <button onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)} className="flex-1 text-[10px] font-black uppercase text-tp-purple border border-tp-purple/10 rounded-xl px-4 py-2.5">
                                {expandedUserId === user.id ? 'Hide Details' : 'Manage Tracks'}
                            </button>
                        </div>
                    </div>

                    {expandedUserId === user.id && (
                        <div className="mt-6 pt-6 border-t border-gray-50 animate-fadeIn space-y-6">
                            {/* Coach Assignment (Admin Only) */}
                            {currentUser.role === 'admin' && (
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Assigned Coach</label>
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
                                        <div key={mod.id} className={`p-4 rounded-xl border transition-all ${isAssigned ? 'border-tp-purple/20 bg-tp-purple/[0.02]' : 'border-gray-50 opacity-40'}`}>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center min-w-0">
                                                    <span className="text-tp-purple mr-2 opacity-70 scale-75">{mod.icon}</span>
                                                    <span className="font-bold text-tp-purple text-xs truncate">{mod.title}</span>
                                                </div>
                                                <button onClick={() => handleToggleModule(user.id, mod.id)} className={`w-8 h-4 flex items-center rounded-full p-1 transition-all ${isAssigned ? 'bg-tp-red' : 'bg-gray-300'}`}>
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

      {/* Manual Roster Assignment Modal */}
      {showRosterModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-tp-navy/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
                  <h3 className="text-lg font-black text-tp-purple mb-6 uppercase tracking-tight">Relocate Agent</h3>
                  <div className="space-y-2 mb-8">
                      {rosters.map(r => (
                          <button key={r.id} onClick={() => handleAssignRoster(showRosterModal, r.id)} className="w-full text-left p-4 rounded-xl border border-gray-100 hover:bg-tp-purple/5 hover:border-tp-purple/30 transition-all font-bold text-sm text-gray-700">{r.name}</button>
                      ))}
                  </div>
                  <button onClick={() => setShowRosterModal(null)} className="w-full text-gray-400 font-bold uppercase text-[10px]">Cancel</button>
              </div>
          </div>
      )}

      {/* Logic Hub for Admin only */}
      {activeTab === 'analysis' && currentUser.role === 'admin' && (
          <div className="space-y-6 animate-fadeIn py-10 text-center">
              <div className="w-20 h-20 bg-tp-red/5 text-tp-red rounded-3xl flex items-center justify-center mx-auto mb-6"><TargetIcon className="w-10 h-10" /></div>
              <h2 className="text-2xl font-black text-tp-purple uppercase">Global Logic Hub</h2>
              <p className="text-gray-500 max-w-md mx-auto">Access CEFR cross-referencing, automated remediation scheduling, and global training vectors for all Teleperformance accounts.</p>
          </div>
      )}

      {/* Curriculum tab - placeholder for standard lesson management */}
      {activeTab === 'content' && (
          <div className="animate-fadeIn p-10 text-center text-gray-400 font-black uppercase text-xs">Curriculum management ready.</div>
      )}
    </div>
  );
};

export default AdminPanel;
