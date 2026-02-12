
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

/**
 * Normalization helper: Ensures all metrics are on a 0-100 scale for UI consistency.
 * If score <= 10 (SVAR), it's multiplied by 10.
 */
const normalizeScore = (val: number): number => {
  if (val <= 10) return val * 10;
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
          return <circle key={i} cx={x} cy={y} r="3" className="fill-white stroke-tp-red stroke-1" />;
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

    return [
      { label: 'Fluency', val: normalizeScore(s?.fluency || 0), raw: s?.fluency || 0, tag: 'Speaking' },
      { label: 'Pronunciation', val: normalizeScore(s?.pronunciation || 0), raw: s?.pronunciation || 0, tag: 'Speaking' },
      { label: 'Listening', val: normalizeScore(s?.activeListening || 0), raw: s?.activeListening || 0, tag: 'Listening' },
      { label: 'Vocabulary', val: normalizeScore(s?.vocabulary || 0), raw: s?.vocabulary || 0, tag: 'Reading' },
      { label: 'Grammar', val: normalizeScore(w?.grammar || 0), raw: w?.grammar || 0, tag: 'Writing' },
      { label: 'Coherence', val: normalizeScore(w?.coherence || 0), raw: w?.coherence || 0, tag: 'Writing' }
    ];
  }, [user.shlData]);

  const { recommended, filteredCurriculum } = useMemo(() => {
    const lowScores = metrics.filter(m => m.val < GAP_THRESHOLD_NORMALIZED);
    const gapTags = lowScores.map(m => m.tag.toLowerCase());

    const recs: Resource[] = [];
    const curriculum: Resource[] = [];

    resources.forEach(res => {
      const matchesSkill = activeSkill === 'All' || res.tags.some(t => t.toLowerCase() === activeSkill.toLowerCase());
      const isRelevantToGap = res.tags.some(t => gapTags.includes(t.toLowerCase()));

      if (matchesSkill) {
        if (isRelevantToGap && res.progress?.status !== 'completed') {
          recs.push(res);
        } else {
          curriculum.push(res);
        }
      }
    });

    return {
      recommended: recs.slice(0, 3), 
      filteredCurriculum: curriculum
    };
  }, [resources, metrics, activeSkill]);

  const progressPercent = resources.length > 0 
    ? Math.round((resources.filter(r => r.progress?.status === 'completed').length / resources.length) * 100) 
    : 0;

  const skillButtons: { name: SkillCategory; icon: React.ReactNode }[] = [
    { name: 'All', icon: <BrainIcon className="w-4 h-4" /> },
    { name: 'Listening', icon: <ListeningIcon className="w-4 h-4" /> },
    { name: 'Speaking', icon: <SpeakingIcon className="w-4 h-4" /> },
    { name: 'Reading', icon: <ReadingIcon className="w-4 h-4" /> },
    { name: 'Writing', icon: <PracticeIcon className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-10 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-tp-purple text-white rounded-xl shadow-lg">
              <BrainIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-tp-purple uppercase tracking-[0.4em]">Dual-Scale Gap Analysis</span>
          </div>
          <h1 className="text-5xl font-black text-tp-purple tracking-tighter leading-none">
            {user.name.split(' ')[0]}'s Hub
          </h1>
          <div className="mt-4">
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center">
              <span className="w-12 h-0.5 bg-tp-red mr-4"></span>
              Proficiency: {user.languageLevel} • Account: {user.id}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-6 w-full md:w-auto">
          <div className="bg-white px-8 py-5 rounded-[32px] shadow-sm border border-gray-100 flex items-center gap-6 w-fit ml-auto">
            <div className="text-center">
              <p className="text-3xl font-black text-tp-purple leading-none">{progressPercent}%</p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">Overall Mastery</p>
            </div>
            <div className="w-12 h-12 bg-tp-red/10 rounded-full flex items-center justify-center text-tp-red">
              <TrendingUpIcon className="w-6 h-6" />
            </div>
          </div>

          {/* 4-Skill Selector on the Right */}
          <div className="bg-white p-1.5 rounded-[24px] shadow-sm border border-gray-100 flex flex-wrap gap-1 justify-end ml-auto">
            {skillButtons.map((skill) => (
              <button
                key={skill.name}
                onClick={() => setActiveSkill(skill.name)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeSkill === skill.name
                    ? 'bg-tp-purple text-white shadow-lg shadow-tp-purple/20 scale-105'
                    : 'text-gray-400 hover:text-tp-purple hover:bg-tp-purple/5'
                }`}
              >
                <span className="scale-75">{skill.icon}</span>
                {skill.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {recommended.length > 0 && (
        <div className="bg-tp-purple rounded-[48px] p-10 text-white relative shadow-2xl overflow-hidden shadow-tp-purple/20">
          <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none">
            <TargetIcon className="w-64 h-64 text-white" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black flex items-center tracking-tight uppercase mb-8">
              <TargetIcon className="mr-3 text-tp-red" /> Priority Opportunities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommended.map((res) => (
                <div key={res.id} onClick={() => onOpenResource(res)} className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] hover:bg-white/20 hover:scale-[1.02] transition-all cursor-pointer group flex flex-col justify-between h-[180px]">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-tp-red uppercase tracking-[0.2em] truncate">{res.tags[0]}</p>
                      <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded uppercase">CRITICAL</span>
                    </div>
                    <h3 className="font-bold text-lg leading-tight line-clamp-2">{res.title}</h3>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{res.type}</span>
                    <span className="text-xs font-black uppercase tracking-widest group-hover:text-tp-red transition-colors">Start Path →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="bg-white border border-gray-100 rounded-[48px] p-8 shadow-xl relative overflow-hidden h-full flex flex-col items-center">
            <div className="absolute top-0 left-0 w-2 h-full bg-tp-red"></div>
            <div className="flex items-center gap-3 mb-6 w-full">
              <div className="w-10 h-10 bg-tp-red/10 rounded-xl flex items-center justify-center text-tp-red">
                <TargetIcon className="w-5 h-5" />
              </div>
              <h3 className="font-black text-tp-purple uppercase text-xs tracking-[0.2em]">Skill Radar (100% Scale)</h3>
            </div>
            
            <RadarChart data={metrics.map(m => ({ label: m.label, value: m.val }))} />

            <div className="w-full space-y-4 mt-4">
              {metrics.map(({ label, val, raw }) => (
                <div key={label}>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                    <span className="text-tp-purple">{label}</span>
                    <span className={val < GAP_THRESHOLD_NORMALIZED ? 'text-tp-red' : 'text-green-600'}>
                      {typeof raw === 'number' ? raw.toFixed(1) : raw} / {val <= 100 && raw <= 10 ? '10' : '100'}
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

        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-8 px-4">
            <h2 className="text-2xl font-black text-tp-purple tracking-tight uppercase">
              {activeSkill === 'All' ? 'Full Curriculum' : `${activeSkill} Focused Path`}
            </h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{filteredCurriculum.length} Modules</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-20">
            {filteredCurriculum.map((res) => (
              <div key={res.id} onClick={() => onOpenResource(res)} className={`group bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[140px] ${res.progress?.status === 'completed' ? 'grayscale opacity-60' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl ${res.progress?.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-tp-purple/5 text-tp-purple'}`}>
                    <CheckCircleIcon className="w-5 h-5" filled={res.progress?.status === 'completed'} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black bg-tp-purple/5 text-tp-purple px-2 py-0.5 rounded uppercase">{res.tags[0]}</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{res.level}</span>
                  </div>
                </div>
                <div>
                   <h3 className="font-black text-tp-purple text-base leading-tight group-hover:text-tp-red transition-colors mb-2">{res.title}</h3>
                   <p className="text-[10px] text-gray-400 line-clamp-1">{res.objective}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
