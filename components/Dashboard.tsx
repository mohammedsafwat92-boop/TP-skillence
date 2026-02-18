
import React, { useMemo, useState, useEffect } from 'react';
import type { UserProfile, Resource, View, SkillCategory } from '../types';
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
  initialSkill?: SkillCategory;
}

const normalizeScore = (val: number): number => {
  if (val <= 10 && val > 0) return val * 10;
  return val;
};

const RadarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const size = 300;
  const center = size / 2;
  const radius = size * 0.4;
  const angleStep = (Math.PI * 2) / data.length;

  const points = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (Math.min(d.value, 100) / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  const axisLines = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    const labelX = center + (radius + 25) * Math.cos(angle);
    const labelY = center + (radius + 15) * Math.sin(angle);
    return { x, y, labelX, labelY, label: d.label };
  });

  return (
    <div className="flex justify-center items-center w-full my-4">
      <svg width={size} height={size + 40} viewBox={`0 0 ${size} ${size + 40}`} className="overflow-visible">
        {[0.2, 0.4, 0.6, 0.8, 1].map((lvl) => (
          <polygon
            key={lvl}
            points={data.map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const r = radius * lvl;
              const x = center + r * Math.cos(angle);
              const y = center + r * Math.sin(angle);
              return `${x},${y}`;
            }).join(' ')}
            className="fill-none stroke-gray-100 stroke-1"
          />
        ))}

        {axisLines.map((line, i) => (
          <g key={i}>
            <line x1={center} y1={center} x2={line.x} y2={line.y} className="stroke-gray-100 stroke-1" />
            <text x={line.labelX} y={line.labelY} textAnchor="middle" className="text-[9px] font-black fill-tp-purple uppercase tracking-tighter">{line.label}</text>
          </g>
        ))}

        <polygon points={points} className="fill-tp-red/20 stroke-tp-red stroke-2 transition-all duration-500" />
        
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const r = (Math.min(d.value, 100) / 100) * radius;
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          return (
            <circle 
              key={i} 
              cx={x} 
              cy={y} 
              r="4" 
              className="fill-tp-purple stroke-white stroke-2 shadow-sm"
            />
          );
        })}
      </svg>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user, resources, onNavigate, onOpenResource, initialSkill }) => {
  const [activeSkill, setActiveSkill] = useState<SkillCategory>(initialSkill || 'All');

  useEffect(() => {
    if (initialSkill) setActiveSkill(initialSkill);
  }, [initialSkill]);

  const GAP_THRESHOLD_NORMALIZED = 80;

  // Mastery Calculation: (Number of Completed Courses / Total Assigned Courses) * 100
  const progressPercent = useMemo(() => {
    if (resources.length === 0) return 0;
    const completedCount = resources.filter(r => r.progress?.status === 'completed').length;
    return Math.round((completedCount / resources.length) * 100);
  }, [resources]);

  const metrics = useMemo(() => {
    const s = user.shlData?.svar;
    const w = user.shlData?.writex;

    const normalizeSVAR = (v: any) => normalizeScore(Number(v) || 0);
    const normalizeWriteX = (v: any) => Number(v) || 0;

    return [
      { label: 'Fluency', val: normalizeSVAR(s?.fluency), raw: s?.fluency || 0, tag: 'Speaking' },
      { label: 'Pronunciation', val: normalizeSVAR(s?.pronunciation), raw: s?.pronunciation || 0, tag: 'Speaking' },
      { label: 'Listening', val: normalizeSVAR(s?.activeListening), raw: s?.activeListening || 0, tag: 'Listening' },
      { label: 'Vocabulary', val: normalizeSVAR(s?.vocabulary), raw: s?.vocabulary || 0, tag: 'Reading' },
      { label: 'Grammar', val: normalizeWriteX(w?.grammar), raw: w?.grammar || 0, tag: 'Writing' },
      { label: 'Coherence', val: normalizeWriteX(w?.coherence), raw: w?.coherence || 0, tag: 'Writing' }
    ];
  }, [user.shlData]);

  // Tab Logic & Filtering (Case-insensitive matching)
  const { activeCourses, completedCourses } = useMemo(() => {
    const filtered = resources.filter(res => {
      if (activeSkill === 'All') return true;
      return res.tags.some(t => t.toLowerCase() === activeSkill.toLowerCase());
    });

    return {
      activeCourses: filtered.filter(r => r.progress?.status !== 'completed'),
      completedCourses: filtered.filter(r => r.progress?.status === 'completed')
    };
  }, [resources, activeSkill]);

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-tp-purple text-white rounded-xl shadow-lg">
              <BrainIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-tp-purple uppercase tracking-[0.4em]">Academy Registry</span>
          </div>
          <h1 className="text-5xl font-black text-tp-purple tracking-tighter leading-none">
            {user.name.split(' ')[0]}'s Hub
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-4">
            Level: {user.languageLevel} • Roster: {user.rosterId || 'Default'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-6 w-full md:w-auto">
          {/* Mastery Calculation Display */}
          <div className="bg-white px-8 py-5 rounded-[32px] shadow-sm border border-gray-100 flex items-center gap-6 w-fit ml-auto shadow-tp-purple/5">
            <div className="text-center">
              <p className="text-3xl font-black text-tp-purple leading-none">{progressPercent}%</p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">Overall Mastery</p>
            </div>
            <div className="w-12 h-12 bg-tp-red/10 rounded-full flex items-center justify-center text-tp-red">
              <TrendingUpIcon className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-1.5 rounded-[24px] shadow-sm border border-gray-100 flex flex-wrap gap-1 justify-end ml-auto">
            {['All', 'Listening', 'Speaking', 'Reading', 'Writing'].map((skill) => (
              <button
                key={skill}
                onClick={() => setActiveSkill(skill as SkillCategory)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeSkill === skill ? 'bg-tp-purple text-white shadow-lg shadow-tp-purple/20' : 'text-gray-400 hover:text-tp-purple'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar: Metrics */}
        <div className="lg:col-span-4 lg:sticky lg:top-8">
          <div className="bg-white border border-gray-100 rounded-[48px] p-8 shadow-xl flex flex-col shadow-tp-purple/5">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-tp-red rounded-full"></div>
              <h3 className="font-black text-tp-purple uppercase text-xs tracking-[0.2em]">Competency Metrics</h3>
            </div>
            
            <RadarChart data={metrics.map(m => ({ label: m.label, value: m.val }))} />
            
            <div className="w-full space-y-4 mt-8">
              {metrics.map(({ label, val, raw }) => (
                <div key={label}>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                    <span className="text-tp-purple">{label}</span>
                    <span className={val < GAP_THRESHOLD_NORMALIZED ? 'text-tp-red' : 'text-green-600'}>
                      {typeof raw === 'number' ? raw.toFixed(1) : raw}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${val < GAP_THRESHOLD_NORMALIZED ? 'bg-tp-red' : 'bg-tp-purple'}`} style={{ width: `${Math.min(val, 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content: Course Grid */}
        <div className="lg:col-span-8 space-y-12">
          {/* Section: Active Assignments */}
          <div>
            <div className="flex items-center justify-between mb-8 px-4">
              <h2 className="text-2xl font-black text-tp-purple tracking-tight uppercase flex items-center gap-3">
                <TargetIcon className="w-6 h-6 text-tp-red" />
                Active Assignments
              </h2>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{activeCourses.length} Modules</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeCourses.map((res) => (
                <div 
                  key={res.id} 
                  onClick={() => onOpenResource(res)} 
                  className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-lg hover:shadow-2xl transition-all cursor-pointer group flex flex-col justify-between min-h-[200px]"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-black text-tp-red uppercase tracking-[0.2em]">{res.tags[0]}</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest ${res.progress?.status === 'assigned' ? 'bg-tp-purple text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {res.progress?.status === 'assigned' ? 'MANUAL' : 'AUTO'}
                      </span>
                    </div>
                    <h3 className="font-black text-xl text-tp-purple group-hover:text-tp-red transition-colors leading-tight">{res.title}</h3>
                  </div>
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-50">
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{res.type}</span>
                    <span className="text-xs font-black uppercase tracking-widest text-tp-purple group-hover:translate-x-1 transition-transform">Launch Module →</span>
                  </div>
                </div>
              ))}
              {activeCourses.length === 0 && (
                <div className="col-span-full py-16 text-center text-gray-300 font-black uppercase text-xs tracking-widest border-2 border-dashed border-gray-100 rounded-[40px] bg-gray-50/30">
                  No active assignments in this category.
                </div>
              )}
            </div>
          </div>

          {/* Section: Completed History */}
          <div>
            <div className="flex items-center justify-between mb-8 px-4">
              <h2 className="text-2xl font-black text-tp-purple tracking-tight uppercase flex items-center gap-3">
                <CheckCircleIcon className="w-6 h-6 text-green-500" filled />
                Completed History
              </h2>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{completedCourses.length} Mastered</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {completedCourses.map((res) => (
                <div 
                  key={res.id} 
                  onClick={() => onOpenResource(res)} 
                  className="bg-white p-8 rounded-[40px] border-2 border-green-500/30 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group grayscale hover:grayscale-0"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-green-100 text-green-600 px-3 py-1 rounded-xl flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4" filled />
                        <span className="text-[9px] font-black uppercase">Completed</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{res.level}</span>
                    </div>
                    <h3 className="font-black text-lg text-tp-purple leading-tight">{res.title}</h3>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{res.tags[0]}</span>
                    {res.progress?.score && (
                      <span className="text-[10px] font-black text-green-600 uppercase">Score: {res.progress.score}%</span>
                    )}
                  </div>
                </div>
              ))}
              {completedCourses.length === 0 && (
                <div className="col-span-full py-16 text-center text-gray-300 font-black uppercase text-xs tracking-widest border-2 border-dashed border-gray-100 rounded-[40px] bg-gray-50/30">
                  Registry history is currently empty.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
