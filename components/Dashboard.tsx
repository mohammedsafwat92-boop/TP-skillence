
import React, { useMemo, useState } from 'react';
import type { UserProfile, Resource, View } from '../types';
import { 
  TrendingUpIcon, 
  TargetIcon, 
  BrainIcon, 
  CheckCircleIcon,
  ListeningIcon,
  SpeakingIcon,
  ReadingIcon,
  PracticeIcon
} from './Icons';

interface DashboardProps {
  user: UserProfile;
  resources: Resource[];
  onNavigate: (view: View) => void;
  onOpenResource: (resource: Resource) => void;
}

type SkillCategory = 'All' | 'Listening' | 'Speaking' | 'Reading' | 'Writing';

const Dashboard: React.FC<DashboardProps> = ({ user, resources, onNavigate, onOpenResource }) => {
  const [activeSkill, setActiveSkill] = useState<SkillCategory>('All');

  // 1. Threshold for identifying a "Gap"
  const GAP_THRESHOLD_PERCENT = 75;

  // 2. Score Normalization & Mapping strictly from SHL Data
  const metrics = useMemo(() => {
    const s = user.shlData?.svar;
    const w = user.shlData?.writex;

    return [
      { label: 'Fluency', val: (s?.fluency || 0) * 10, raw: s?.fluency || 0, tag: 'Speaking' },
      { label: 'Pronunciation', val: (s?.pronunciation || 0) * 10, raw: s?.pronunciation || 0, tag: 'Speaking' },
      { label: 'Listening', val: (s?.activeListening || 0) * 10, raw: s?.activeListening || 0, tag: 'Listening' },
      { label: 'Writing Grammar', val: (w?.grammar || 0) * 20, raw: w?.grammar || 0, tag: 'Writing' },
      { label: 'Writing Vocabulary', val: (w?.vocabulary || 0) * 20, raw: w?.vocabulary || 0, tag: 'Writing' },
      { label: 'Coherence', val: (w?.coherence || 0) * 20, raw: w?.coherence || 0, tag: 'Writing' }
    ];
  }, [user.shlData]);

  // 3. Filtering Logic for Skill Selection
  const { recommended, filteredCurriculum } = useMemo(() => {
    // Identify Gaps across all metrics
    const lowScores = metrics.filter(m => m.val < GAP_THRESHOLD_PERCENT);
    const gapTags = lowScores.map(m => m.tag.toLowerCase());

    const recs: Resource[] = [];
    const curriculum: Resource[] = [];

    resources.forEach(res => {
      const isCompleted = res.progress?.status === 'completed';
      const isRelevantToGap = res.tags.some(t => gapTags.includes(t.toLowerCase()));

      // Filter by active skill category if not 'All'
      const matchesSkill = activeSkill === 'All' || res.tags.some(t => t.toLowerCase() === activeSkill.toLowerCase());

      if (matchesSkill) {
        if (isRelevantToGap && !isCompleted) {
          recs.push(res);
        } else {
          curriculum.push(res);
        }
      }
    });

    const sortFn = (a: Resource, b: Resource) => {
      const aDone = a.progress?.status === 'completed' ? 1 : 0;
      const bDone = b.progress?.status === 'completed' ? 1 : 0;
      return aDone - bDone;
    };

    recs.sort(sortFn);
    curriculum.sort(sortFn);

    return {
      recommended: recs.slice(0, 3), 
      filteredCurriculum: curriculum
    };
  }, [resources, metrics, activeSkill]);

  const completedCount = resources.filter(r => r.progress?.status === 'completed').length;
  const progressPercent = resources.length > 0 ? Math.round((completedCount / resources.length) * 100) : 0;

  const skillButtons: { name: SkillCategory; icon: React.ReactNode }[] = [
    { name: 'All', icon: <BrainIcon className="w-4 h-4" /> },
    { name: 'Listening', icon: <ListeningIcon className="w-4 h-4" /> },
    { name: 'Speaking', icon: <SpeakingIcon className="w-4 h-4" /> },
    { name: 'Reading', icon: <ReadingIcon className="w-4 h-4" /> },
    { name: 'Writing', icon: <PracticeIcon className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-tp-purple text-white rounded-xl shadow-lg">
              <BrainIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-tp-purple uppercase tracking-[0.4em]">Personalized Learning Path</span>
          </div>
          <h1 className="text-5xl font-black text-tp-purple tracking-tighter leading-none">
            {user.name.split(' ')[0]}'s Hub
          </h1>
          <div className="flex items-center gap-4 mt-4">
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center">
              <span className="w-12 h-0.5 bg-tp-red mr-4"></span>
              CEFR Grade: {user.languageLevel} • Student ID: {user.id}
            </p>
          </div>
        </div>

        <div className="bg-white px-8 py-5 rounded-[32px] shadow-[0_20px_40px_rgba(46,8,84,0.05)] border border-gray-100 flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-black text-tp-purple leading-none">{progressPercent}%</p>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">Overall Mastery</p>
          </div>
          <div className="w-12 h-12 bg-tp-red/10 rounded-full flex items-center justify-center text-tp-red">
            <TrendingUpIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Skill Selector Filter Bar */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-2 rounded-[32px] shadow-sm border border-gray-100 w-fit">
        {skillButtons.map((skill) => (
          <button
            key={skill.name}
            onClick={() => setActiveSkill(skill.name)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
              activeSkill === skill.name
                ? 'bg-tp-purple text-white shadow-lg shadow-tp-purple/20 scale-105'
                : 'text-gray-400 hover:text-tp-purple hover:bg-tp-purple/5'
            }`}
          >
            {skill.icon}
            {skill.name}
          </button>
        ))}
      </div>

      {/* Gap Analysis Priority Section */}
      {recommended.length > 0 && (
        <div className="bg-tp-purple rounded-[48px] p-10 text-white relative shadow-2xl overflow-hidden shadow-tp-purple/20">
          <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none">
            <TargetIcon className="w-64 h-64 text-white" />
          </div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-black flex items-center tracking-tight uppercase">
                  <TargetIcon className="mr-3 text-tp-red" /> Gap Remediation
                </h2>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Targeted content based on your {activeSkill === 'All' ? '' : activeSkill} scores</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommended.map((res) => (
                <div 
                  key={res.id} 
                  onClick={() => onOpenResource(res)}
                  className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] hover:bg-white/20 hover:scale-[1.02] transition-all cursor-pointer group flex flex-col justify-between h-[200px]"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-tp-red uppercase tracking-[0.2em] truncate">{res.tags[0]}</p>
                      <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded uppercase">PRIORITY</span>
                    </div>
                    <h3 className="font-bold text-lg leading-tight line-clamp-2">{res.title}</h3>
                    <p className="text-xs text-white/40 mt-3 line-clamp-2">{res.objective}</p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{res.type}</span>
                    <span className="text-xs font-black uppercase tracking-widest group-hover:text-tp-red transition-colors">Start Track →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Stats & Curriculum Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Competency Matrix Visualizer */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-gray-100 rounded-[48px] p-8 shadow-xl relative overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-2 h-full bg-tp-red"></div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-tp-red/10 rounded-xl flex items-center justify-center text-tp-red">
                <TrendingUpIcon className="w-5 h-5" />
              </div>
              <h3 className="font-black text-tp-purple uppercase text-xs tracking-[0.2em]">Competency Matrix</h3>
            </div>
            
            <div className="space-y-6">
              {metrics.map(({ label, val, raw }) => (
                <div key={label}>
                  <div className="flex justify-between text-[11px] font-black uppercase mb-1.5">
                    <span className="text-tp-purple">{label}</span>
                    <span className={val < GAP_THRESHOLD_PERCENT ? 'text-tp-red' : 'text-green-600'}>
                      {raw.toFixed(1)} / {label.toLowerCase().includes('writing') || label === 'Coherence' ? '5.0' : '10.0'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${val < GAP_THRESHOLD_PERCENT ? 'bg-tp-red' : 'bg-tp-purple'}`} 
                      style={{ width: `${val}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 p-6 bg-tp-purple text-white rounded-3xl border border-gray-100 shadow-xl shadow-tp-purple/20">
               <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Assigned Academy Level</p>
               <p className="text-2xl font-black">{user.languageLevel} Proficiency</p>
            </div>
          </div>
        </div>

        {/* Assigned Curriculum (Filtered by Skill) */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-8 px-4">
            <h2 className="text-2xl font-black text-tp-purple tracking-tight uppercase">
              {activeSkill === 'All' ? 'Assigned Learning Path' : `${activeSkill} Modules`}
            </h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{filteredCurriculum.length} Modules Found</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-20">
            {filteredCurriculum.map((res) => (
              <div 
                key={res.id} 
                onClick={() => onOpenResource(res)}
                className={`group bg-white p-6 rounded-[32px] border border-gray-100 shadow-[0_15px_30px_rgba(0,0,0,0.03)] transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[140px] ${res.progress?.status === 'completed' ? 'grayscale opacity-60' : ''}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl ${res.progress?.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-tp-purple/5 text-tp-purple'}`}>
                    <CheckCircleIcon className="w-5 h-5" filled={res.progress?.status === 'completed'} />
                  </div>
                  <div className="flex items-center gap-2">
                    {res.tags.slice(0, 1).map(tag => (
                      <span key={tag} className="text-[8px] font-black bg-tp-purple/5 text-tp-purple px-2 py-0.5 rounded uppercase">{tag}</span>
                    ))}
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{res.level}</span>
                  </div>
                </div>
                <div>
                   <h3 className="font-black text-tp-purple text-base leading-tight group-hover:text-tp-red transition-colors mb-2">{res.title}</h3>
                   <p className="text-[10px] text-gray-400 line-clamp-1">{res.objective}</p>
                </div>
              </div>
            ))}
            {filteredCurriculum.length === 0 && (
              <div className="col-span-2 py-20 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-[32px]">
                 <p className="text-gray-400 font-black uppercase text-xs tracking-widest">No assigned {activeSkill !== 'All' ? activeSkill : ''} modules for level {user.languageLevel}.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
