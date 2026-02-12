
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

  /**
   * Filtered logic based on:
   * 1. progress.status === 'assigned' (Manual Assignment)
   * 2. SHL Gap Match (AI Recommended)
   * 3. Completed (History)
   * 
   * General level matches that are neither gaps nor manual assignments are HIDDEN.
   */
  const { recommended, filteredCurriculum } = useMemo(() => {
    const lowScores = metrics.filter(m => m.val < GAP_THRESHOLD_NORMALIZED);
    const gapTags = lowScores.map(m => m.tag.toLowerCase());

    const recs: Resource[] = [];
    const curriculum: Resource[] = [];

    resources.forEach(res => {
      const matchesSkill = activeSkill === 'All' || res.tags.some(t => t.toLowerCase() === activeSkill.toLowerCase());
      if (!matchesSkill) return;

      const isManual = res.progress?.status === 'assigned' || res.progress?.status === 'open';
      const isGapMatch = res.tags.some(t => gapTags.includes(t.toLowerCase()));
      const isCompleted = res.progress?.status === 'completed';

      // Only show if it's manual, a gap match, or already completed
      if (isManual || isGapMatch || isCompleted) {
        if (isManual || (isGapMatch && !isCompleted)) {
          recs.push(res);
        } else {
          curriculum.push(res);
        }
      }
    });

    return { recommended: recs, filteredCurriculum: curriculum };
  }, [resources, metrics, activeSkill]);

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
            <span className="text-[10px] font-black text-tp-purple uppercase tracking-[0.4em]">Personalized Path</span>
          </div>
          <h1 className="text-5xl font-black text-tp-purple tracking-tighter leading-none">
            {user.name.split(' ')[0]}'s Hub
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-4">
            CEFR: {user.languageLevel} • ID: {user.id}
          </p>
        </div>

        <div className="flex flex-col items-end gap-6 w-full md:w-auto">
          <div className="bg-white px-8 py-5 rounded-[32px] shadow-sm border border-gray-100 flex items-center gap-6 w-fit ml-auto">
            <div className="text-center">
              <p className="text-3xl font-black text-tp-purple leading-none">{progressPercent}%</p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">Proficiency</p>
            </div>
            <div className="w-12 h-12 bg-tp-red/10 rounded-full flex items-center justify-center text-tp-red">
              <TrendingUpIcon className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-1.5 rounded-[24px] shadow-sm border border-gray-100 flex flex-wrap gap-1 justify-end ml-auto">
            {[
              { name: 'All', icon: <BrainIcon className="w-4 h-4" /> },
              { name: 'Listening', icon: <ListeningIcon className="w-4 h-4" /> },
              { name: 'Speaking', icon: <SpeakingIcon className="w-4 h-4" /> },
              { name: 'Reading', icon: <ReadingIcon className="w-4 h-4" /> },
              { name: 'Writing', icon: <PracticeIcon className="w-4 h-4" /> }
            ].map((skill) => (
              <button
                key={skill.name}
                onClick={() => setActiveSkill(skill.name as SkillCategory)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeSkill === skill.name ? 'bg-tp-purple text-white shadow-lg' : 'text-gray-400 hover:text-tp-purple'
                }`}
              >
                {skill.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {recommended.length > 0 && (
        <div className="bg-tp-purple rounded-[48px] p-10 text-white relative shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none">
            <TargetIcon className="w-64 h-64 text-white" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black flex items-center tracking-tight uppercase mb-8">
              <TargetIcon className="mr-3 text-tp-red" /> Priority Modules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommended.map((res) => (
                <div key={res.id} onClick={() => onOpenResource(res)} className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] hover:bg-white/20 transition-all cursor-pointer flex flex-col justify-between h-[180px]">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-tp-red uppercase tracking-[0.2em]">{res.tags[0]}</p>
                      <span className="text-[8px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase">
                        {res.progress?.status === 'assigned' ? 'MANUAL' : 'GAP MATCH'}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg leading-tight line-clamp-2">{res.title}</h3>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{res.type}</span>
                    <span className="text-xs font-black uppercase tracking-widest hover:text-tp-red transition-colors">Start →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="bg-white border border-gray-100 rounded-[48px] p-8 shadow-xl h-full">
            <h3 className="font-black text-tp-purple uppercase text-xs tracking-[0.2em] mb-6">Skill Calibration</h3>
            <RadarChart data={metrics.map(m => ({ label: m.label, value: m.val }))} />
            <div className="w-full space-y-4 mt-8">
              {metrics.map(({ label, val, raw }) => (
                <div key={label}>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                    <span className="text-tp-purple">{label}</span>
                    <span className={val < GAP_THRESHOLD_NORMALIZED ? 'text-tp-red' : 'text-green-600'}>{raw}</span>
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
             <h2 className="text-2xl font-black text-tp-purple tracking-tight uppercase">Mastery Log</h2>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{filteredCurriculum.length} Completed</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredCurriculum.map((res) => (
              <div key={res.id} onClick={() => onOpenResource(res)} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm transition-all hover:shadow-lg cursor-pointer grayscale opacity-60">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 rounded-xl bg-green-100 text-green-600">
                      <CheckCircleIcon className="w-5 h-5" filled />
                    </div>
                    <span className="text-[9px] font-black text-gray-400 uppercase">{res.level}</span>
                 </div>
                 <h3 className="font-black text-tp-purple text-base leading-tight">{res.title}</h3>
              </div>
            ))}
            {filteredCurriculum.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest border-2 border-dashed border-gray-100 rounded-[40px]">
                No completed records found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
