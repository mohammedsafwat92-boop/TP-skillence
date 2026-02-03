
import React from 'react';
import type { UserProfile, Resource, View } from '../types';
import { TrendingUpIcon, TargetIcon, BadgeIcon, WorksheetIcon, CheckCircleIcon, BrainIcon, SpeakingIcon } from './Icons';

interface DashboardProps {
  user: UserProfile;
  resources: Resource[];
  onNavigate: (view: View) => void;
  onOpenResource: (resource: Resource) => void;
  isDemo?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ user, resources = [], onNavigate, onOpenResource, isDemo }) => {
  const safeResources = Array.isArray(resources) ? resources : [];
  const completedCount = safeResources.filter(r => r.progress.status === 'completed').length;
  const progressPercent = safeResources.length > 0 ? Math.round((completedCount / safeResources.length) * 100) : 0;

  const PASS_MARK = 75;
  const focusSkills: string[] = [];
  if (user.performanceData) {
    if (user.performanceData.grammar < PASS_MARK) focusSkills.push('Grammar');
    if (user.performanceData.fluency < PASS_MARK) focusSkills.push('Fluency');
    if (user.performanceData.pronunciation < PASS_MARK) focusSkills.push('Pronunciation');
    if (user.performanceData.vocabulary < PASS_MARK) focusSkills.push('Vocabulary');
  }

  const recommendedResources = safeResources.filter(res => {
    if (res.progress.status === 'completed') return false;
    return res.tags.some(tag => focusSkills.includes(tag)) || res.level === user.languageLevel;
  }).slice(0, 4);

  return (
    <div className="space-y-10 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-tp-purple text-white rounded-xl shadow-lg">
              <BrainIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-tp-purple uppercase tracking-[0.4em]">Language Academy Registry</span>
          </div>
          <h1 className="text-5xl font-black text-tp-purple tracking-tighter leading-none">
            {user.name.split(' ')[0]}
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-4 flex items-center">
            <span className="w-12 h-0.5 bg-tp-red mr-4"></span>
            CEFR: {user.languageLevel} • ID: {user.id}
          </p>
        </div>

        <div className="flex gap-4">
            <button 
              onClick={() => onNavigate({ type: 'live-coach' })}
              className="bg-tp-navy text-white px-8 py-5 rounded-[32px] font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:bg-tp-purple transition-all flex items-center group"
            >
              <SpeakingIcon className="w-5 h-5 mr-3 text-tp-red group-hover:animate-pulse" />
              Live AI Practice
            </button>
            <div className="bg-white px-8 py-5 rounded-[32px] shadow-[0_20px_40px_rgba(46,8,84,0.05)] border border-gray-100 flex items-center gap-6">
                <div className="text-center">
                    <p className="text-3xl font-black text-tp-purple leading-none">{progressPercent}%</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">Proficiency</p>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
              <div className="bg-tp-purple rounded-[48px] p-10 text-white relative shadow-2xl overflow-hidden shadow-tp-purple/20">
                <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none">
                    <BrainIcon className="w-64 h-64 text-white" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black flex items-center tracking-tight">
                        <TargetIcon className="mr-3 text-tp-red" /> Remedial Path
                    </h2>
                    <span className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Gaps: {focusSkills.join(', ') || 'None Detected'}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {recommendedResources.map((res) => (
                      <div 
                        key={res.id} 
                        onClick={() => onOpenResource(res)}
                        className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] hover:bg-white/20 hover:scale-[1.02] transition-all cursor-pointer group flex flex-col justify-between h-[160px]"
                      >
                        <div>
                          <p className="text-[10px] font-black text-tp-red uppercase tracking-[0.2em] mb-2">{res.tags[0]}</p>
                          <h3 className="font-bold text-lg leading-tight line-clamp-2">{res.title}</h3>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{res.type}</span>
                            <span className="text-xs font-black uppercase tracking-widest">Master →</span>
                        </div>
                      </div>
                    ))}
                    {recommendedResources.length === 0 && (
                      <div className="col-span-2 py-10 text-center opacity-50">
                        <p className="font-black uppercase text-xs tracking-widest">No immediate gaps detected for your current level.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
          </div>

          <div className="lg:col-span-4 flex flex-col">
              <div className="bg-white border border-gray-100 rounded-[48px] p-8 shadow-xl flex-1 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-tp-red"></div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-tp-red/10 rounded-xl flex items-center justify-center text-tp-red">
                        <TrendingUpIcon className="w-5 h-5" />
                    </div>
                    <h3 className="font-black text-tp-purple uppercase text-xs tracking-[0.2em]">Academy Stats</h3>
                </div>
                
                <div className="space-y-6 flex-1">
                    <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Language Scorecard</p>
                      <div className="space-y-3">
                        {user.performanceData && Object.entries(user.performanceData).map(([key, val]) => {
                          if (key === 'testDate') return null;
                          return (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-600 capitalize">{key}</span>
                              <span className={`text-xs font-black ${Number(val) < PASS_MARK ? 'text-tp-red' : 'text-tp-purple'}`}>{val}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                </div>

                <button 
                  onClick={() => onNavigate({ type: 'quiz', quizId: 'adaptive_test' })}
                  className="mt-8 w-full bg-tp-purple text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-tp-navy transition-all shadow-xl"
                >
                    Retake Calibration
                </button>
              </div>
          </div>
      </div>

      <div className="pt-10">
        <div className="flex items-center justify-between mb-8 px-4">
            <h2 className="text-2xl font-black text-tp-purple tracking-tight">Full Academy Curriculum</h2>
            <div className="h-px bg-gray-200 flex-1 mx-8 hidden sm:block"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{safeResources.length} Modules Available</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {safeResources.map((res) => (
            <div 
              key={res.id} 
              onClick={() => onOpenResource(res)}
              className={`group bg-white p-6 rounded-[32px] border border-gray-100 shadow-[0_15px_30px_rgba(0,0,0,0.03)] transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[160px] ${res.progress.status === 'completed' ? 'grayscale opacity-60' : ''}`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl ${res.progress.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-tp-purple/5 text-tp-purple'}`}>
                    <CheckCircleIcon className="w-5 h-5" filled={res.progress.status === 'completed'} />
                  </div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{res.level}</span>
                </div>
                <h3 className="font-black text-tp-purple text-base leading-tight group-hover:text-tp-red transition-colors">{res.title}</h3>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-[9px] font-black text-tp-navy/60 bg-tp-navy/5 px-2 py-1 rounded-md uppercase tracking-widest">{res.type}</span>
                <span className="text-[10px] font-bold text-gray-300 group-hover:text-tp-purple transition-colors">Start →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
