
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

  // Step 3: Split Content into Active and Completed groups
  const { activeCourses, completedCourses } = useMemo(() => {
    const active: Resource[] = [];
    const completed: Resource[] = [];

    resources.forEach(res => {
      // Filter by skill first if one is active
      const matchesSkill = activeSkill === 'All' || res.tags.some(t => t.toLowerCase() === activeSkill.toLowerCase());
      if (!matchesSkill) return;

      if (res.progress?.status === 'completed') {
        completed.push(res);
      } else {
        active.push(res);
      }
    });

    return { activeCourses: active, completedCourses: completed };
  }, [resources, activeSkill]);

  const progressPercent = resources.length > 0 
    ? Math.round((resources.filter(r => r.progress?.status === 'completed').length / resources.length) * 100) 
    : 0;

  return (
    <div className="space-y-10 animate-fadeIn">
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

      {/* Step 3: Render Active Learning Path */}
      {activeCourses.length > 0 && (
        <div className="bg-tp-purple rounded-[48px] p-10 text-white relative shadow-2xl overflow-hidden shadow-tp-purple/30">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
            <TargetIcon className="w-80 h-80 text-white" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black flex items-center tracking-tight uppercase mb-8">
              <TargetIcon className="mr-3 text-tp-red" /> Active Learning Path
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCourses.map((res) => (
                <div key={res.id} onClick={() => onOpenResource(res)} className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] hover:bg-white/20 transition-all cursor-pointer flex flex-col justify-between h-[180px] group border-white/5">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-tp-red uppercase tracking-[0.2em]">{res.tags[0]}</p>
                      <span className={`text-[8px] font-black bg-white/20 px-2 py-0.5 rounded-lg uppercase tracking-widest ${res.progress?.status === 'assigned' ? 'text-tp-red bg-white text-[9px] px-3' : 'text-white/60'}`}>
                        {res.progress?.status === 'assigned' ? 'MANUAL' : 'AUTO'}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-white transition-colors">{res.title}</h3>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{res.type}</span>
                    <span className="text-xs font-black uppercase tracking-widest group-hover:text-tp-red transition-all">Launch Module →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="bg-white border border-gray-100 rounded-[48px] p-8 shadow-xl h-full flex flex-col shadow-tp-purple/5">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-tp-red rounded-full"></div>
              <h3 className="font-black text-tp-purple uppercase text-xs tracking-[0.2em]">Competency Metrics</h3>
            </div>
            
            <RadarChart data={metrics.map(m => ({ label: m.label, value: m.val }))} />
            
            <div className="w-full space-y-4 mt-auto">
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

        {/* Step 3: Render Completed Mastery Log */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-8 px-4">
             <h2 className="text-2xl font-black text-tp-purple tracking-tight uppercase">Mastery Log</h2>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{completedCourses.length} Completed</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-20">
            {completedCourses.map((res) => (
              <div key={res.id} onClick={() => onOpenResource(res)} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm transition-all hover:shadow-lg cursor-pointer grayscale opacity-50 hover:grayscale-0 hover:opacity-100 group shadow-tp-purple/5">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 rounded-xl bg-green-100 text-green-600 group-hover:bg-tp-red group-hover:text-white transition-colors">
                      <CheckCircleIcon className="w-5 h-5" filled />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black bg-tp-purple/5 text-tp-purple px-2 py-0.5 rounded uppercase">{res.tags[0]}</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{res.level}</span>
                    </div>
                 </div>
                 <h3 className="font-black text-tp-purple text-base leading-tight">{res.title}</h3>
                 {res.progress?.score && (
                   <p className="mt-2 text-[10px] font-black text-tp-red uppercase tracking-widest">Mastery Score: {res.progress.score}%</p>
                 )}
              </div>
            ))}
            {completedCourses.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-300 font-black uppercase text-xs tracking-widest border-2 border-dashed border-gray-100 rounded-[40px] bg-gray-50/50">
                No completed records in the registry.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
