
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
   * Transforms standard YouTube URLs to Embed formats to bypass X-Frame-Options: SAMEORIGIN
   */
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  const startQuiz = async () => {
    setIsGenerating(true);
    try {
      const questions = await geminiService.generateQuizForResource(resource.title, resource.objective || '');
      setQuizQuestions(questions);
      setAnswers(new Array(questions.length).fill(-1));
      setView('quiz');
    } catch (err) {
      alert("Assessment Engine failed to load questions.");
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
            <iframe 
              src={getEmbedUrl(resource.url)} 
              className="flex-1 w-full border-none shadow-inner" 
              title="Lesson Content" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <div className="px-10 py-8 bg-tp-navy/10 border-t border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-tp-purple uppercase tracking-widest">Training Objective</p>
                <p className="text-sm font-medium text-gray-600 italic">"{resource.objective || 'Complete module to unlock assessment.'}"</p>
              </div>
              <button 
                onClick={startQuiz}
                disabled={isGenerating || backendStatus === 'completed'}
                className="bg-tp-red text-white font-black py-4 px-12 rounded-2xl hover:bg-red-700 transition-all shadow-xl uppercase tracking-widest text-xs disabled:opacity-50"
              >
                {backendStatus === 'completed' ? 'Module Certified' : isGenerating ? 'Preparing Quiz...' : 'Final Mastery Check'}
              </button>
            </div>
          </div>
        )}

        {view === 'quiz' && (
          <div className="max-w-4xl mx-auto p-12 overflow-y-auto h-full custom-scrollbar">
            <h3 className="text-3xl font-black text-tp-purple uppercase tracking-tight mb-8">Registry Proficiency Validation</h3>
            <div className="space-y-10">
              {quizQuestions.map((q, i) => (
                <div key={i} className="bg-gray-50 p-8 rounded-[32px] border border-gray-100">
                  <p className="font-bold text-xl text-tp-purple mb-6">{i + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((opt, optIdx) => (
                      <button 
                        key={optIdx}
                        onClick={() => { const n = [...answers]; n[i] = optIdx; setAnswers(n); }}
                        className={`text-left px-6 py-4 rounded-2xl border-2 transition-all font-bold text-sm ${answers[i] === optIdx ? 'border-tp-purple bg-tp-purple text-white shadow-xl' : 'border-white bg-white hover:border-tp-purple/20 text-gray-600 shadow-sm'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button 
                onClick={submitQuiz}
                disabled={isGenerating || answers.includes(-1)}
                className="w-full bg-tp-purple text-white py-6 rounded-3xl font-black uppercase text-sm tracking-widest shadow-2xl disabled:opacity-50"
              >
                Submit Performance Data
              </button>
            </div>
          </div>
        )}

        {view === 'result' && (
          <div className="h-full flex items-center justify-center p-8 bg-gray-50/50">
            <div className="bg-white rounded-[40px] p-16 max-w-lg w-full text-center shadow-2xl border border-gray-100">
              <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-10 ${score >= 60 ? 'bg-green-100 text-green-600' : 'bg-tp-red/10 text-tp-red'}`}>
                {score >= 60 ? <CheckCircleIcon className="w-14 h-14" filled /> : <ExclamationCircleIcon className="w-14 h-14" />}
              </div>
              <h2 className="text-4xl font-black text-tp-purple mb-2 uppercase tracking-tight">{score >= 60 ? 'Certified' : 'Retry Required'}</h2>
              <p className="text-6xl font-black text-tp-purple mb-8">{score}%</p>
              <button onClick={onClose} className="w-full bg-tp-navy text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-tp-purple transition-all shadow-xl">Close Session</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonViewer;
