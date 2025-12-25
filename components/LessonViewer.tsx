
import React from 'react';
import type { Lesson } from '../types';
import { ExitIcon } from './Icons';

interface LessonViewerProps {
  lesson: Lesson;
  onComplete: () => void;
  onClose: () => void;
}

const LessonViewer: React.FC<LessonViewerProps> = ({ lesson, onComplete, onClose }) => {
  const formatUrl = (url?: string) => {
    if (!url) return '';
    
    // YouTube Embed Logic
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(youtubeRegex);
    
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    
    return url;
  };

  const embeddedUrl = formatUrl(lesson.link);

  return (
    <div className="fixed inset-0 z-50 bg-tp-navy/95 backdrop-blur-xl flex flex-col animate-fadeIn">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-tp-purple border-b border-white/10">
        <div className="flex items-center">
            <div className="p-2 bg-tp-red rounded-lg mr-4">
                <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
            <div>
                <h2 className="text-white font-black text-xl tracking-tight uppercase">{lesson.title}</h2>
                <p className="text-xs text-gray-300 font-bold uppercase tracking-widest">{lesson.type} • {lesson.level}</p>
            </div>
        </div>
        <button 
            onClick={onClose}
            className="p-3 text-white hover:bg-white/10 rounded-full transition-all group"
            title="Close Lesson"
        >
            <ExitIcon className="w-6 h-6" />
        </button>
      </header>

      {/* Body / Iframe */}
      <div className="flex-1 relative bg-white overflow-hidden">
        {lesson.link ? (
            <div className="w-full h-full flex flex-col">
                <iframe 
                    src={embeddedUrl} 
                    className="w-full h-full border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                />
                
                {/* Fallback & Info bar for standard links */}
                {!embeddedUrl.includes('youtube.com/embed') && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-gray-100 flex items-center space-x-4">
                        <p className="text-sm font-bold text-tp-purple">Difficulty viewing?</p>
                        <a 
                            href={lesson.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-black text-tp-red hover:underline uppercase tracking-widest"
                        >
                            Open in New Tab
                        </a>
                    </div>
                )}
            </div>
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-10 text-center">
                 <div className="w-20 h-20 bg-tp-purple/5 rounded-3xl flex items-center justify-center text-tp-purple mb-6">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                 </div>
                 <h3 className="text-2xl font-black text-tp-purple mb-4">No Digital Resource Available</h3>
                 <p className="text-gray-700 max-w-md font-medium text-lg leading-relaxed">
                    This lesson is a manual practice or reading objective. Please refer to your internal training documents or follow the objectives listed.
                 </p>
            </div>
        )}
      </div>

      {/* Footer / Completion Bar */}
      <footer className="px-8 py-6 bg-tp-navy border-t border-white/5 flex justify-center">
        <button 
            onClick={onComplete}
            className="bg-tp-red text-white font-black py-4 px-16 rounded-2xl hover:bg-red-700 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-tp-red/40 uppercase tracking-[0.2em] text-sm md:text-base flex items-center"
        >
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            Mark as Complete
        </button>
      </footer>
    </div>
  );
};

export default LessonViewer;
