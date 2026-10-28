
import React, { useState } from 'react';
import type { Resource, QuizQuestion, UserProfile } from '../types';
import { geminiService } from '../services/geminiService';
import { googleSheetService } from '../services/googleSheetService';
import { ExitIcon, CheckCircleIcon, ExclamationCircleIcon, BrainIcon, LinkIcon } from './Icons';
import LiveCoach from './LiveCoach';
import InteractiveLessonViewer from './InteractiveLessonViewer';

interface LessonViewerProps {
  resource: Resource;
  uid: string;
  currentUser?: UserProfile;
  onClose: () => void;
  onMasteryAchieved: () => void;
}

const LessonViewer: React.FC<LessonViewerProps> = ({ resource, uid, currentUser, onClose, onMasteryAchieved }) => {
  const [view, setView] = useState<'content' | 'quiz' | 'result'>('content');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [score, setScore] = useState(0);
  const [backendStatus, setBackendStatus] = useState<Resource['progress']['status']>(resource.progress?.status || 'assigned');
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);

  const isInteractive = Boolean(
    (resource as any).interactiveLesson ||
    (resource as any).lessonDataJSON ||
    resource.type === 'interactive' ||
    (resource.url && resource.url.startsWith('interactive:'))
  );

  const handleInteractiveSubmit = async (submissionId?: string) => {
    try {
      // Record 100% mastery / completion progress in backend
      const response = await googleSheetService.submitProgress(uid, resource.id, true, 100, 0);
      setBackendStatus('completed');
      onMasteryAchieved();
    } catch (err) {
      console.error("Failed to submit interactive lesson completion progress:", err);
      setBackendStatus('completed');
      onMasteryAchieved();
    }
  };
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('/embed/')) return url;

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[2].length === 11) {
      const videoId = match[2];
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
    }
    
    return url;
  };

  const startQuiz = async () => {
    setIsGeneratingQuiz(true);
    setQuizError(null);
    try {
      const questions = await geminiService.generateQuiz(
        resource.title, 
        resource.url,
        resource.type,
        resource.scrapedText,
        resource.level
      );
      
      if (questions.length === 0) {
        setQuizError("Could not generate quiz from this content.");
        return;
      }

      setQuizQuestions(questions);
      setAnswers(new Array(questions.length).fill(-1));
      setQuizStartTime(Date.now());
      setView('quiz');
    } catch (err: any) {
      setQuizError(err?.message || "Assessment engine failed. Check connection.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const submitQuiz = async () => {
    const correctCount = quizQuestions.reduce((acc, q, i) => acc + (answers[i] === q.correctAnswer ? 1 : 0), 0);
    const finalScore = Math.round((correctCount / quizQuestions.length) * 100);
    const passed = finalScore >= 60;
    const timeTakenSecs = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;
    
    setScore(finalScore);
    setIsGenerating(true);
    try {
      const response = await googleSheetService.submitQuizResult(uid, resource.id, passed, finalScore, timeTakenSecs);
      setBackendStatus(response.status); 
      if (passed) onMasteryAchieved();
      setView('result');
    } catch (err) {
      console.error("Registry sync failed", err);
      setView('result');
    } finally {
      setIsGenerating(false);
    }
  };

  if (resource.type === 'Simulation') {
    const activeUserProfile: UserProfile = currentUser || {
      id: uid,
      name: 'Agent Training Node',
      role: 'agent',
      languageLevel: 'B2',
      rosterId: ''
    };

    const handleSimulationComplete = async (score: number, timeTaken: number) => {
      try {
        const passed = score >= 60;
        await googleSheetService.submitProgress(uid, resource.id, passed, score, timeTaken);
        onMasteryAchieved();
      } catch (err) {
        console.error("Failed to submit simulation progress:", err);
      }
    };

    return (
      <LiveCoach 
        currentUser={activeUserProfile}
        initialScenario={resource.url}
        scenarioId={resource.url}
        onClose={onClose}
        onImpersonate={() => {}}
        onComplete={handleSimulationComplete}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col animate-fadeIn">
      <header className="flex items-center justify-between px-6 py-4 bg-tp-purple border-b border-white/10">
        <div className="flex items-center">
            <BrainIcon className="w-8 h-8 text-tp-red mr-3" />
            <div>
                <h2 className="text-white font-bold text-xl tracking-tight leading-snug">{resource.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/70 font-semibold uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-lg inline-block">Dual-Scale Training Node</span>
                  <span className="text-xs text-tp-red font-semibold uppercase tracking-wider bg-rose-500/10 px-2.5 py-0.5 rounded-lg inline-block border border-rose-500/20">{resource.duration || '10'} mins</span>
                </div>
            </div>
        </div>
        <button onClick={onClose} className="p-2.5 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all"><ExitIcon className="w-5 h-5" /></button>
      </header>

      <div className="flex-1 relative bg-white overflow-hidden">
        {view === 'content' && (
          <div className="w-full h-full flex flex-col overflow-y-auto">
            {isInteractive ? (
              <div className="p-6">
                {/* 2. Wiring "Submit" to "Mastery Check" via onSubmitted callback */}
                <InteractiveLessonViewer 
                  lessonData={(resource as any).interactiveLesson || (resource as any).lessonDataJSON} 
                  currentUser={currentUser || { id: uid, name: 'Agent', role: 'agent', languageLevel: 'B2', rosterId: '' }} 
                  onSubmitted={(submissionId) => handleInteractiveSubmit(submissionId)}
                />
              </div>
            ) : (
              <div className="flex-1 w-full bg-black relative">
                <iframe 
                  src={getEmbedUrl(resource.url)} 
                  className="w-full h-full border-none" 
                  title="Training Module Viewer" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-bold text-tp-purple uppercase tracking-wider mb-1">Objective</p>
                <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                  "{resource.objective || 'Complete visual study to unlock assessment.'}"
                </p>
                {quizError && (
                  <div className="mt-2 flex items-center gap-2 text-rose-600">
                    <ExclamationCircleIcon className="w-4 h-4" />
                    <p className="text-xs font-semibold">{quizError}</p>
                  </div>
                )}
              </div>

              {/* 1. CONDITIONAL BUTTON RENDERING:
                  - Normal lesson (!isInteractive): Render 'Open in New Tab' and 'Mastery Check' buttons.
                  - Interactive lesson (isInteractive): HIDE both buttons entirely.
              */}
              {!isInteractive ? (
                <div className="flex items-center gap-3">
                  <a 
                    href={resource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white text-tp-purple border border-slate-200 font-semibold py-3 px-5 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm uppercase tracking-wider text-xs flex items-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Open in New Tab
                  </a>
                  <button 
                    onClick={startQuiz}
                    disabled={isGeneratingQuiz || backendStatus === 'completed'}
                    className="bg-tp-red text-white font-semibold py-3 px-6 rounded-xl hover:bg-red-700 transition-all shadow-sm uppercase tracking-wider text-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    {isGeneratingQuiz && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    {backendStatus === 'completed' ? 'Certified Complete' : isGeneratingQuiz ? 'Generating Quiz...' : 'Mastery Check'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 ${
                    backendStatus === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-tp-purple/10 text-tp-purple border border-tp-purple/20'
                  }`}>
                    {backendStatus === 'completed' ? '✓ Mastery Certified & Completed' : 'Interactive Lesson Mode — Complete & Submit Form Above'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'quiz' && (
          <div className="max-w-4xl mx-auto p-6 md:p-8 overflow-y-auto h-full custom-scrollbar pb-24">
            <div className="mb-8 bg-purple-50/60 border border-purple-100 p-6 rounded-2xl">
              <h3 className="text-xs font-bold text-tp-purple uppercase tracking-wider mb-2">Validation Instruction</h3>
              <p className="text-base font-medium text-slate-800 italic leading-snug">
                "<span className="text-tp-purple font-bold underline">{resource.title}</span> mastery validation in progress."
              </p>
            </div>
            
            <div className="space-y-6">
              {quizQuestions.map((q, i) => (
                <div key={i} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-8 h-8 bg-tp-purple text-white rounded-xl flex items-center justify-center font-bold text-sm">{i + 1}</span>
                    <p className="font-bold text-base sm:text-lg text-slate-900 leading-snug">{q.question}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, optIdx) => (
                      <button 
                        key={optIdx}
                        onClick={() => { const n = [...answers]; n[i] = optIdx; setAnswers(n); }}
                        className={`text-left px-5 py-3.5 rounded-xl border transition-all font-medium text-sm ${answers[i] === optIdx ? 'border-tp-purple bg-tp-purple text-white shadow-md' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/70 text-slate-700'}`}
                      >
                        <span className="mr-2.5 opacity-60 font-semibold">{String.fromCharCode(65 + optIdx)}.</span> {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-center mt-8">
                <button 
                  onClick={submitQuiz}
                  disabled={isGenerating || answers.includes(-1)}
                  className="w-full max-w-md bg-tp-purple text-white py-3.5 px-6 rounded-xl font-bold uppercase text-xs tracking-wider shadow-md hover:bg-tp-purple-light transition-all disabled:opacity-50"
                >
                  Confirm Proficiency
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'result' && (
          <div className="h-full flex items-center justify-center p-6 bg-slate-50/50">
            <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center shadow-xl border border-slate-200">
              <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${score >= 60 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                {score >= 60 ? <CheckCircleIcon className="w-12 h-12" filled /> : <ExclamationCircleIcon className="w-12 h-12" />}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">{score >= 60 ? 'Mastery Achieved' : 'Try Again'}</h2>
              <p className="text-5xl sm:text-6xl font-black text-tp-purple mb-8 tracking-tight">{score}%</p>
              <button onClick={onClose} className="w-full bg-tp-purple text-white py-3.5 px-6 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-tp-purple-light transition-all shadow-md">Close Module</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonViewer;
