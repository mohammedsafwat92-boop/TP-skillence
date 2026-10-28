
import React, { useMemo, useState, useEffect } from 'react';
import type { UserProfile, Resource, View, SkillCategory } from '../types';
import { ResourceType } from '../types';
import { getMyLessons } from '../services/progressService';
import { googleSheetService } from '../services/googleSheetService';
import { Sparkles, Loader2, ShieldCheck, FileText } from 'lucide-react';
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

const Dashboard: React.FC<DashboardProps> = ({ user, resources, onNavigate, onOpenResource, initialSkill }) => {
  const [activeSkill, setActiveSkill] = useState<SkillCategory>(initialSkill || 'All');
  
  // Instant SWR cache hydration for zero-delay dashboard rendering
  const [myLessons, setMyLessons] = useState<any[]>(() => {
    const uid = user?.id || (user as any)?.uid || user?.email;
    if (!uid) return [];
    const cached = googleSheetService.getCachedMyLessons(uid);
    return Array.isArray(cached) ? cached : [];
  });
  const [isLoadingMyLessons, setIsLoadingMyLessons] = useState<boolean>(() => {
    const uid = user?.id || (user as any)?.uid || user?.email;
    if (!uid) return false;
    const cached = googleSheetService.getCachedMyLessons(uid);
    return !(Array.isArray(cached) && cached.length > 0);
  });

  useEffect(() => {
    if (initialSkill) setActiveSkill(initialSkill);
  }, [initialSkill]);

  useEffect(() => {
    const loadShieldedLessons = async () => {
      const uid = user?.id || (user as any)?.uid || user?.email;
      if (!uid) {
        setIsLoadingMyLessons(false);
        return;
      }
      
      const cached = googleSheetService.getCachedMyLessons(uid);
      if (Array.isArray(cached) && cached.length > 0) {
        setMyLessons(cached);
        setIsLoadingMyLessons(false);
      } else {
        setIsLoadingMyLessons(true);
      }

      try {
        const fetched = await getMyLessons(uid, (fresh) => {
          if (Array.isArray(fresh)) {
            setMyLessons(fresh);
            setIsLoadingMyLessons(false);
          }
        });
        if (Array.isArray(fetched)) {
          setMyLessons(fetched);
        }
      } catch (err) {
        console.error("Failed to fetch user shielded lessons:", err);
      } finally {
        setIsLoadingMyLessons(false);
      }
    };

    loadShieldedLessons();
  }, [user]);

  const GAP_THRESHOLD_NORMALIZED = 80;

  // Mastery Calculation: (Number of Completed Courses / Total Assigned Courses) * 100
  const progressPercent = useMemo(() => {
    if (resources.length === 0) return 0;
    const completedCount = resources.filter(r => r.progress?.status === 'completed').length;
    return Math.round((completedCount / resources.length) * 100);
  }, [resources]);

  const competencyMetrics = useMemo(() => {
    const m = user?.metrics || {};
    const svar = m.svar || {};
    const writex = m.writex || {};

    const fallback = (val: any, fallbackVal: any) => {
      if (val !== undefined && val !== null && val !== '') return Number(val);
      if (fallbackVal !== undefined && fallbackVal !== null && fallbackVal !== '') return Number(fallbackVal);
      return 0;
    };

    return [
      { label: 'Fluency', score: fallback(svar.fluency, m.fluency) },
      { label: 'Vocabulary', score: fallback(svar.vocabulary, m.vocabulary) },
      { label: 'Grammar', score: fallback(writex.grammar, m.grammar || svar.grammar) },
      { label: 'Pronunciation', score: fallback(svar.pronunciation, m.pronunciation) },
      { label: 'Coherence', score: fallback(writex.coherence, m.coherence || svar.coherence) }
    ];
  }, [user]);

  const isMetricsEmpty = useMemo(() => {
    const m = user?.metrics;
    if (!m) return true;
    
    const svar = m.svar || {};
    const writex = m.writex || {};
    
    // Check nested svar
    const svarKeys = Object.keys(svar).filter(k => svar[k as keyof typeof svar] !== undefined && svar[k as keyof typeof svar] !== null && svar[k as keyof typeof svar] !== '');
    // Check nested writex
    const keysWritex = Object.keys(writex).filter(k => writex[k as keyof typeof writex] !== undefined && writex[k as keyof typeof writex] !== null);
    const writexKeys = keysWritex.filter(k => writex[k as keyof typeof writex] !== '');
    
    // Check flat keys
    const flatKeys = ['fluency', 'vocabulary', 'grammar', 'pronunciation', 'coherence'];
    const hasFlat = flatKeys.some(k => m[k] !== undefined && m[k] !== null && m[k] !== '');

    return svarKeys.length === 0 && writexKeys.length === 0 && !hasFlat;
  }, [user]);

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

  // Calculate Progress Stats
  const WEEKLY_TARGET = 180;

  const stats = useMemo(() => {
    const now = new Date();
    // Calculate start of current week (Sunday)
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);

    const nonGeneralResources = resources.filter(r => !(r.tags || []).includes('general'));
    const totalAssigned = nonGeneralResources.length;
    const completedCount = nonGeneralResources.filter(r => r.progress?.status === 'completed').length;

    const weeklyMinutes = nonGeneralResources.reduce((acc, res) => {
      if (res.progress?.status === 'completed' && res.progress.completedAt) {
        const completedDate = new Date(res.progress.completedAt);
        if (completedDate >= startOfWeek) {
          return acc + (parseInt(String(res.duration)) || 15);
        }
      }
      return acc;
    }, 0);

    // Calculate days remaining in the current week (until next Sunday)
    const nextSunday = new Date(startOfWeek);
    nextSunday.setDate(startOfWeek.getDate() + 7);
    const diffTime = nextSunday.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Calculate weekly average score
    const weeklyCompleted = resources.filter(r => 
      r.progress?.status === 'completed' && 
      r.progress.completedAt && 
      new Date(r.progress.completedAt) >= startOfWeek
    );

    const scoredCompleted = weeklyCompleted.filter(r => 
      r.progress?.score !== undefined && 
      r.progress.score !== null && 
      r.progress.score > 0
    );

    const weeklyAverageScore = scoredCompleted.length > 0
      ? Math.round(scoredCompleted.reduce((sum, r) => sum + (r.progress.score || 0), 0) / scoredCompleted.length)
      : 0;

    return {
      weeklyProgress: Math.min(Math.round((weeklyMinutes / WEEKLY_TARGET) * 100), 100),
      weeklyMinutes,
      daysRemaining,
      overallProgress: totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0,
      completedCount,
      totalAssigned,
      weeklyAverageScore
    };
  }, [resources]);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 bg-tp-purple text-white rounded-lg shadow-sm">
              <BrainIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-tp-purple uppercase tracking-wider">Academy Registry</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {user.name.split(' ')[0]}'s Hub
          </h1>
          <p className="text-slate-500 font-semibold text-xs mt-1.5 uppercase tracking-wider">
            Level: {user.languageLevel} • Roster: {user.rosterId || 'Default'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-4 w-full md:w-auto">
          {/* Weekly Status Section */}
          <div className="bg-white px-6 py-5 rounded-2xl shadow-sm border border-slate-200/80 w-full md:w-[380px]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Weekly Status</h3>
              <span className="text-xs font-bold text-tp-red uppercase tracking-wider bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-lg">
                {stats.daysRemaining} Days Left
              </span>
            </div>
            <div className="flex justify-between items-end mb-2.5">
              <div>
                <p className="text-2xl font-bold text-tp-purple">
                  {stats.weeklyMinutes} <span className="text-xs text-slate-400 font-normal">/ 180 MINS</span>
                </p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                  Weekly Avg Score: {stats.weeklyAverageScore > 0 ? `${stats.weeklyAverageScore}%` : 'N/A'}
                </p>
              </div>
              <span className="text-xs font-bold text-tp-purple">{stats.weeklyProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-tp-purple h-full rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${stats.weeklyProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-200/80 flex flex-wrap gap-1 justify-end ml-auto">
            {['All', 'Listening', 'Speaking', 'Reading', 'Writing'].map((skill) => (
              <button
                key={skill}
                onClick={() => setActiveSkill(skill as SkillCategory)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeSkill === skill ? 'bg-tp-purple text-white shadow-sm' : 'text-slate-600 hover:text-tp-purple hover:bg-slate-50'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Weekly Target</p>
              <h3 className="text-2xl font-bold text-tp-purple">
                {stats.weeklyMinutes} <span className="text-xs text-slate-400 font-normal">/ 180 mins</span>
              </h3>
            </div>
            <span className="text-xs font-bold text-tp-purple bg-purple-50 px-2.5 py-1 rounded-lg">
              {stats.weeklyProgress}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-tp-purple h-2.5 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${stats.weeklyProgress}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Overall Progress</p>
              <h3 className="text-2xl font-bold text-emerald-600">
                {stats.completedCount} <span className="text-xs text-slate-400 font-normal">/ {stats.totalAssigned} Courses</span>
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              {stats.overallProgress}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${stats.overallProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar: Metrics */}
        <div className="lg:col-span-4 lg:sticky lg:top-8">
          {/* Competency Metrics Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
            <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5 text-tp-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Competency Metrics
            </h3>
            
            {isMetricsEmpty ? (
              <div className="py-8 text-center flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <span className="text-lg font-bold text-slate-400 block mb-1">N/A</span>
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Pending Assessment</span>
              </div>
            ) : (
              <div className="space-y-4">
                {competencyMetrics.map((metric, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-slate-700">{metric.label}</span>
                      <span className="text-xs font-bold text-slate-900">{metric.score > 0 ? `${metric.score}%` : 'N/A'}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                          metric.score >= 80 ? 'bg-emerald-600' : 
                          metric.score >= 60 ? 'bg-amber-500' : 
                          metric.score > 0 ? 'bg-rose-500' : 'bg-slate-300'
                        }`}
                        style={{ width: `${metric.score}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Course Grid */}
        <div className="lg:col-span-8 space-y-10">
          {/* Section: Assigned Interactive Lessons (Shielded) */}
          <div className="bg-gradient-to-br from-tp-purple/5 to-tp-red/5 p-6 md:p-8 rounded-3xl border border-tp-purple/20 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-tp-purple text-white rounded-xl shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                    Assigned Interactive Lessons
                  </h2>
                  <p className="text-xs font-medium text-slate-500">
                    Shielded content authorized for {user.name}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-tp-purple uppercase tracking-wider bg-white px-3 py-1.5 rounded-lg shadow-sm border border-tp-purple/10">
                {myLessons.length} Authorized
              </span>
            </div>

            {isLoadingMyLessons ? (
              <div className="py-12 text-center text-slate-500 font-bold flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-tp-purple animate-spin" />
                <p className="text-xs uppercase tracking-wider">Fetching your authorized lessons...</p>
              </div>
            ) : myLessons.length === 0 ? (
              <div className="py-12 px-6 text-center text-slate-500 font-semibold text-xs uppercase tracking-wider border-2 border-dashed border-tp-purple/20 rounded-2xl bg-white/60">
                You have no assigned lessons at this time.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myLessons.map((lesson, idx) => {
                  const lessonData = lesson.lessonData || lesson;
                  const lessonId = lesson.id || lessonData.id;
                  const title = lessonData.title || lesson.title || 'Interactive Lesson';
                  const docxFilename = lessonData.docxFilename;
                  const audioCount = lessonData.blocks?.filter((b: any) => b.type === 'audio')?.length || 0;
                  const freetextCount = lessonData.blocks?.filter((b: any) => b.type === 'freetext')?.length || 0;

                  return (
                    <div
                      key={lessonId || idx}
                      onClick={() => {
                        const resObj: Resource = {
                          id: lessonId,
                          title: title,
                          url: `interactive:${lessonId}`,
                          type: ResourceType.Practice,
                          tags: ['Interactive', 'DOCX'],
                          level: (user.languageLevel as any) || 'B2',
                          objective: `Interactive practice with ${audioCount} audio tracks and ${freetextCount} free-text questions.`,
                          duration: 20,
                          progress: { status: 'assigned' },
                          ...( { interactiveLesson: lessonData } as any )
                        };
                        onOpenResource(resObj);
                      }}
                      className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-tp-purple/40 transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-tp-purple uppercase tracking-wider bg-purple-50 px-2.5 py-1 rounded-lg">
                            Interactive .DOCX
                          </span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Shielded
                          </span>
                        </div>
                        <h3 className="font-bold text-base md:text-lg text-slate-900 group-hover:text-tp-purple transition-colors leading-snug">
                          {title}
                        </h3>
                        {docxFilename && (
                          <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" /> {docxFilename}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          {audioCount > 0 && <span>🎧 {audioCount} Audio</span>}
                          {freetextCount > 0 && <span>✍️ {freetextCount} Written</span>}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-tp-purple group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Start Lesson →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Active Assignments */}
          <div>
            <div className="flex items-center justify-between mb-6 px-1">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <TargetIcon className="w-5 h-5 text-tp-red" />
                Active Assignments
              </h2>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{activeCourses.length} Modules</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeCourses.map((res, idx) => (
                <div 
                  key={`active-course-${res.id || idx}`} 
                  onClick={() => onOpenResource(res)} 
                  className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-tp-purple/40 transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-bold text-tp-red uppercase tracking-wider">{res.tags[0]}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${res.progress?.status === 'assigned' ? 'bg-purple-100 text-tp-purple' : 'bg-slate-100 text-slate-600'}`}>
                        {res.progress?.status === 'assigned' ? 'MANUAL' : 'AUTO'}
                      </span>
                    </div>
                    <h3 className="font-bold text-base md:text-lg text-slate-900 group-hover:text-tp-purple transition-colors leading-snug">{res.title}</h3>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{res.type}</span>
                      <span className="text-xs font-semibold text-tp-purple bg-purple-50 px-2 py-0.5 rounded-md">{res.duration || '10'} mins</span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-tp-purple group-hover:translate-x-1 transition-transform">Launch Module →</span>
                  </div>
                </div>
              ))}
              {activeCourses.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-400 font-semibold uppercase text-xs tracking-wider border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  No active assignments in this category.
                </div>
              )}
            </div>
          </div>

          {/* Section: Completed History */}
          <div>
            <div className="flex items-center justify-between mb-6 px-1">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" filled />
                Completed History
              </h2>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{completedCourses.length} Mastered</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {completedCourses.map((res, idx) => (
                <div 
                  key={`completed-course-${res.id || idx}`} 
                  onClick={() => onOpenResource(res)} 
                  className="bg-slate-50/60 p-6 rounded-2xl border border-emerald-200/80 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between min-h-[160px] group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg flex items-center gap-1.5">
                        <CheckCircleIcon className="w-3.5 h-3.5" filled />
                        <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
                      </div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{res.level}</span>
                    </div>
                    <h3 className="font-bold text-base md:text-lg text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors">{res.title}</h3>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{res.tags[0]}</span>
                    {res.progress?.score && (
                      <span className="text-xs font-bold text-emerald-600 uppercase">Score: {res.progress.score}%</span>
                    )}
                  </div>
                </div>
              ))}
              {completedCourses.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-400 font-semibold uppercase text-xs tracking-wider border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
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
