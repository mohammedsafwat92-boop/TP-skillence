
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
  const [backendStatus, setBackendStatus] = useState<'open' | 'locked' | 'completed'>(resource.progress.status);

  // HARD BLOCK FOR LOCKED STATUS
  if (backendStatus === 'locked') {
    return (
      <div className="fixed inset-0 z-[100] bg-tp-navy/98 backdrop-blur-2xl flex items-center justify-center p-8 animate-fadeIn">
        <div className="bg-white rounded-[40px] p-12 max-w-md text-center shadow-2xl border-t-8 border-tp-red">
          <div className="w-24 h-24 bg-tp-red/10 rounded-full flex items-center justify-center mx-auto mb-8 text-tp-red animate-pulse">
            <ExclamationCircleIcon className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-tp-purple mb-4 uppercase tracking-tight">Access Locked</h2>
          <p className="text-gray-600 mb-10 leading-relaxed font-medium">You have exceeded the maximum assessment attempts for this module. Mastery threshold not reached.</p>
          <div className="bg-gray-50 p-6 rounded-3xl mb-10 text-left">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Academy Protocol</p>
            <p className="text-sm font-bold text-tp-purple italic">"Please contact your Language Coach for a manual unlock and direct coaching session."</p>
          </div>
          <button onClick={onClose} className="w-full bg-tp-navy text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-tp-purple transition-all shadow-xl">Exit Training</button>
        </div>
      </div>
    );
  }

  const startQuiz = async () => {
    setIsGenerating(true);
    try {
      const questions = await geminiService.generateQuizForResource(resource.title, resource.objective || '');
      setQuizQuestions(questions);
      setAnswers(new Array(questions.length).fill(-1));
      setView('quiz');
    } catch (err) {
      alert("AI Calibration failed. Check connection.");
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
      // BACKEND SYNC
      const response = await googleSheetService.submitQuizResult(uid, resource.id, passed, finalScore);
      setBackendStatus(response.status); 
      if (passed) onMasteryAchieved();
      setView('result');
    } catch (err) {
      alert("Progress sync failed. Results might not be saved.");
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
                <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-white/50 font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">{resource.level}</span>
                    <span className="text-[10px] text-tp-red font-black uppercase tracking-widest">{resource.tags[0]}</span>
                </div>
            </div>
        </div>
        <button onClick={onClose} className="p-4 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-all"><ExitIcon className="w-7 h-7" /></button>
      </header>

      <div className="flex-1 relative bg-white overflow-hidden">
        {view === 'content' && (
          <div className="w-full h-full flex flex-col">
            <iframe src={resource.url} className="flex-1 w-full border-none shadow-inner" allowFullScreen />
            <div className="px-10 py-8 bg-tp-navy/10 backdrop-blur-md border-t border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-tp-purple uppercase tracking-widest">Objective</p>
                <p className="text-sm font-medium text-gray-600 italic">"{resource.objective || 'Complete the lesson to unlock assessment.'}"</p>
              </div>
              <button 
                onClick={startQuiz}
                disabled={isGenerating}
                className="bg-tp-red text-white font-black py-4 px-12 rounded-2xl hover:bg-red-700 transition-all shadow-2xl shadow-tp-red/30 uppercase tracking-widest text-xs flex items-center group"
              >
                {isGenerating ? 'AI Calibrating...' : 'Launch Assessment'}
                <span className="ml-3 group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        )}

        {view === 'quiz' && (
          <div className="max-w-4xl mx-auto p-12 overflow-y-auto h-full custom-scrollbar">
            <div className="mb-12">
                <h3 className="text-3xl font-black text-tp-purple uppercase tracking-tight mb-2">Mastery Check</h3>
                <p className="text-sm text-gray-500 font-medium">Achieve 60% (3/5) to certify proficiency.</p>
            </div>
            <div className="space-y-12">
              {quizQuestions.map((q, i) => (
                <div key={i} className="bg-gray-50 p-8 rounded-[32px] border border-gray-100 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-tp-purple opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
              <div className="pt-10">
                <button 
                    onClick={submitQuiz}
                    disabled={isGenerating || answers.includes(-1)}
                    className="w-full bg-tp-purple text-white py-6 rounded-3xl font-black uppercase text-sm tracking-[0.2em] hover:bg-tp-navy transition-all shadow-2xl"
                >
                    {isGenerating ? 'Evaluating...' : 'Complete Assessment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'result' && (
          <div className="h-full flex items-center justify-center p-8 bg-gray-50/50">
            <div className="bg-white rounded-[40px] p-16 max-w-lg w-full text-center shadow-2xl border border-gray-100 relative overflow-hidden">
              <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-10 shadow-inner ${score >= 60 ? 'bg-green-100 text-green-600' : 'bg-tp-red/10 text-tp-red'}`}>
                {score >= 60 ? <CheckCircleIcon className="w-14 h-14" filled /> : <ExclamationCircleIcon className="w-14 h-14" />}
              </div>
              <h2 className="text-4xl font-black text-tp-purple mb-2 uppercase tracking-tight">{score >= 60 ? 'Certified' : 'Failed'}</h2>
              <p className="text-6xl font-black text-tp-purple mb-8">{score}%</p>
              <div className="bg-tp-purple/5 p-6 rounded-3xl mb-12">
                <p className="text-gray-600 font-medium text-lg italic">
                    {score >= 60 ? 'Academy metrics updated. Level proficiency confirmed.' : 'Target score not reached. Please review the material carefully before retrying.'}
                </p>
              </div>
              <button onClick={onClose} className="w-full bg-tp-navy text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-tp-purple transition-all">Back to Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonViewer;
