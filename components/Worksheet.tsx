
import React, { useState, useCallback, useEffect } from 'react';
import { generateWorksheetQuestions } from '../services/geminiService';
import type { QuizQuestion, Lesson, Module, View, Quiz, UserProgress, ActivityLog } from '../types';
import { ResourceType } from '../types';
import { quizzes } from '../data/trainingData';
import { WatchIcon, ReadIcon, ListenIcon, PracticeIcon, WorksheetIcon, LinkIcon, CheckCircleIcon, TrendingUpIcon, ExclamationCircleIcon, BadgeIcon, ChartBarIcon, SpeakingIcon } from './Icons';

interface WorksheetProps {
  modules: { [id: string]: Module };
  view: View;
  onNavigate: (view: View) => void;
  progress: UserProgress;
  onToggleLesson: (lessonTitle: string) => void;
  onQuizComplete: (quizId: string, score: number) => void;
  userLevel?: string;
}

const LessonCard: React.FC<{
    lesson: Lesson; 
    isCompleted: boolean; 
    onToggle: (title: string) => void;
}> = ({ lesson, isCompleted, onToggle }) => {
    const isClickable = !!lesson.link;
    
    const handleToggleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(lesson.title);
    };

    const content = (
        <div className={`glass-card p-5 rounded-2xl border transition-all duration-300 ${isClickable ? 'hover:shadow-xl hover:-translate-y-1 hover:border-tp-red cursor-pointer' : ''} ${isCompleted ? 'opacity-60 bg-gray-50/50' : 'bg-white shadow-lg shadow-tp-purple/5'}`}>
             <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <h3 className={`font-bold text-lg leading-tight ${isCompleted ? 'text-gray-400 line-through font-medium' : 'text-tp-purple'}`}>
                        {lesson.title}
                    </h3>
                    <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2 space-x-3">
                        <span className={`px-2 py-0.5 rounded ${lesson.isCustom ? 'bg-tp-red/10 text-tp-red border border-tp-red/20' : 'bg-gray-100 text-gray-400'}`}>
                            {lesson.level}
                        </span>
                        {lesson.duration && <span className="flex items-center"><svg className="w-3 h-3 mr-1 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>{lesson.duration}</span>}
                    </div>
                </div>
                <button 
                    onClick={handleToggleClick} 
                    className={`ml-4 p-2 rounded-xl transition-all ${isCompleted ? 'bg-green-50 text-green-500 shadow-inner' : 'bg-gray-50 text-gray-300 hover:text-tp-red hover:bg-tp-red/5'}`}
                >
                    <CheckCircleIcon filled={isCompleted} />
                </button>
            </div>
             <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                 {lesson.objective ? (
                     <p className="text-xs text-gray-500 font-medium italic flex-1 pr-4">"{lesson.objective.split('-')[0]}"</p>
                 ) : <span className="flex-1" />}
                 
                 <div className="flex items-center px-3 py-1 bg-tp-purple/5 text-tp-purple rounded-full text-[10px] font-black uppercase tracking-widest">
                    <span className="scale-75 mr-1.5 opacity-80">{getResourceTypeIcon(lesson.type)}</span>
                    {lesson.type}
                </div>
             </div>
        </div>
    );

    if (isClickable) {
        return <a href={lesson.link} target="_blank" rel="noopener noreferrer" className="block h-full">{content}</a>;
    }
    
    return <div className="h-full">{content}</div>;
};

const getResourceTypeIcon = (type: ResourceType) => {
    switch(type) {
        case ResourceType.Watch: return <WatchIcon />;
        case ResourceType.Read: return <ReadIcon />;
        case ResourceType.Listen: return <ListenIcon />;
        case ResourceType.Practice: return <PracticeIcon />;
        case ResourceType.Hyperlink: return <LinkIcon />;
        default: return null;
    }
};

const ActivityChart: React.FC<{ history: ActivityLog[] }> = ({ history }) => {
    const days = [];
    const counts = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        const count = history.filter(h => h.date.startsWith(dateStr)).length;
        counts.push(count);
    }

    const maxCount = Math.max(...counts, 5);
    const height = 100;
    const barWidth = 34;
    const gap = 12;

    return (
        <div className="flex flex-col items-center">
            <svg width="100%" height={height + 30} viewBox={`0 0 ${days.length * (barWidth + gap)} ${height + 30}`}>
                {counts.map((count, i) => {
                    const barHeight = (count / maxCount) * height;
                    const x = i * (barWidth + gap);
                    const y = height - barHeight;
                    return (
                        <g key={i} className="group cursor-help">
                            <rect 
                                x={x} 
                                y={y} 
                                width={barWidth} 
                                height={barHeight} 
                                className="fill-tp-purple transition-all group-hover:fill-tp-red" 
                                rx="8"
                            />
                            <text x={x + barWidth / 2} y={height + 20} textAnchor="middle" className="text-[10px] fill-gray-400 font-bold uppercase">
                                {days[i]}
                            </text>
                            {count > 0 && (
                                <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" className="text-[10px] fill-tp-purple font-black">
                                    {count}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const PerformanceChart: React.FC<{ history: ActivityLog[] }> = ({ history }) => {
    const quizLogs = history.filter(h => h.type === 'quiz' && h.score !== undefined);
    if (quizLogs.length === 0) return <div className="h-32 flex items-center justify-center text-gray-400 text-xs font-bold uppercase tracking-widest">Awaiting assessment data</div>;

    const data = quizLogs.slice(-10);
    const height = 100;
    const width = 300;
    const padding = 25;
    
    const points = data.map((log, i) => {
        const x = padding + (i / (Math.max(data.length - 1, 1))) * (width - 2 * padding);
        const y = height - padding - ((log.score || 0) / 100) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="flex flex-col items-center w-full">
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="#f1f5f9" strokeWidth="2" />
                <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#f1f5f9" strokeWidth="2" />
                <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#f1f5f9" strokeWidth="2" />
                <polyline points={points} fill="none" stroke="#E2001A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
                {data.map((log, i) => {
                    const x = padding + (i / (Math.max(data.length - 1, 1))) * (width - 2 * padding);
                    const y = height - padding - ((log.score || 0) / 100) * (height - 2 * padding);
                    return <circle key={i} cx={x} cy={y} r="5" className="fill-white stroke-tp-purple stroke-[3px]" />;
                })}
            </svg>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Growth Trajectory</p>
        </div>
    );
};

const DashboardView: React.FC<{
    modules: { [id: string]: Module }, 
    onNavigate: (view: View) => void,
    progress: UserProgress
}> = ({ modules, onNavigate, progress }) => {
    const totalLessons = (Object.values(modules) as Module[]).reduce((acc, mod) => acc + mod.lessons.length, 0);
    const completedLessonsCount = progress.completedLessons.length;
    const completedPercentage = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;
    
    const totalQuizzes = quizzes.length;
    const completedQuizzes = Object.keys(progress.quizScores).length;
    const averageScore = completedQuizzes > 0 
        ? Math.round((Object.values(progress.quizScores) as number[]).reduce((a, b) => a + b, 0) / completedQuizzes)
        : 0;

    const personalPlan: { module: Module, lesson: Lesson }[] = [];
    (Object.values(modules) as Module[]).forEach(mod => {
        mod.lessons.forEach(l => {
            if (l.isCustom && l.assignedTo && !progress.completedLessons.includes(l.title)) {
                personalPlan.push({ module: mod, lesson: l });
            }
        });
    });

    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-4xl font-black text-tp-purple tracking-tight">Agent Hub</h1>
                <div className="flex items-center mt-2">
                    <div className="h-1.5 w-12 bg-tp-red rounded-full mr-3"></div>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px]">Empowering Interaction • {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                </div>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="glass-card p-8 rounded-3xl shadow-xl shadow-tp-purple/5 border border-white/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-tp-purple/5 rounded-bl-full -mr-8 -mt-8 group-hover:bg-tp-red/5 transition-colors"></div>
                    <div className="flex items-center mb-4">
                        <div className="p-3 rounded-2xl bg-tp-purple/5 text-tp-purple">
                            <TrendingUpIcon />
                        </div>
                        <p className="ml-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Progress</p>
                    </div>
                    <p className="text-4xl font-black text-tp-purple">{completedPercentage}%</p>
                    <p className="text-xs text-gray-500 font-medium mt-1">{completedLessonsCount} Lessons Mastered</p>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-tp-purple transition-all duration-1000" style={{ width: `${completedPercentage}%` }}></div>
                    </div>
                </div>

                <div className="glass-card p-8 rounded-3xl shadow-xl shadow-tp-purple/5 border border-white/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-tp-red/5 rounded-bl-full -mr-8 -mt-8"></div>
                    <div className="flex items-center mb-4">
                        <div className="p-3 rounded-2xl bg-tp-red/5 text-tp-red">
                            <BadgeIcon className="w-6 h-6" />
                        </div>
                        <p className="ml-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Efficiency</p>
                    </div>
                    <p className="text-4xl font-black text-tp-purple">{averageScore}%</p>
                    <p className="text-xs text-gray-500 font-medium mt-1">Average Proficiency</p>
                </div>

                <div className="glass-card p-8 rounded-3xl shadow-xl shadow-tp-purple/5 border border-white/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-tp-purple/5 rounded-bl-full -mr-8 -mt-8"></div>
                    <div className="flex items-center mb-4">
                        <div className="p-3 rounded-2xl bg-tp-purple/5 text-tp-purple">
                            <WorksheetIcon className="w-6 h-6" />
                        </div>
                        <p className="ml-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Assessments</p>
                    </div>
                    <p className="text-4xl font-black text-tp-purple">{completedQuizzes}</p>
                    <p className="text-xs text-gray-500 font-medium mt-1">Tests Successfully Taken</p>
                </div>
            </div>

            {/* Specialized Plan Overlay */}
            {personalPlan.length > 0 && (
                <div className="bg-tp-purple rounded-3xl p-8 text-white relative shadow-2xl overflow-hidden shadow-tp-purple/40">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-tp-red/20 rounded-full blur-3xl"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black mb-6 flex items-center">
                            <span className="bg-tp-red text-white p-2 rounded-xl mr-4 shadow-lg"><ExclamationCircleIcon /></span>
                            Targeted Remedial Path
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {personalPlan.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => onNavigate({type: 'module', moduleId: item.module.id})}
                                    className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/20 hover:scale-105 transition-all group"
                                >
                                    <div className="text-[10px] font-black text-tp-red uppercase tracking-[0.2em] mb-2">{item.module.title}</div>
                                    <h3 className="font-bold text-lg mb-4 leading-tight group-hover:text-white transition-colors">{item.lesson.title}</h3>
                                    <div className="text-[10px] font-black uppercase tracking-widest flex items-center group-hover:translate-x-1 transition-transform">
                                        Action Required <svg className="w-3 h-3 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card p-8 rounded-3xl shadow-xl border border-white/50">
                    <div className="flex items-center mb-8">
                        <div className="w-1.5 h-6 bg-tp-red rounded-full mr-4"></div>
                        <h2 className="text-xl font-black text-tp-purple">Engagement Pulse</h2>
                    </div>
                    <ActivityChart history={progress.activityHistory || []} />
                </div>
                <div className="glass-card p-8 rounded-3xl shadow-xl border border-white/50">
                    <div className="flex items-center mb-8">
                        <div className="w-1.5 h-6 bg-tp-purple rounded-full mr-4"></div>
                        <h2 className="text-xl font-black text-tp-purple">Skill Progression</h2>
                    </div>
                    <PerformanceChart history={progress.activityHistory || []} />
                </div>
            </div>

            {/* Modules Grid */}
            <div>
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-tp-purple">Learning Tracks</h2>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{Object.values(modules).length} Paths Active</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {Object.values(modules).map((module: Module) => {
                         const modTotal = module.lessons.length;
                         const modCompleted = module.lessons.filter(l => progress.completedLessons.includes(l.title)).length;
                         const modPercent = modTotal > 0 ? Math.round((modCompleted / modTotal) * 100) : 0;
                         const isComplete = modTotal > 0 && modCompleted === modTotal;

                        return (
                        <div 
                            key={module.id} 
                            onClick={() => onNavigate({type: 'module', moduleId: module.id})} 
                            className={`glass-card p-8 rounded-3xl shadow-lg border transition-all cursor-pointer hover:shadow-2xl hover:-translate-y-1 group relative overflow-hidden ${isComplete ? 'border-tp-red/20 bg-tp-red/[0.02]' : 'border-white/50'}`}
                        >
                            <div className="flex items-center relative z-10">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isComplete ? 'bg-tp-red text-white' : 'bg-tp-purple/5 text-tp-purple group-hover:bg-tp-purple group-hover:text-white'}`}>
                                    {module.icon}
                                </div>
                                <div className="ml-6 flex-1">
                                    <h3 className="font-black text-xl text-tp-purple">{module.title}</h3>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{modCompleted} / {modTotal} Lessons</span>
                                        <span className={`text-[10px] font-black ${isComplete ? 'text-tp-red' : 'text-tp-purple'}`}>{modPercent}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                                        <div className={`h-full transition-all duration-700 ${isComplete ? 'bg-tp-red' : 'bg-tp-purple'}`} style={{ width: `${modPercent}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        </div>
    );
};

const ModuleView: React.FC<{
    module: Module;
    progress: UserProgress;
    onToggleLesson: (title: string) => void;
    onNavigate: (view: View) => void;
}> = ({ module, progress, onToggleLesson, onNavigate }) => {
    const totalLessons = module.lessons.length;
    const completedCount = module.lessons.filter(l => progress.completedLessons.includes(l.title)).length;
    const isComplete = totalLessons > 0 && completedCount === totalLessons;
    const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    const categorizedLessons: Record<string, Lesson[]> = {
        'Strategic Mastery (All)': [],
        'Core Foundations (A1 - A2)': [],
        'Advanced Fluency (B1 - B2)': [],
        'Specialized Professional (C1+)': [],
    };

    module.lessons.forEach(lesson => {
        const lvl = lesson.level.toUpperCase();
        if (lvl.includes('ALL') || lvl.includes('TARGETED')) categorizedLessons['Strategic Mastery (All)'].push(lesson);
        else if (lvl.includes('C1') || lvl.includes('C2')) categorizedLessons['Specialized Professional (C1+)'].push(lesson);
        else if (lvl.includes('B1') || lvl.includes('B2')) categorizedLessons['Advanced Fluency (B1 - B2)'].push(lesson);
        else if (lvl.includes('A1') || lvl.includes('A2')) categorizedLessons['Core Foundations (A1 - A2)'].push(lesson);
        else categorizedLessons['Strategic Mastery (All)'].push(lesson);
    });

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-12">
                <div className="flex items-center">
                    <div className="w-20 h-20 bg-tp-purple text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-tp-purple/30">
                        {module.icon}
                    </div>
                    <div className="ml-8">
                        <h1 className="text-4xl font-black text-tp-purple tracking-tight">{module.title}</h1>
                        <p className="text-gray-500 font-medium mt-1">{module.description}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-5xl font-black text-tp-red drop-shadow-sm">{percent}%</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">Proficiency</div>
                </div>
            </div>

            {isComplete && (
                <div className="bg-gradient-to-r from-tp-red/5 to-tp-purple/5 border-2 border-tp-red p-8 mb-12 rounded-3xl flex items-center justify-between shadow-xl">
                    <div className="flex items-center">
                        <BadgeIcon className="w-12 h-12 text-tp-red mr-6" />
                        <div>
                            <h3 className="text-2xl font-black text-tp-purple uppercase tracking-tight">Certification Standard Achieved</h3>
                            <p className="text-gray-600 font-medium">This agent has completed all required coursework for this track.</p>
                        </div>
                    </div>
                </div>
            )}

            {Object.entries(categorizedLessons).map(([category, lessons]) => {
                if (lessons.length === 0) return null;
                return (
                    <div key={category} className="mb-14">
                        <div className="flex items-center mb-6">
                            <div className="h-0.5 w-6 bg-tp-red rounded-full mr-3"></div>
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">{category}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {lessons.map((lesson, index) => (
                                <LessonCard 
                                    key={index} 
                                    lesson={lesson} 
                                    isCompleted={progress.completedLessons.includes(lesson.title)}
                                    onToggle={onToggleLesson}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const QuizComponent: React.FC<{
    quiz: Quiz; 
    onNavigate: (view: View) => void; 
    modules: { [id: string]: Module };
    onQuizComplete: (id: string, score: number) => void;
    userLevel?: string;
}> = ({ quiz, onNavigate, modules, onQuizComplete, userLevel }) => {
    const [viewState, setViewState] = useState<'start' | 'quiz' | 'results'>('start');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTranscript, setShowTranscript] = useState(false);

    const handleStartQuiz = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const generatedQuestions = await generateWorksheetQuestions(quiz.id, userLevel);
            setQuestions(generatedQuestions);
            setUserAnswers(new Array(generatedQuestions.length).fill(-1));
            setViewState('quiz');
            setCurrentQuestionIndex(0);
        } catch (err) {
            setError((err as Error).message);
            setViewState('start');
        } finally {
            setIsLoading(false);
        }
    }, [quiz.id, userLevel]);

    useEffect(() => {
      setViewState('start');
      setError(null);
    }, [quiz.id]);
    
    if (isLoading) return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="w-16 h-16 border-4 border-tp-red border-t-transparent rounded-full animate-spin mb-8"></div>
          <h2 className="text-2xl font-black text-tp-purple">Calibrating Assessment Engine</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-2">Tailoring questions to your profile...</p>
        </div>
    );

    if (viewState === 'start' || error) return (
        <div className="max-w-2xl mx-auto mt-20 text-center glass-card p-12 rounded-3xl shadow-2xl border border-white/50">
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-3xl bg-tp-purple/5 mb-8 text-tp-purple shadow-inner">
                <WorksheetIcon className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black text-tp-purple mb-4 tracking-tight uppercase">{quiz.title}</h1>
            <p className="text-gray-500 font-medium mb-10 leading-relaxed px-10">{quiz.description}</p>
            
            {error && <p className="text-tp-red mb-6 text-xs font-bold uppercase tracking-widest">⚠️ {error}</p>}
            
            <button
                onClick={handleStartQuiz}
                className="bg-tp-purple text-white font-black py-4 px-12 rounded-2xl hover:bg-tp-navy hover:scale-105 transition-all shadow-xl shadow-tp-purple/20 uppercase tracking-[0.2em] text-sm"
            >
                Initiate Test
            </button>
        </div>
    );

    if (viewState === 'quiz' && questions.length > 0) {
        const currentQuestion = questions[currentQuestionIndex];
        const handleAnswerSelect = (optionIndex: number) => {
          const newAnswers = [...userAnswers];
          newAnswers[currentQuestionIndex] = optionIndex;
          setUserAnswers(newAnswers);
        };
        const handleNext = () => {
          setShowTranscript(false);
          if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(currentQuestionIndex + 1);
        };
        const handlePrevious = () => {
          setShowTranscript(false);
          if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1);
        };
        const handleSubmit = () => {
            const scoreRaw = questions.reduce((s, q, i) => {
                if (q.type === 'speaking') return s + 1;
                return userAnswers[i] === q.correctAnswer ? s + 1 : s;
            }, 0);
            const scorePercent = Math.round((scoreRaw / questions.length) * 100);
            onQuizComplete(quiz.id, scorePercent);
            setViewState('results');
        };

        return (
            <div className="max-w-3xl mx-auto mt-12 pb-20">
                <div className="glass-card rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
                    <div className="bg-tp-purple px-10 py-6 flex justify-between items-center">
                        <h2 className="font-black text-white uppercase tracking-widest text-sm">Calibration Session</h2>
                        <span className="text-[10px] font-black text-tp-red bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest">Question {currentQuestionIndex + 1} / {questions.length}</span>
                    </div>
                    
                    <div className="p-10">
                        {/* Question Specific UI */}
                        {currentQuestion.type === 'listening' && (
                            <div className="mb-10 p-6 bg-tp-purple/5 rounded-3xl border border-tp-purple/10">
                                <div className="flex items-center mb-4 text-tp-purple font-black uppercase text-xs tracking-widest">
                                    <ListenIcon /> <span className="ml-3">Audio Analysis</span>
                                </div>
                                <div className="flex space-x-4">
                                    <button className="flex-1 bg-tp-purple text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-tp-navy transition-colors flex items-center justify-center">
                                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Play Audio
                                    </button>
                                    <button 
                                        onClick={() => setShowTranscript(!showTranscript)}
                                        className="flex-1 bg-white border border-tp-purple/20 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-tp-purple hover:bg-tp-purple/5 transition-colors"
                                    >
                                        {showTranscript ? 'Hide' : 'Show'} Transcript
                                    </button>
                                </div>
                                {showTranscript && (
                                    <div className="mt-6 p-5 bg-white rounded-2xl border border-gray-100 text-sm text-gray-700 italic leading-relaxed">
                                        "{currentQuestion.context}"
                                    </div>
                                )}
                            </div>
                        )}
                        {currentQuestion.type === 'reading' && (
                            <div className="mb-10 p-6 bg-tp-purple/5 rounded-3xl border border-tp-purple/10">
                                <div className="flex items-center mb-4 text-tp-purple font-black uppercase text-xs tracking-widest">
                                    <ReadIcon /> <span className="ml-3">Contextual Analysis</span>
                                </div>
                                <div className="p-6 bg-white rounded-2xl border border-gray-100 text-sm text-gray-800 leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
                                    {currentQuestion.context}
                                </div>
                            </div>
                        )}
                        {currentQuestion.type === 'speaking' && (
                            <div className="mb-10 p-8 bg-tp-red/5 rounded-3xl border border-tp-red/10">
                                <div className="flex items-center mb-6 text-tp-red font-black uppercase text-xs tracking-widest">
                                    <SpeakingIcon /> <span className="ml-3">Verbal Articulation</span>
                                </div>
                                <p className="text-xl font-bold text-tp-purple mb-8 leading-tight">{currentQuestion.speakingPrompt}</p>
                                <div className="flex justify-center py-12 bg-white rounded-3xl border-2 border-dashed border-tp-red/20 group hover:border-tp-red transition-colors cursor-pointer">
                                    <button className="flex flex-col items-center text-gray-300 group-hover:text-tp-red transition-colors">
                                        <div className="h-16 w-16 rounded-full border-4 border-current flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <div className="h-4 w-4 bg-current rounded-full animate-pulse"></div>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Capture Response</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        <p className="text-2xl font-black text-tp-purple mb-8 tracking-tight leading-tight">{currentQuestion.question}</p>
                        
                        {currentQuestion.type === 'speaking' ? (
                             <button
                                onClick={() => handleAnswerSelect(0)}
                                className={`w-full text-center py-5 rounded-2xl border-2 font-black uppercase tracking-widest text-sm transition-all ${
                                    userAnswers[currentQuestionIndex] === 0
                                    ? 'bg-tp-purple text-white border-tp-purple shadow-xl shadow-tp-purple/20'
                                    : 'bg-white border-gray-100 hover:border-tp-red text-gray-400'
                                }`}
                            >
                                {userAnswers[currentQuestionIndex] === 0 ? "Response Locked" : "Finalize Articulation"}
                            </button>
                        ) : (
                            <div className="space-y-4">
                                {currentQuestion.options?.map((option, index) => (
                                    <button
                                    key={index}
                                    onClick={() => handleAnswerSelect(index)}
                                    className={`w-full text-left p-6 rounded-2xl border-2 transition-all group ${
                                        userAnswers[currentQuestionIndex] === index
                                        ? 'bg-tp-purple text-white border-tp-purple shadow-xl shadow-tp-purple/20'
                                        : 'bg-white border-gray-100 hover:border-tp-purple/20 hover:bg-tp-purple/[0.02] text-gray-600'
                                    }`}
                                    >
                                    <div className="flex items-center">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-5 text-sm font-black transition-colors ${
                                            userAnswers[currentQuestionIndex] === index ? 'bg-tp-red text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-tp-purple/10 group-hover:text-tp-purple'
                                        }`}>
                                            {String.fromCharCode(65 + index)}
                                        </div>
                                        <span className="font-bold">{option}</span>
                                    </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50/50 px-10 py-8 border-t border-gray-100 flex justify-between">
                        <button 
                            onClick={handlePrevious} 
                            disabled={currentQuestionIndex === 0} 
                            className="px-6 py-3 text-gray-400 font-black uppercase tracking-widest text-xs hover:text-tp-purple disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            Back
                        </button>
                        {currentQuestionIndex === questions.length - 1 ? (
                            <button onClick={handleSubmit} className="bg-tp-red text-white font-black py-3 px-10 rounded-xl hover:bg-red-700 shadow-lg shadow-tp-red/20 uppercase tracking-widest text-xs">Execute Final Submit</button>
                        ) : (
                            <button onClick={handleNext} className="bg-tp-purple text-white font-black py-3 px-10 rounded-xl hover:bg-tp-navy shadow-lg shadow-tp-purple/20 uppercase tracking-widest text-xs">Next Phase</button>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    
    if (viewState === 'results') {
      const score = questions.reduce((s, q, i) => {
          if (q.type === 'speaking') return s + 1;
          return userAnswers[i] === q.correctAnswer ? s + 1 : s;
      }, 0);
      const passed = (score / questions.length) >= 0.7;

      return (
        <div className="max-w-xl mx-auto mt-20 text-center glass-card p-12 rounded-3xl shadow-2xl border border-white/50">
          <div className={`mx-auto flex items-center justify-center h-24 w-24 rounded-3xl mb-8 shadow-inner ${passed ? 'bg-green-100 text-green-600' : 'bg-tp-red/10 text-tp-red'}`}>
            {passed ? <BadgeIcon className="w-12 h-12" /> : <ExclamationCircleIcon />}
          </div>
          
          <h2 className="text-3xl font-black text-tp-purple mb-4 tracking-tight uppercase">{passed ? 'Excellence Certified' : 'Maintenance Required'}</h2>
          <p className="text-gray-500 font-medium mb-10 leading-relaxed">Agent has achieved an overall proficiency of <span className="font-black text-tp-purple text-xl">{Math.round((score/questions.length)*100)}%</span> across all test dimensions.</p>

          <button onClick={() => onNavigate({type: 'dashboard'})} className="bg-tp-purple text-white font-black py-4 px-12 rounded-2xl hover:bg-tp-navy shadow-xl shadow-tp-purple/20 uppercase tracking-widest text-sm">
            Return to Command Center
          </button>
        </div>
      );
    }

    return null;
}

const Worksheet: React.FC<WorksheetProps & { userLevel?: string }> = ({ modules, view, onNavigate, progress, onToggleLesson, onQuizComplete, userLevel }) => {
    switch(view.type) {
        case 'dashboard':
            return <DashboardView modules={modules} onNavigate={onNavigate} progress={progress} />;
        case 'module':
            const module = modules[view.moduleId];
            return module ? <ModuleView module={module} progress={progress} onToggleLesson={onToggleLesson} onNavigate={onNavigate} /> : <div>Path not found.</div>;
        case 'quiz':
            const quiz = quizzes.find(q => q.id === view.quizId);
            return quiz ? <QuizComponent quiz={quiz} onNavigate={onNavigate} modules={modules} onQuizComplete={onQuizComplete} userLevel={userLevel} /> : <div>Assessment not found.</div>;
        default:
            return <div>System ready.</div>
    }
};

export default Worksheet;
