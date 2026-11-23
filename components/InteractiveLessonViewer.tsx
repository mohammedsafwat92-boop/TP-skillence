import React, { useState, useEffect } from 'react';
import { googleSheetService } from '../services/googleSheetService';
import type { InteractiveLessonData, LessonEvaluationResult } from '../types';
import { Play, Volume2, Send, CheckCircle2, AlertCircle, Loader2, FileText, HelpCircle, User, ShieldAlert, Sparkles, Award, XCircle, MinusCircle } from 'lucide-react';

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
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<LessonEvaluationResult | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  const isAutoGraded = Boolean(
    lessonData.autoGraded ||
    (lessonData.answerKey && lessonData.answerKey.trim().length > 0)
  );

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
    setEvaluationError(null);

    try {
      const lessonId = lessonData.id || `les_${lessonData.title.replace(/\s+/g, '_')}`;
      let evalResult: LessonEvaluationResult | undefined;

      if (isAutoGraded) {
        setIsEvaluating(true);
        try {
          evalResult = await googleSheetService.evaluateLessonAnswers({
            lessonTitle: lessonData.title,
            blocks: lessonData.blocks || [],
            answers,
            answerKey: lessonData.answerKey,
            evaluationGuidelines: lessonData.evaluationGuidelines
          });
          setEvaluation(evalResult);
        } catch (evalErr: any) {
          const msg = String(evalErr?.message || '');
          if (msg.includes('SESSION_EXPIRED') || msg.includes('FORBIDDEN')) {
            throw evalErr;
          }
          console.error("Automated evaluation failed (saving answers anyway):", evalErr);
          setEvaluationError(evalErr?.message || "Automatic grading could not be completed right now.");
        } finally {
          setIsEvaluating(false);
        }
      }

      const result = await googleSheetService.saveAnswers(
        currentUser.id,
        lessonId,
        answers,
        evalResult
      );

      // Validate explicit success boolean from backend response
      if (result && result.success) {
        const subId = result.id || 'ans_' + Date.now();
        setSubmissionId(subId);
        if (result.evaluation) {
          setEvaluation(result.evaluation);
        }
        setSubmitSuccess(true);
        if (onSubmitted) onSubmitted(subId);
      } else {
        const failureMsg = result?.message || "Unknown backend error while saving answers.";
        setErrorMessage(`Submission failed: ${failureMsg}`);
        alert(`Submission failed: ${failureMsg}`);
      }
    } catch (err: any) {
      console.error("Failed to submit free-text answers:", err);
      const failureMsg = err?.message || "Unknown network error.";
      setErrorMessage(`Submission failed: ${failureMsg}`);
      alert(`Submission failed: ${failureMsg}`);
    } finally {
      setIsSubmitting(false);
      setIsEvaluating(false);
    }
  };

  const totalFreeTextCount = React.useMemo(() => {
    let count = 0;
    for (const block of lessonData.blocks || []) {
      if (block.type === 'freetext') {
        count++;
      } else if (block.type === 'smallfreetext' || block.type === 'text') {
        const matches = (block.content || '').match(/[\(\[]Entry:\s*Small\s*Free\s*Text[\)\]]/gi);
        if (matches && matches.length > 0) {
          count += matches.length;
        } else if (block.type === 'smallfreetext') {
          count++;
        }
      }
    }
    return count;
  }, [lessonData.blocks]);

  const answeredCount = Object.keys(answers).filter(k => String(answers[k] || '').trim().length > 0).length;

  const renderTextWithInlineInputs = (
    content: string,
    baseQuestionId: string,
    blockIndex: number
  ) => {
    const SMALL_TAG_REGEX = /([\(\[]Entry:\s*Small\s*Free\s*Text[\)\]])/gi;
    const cleanedContent = content.replace(
      /<(strong|b|em|i|span)[^>]*>(\s*[\(\[]Entry:\s*Small\s*Free\s*Text[\)\]]\s*)<\/\1>/gi,
      '$2'
    );

    const parts = cleanedContent.split(SMALL_TAG_REGEX);
    let globalTagIndexInBlock = 0;

    return (
      <div className="text-gray-800 leading-relaxed text-sm sm:text-base font-normal bg-gray-50/50 p-6 rounded-2xl border border-gray-100 prose prose-purple max-w-none [&>p]:mb-2 [&>p]:last:mb-0 [&>ul]:list-disc [&>ul]:ml-6 [&>ol]:list-decimal [&>ol]:ml-6 [&>h1]:text-xl [&>h1]:font-black [&>h2]:text-lg [&>h2]:font-bold font-sans">
        {parts.map((part, partIdx) => {
          if (/^[\(\[]Entry:\s*Small\s*Free\s*Text[\)\]]$/i.test(part)) {
            const currentTagIdx = globalTagIndexInBlock;
            globalTagIndexInBlock++;
            const qId = currentTagIdx === 0 ? baseQuestionId : `${baseQuestionId}_${currentTagIdx + 1}`;
            const currentVal = answers[qId] || '';

            return (
              <span key={partIdx} className="inline-flex items-center gap-1.5 mx-1.5 my-1 align-middle">
                <span className="relative inline-block">
                  <input
                    type="text"
                    maxLength={65}
                    value={currentVal}
                    onChange={(e) => handleTextChange(qId, e.target.value)}
                    placeholder="Small free text (max 65 chars)..."
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-tp-purple focus:ring-2 focus:ring-tp-purple/20 transition-all shadow-sm w-48 sm:w-64 pr-12"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-mono font-medium text-slate-400 select-none pointer-events-none bg-slate-50/80 px-1.5 py-0.5 rounded border border-slate-200">
                    {currentVal.length}/65
                  </span>
                </span>
                {currentVal.trim() && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                )}
              </span>
            );
          }

          return (
            <span
              key={partIdx}
              dangerouslySetInnerHTML={{ __html: part }}
            />
          );
        })}
      </div>
    );
  };

  if (isCheckingAuth) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium flex flex-col items-center justify-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-200 max-w-xl mx-auto my-12">
        <Loader2 className="w-8 h-8 text-tp-purple animate-spin" />
        <p className="text-xs uppercase tracking-wider font-semibold">Verifying lesson authorization...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="locked-screen p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-rose-900">Unauthorized Access</h2>
        <p className="text-sm font-medium text-rose-700">You have not been assigned this lesson. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 max-w-4xl mx-auto my-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-tp-purple bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
              Interactive Lesson
            </span>
            {isAutoGraded && (
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5" /> Auto-Graded
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-2">
            {lessonData.title}
          </h1>
          {lessonData.docxFilename && (
            <p className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Source: {lessonData.docxFilename}
            </p>
          )}
        </div>

        {totalFreeTextCount > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center flex-shrink-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Free-Text Progress
            </span>
            <span className="text-sm font-bold text-tp-purple">
              {answeredCount} / {totalFreeTextCount} Answered
            </span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-3 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {submitSuccess ? (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 sm:p-8 text-center space-y-5">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-emerald-900">Answers Submitted Successfully!</h2>
          <p className="text-xs font-medium text-emerald-700 max-w-md mx-auto">
            Your responses have been securely stored in the <code className="bg-emerald-100 px-2 py-0.5 rounded text-emerald-900 font-mono">Brain_FreeTextAnswers</code> tab in Google Sheets.
          </p>
          {submissionId && (
            <div className="text-xs font-mono text-emerald-700 bg-emerald-100/60 py-1.5 px-3 rounded-lg inline-block">
              Submission ID: {submissionId}
            </div>
          )}

          {evaluation && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 text-left shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 text-tp-purple flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-tp-purple">
                      Automated Evaluation Results
                    </p>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Overall Performance Summary
                    </h3>
                  </div>
                </div>
                <div
                  className={`inline-flex items-baseline gap-1 px-4 py-2 rounded-xl border font-extrabold tabular-nums self-start sm:self-auto ${
                    evaluation.overallScore >= 80
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : evaluation.overallScore >= 50
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  <span className="text-2xl">{evaluation.overallScore}%</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Score</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                {evaluation.summary}
              </p>
            </div>
          )}

          {evaluationError && !evaluation && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-2.5 text-left text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                Your answers were saved, but automatic evaluation could not finish: {evaluationError}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-emerald-200 text-left space-y-3">
            <h3 className="text-xs font-bold uppercase text-emerald-900 tracking-wider">Your Submitted Responses:</h3>
            {Object.entries(answers).map(([qId, ansText]) => {
              const qEval = evaluation?.perQuestion?.find(
                (item) => item.questionId.toLowerCase() === qId.toLowerCase()
              );

              const verdictBadge = qEval ? (
                qEval.verdict === 'correct' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Correct • {qEval.score}%
                  </span>
                ) : qEval.verdict === 'partial' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                    <MinusCircle className="w-3.5 h-3.5" /> Partial • {qEval.score}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                    <XCircle className="w-3.5 h-3.5" /> Incorrect • {qEval.score}%
                  </span>
                )
              ) : null;

              return (
                <div key={qId} className="bg-white border border-emerald-200 p-4 rounded-xl text-xs space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-emerald-800 uppercase tracking-wider">{qId.toUpperCase()}:</span>
                    {verdictBadge}
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap font-medium">{ansText}</p>
                  {qEval && (
                    <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                      <p className="text-slate-700 leading-relaxed">
                        <span className="font-bold text-slate-900">Feedback: </span>
                        {qEval.feedback}
                      </p>
                      {qEval.sampleAnswer && (
                        <p className="text-tp-purple bg-purple-50/60 border border-purple-100 rounded-lg px-3 py-2 leading-relaxed">
                          <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">Sample Answer</span>
                          <span className="font-medium text-slate-800">{qEval.sampleAnswer}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Blocks Renderer */}
          {lessonData.blocks.map((block, index) => {
            if (block.type === 'smallfreetext' || (block.type === 'text' && /[\(\[]Entry:\s*Small\s*Free\s*Text[\)\]]/i.test(block.content || ''))) {
              return (
                <div key={block.id || index}>
                  {renderTextWithInlineInputs(block.content || '', block.questionId || `q_${index}`, index)}
                </div>
              );
            }

            if (block.type === 'text') {
              return (
                <div
                  key={block.id || index}
                  className="text-gray-800 leading-relaxed text-sm sm:text-base font-normal bg-gray-50/50 p-6 rounded-2xl border border-gray-100 prose prose-purple max-w-none [&>p]:mb-3 [&>p]:last:mb-0 [&>ul]:list-disc [&>ul]:ml-6 [&>ol]:list-decimal [&>ol]:ml-6 [&>h1]:text-xl [&>h1]:font-black [&>h2]:text-lg [&>h2]:font-bold font-sans"
                  dangerouslySetInnerHTML={{ __html: block.content || '' }}
                />
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
                <div key={block.id || index} className="bg-white border border-purple-200/80 p-5 sm:p-6 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-tp-purple font-bold text-xs uppercase tracking-wider">
                      <HelpCircle className="w-4 h-4" />
                      <span>{block.label || `Free Text Entry Question`}</span>
                    </div>
                    {currentVal.trim() && (
                      <span className="text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Answered
                      </span>
                    )}
                  </div>

                  <textarea
                    rows={4}
                    value={currentVal}
                    onChange={(e) => handleTextChange(qId, e.target.value)}
                    placeholder="Type your free-text answer here..."
                    className="w-full p-3.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-tp-purple focus:ring-2 focus:ring-tp-purple/20 transition-all bg-slate-50/50"
                  />
                </div>
              );
            }

            return null;
          })}

          {/* Submit Action */}
          {totalFreeTextCount > 0 && (
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-tp-purple" /> Submitting as: <strong className="text-slate-900">{currentUser.name}</strong>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-tp-purple hover:bg-tp-purple-light text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {isEvaluating ? 'Auto-Grading Your Answers...' : 'Submitting to Google Sheets...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> {isAutoGraded ? 'Submit & Grade Answers' : 'Submit Answers'}
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
