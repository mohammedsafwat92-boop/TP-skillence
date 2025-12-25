
import React, { useState, useEffect } from 'react';
import type { UserProfile, Module, Lesson, UserProgress } from '../types';
import { ResourceType } from '../types';
import { getUsers, saveUsers, addCustomLesson, getCustomLessons, removeCustomLesson, saveCustomLessons } from '../services/adminService';
import { getAllUsersProgress, initialProgress } from '../services/progressService';
import { RESULTS_SHEET_URL } from '../services/googleSheetService';
import { TrashIcon, PlusIcon, UserIcon, AdminIcon, TableIcon, ClipboardListIcon, BrainIcon, DownloadIcon, TrendingUpIcon, ChartBarIcon, LightningIcon, TargetIcon, ExitIcon, BadgeIcon, ExclamationCircleIcon, CheckCircleIcon } from './Icons';

// --- Centralized SHL Data for Analysis & Dashboard ---
const CANDIDATE_DATA: Record<string, any> = {
    'hesham': { id: '1773984510', name: 'Hesham Mohammed Mostafa', level: 'B1', date: 'May 25', scores: { writing: 5, fluency: 57, grammar: 100, listening: 85, pronunciation: 87, understanding: 60, analytical: 84 }, cefr: 'B2' },
    'adam': { id: '1773984511', name: 'Adam Abdelsamie Salah', level: 'B2', date: 'May 22', scores: { writing: 58, fluency: 58, grammar: 89, listening: 85, pronunciation: 43, understanding: 80, analytical: 74, content: 45 }, cefr: 'B2' },
    'mona': { id: '177398451122501', name: 'Mona Emad Ibrahim', level: 'B2', date: 'May 24', scores: { writing: 36, fluency: 57, grammar: 67, listening: 78, pronunciation: 87, understanding: 60, analytical: 84, content: 5 }, cefr: 'B2' },
    'yousef': { id: '177398451069724', name: 'Yousef Mahmoud El Sayed', level: 'B2', date: 'May 26', scores: { writing: 5, fluency: 65, grammar: 5, listening: 86, pronunciation: 47, understanding: 60, analytical: 37, content: 5 }, cefr: 'B2' },
    'dua': { id: '177398451165673', name: 'Dua Abdelmagid', level: 'B2', date: 'May 19', scores: { writing: 55, fluency: 57, grammar: 46, listening: 78, pronunciation: 62, understanding: 40, analytical: 84 }, cefr: 'B2' },
    'ethr': { id: '177398451871634', name: 'Ethr Gamal Hassanin', level: 'B2', date: 'May 22', scores: { writing: 73, fluency: 65, grammar: 69, listening: 80, pronunciation: 77, understanding: 60, analytical: 53 }, cefr: 'B2' },
    'hager': { id: '177398451205944', name: 'Hager Ehb', level: 'B2', date: 'May 22', scores: { writing: 42, fluency: 56, grammar: 58, listening: 83, pronunciation: 83, understanding: 60, analytical: 21, content: 36 }, cefr: 'B2' },
    'hana': { id: '177398451147444', name: 'Hana Ali', level: 'C1', date: 'May 20', scores: { writing: 81, fluency: 64, grammar: 100, listening: 87, pronunciation: 84, understanding: 100, analytical: 63 }, cefr: 'B2' },
    'mina': { id: '177398451081244', name: 'Mina Sidra', level: 'C1', date: 'May 19', scores: { writing: 75, fluency: 69, grammar: 71, listening: 86, pronunciation: 77, understanding: 100, analytical: 79 }, cefr: 'B2' },
    'muhannad': { id: '177398451335719', name: 'Muhannad Hamdok', level: 'B1', date: 'May 19', scores: { writing: 5, fluency: 42, grammar: 80, listening: 86, pronunciation: 65, understanding: 60, analytical: 37, content: 5 }, cefr: 'B2' },
    'seif': { id: '177398451812628', name: 'Seif Mohamed Alaa', level: 'B2', date: 'May 25', scores: { writing: 36, fluency: 54, grammar: 100, listening: 75, pronunciation: 42, understanding: 60, analytical: 79, content: 18 }, cefr: 'B2' },
    'ziyad': { id: '177398451609916', name: 'Ziyad', level: 'B2', date: 'May 22', scores: { writing: 72, fluency: 58, grammar: 100, listening: 86, pronunciation: 83, understanding: 40, analytical: 74 }, cefr: 'B2' },
    'adham': { id: '177398451992212', name: 'Adham Khalid Mahmoud', level: 'C1', date: 'May 25', scores: { writing: 38, fluency: 70, grammar: 100, listening: 79, pronunciation: 77, understanding: 80, analytical: 47, content: 26 }, cefr: 'C1' },
};

// 20-Hour Intensive Plans based on Opportunity Areas
const INTENSIVE_TRACKS = {
    WRITING_MASTERY: {
        trigger: ['writing', 'grammar', 'content'],
        name: '20h Written Excellence Track',
        module: 'reading', // Assigned to Reading module as container
        lessons: [
            { title: 'Phase 1: Grammar & Syntax Deep Dive', type: ResourceType.Practice, duration: '5 hours', objective: 'Intensive review of sentence structure, punctuation, and capitalization rules.' },
            { title: 'Phase 2: Professional Email Etiquette', type: ResourceType.Read, duration: '5 hours', objective: 'Structuring business correspondence, tone management, and clarity.' },
            { title: 'Phase 3: Essay & Argument Construction', type: ResourceType.Practice, duration: '5 hours', objective: 'Brainstorming, outlining, and developing coherent arguments.' },
            { title: 'Phase 4: Final Writing Project', type: ResourceType.Practice, duration: '5 hours', objective: 'Submit 3 full-length essays for comprehensive review.' }
        ]
    },
    VERBAL_FLUENCY: {
        trigger: ['fluency', 'pronunciation'],
        name: '20h Verbal Mastery Track',
        module: 'speaking',
        lessons: [
            { title: 'Phase 1: Phonetics & Enunciation Drill', type: ResourceType.Watch, duration: '4 hours', objective: 'Mastering vowel sounds, consonant clusters, and syllable stress.' },
            { title: 'Phase 2: Shadowing Workshop', type: ResourceType.Listen, duration: '6 hours', objective: 'Imitating native speaker cadence and intonation patterns.' },
            { title: 'Phase 3: Conversational Linking', type: ResourceType.Practice, duration: '5 hours', objective: 'Using connecting words to improve flow and reduce hesitation.' },
            { title: 'Phase 4: Mock Call Simulation', type: ResourceType.Practice, duration: '5 hours', objective: 'Real-time roleplay scenarios focusing on speed and clarity.' }
        ]
    },
    COMPREHENSION_ANALYTICAL: {
        trigger: ['listening', 'understanding', 'analytical'],
        name: '20h Analytical & Comprehension Track',
        module: 'listening',
        lessons: [
            { title: 'Phase 1: Active Listening Foundations', type: ResourceType.Watch, duration: '4 hours', objective: 'Techniques for retention and identifying key information.' },
            { title: 'Phase 2: Verbal Reasoning Logic', type: ResourceType.Read, duration: '6 hours', objective: 'Analyzing complex texts and data to draw correct inferences.' },
            { title: 'Phase 3: Rapid Information Processing', type: ResourceType.Listen, duration: '5 hours', objective: 'Drills on understanding fast-paced native speech with background noise.' },
            { title: 'Phase 4: Complex Case Study Analysis', type: ResourceType.Practice, duration: '5 hours', objective: 'Solving multi-faceted customer issues using gathered data.' }
        ]
    }
};

interface AdminPanelProps {
  users: UserProfile[];
  setUsers: (users: UserProfile[]) => void;
  modules: { [id: string]: Module };
  onUpdateContent: () => void;
}

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
        <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`}>
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
                        className="text-[8px] fill-gray-500 font-medium"
                    >
                        {m}
                    </text>
                );
            })}
        </svg>
    );
};

const AdminPanel: React.FC<AdminPanelProps> = ({ users, setUsers, modules, onUpdateContent }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'content' | 'analysis' | 'dashboard'>('users');
  const [newUser, setNewUser] = useState({ name: '', level: 'B1' as UserProfile['languageLevel'], role: 'agent' as const });
  const [selectedModule, setSelectedModule] = useState(Object.keys(modules)[0]);
  const [newLesson, setNewLesson] = useState<Partial<Lesson>>({
    title: '',
    type: ResourceType.Read,
    link: '',
    objective: '',
    level: 'B1'
  });
  const [customLessonsList, setCustomLessonsList] = useState<{ [moduleId: string]: Lesson[] }>(getCustomLessons());
  const [selectedProfileId, setSelectedProfileId] = useState<string>('hesham');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const refreshContent = () => {
      onUpdateContent();
      setCustomLessonsList(getCustomLessons());
  };

  const allUserProgress = getAllUsersProgress();

  const handleAddUser = () => {
    if (!newUser.name) return;
    const user: UserProfile = {
      id: `agent-${Date.now()}`,
      name: newUser.name,
      languageLevel: newUser.level,
      role: newUser.role,
      assignedModules: Object.keys(modules)
    };
    const updatedUsers = [...users, user];
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    setNewUser({ name: '', level: 'B1', role: 'agent' });
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
        const updatedUsers = users.filter(u => u.id !== id);
        setUsers(updatedUsers);
        saveUsers(updatedUsers);
    }
  };

  const handleExportUsers = () => {
    const headers = ['ID', 'Name', 'Role', 'Language Level', 'Assigned Modules'];
    const rows = users.map(u => [
        u.id, `"${u.name}"`, u.role, u.languageLevel, `"${u.assignedModules.join(', ')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'tp_skillence_users.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleModuleForUser = (userId: string, moduleId: string) => {
    const updatedUsers = users.map(user => {
        if (user.id !== userId) return user;
        const hasModule = user.assignedModules.includes(moduleId);
        return {
            ...user,
            assignedModules: hasModule 
                ? user.assignedModules.filter(m => m !== moduleId)
                : [...user.assignedModules, moduleId]
        };
    });
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
  };

  const handleAssignAllModules = (userId: string) => {
      const allModuleIds = Object.keys(modules);
      const updatedUsers = users.map(user => {
          if (user.id !== userId) return user;
          return { ...user, assignedModules: allModuleIds };
      });
      setUsers(updatedUsers);
      saveUsers(updatedUsers);
  };

  const handleUnassignAllModules = (userId: string) => {
      const updatedUsers = users.map(user => {
          if (user.id !== userId) return user;
          return { ...user, assignedModules: [] };
      });
      setUsers(updatedUsers);
      saveUsers(updatedUsers);
  };

  const handleAddLesson = () => {
      if (!newLesson.title || !selectedModule) return;
      const lessonToAdd: Lesson = {
          title: newLesson.title,
          level: newLesson.level || 'B1',
          type: newLesson.type || ResourceType.Read,
          link: newLesson.link || '',
          objective: newLesson.objective || '',
          duration: '15 min'
      };
      addCustomLesson(selectedModule, lessonToAdd);
      refreshContent();
      setNewLesson({ title: '', type: ResourceType.Read, link: '', objective: '', level: 'B1' });
      alert('Lesson added successfully!');
  };

  const handleDeleteLesson = (moduleId: string, lessonTitle: string) => {
      if (confirm(`Delete lesson "${lessonTitle}"?`)) {
          removeCustomLesson(moduleId, lessonTitle);
          refreshContent();
      }
  };

  const generateRemedialLessons = (candidateKey: string) => {
      const data = CANDIDATE_DATA[candidateKey];
      const lessonsToAdd: { module: string, lesson: Lesson }[] = [];
      let primaryGap = { metric: '', score: 100 };

      Object.entries(data.scores).forEach(([key, val]) => {
          if (typeof val === 'number' && val < primaryGap.score) {
              primaryGap = { metric: key, score: val };
          }
      });

      let selectedTrack = null;
      if (INTENSIVE_TRACKS.WRITING_MASTERY.trigger.includes(primaryGap.metric)) {
          selectedTrack = INTENSIVE_TRACKS.WRITING_MASTERY;
      } else if (INTENSIVE_TRACKS.VERBAL_FLUENCY.trigger.includes(primaryGap.metric)) {
          selectedTrack = INTENSIVE_TRACKS.VERBAL_FLUENCY;
      } else if (INTENSIVE_TRACKS.COMPREHENSION_ANALYTICAL.trigger.includes(primaryGap.metric)) {
          selectedTrack = INTENSIVE_TRACKS.COMPREHENSION_ANALYTICAL;
      }

      if (selectedTrack && primaryGap.score < 60) {
          selectedTrack.lessons.forEach(l => {
              lessonsToAdd.push({
                  module: selectedTrack.module,
                  lesson: {
                      title: `${l.title} (${data.name.split(' ')[0]})`,
                      level: 'Targeted',
                      type: l.type as ResourceType,
                      objective: `${l.objective} - [Assigned Plan: ${selectedTrack.name} | Gap: ${primaryGap.metric.toUpperCase()} ${primaryGap.score}]`,
                      duration: l.duration,
                      assignedTo: data.id
                  }
              });
          });
      }

      return lessonsToAdd;
  };

  const handleAutoAssignAll = () => {
      if(!confirm("This will process all candidates and assign 20-hour intensive training plans where gaps exist. Proceed?")) return;
      
      let currentUsersList = getUsers(); 
      let currentCustomLessons = getCustomLessons(); 
      let updatesMade = false;

      Object.keys(CANDIDATE_DATA).forEach(key => {
          const data = CANDIDATE_DATA[key];
          const exists = currentUsersList.find(u => u.id === data.id || u.name === data.name);
          if (!exists) {
              const user: UserProfile = {
                  id: data.id,
                  name: data.name,
                  languageLevel: data.level as any,
                  role: 'agent',
                  assignedModules: Object.keys(modules)
              };
              currentUsersList.push(user);
              updatesMade = true;
          }

          const lessonsToAdd = generateRemedialLessons(key);
          if (lessonsToAdd.length > 0) {
              lessonsToAdd.forEach(({ module, lesson }) => {
                  if (!currentCustomLessons[module]) {
                      currentCustomLessons[module] = [];
                  }
                  const lessonExists = currentCustomLessons[module].some(l => l.title === lesson.title);
                  if (!lessonExists) {
                      currentCustomLessons[module].push({ ...lesson, isCustom: true });
                      updatesMade = true;
                  }
              });
          }
      });

      if (updatesMade) {
          saveUsers(currentUsersList);
          saveCustomLessons(currentCustomLessons);
          setUsers(currentUsersList);
          setCustomLessonsList(currentCustomLessons);
          onUpdateContent();
          alert(`Successfully assigned intensive plans to agents with identified opportunities.`);
      } else {
          alert("No new updates required.");
      }
  };

  const handleExportDashboardData = () => {
      const headers = ['Agent Name', 'Test ID', 'CEFR', 'Writing', 'Speaking', 'Listening', 'Grammar', 'Analytical', 'Overall Avg', 'Primary Opportunity', 'Recommended 20h Plan', 'Assigned Modules'];
      const rows = Object.values(CANDIDATE_DATA).map(c => {
          const scores = c.scores;
          const avg = Math.round(Object.values(scores).reduce((a: any, b: any) => a + b, 0) as number / Object.values(scores).length);
          let primaryGap = { metric: '', score: 100 };
          Object.entries(scores).forEach(([key, val]) => {
              if (typeof val === 'number' && val < primaryGap.score) {
                  primaryGap = { metric: key, score: val };
              }
          });
          const userProfile = users.find(u => u.id === c.id);
          const assignedModules = userProfile ? userProfile.assignedModules.map(m => modules[m]?.title || m).join(', ') : 'Profile Not Created';

          return [
              `"${c.name}"`, `"${c.id}"`, c.cefr,
              scores.writing || 'N/A', scores.fluency || 'N/A', scores.listening || 'N/A', scores.grammar || 'N/A', scores.analytical || 'N/A', 
              avg, `"${primaryGap.metric.toUpperCase()}"`, "TP Intensive Plan", `"${assignedModules}"`
          ];
      });

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'tp_egypt_training_dashboard.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const calculateTeamStats = () => {
      const candidates = Object.values(CANDIDATE_DATA);
      const avg = (metric: string) => Math.round(candidates.reduce((acc, c) => acc + (c.scores[metric] || 0), 0) / candidates.length);
      const allScores = candidates.map(c => {
          const s = Object.values(c.scores) as number[];
          return { name: c.name, score: Math.round(s.reduce((a, b) => a + b, 0) / s.length) };
      });
      const topPerformer = allScores.reduce((prev, current) => (prev.score > current.score) ? prev : current);
      const metrics = ['writing', 'fluency', 'grammar', 'listening', 'pronunciation', 'understanding', 'analytical'];
      const metricAvgs = metrics.map(m => ({ name: m, val: avg(m) }));
      const focusArea = metricAvgs.reduce((prev, curr) => prev.val < curr.val ? prev : curr);
      const affectedCount = candidates.filter(c => (c.scores[focusArea.name] || 0) < 60).length;

      return {
          avgScore: Math.round(allScores.reduce((a, b) => a + b.score, 0) / allScores.length),
          topPerformer,
          focusArea: { ...focusArea, count: affectedCount },
          count: candidates.length,
          radarData: {
              'Writing': avg('writing'),
              'Grammar': avg('grammar'),
              'Listening': avg('listening'),
              'Oral': Math.round((avg('fluency') + avg('pronunciation')) / 2),
              'Analytical': avg('analytical')
          },
          proficiency: {
              'Language Mechanics': Math.round((avg('grammar') + avg('pronunciation')) / 2),
              'Comprehension': Math.round((avg('listening') + avg('understanding')) / 2),
              'Oral Communication': Math.round((avg('fluency') + avg('pronunciation')) / 2),
              'Soft Skills': avg('analytical'),
              'Written Communication': avg('writing')
          }
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

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 max-w-6xl mx-auto border border-gray-100">
      <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-black text-tp-purple flex items-center tracking-tight">
            <AdminIcon />
            <span className="ml-4">Command Center</span>
          </h1>
          <a href={RESULTS_SHEET_URL} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs font-bold text-green-600 hover:text-green-800 bg-green-50 px-4 py-2 rounded-xl border border-green-200 uppercase tracking-widest transition-all">
            <span className="mr-2"><TableIcon /></span>
            Global Results Sheet
          </a>
      </div>

      <div className="flex border-b border-gray-100 mb-8 space-x-8 overflow-x-auto pb-1">
        <button onClick={() => setActiveTab('users')} className={`pb-3 font-bold text-xs uppercase tracking-widest flex items-center whitespace-nowrap transition-all ${activeTab === 'users' ? 'text-tp-purple border-b-4 border-tp-red' : 'text-gray-400'}`}>
            <UserIcon /> <span className="ml-3">Agents</span>
        </button>
        <button onClick={() => setActiveTab('dashboard')} className={`pb-3 font-bold text-xs uppercase tracking-widest flex items-center whitespace-nowrap transition-all ${activeTab === 'dashboard' ? 'text-tp-purple border-b-4 border-tp-red' : 'text-gray-400'}`}>
            <ChartBarIcon /> <span className="ml-3">Team Intel</span>
        </button>
        <button onClick={() => setActiveTab('analysis')} className={`pb-3 font-bold text-xs uppercase tracking-widest flex items-center whitespace-nowrap transition-all ${activeTab === 'analysis' ? 'text-tp-purple border-b-4 border-tp-red' : 'text-gray-400'}`}>
             <BrainIcon /> <span className="ml-3">Individual Logic</span>
        </button>
        <button onClick={() => setActiveTab('content')} className={`pb-3 font-bold text-xs uppercase tracking-widest flex items-center whitespace-nowrap transition-all ${activeTab === 'content' ? 'text-tp-purple border-b-4 border-tp-red' : 'text-gray-400'}`}>
            <ClipboardListIcon /> <span className="ml-3">Curriculum</span>
        </button>
      </div>

      {activeTab === 'dashboard' && (
          <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                  <div>
                      <h2 className="text-2xl font-black text-tp-purple flex items-center"><BrainIcon /> <span className="ml-3 uppercase tracking-tight">Team Intelligence Hub</span></h2>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Active Analysis: {teamStats.count} Profiled Agents</p>
                  </div>
                  <div className="flex space-x-3 mt-6 md:mt-0">
                      <button onClick={handleExportDashboardData} className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center shadow-sm">
                          <DownloadIcon /> <span className="ml-3">Export Data</span>
                      </button>
                      <button onClick={handleAutoAssignAll} className="bg-tp-purple hover:bg-tp-navy text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center shadow-xl shadow-tp-purple/20 transition-all">
                          <LightningIcon /> <span className="ml-3">Auto-Assign Plans</span>
                      </button>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-tp-purple/5 p-8 rounded-3xl border border-tp-purple/10 flex flex-col justify-center">
                      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Average Score</p>
                      <p className="text-5xl font-black text-tp-purple">{teamStats.avgScore}%</p>
                      <div className="mt-4 flex items-center text-green-600 text-xs font-bold">
                          <TrendingUpIcon /> <span className="ml-1">+2.4% vs last week</span>
                      </div>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Top Performer</p>
                      <p className="text-xl font-black text-tp-purple truncate">{teamStats.topPerformer.name}</p>
                      <p className="text-xs text-tp-red font-black uppercase tracking-widest mt-2">Proficiency: {teamStats.topPerformer.score}%</p>
                  </div>
                  <div className="bg-tp-red/5 p-8 rounded-3xl border border-tp-red/10 flex flex-col justify-center">
                      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Critical Focus</p>
                      <p className="text-3xl font-black text-tp-red capitalize tracking-tight">{teamStats.focusArea.name}</p>
                      <p className="text-xs text-gray-500 font-bold mt-2 uppercase tracking-widest">{teamStats.focusArea.count} Agents Below Target</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                      <h3 className="font-black text-tp-purple text-sm uppercase tracking-widest mb-8 flex items-center"><UserIcon /> <span className="ml-3">Skill Landscape</span></h3>
                      <div className="flex justify-center">
                          <RadarChart data={teamStats.radarData} />
                      </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                      <h3 className="font-black text-tp-purple text-sm uppercase tracking-widest mb-8 flex items-center"><ChartBarIcon /> <span className="ml-3">Team Proficiency Levels</span></h3>
                      <div className="space-y-6">
                          {Object.entries(teamStats.proficiency).map(([skill, val]) => (
                              <div key={skill}>
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                                      <span className="text-gray-500">{skill}</span>
                                      <span className="text-tp-purple">{val}%</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                      <div 
                                          className={`h-2 rounded-full transition-all duration-1000 ${val >= 80 ? 'bg-green-500' : val >= 60 ? 'bg-tp-purple' : 'bg-tp-red'}`} 
                                          style={{ width: `${val}%` }}
                                      ></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-tp-purple uppercase tracking-tight">Agent Directory</h2>
            <div className="flex space-x-3">
                <button 
                    onClick={handleExportUsers}
                    className="flex items-center text-[10px] font-black uppercase tracking-widest text-tp-purple bg-tp-purple/5 px-4 py-2.5 rounded-xl border border-tp-purple/10 hover:bg-tp-purple hover:text-white transition-all"
                >
                    <DownloadIcon />
                    <span className="ml-2">Export CSV</span>
                </button>
                <button onClick={() => setNewUser(prev => ({ ...prev, name: 'New Agent' }))} className="bg-tp-red text-white px-5 py-2.5 rounded-xl hover:bg-red-700 flex items-center text-xs font-black uppercase tracking-widest shadow-xl shadow-tp-red/20 transition-all">
                    <PlusIcon /> <span className="ml-3">Add Profile</span>
                </button>
            </div>
          </div>
          
          <div className="grid gap-6">
            {users.map(user => {
                const userProgress = allUserProgress[user.id] || initialProgress;
                return (
                <div key={user.id} className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:border-tp-purple/20 transition-all">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-tp-purple/5 rounded-2xl flex items-center justify-center text-tp-purple">
                                <UserIcon />
                            </div>
                            <div className="ml-5">
                                <h3 className="font-black text-lg text-tp-purple tracking-tight">{user.name}</h3>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center space-x-3 mt-1">
                                    <span className="bg-tp-red text-white px-1.5 py-0.5 rounded text-[8px]">{user.role}</span>
                                    <span>Level: {user.languageLevel}</span>
                                    <span>•</span>
                                    <span>{user.assignedModules.length} Tracks Assigned</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                                className="text-[10px] font-black uppercase tracking-widest text-tp-purple hover:text-tp-red transition-all"
                            >
                                {expandedUserId === user.id ? 'Collapse' : 'Configuration'}
                            </button>
                            <button onClick={() => handleDeleteUser(user.id)} className="text-gray-300 hover:text-tp-red transition-all p-2">
                                <TrashIcon />
                            </button>
                        </div>
                    </div>

                    {expandedUserId === user.id && (
                        <div className="mt-8 pt-8 border-t border-gray-50 animate-fadeIn">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.values(modules).map((mod: Module) => {
                                    const isAssigned = user.assignedModules.includes(mod.id);
                                    const progress = getModuleProgress(user.id, mod.id);
                                    return (
                                        <div key={mod.id} className={`p-5 rounded-2xl border transition-all ${isAssigned ? 'border-tp-purple/20 bg-tp-purple/[0.02]' : 'border-gray-50 bg-gray-50/50 opacity-40'}`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center">
                                                    <span className="text-tp-purple mr-3 opacity-70">{mod.icon}</span>
                                                    <span className="font-bold text-tp-purple text-sm">{mod.title}</span>
                                                </div>
                                                <button 
                                                    onClick={() => toggleModuleForUser(user.id, mod.id)}
                                                    className={`w-10 h-5 flex items-center rounded-full p-1 transition-all ${isAssigned ? 'bg-tp-red' : 'bg-gray-300'}`}
                                                >
                                                    <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-all ${isAssigned ? 'translate-x-5' : ''}`}></div>
                                                </button>
                                            </div>
                                            {isAssigned && (
                                                <div className="space-y-2">
                                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                        <div className="bg-tp-purple h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                    <div className="text-[9px] font-black uppercase tracking-widest text-right text-gray-400">{progress}% Done</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )})}
          </div>
        </div>
      )}
      
      {activeTab === 'analysis' && (
          <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-1/3 space-y-3">
                      <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-4">Assessments Awaiting Calibration</h3>
                      <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                          {Object.entries(CANDIDATE_DATA).map(([key, data]) => (
                              <button
                                  key={key}
                                  onClick={() => setSelectedProfileId(key)}
                                  className={`w-full text-left p-5 rounded-2xl border transition-all flex justify-between items-center ${selectedProfileId === key ? 'bg-tp-purple text-white border-tp-purple shadow-xl shadow-tp-purple/20' : 'bg-white border-gray-100 hover:border-tp-purple/30'}`}
                              >
                                  <div>
                                      <p className="font-black text-sm tracking-tight">{data.name}</p>
                                      <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${selectedProfileId === key ? 'text-white/60' : 'text-gray-400'}`}>Test: {data.date}</p>
                                  </div>
                                  <div className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase ${selectedProfileId === key ? 'bg-tp-red text-white' : 'bg-tp-purple/5 text-tp-purple'}`}>
                                      {data.level}
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="w-full md:w-2/3 bg-gray-50/50 rounded-3xl p-8 border border-gray-100">
                      {selectedProfileId && CANDIDATE_DATA[selectedProfileId] ? (
                          <div>
                              <div className="flex justify-between items-start mb-8">
                                  <div>
                                      <h2 className="text-3xl font-black text-tp-purple tracking-tight">{CANDIDATE_DATA[selectedProfileId].name}</h2>
                                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Global ID: {CANDIDATE_DATA[selectedProfileId].id} • CEFR: {CANDIDATE_DATA[selectedProfileId].cefr}</p>
                                  </div>
                                  <button 
                                      className="bg-tp-purple text-white px-5 py-2.5 rounded-xl shadow-xl shadow-tp-purple/20 hover:bg-tp-navy transition-all flex items-center text-[10px] font-black uppercase tracking-widest"
                                  >
                                      <LightningIcon />
                                      <span className="ml-3">Manual Override</span>
                                  </button>
                              </div>

                              <div className="grid grid-cols-2 gap-6 mb-10">
                                  {Object.entries(CANDIDATE_DATA[selectedProfileId].scores).map(([key, score]) => (
                                      <div key={key} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                          <div className="flex justify-between mb-3">
                                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{key}</span>
                                              <span className={`text-[10px] font-black uppercase tracking-widest ${(score as number) < 60 ? 'text-tp-red' : 'text-green-600'}`}>{score as number}/100</span>
                                          </div>
                                          <div className="w-full bg-gray-100 rounded-full h-2">
                                              <div className={`h-2 rounded-full transition-all duration-700 ${(score as number) < 60 ? 'bg-tp-red' : 'bg-green-500'}`} style={{ width: `${score}%` }}></div>
                                          </div>
                                      </div>
                                  ))}
                              </div>

                              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                                  <h4 className="font-black text-tp-purple uppercase text-sm tracking-widest mb-6 flex items-center">
                                      {/* Using BadgeIcon with className directly now that props are supported */}
                                      <BadgeIcon className="w-6 h-6 text-tp-red mr-3" />
                                      Recommended Training Vector
                                  </h4>
                                  <p className="text-sm text-gray-600 leading-relaxed mb-6 font-medium">
                                      Based on the latest assessment, we recommend a <span className="text-tp-red font-black">20-Hour Targeted Track</span> focusing on the primary performance gaps.
                                  </p>
                                  <button className="w-full bg-tp-red text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-tp-red/20 hover:bg-red-700 transition-all">
                                      Launch Intensive Plan
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-300">
                             <BrainIcon className="w-16 h-16 opacity-10 mb-4" />
                             <p className="font-black uppercase tracking-widest text-xs">Select agent to start analysis</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
