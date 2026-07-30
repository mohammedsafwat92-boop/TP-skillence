import React, { useState, useEffect } from 'react';
import { googleSheetService } from '../services/googleSheetService';
import type { InteractiveLessonData } from '../types';
import { Play, Volume2, Send, CheckCircle2, AlertCircle, Loader2, FileText, HelpCircle, User, ShieldAlert } from 'lucide-react';

interface InteractiveLessonViewerProps {
  lessonData: InteractiveLessonData;
  currentUser?: { id: string; name: string; role?: string };
  onSubmitted?: (submissionId: string) => void;
}

export const InteractiveLessonViewer: React.FC<InteractiveLessonViewerProps> = ({
  lessonData,
  currentUser = { id: 'user_anonymous', name: 'Student' },
  onSubmitted
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  useEffect(() => {
    const verifyAccess = async () => {
      // Admins and coaches bypass shielding for preview and management
      if ((currentUser as any)?.role === 'admin' || (currentUser as any)?.role === 'coach') {
        setIsAuthorized(true);
        setIsCheckingAuth(false);
        return;
      }

      if (!currentUser?.id) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        return;
      }

      try {
        const myLessons = await googleSheetService.getMyLessons(currentUser.id);
        const currentLessonId = lessonData.id || `les_${lessonData.title.replace(/\s+/g, '_')}`;

        const hasAccess = Array.isArray(myLessons) && myLessons.some((l: any) => {
          const lId = l.id || l.lessonData?.id;
          const lTitle = l.title || l.lessonData?.title;
          return String(lId) === String(currentLessonId) ||
                 String(lId) === String(lessonData.id) ||
                 (lTitle && lTitle.trim().toLowerCase() === lessonData.title.trim().toLowerCase());
        });

        setIsAuthorized(hasAccess);
      } catch (err) {
        console.error("Failed to verify lesson authorization:", err);
        setIsAuthorized(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    verifyAccess();
  }, [lessonData, currentUser]);

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: text
    }));
  };

  const handleSubmit = async () => {
    // Check if at least one answer is provided
    const hasAnyAnswer = (Object.values(answers) as string[]).some(a => String(a || '').trim().length > 0);
    if (!hasAnyAnswer) {
      setErrorMessage("Please answer at least one free-text question before submitting.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const lessonId = lessonData.id || `les_${lessonData.title.replace(/\s+/g, '_')}`;
      const res = await googleSheetService.saveAnswers(
        currentUser.id,
        lessonId,
        answers
      );

      setSubmissionId(res.id);
      setSubmitSuccess(true);
      if (onSubmitted) onSubmitted(res.id);
    } catch (err: any) {
      console.error("Failed to submit free-text answers:", err);
      setErrorMessage(err?.message || "Failed to submit answers to Google Sheets.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const freeTextCount = lessonData.blocks.filter(b => b.type === 'freetext').length;
  const answeredCount = Object.keys(answers).filter(k => String(answers[k] || '').trim().length > 0).length;

  if (isCheckingAuth) {
    return (
      <div className="p-12 text-center text-gray-500 font-bold flex flex-col items-center justify-center gap-3 bg-white rounded-3xl shadow-xl border border-gray-100 max-w-xl mx-auto my-12">
        <Loader2 className="w-8 h-8 text-tp-purple animate-spin" />
        <p className="text-xs uppercase tracking-widest">Verifying lesson authorization...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="locked-screen p-8 bg-red-50 border-2 border-red-200 rounded-3xl text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-red-900">Unauthorized Access</h2>
        <p className="text-sm font-semibold text-red-700">You have not been assigned this lesson. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-gray-100 max-w-4xl mx-auto my-6 space-y-8">
      {/* Header */}
      <div className="border-b border-gray-100 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-tp-purple bg-tp-purple/10 px-3 py-1 rounded-full">
            Interactive Lesson
          </span>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-2">
            {lessonData.title}
          </h1>
          {lessonData.docxFilename && (
            <p className="text-xs font-semibold text-gray-400 mt-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Source: {lessonData.docxFilename}
            </p>
          )}
        </div>

        {freeTextCount > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-center flex-shrink-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
              Free-Text Progress
            </span>
            <span className="text-sm font-black text-tp-purple">
              {answeredCount} / {freeTextCount} Answered
            </span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border-2 border-red-200 text-red-800 rounded-2xl flex items-start gap-3 text-xs font-bold">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {submitSuccess ? (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-black text-emerald-900">Answers Submitted Successfully!</h2>
          <p className="text-xs font-semibold text-emerald-700 max-w-md mx-auto">
            Your responses have been securely stored in the <code className="bg-emerald-100 px-2 py-0.5 rounded text-emerald-900 font-mono">Brain_FreeTextAnswers</code> tab in Google Sheets.
          </p>
          {submissionId && (
            <div className="text-[11px] font-mono text-emerald-600 bg-emerald-100/60 py-2 px-4 rounded-xl inline-block">
              Submission ID: {submissionId}
            </div>
          )}

          <div className="pt-4 border-t border-emerald-200 text-left space-y-3">
            <h3 className="text-xs font-black uppercase text-emerald-900 tracking-wider">Your Submitted Responses:</h3>
            {Object.entries(answers).map(([qId, ansText]) => (
              <div key={qId} className="bg-white border border-emerald-200 p-4 rounded-xl text-xs space-y-1">
                <span className="font-black text-emerald-800 uppercase tracking-wider">{qId.toUpperCase()}:</span>
                <p className="text-gray-700 whitespace-pre-wrap font-medium">{ansText}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Blocks Renderer */}
          {lessonData.blocks.map((block, index) => {
            if (block.type === 'text') {
              return (
                <div key={block.id || index} className="text-gray-800 leading-relaxed text-sm sm:text-base font-normal space-y-3 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                  {block.content?.split('\n\n').map((paragraph, pIdx) => (
                    <p key={pIdx} className="whitespace-pre-wrap">{paragraph}</p>
                  ))}
                </div>
              );
            }

            if (block.type === 'audio') {
              return (
                <div key={block.id || index} className="bg-gradient-to-r from-tp-purple/5 to-tp-red/5 p-6 rounded-2xl border-2 border-tp-purple/20 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-tp-purple text-white rounded-xl flex items-center justify-center shadow-md">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        Audio Track
                      </h4>
                      <p className="text-[11px] font-bold text-gray-500">
                        {block.audioFilename || `Audio Clip ${index + 1}`}
                      </p>
                    </div>
                  </div>

                  {block.audioUrl ? (
                    <audio
                      controls
                      src={block.audioUrl}
                      className="w-full mt-2 rounded-xl focus:outline-none"
                    >
                      Your browser does not support the audio element.
                    </audio>
                  ) : (
                    <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Audio URL missing or processing.
                    </div>
                  )}
                </div>
              );
            }

            if (block.type === 'freetext') {
              const qId = block.questionId || `q_${index}`;
              const currentVal = answers[qId] || '';

              return (
                <div key={block.id || index} className="bg-white border-2 border-tp-purple/30 p-6 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-tp-purple font-black text-xs uppercase tracking-wider">
                      <HelpCircle className="w-4 h-4" />
                      <span>{block.label || `Free Text Entry Question`}</span>
                    </div>
                    {currentVal.trim() && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Answered
                      </span>
                    )}
                  </div>

                  <textarea
                    rows={4}
                    value={currentVal}
                    onChange={(e) => handleTextChange(qId, e.target.value)}
                    placeholder="Type your free-text answer here..."
                    className="w-full p-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:border-tp-purple focus:ring-2 focus:ring-tp-purple/20 transition-all bg-gray-50/50"
                  />
                </div>
              );
            }

            return null;
          })}

          {/* Submit Action */}
          {freeTextCount > 0 && (
            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-tp-purple" /> Submitting as: <strong className="text-gray-900">{currentUser.name}</strong>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-tp-purple to-tp-red text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting to Google Sheets...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Answers
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteractiveLessonViewer;
