
import React, { useState } from 'react';
import type { Lesson, QuizQuestion } from '../types';
import { geminiService } from '../services/geminiService';
import { ExitIcon, CheckCircleIcon, ExclamationCircleIcon } from './Icons';

interface LessonViewerProps {
  lesson: Lesson;
  onComplete: () => void;
  onClose: () => void;
}

const LessonViewer: React.FC<LessonViewerProps> = ({ lesson, onComplete, onClose }) => {
  const [view, setView] = useState<'content' | 'quiz' | 'result'>('content');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [score, setScore] = useState(0);

  const startQuiz = async () => {
    setIsGenerating(true);
    try {
      const questions = await geminiService.generateQuizForResource(lesson.title, lesson.objective || '');
      setQuizQuestions(questions);
      setAnswers(new Array(questions.length).fill(-1));
      setView('quiz');
    } catch (err) {
      alert("Failed to load quiz.");
    } finally {
      setIsGenerating(false);
    }
  };

  const submitQuiz = async () => {
    const correctCount = quizQuestions.reduce((acc, q, i) => acc + (answers[i] === q.correctAnswer ? 1 : 0), 0);
    const finalScore = Math.round((correctCount / quizQuestions.length) * 100);
    
    setScore(finalScore);
    if (finalScore >= 60) {
      onComplete();
    }
    setView('result');
  };

  return (
    <div className="fixed inset-0 z-50 bg-tp-navy/95 backdrop-blur-xl flex flex-col animate-fadeIn">
      <header className="flex items-center justify-between px-8 py-4 bg-tp-purple border-b border-white/10">
        <div>
          <h2 className="text-white font-black text-xl tracking-tight uppercase">{lesson.title}</h2>
          <p className="text-xs text-gray-300 font-bold uppercase tracking-widest">{lesson.level} Mastery Track</p>
        </div>
        <button onClick={onClose} className="p-3 text-white hover:bg-white/10 rounded-full transition-all"><ExitIcon className="w-6 h-6" /></button>
      </header>

      <div className="flex-1 relative bg-white overflow-hidden">
        {view === 'content' && (
          <div className="w-full h-full flex flex-col">
            {lesson.link ? (
              <iframe src={lesson.link} className="flex-1 w-full border-none" allowFullScreen />
            ) : (
              <div className="flex-1 flex items-center justify-center p-12 text-center">
                 <div>
                    <h3 className="text-2xl font-black text-tp-purple mb-4">Objective</h3>
                    <p className="text-gray-600 max-w-lg mx-auto leading-relaxed">{lesson.objective}</p>
                 </div>
              </div>
            )}
            <div className="p-8 bg-tp-navy flex justify-center">
              <button 
                onClick={startQuiz}
                disabled={isGenerating}
                className="bg-tp-red text-white font-black py-4 px-16 rounded-2xl hover:bg-red-700 transition-all shadow-2xl shadow-tp-red/40 uppercase tracking-widest text-sm flex items-center"
              >
                {isGenerating ? 'AI Generating Quiz...' : 'Take Certification Quiz'}
              </button>
            </div>
          </div>
        )}

        {view === 'quiz' && (
          <div className="max-w-3xl mx-auto p-12 overflow-y-auto h-full custom-scrollbar">
            <h3 className="text-2xl font-black text-tp-purple mb-8 uppercase tracking-tight">Competency Check</h3>
            <div className="space-y-10">
              {quizQuestions.map((q, i) => (
                <div key={i} className="space-y-4">
                  <p className="font-bold text-lg text-gray-800">{i + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 gap-3">
                    {q.options.map((opt, optIdx) => (
                      <button 
                        key={optIdx}
                        onClick={() => { const n = [...answers]; n[i] = optIdx; setAnswers(n); }}
                        className={`text-left p-4 rounded-xl border-2 transition-all font-medium ${answers[i] === optIdx ? 'border-tp-purple bg-tp-purple/5 text-tp-purple' : 'border-gray-100 hover:border-gray-200 text-gray-600'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button 
                onClick={submitQuiz}
                className="w-full bg-tp-purple text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-tp-navy transition-all shadow-xl shadow-tp-purple/20"
              >
                Submit Assessment
              </button>
            </div>
          </div>
        )}

        {view === 'result' && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="bg-white rounded-3xl p-12 max-w-md text-center shadow-2xl border border-gray-100">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${score >= 60 ? 'bg-green-100 text-green-600' : 'bg-tp-red/10 text-tp-red'}`}>
                {/* Fix: Added filled prop to CheckCircleIcon */}
                {score >= 60 ? <CheckCircleIcon filled={true} className="w-12 h-12" /> : <ExclamationCircleIcon className="w-12 h-12" />}
              </div>
              <h2 className="text-3xl font-black text-tp-purple mb-2 uppercase">{score >= 60 ? 'Passed' : 'Not Yet'}</h2>
              <p className="text-4xl font-black text-tp-purple mb-6">{score}%</p>
              <p className="text-gray-600 mb-8">{score >= 60 ? 'Excellent work! Your progress has been synced to the team registry.' : 'You need 60% to pass. Please review the material and try again.'}</p>
              <button onClick={onClose} className="w-full bg-tp-navy text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest">Return to Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonViewer;
