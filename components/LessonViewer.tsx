
import React, { useState } from 'react';
import type { Resource, QuizQuestion } from '../types';
import { geminiService } from '../services/geminiService';
import { googleSheetService } from '../services/googleSheetService';
import { ExitIcon, CheckCircleIcon, ExclamationCircleIcon, BrainIcon } from './Icons';

interface LessonViewerProps {
  resource: Resource;
  uid: string;
  onClose: () => void;
  onMasteryAchieved: () => void;
}

const LessonViewer: React.FC<LessonViewerProps> = ({ resource, uid, onClose, onMasteryAchieved }) => {
  const [view, setView] = useState<'content' | 'quiz' | 'result'>('content');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [score, setScore] = useState(0);
  const [backendStatus, setBackendStatus] = useState<Resource['progress']['status']>(resource.progress?.status || 'assigned');

  /**
   * Enterprise-grade YouTube URL Transformer
   * Fixes "Configuration Error 153" by converting watch links to embed links.
   */
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // Safety check: already an embed URL
    if (url.includes('/embed/')) return url;

    // Advanced regex to capture video IDs from watch?v=, youtu.be, mobile links, etc.
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[2].length === 11) {
      const videoId = match[2];
      // Construct clean embed URL with parameters to disable related videos and branding
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
    }
    
    return url;
  };

  const startQuiz = async () => {
    setIsGenerating(true);
    try {
      const questions = await geminiService.generateQuizForResource(
        resource.title, 
        resource.objective || 'Master the core competencies of this module.'
      );
      setQuizQuestions(questions);
      setAnswers(new Array(questions.length).fill(-1));
      setView('quiz');
    } catch (err) {
      alert("Assessment Engine failed to load questions. Please check your connectivity.");
    } finally {
      setIsGenerating(false);
    }
  };

  const submitQuiz = async () => {
    const correctCount = quizQuestions.reduce((acc, q, i) => acc + (answers[i] === q.correctAnswer ? 1 : 0), 0);
    const finalScore = Math.round((correctCount / quizQuestions.length) * 100);
    const passed = finalScore >= 60;
    
    setScore(finalScore);
    setIsGenerating(true);
    try {
      const response = await googleSheetService.submitQuizResult(uid, resource.id, passed, finalScore);
      setBackendStatus(response.status); 
      if (passed) onMasteryAchieved();
      setView('result');
    } catch (err) {
      console.error("Registry Sync Failure", err);
      setView('result');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-tp-navy/95 backdrop-blur-xl flex flex-col animate-fadeIn">
      <header className="flex items-center justify-between px-10 py-6 bg-tp-purple border-b border-white/5">
        <div className="flex items-center">
            <BrainIcon className="w-10 h-10 text-tp-red mr-4" />
            <div>
                <h2 className="text-white font-black text-2xl tracking-tight uppercase leading-none">{resource.title}</h2>
                <span className="text-[10px] text-white/50 font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded mt-1.5 inline-block">{resource.level} Mastery Track</span>
            </div>
        </div>
        <button onClick={onClose} className="p-4 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-all"><ExitIcon className="w-7 h-7" /></button>
      </header>

      <div className="flex-1 relative bg-white overflow-hidden">
        {view === 'content' && (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 w-full bg-black relative">
              <iframe 
                src={getEmbedUrl(resource.url)} 
                className="w-full h-full border-none" 
                title="Training Module Viewer" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="px-10 py-8 bg-tp-navy/5 border-t border-gray-100 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
              <div className="max-w-2xl">
                <p className="text-[10px] font-black text-tp-purple uppercase tracking-[0.3em] mb-1">Training Objective</p>
                <p className="text-sm font-bold text-gray-700 leading-relaxed italic">
                  "{resource.objective || 'Complete the visual training to unlock proficiency assessment.'}"
                </p>
              </div>
              <button 
                onClick={startQuiz}
                disabled={isGenerating || backendStatus === 'completed'}
                className="bg-tp-red text-white font-black py-5 px-14 rounded-2xl hover:bg-red-700 transition-all shadow-xl uppercase tracking-widest text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {backendStatus === 'completed' ? 'Module Certified' : isGenerating ? 'Preparing Quiz...' : 'Final Mastery Check'}
              </button>
            </div>
          </div>
        )}

        {view === 'quiz' && (
          <div className="max-w-4xl mx-auto p-12 overflow-y-auto h-full custom-scrollbar pb-32">
            <div className="mb-12 bg-tp-purple/5 border border-tp-purple/10 p-8 rounded-[32px]">
              <h3 className="text-[10px] font-black text-tp-purple uppercase tracking-[0.4em] mb-3">Validation Instruction</h3>
              <p className="text-lg font-bold text-tp-purple italic leading-snug">
                "Based on the objective: <span className="text-tp-red">{resource.objective}</span>, please complete the following proficiency tasks."
              </p>
            </div>
            
            <div className="space-y-10">
              {quizQuestions.map((q, i) => (
                <div key={i} className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-[0_20px_40px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="w-10 h-10 bg-tp-purple text-white rounded-xl flex items-center justify-center font-black text-sm">{i + 1}</span>
                    <p className="font-bold text-xl text-tp-purple leading-tight">{q.question}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((opt, optIdx) => (
                      <button 
                        key={optIdx}
                        onClick={() => { const n = [...answers]; n[i] = optIdx; setAnswers(n); }}
                        className={`text-left px-8 py-5 rounded-2xl border-2 transition-all font-bold text-sm ${answers[i] === optIdx ? 'border-tp-purple bg-tp-purple text-white shadow-xl scale-[1.02]' : 'border-gray-50 bg-gray-50 hover:border-tp-purple/20 text-gray-600 shadow-sm'}`}
                      >
                        <span className="mr-3 opacity-30">{String.fromCharCode(65 + optIdx)}.</span> {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-center mt-12">
                <button 
                  onClick={submitQuiz}
                  disabled={isGenerating || answers.includes(-1)}
                  className="w-full max-w-md bg-tp-purple text-white py-6 rounded-3xl font-black uppercase text-sm tracking-widest shadow-2xl disabled:opacity-50 hover:bg-tp-navy transition-all"
                >
                  Submit Performance Data
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'result' && (
          <div className="h-full flex items-center justify-center p-8 bg-gray-50/50">
            <div className="bg-white rounded-[48px] p-20 max-w-xl w-full text-center shadow-[0_40px_80px_rgba(0,0,0,0.1)] border border-gray-100">
              <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-10 ${score >= 60 ? 'bg-green-100 text-green-600' : 'bg-tp-red/10 text-tp-red'}`}>
                {score >= 60 ? <CheckCircleIcon className="w-14 h-14" filled /> : <ExclamationCircleIcon className="w-14 h-14" />}
              </div>
              <h2 className="text-4xl font-black text-tp-purple mb-2 uppercase tracking-tight">{score >= 60 ? 'Excellence Certified' : 'Maintenance Required'}</h2>
              <p className="text-7xl font-black text-tp-purple mb-10 tracking-tighter">{score}%</p>
              <div className="p-6 bg-gray-50 rounded-3xl mb-10 border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Registry Record</p>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Training Item ID: {resource.id}</p>
              </div>
              <button onClick={onClose} className="w-full bg-tp-navy text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-tp-purple transition-all shadow-xl">Close Session Hub</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonViewer;
