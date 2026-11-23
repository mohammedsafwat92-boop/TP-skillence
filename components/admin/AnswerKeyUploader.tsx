import React, { useState, useEffect, useMemo, useRef } from 'react';
import mammoth from 'mammoth';
import { googleSheetService } from '../../services/googleSheetService';
import type { InteractiveLessonData, StoredInteractiveLesson } from '../../types';
import {
  KeyRound,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  RotateCcw,
  Save,
  BookOpen,
  Search
} from 'lucide-react';

export const DEFAULT_EVALUATION_GUIDELINES = `1. Grade each response primarily for meaning, accuracy, and grammatical correctness relative to the Official Answer Key.
2. Accept valid paraphrases, synonyms, and multiple grammatically sound acceptable answers that convey the same meaning.
3. Ignore minor punctuation, capitalization, extra spacing, or standard contraction differences (e.g., "don't" vs "do not", "what's" vs "what is") on question-formation and short-answer items.
4. Award "correct" (85–100) for accurate answers, "partial" (40–84) for partially accurate answers with minor gaps, and "incorrect" (0–39) for inaccurate or off-topic responses.
5. Provide concise, constructive feedback and include a clear model sampleAnswer for each evaluated item.`;

interface AnswerKeyUploaderProps {
  onUpdated?: (lesson: InteractiveLessonData) => void;
}

export const AnswerKeyUploader: React.FC<AnswerKeyUploaderProps> = ({ onUpdated }) => {
  const [lessons, setLessons] = useState<StoredInteractiveLesson[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState<boolean>(true);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [answerKey, setAnswerKey] = useState<string>('');
  const [evaluationGuidelines, setEvaluationGuidelines] = useState<string>(DEFAULT_EVALUATION_GUIDELINES);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [isExtractingFile, setIsExtractingFile] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef<number>(0);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLessons = async () => {
    setIsLoadingLessons(true);
    setErrorMessage(null);
    try {
      const fetched = await googleSheetService.getInteractiveLessons();
      const normalized: StoredInteractiveLesson[] = (Array.isArray(fetched) ? fetched : []).map((raw: any) => {
        const parsedData: InteractiveLessonData =
          typeof raw?.lessonData === 'string'
            ? (() => {
                try {
                  return JSON.parse(raw.lessonData);
                } catch {
                  return { title: raw.title || 'Untitled Lesson', blocks: [] };
                }
              })()
            : raw?.lessonData || {
                id: raw?.id,
                title: raw?.title || 'Untitled Lesson',
                blocks: raw?.blocks || [],
                audioFilesMapped: raw?.audioFilesMapped,
                docxFilename: raw?.docxFilename,
                createdAt: raw?.createdAt,
                autoGraded: raw?.autoGraded,
                answerKey: raw?.answerKey,
                evaluationGuidelines: raw?.evaluationGuidelines
              };

        return {
          id: String(raw?.id || parsedData?.id || ''),
          title: String(raw?.title || parsedData?.title || 'Untitled Lesson'),
          createdAt: String(raw?.createdAt || parsedData?.createdAt || ''),
          lessonData: {
            ...parsedData,
            id: String(raw?.id || parsedData?.id || ''),
            title: String(parsedData?.title || raw?.title || 'Untitled Lesson')
          }
        };
      });

      setLessons(normalized);
      if (normalized.length > 0 && !selectedLessonId) {
        selectLesson(normalized[0]);
      } else if (selectedLessonId) {
        const match = normalized.find((l) => l.id === selectedLessonId);
        if (match) {
          selectLesson(match);
        }
      }
    } catch (err: any) {
      console.error('Failed to load interactive lessons:', err);
      setErrorMessage(err?.message || 'Unable to load existing interactive lessons.');
    } finally {
      setIsLoadingLessons(false);
    }
  };

  useEffect(() => {
    loadLessons();
  }, []);

  const selectLesson = (lesson: StoredInteractiveLesson) => {
    setSelectedLessonId(lesson.id);
    setAnswerKey(lesson.lessonData?.answerKey || '');
    setEvaluationGuidelines(
      lesson.lessonData?.evaluationGuidelines && lesson.lessonData.evaluationGuidelines.trim().length > 0
        ? lesson.lessonData.evaluationGuidelines
        : DEFAULT_EVALUATION_GUIDELINES
    );
    setUploadedFilename(null);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const selectedLesson = useMemo(
    () => lessons.find((l) => l.id === selectedLessonId) || null,
    [lessons, selectedLessonId]
  );

  const filteredLessons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
    );
  }, [lessons, searchQuery]);

  const processAnswerKeyFile = async (file: File) => {
    setIsExtractingFile(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const lowerName = file.name.toLowerCase();
      let extractedText = '';

      if (lowerName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const rawRes = await mammoth.extractRawText({ arrayBuffer });
        extractedText = (rawRes?.value || '').trim();
        if (!extractedText) {
          const htmlRes = await mammoth.convertToHtml({ arrayBuffer });
          extractedText = (htmlRes?.value || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      } else if (lowerName.endsWith('.json')) {
        const text = await file.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            if (typeof parsed.answerKey === 'string') {
              extractedText = parsed.answerKey;
              if (typeof parsed.evaluationGuidelines === 'string' && parsed.evaluationGuidelines.trim()) {
                setEvaluationGuidelines(parsed.evaluationGuidelines.trim());
              }
            } else {
              extractedText = JSON.stringify(parsed, null, 2);
            }
          } else {
            extractedText = JSON.stringify(parsed, null, 2);
          }
        } catch {
          extractedText = text.trim();
        }
      } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || file.type.startsWith('text/')) {
        extractedText = (await file.text()).trim();
      } else {
        setErrorMessage(`Unsupported file type "${file.name}". Please upload a .docx, .txt, .md, or .json file.`);
        return;
      }

      if (!extractedText) {
        setErrorMessage(`No readable text could be extracted from "${file.name}".`);
        return;
      }

      setAnswerKey(extractedText);
      setUploadedFilename(file.name);
    } catch (err: any) {
      console.error('Failed to extract answer key file:', err);
      setErrorMessage(err?.message || `Failed to read "${file.name}".`);
    } finally {
      setIsExtractingFile(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processAnswerKeyFile(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (isExtractingFile) return;

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    await processAnswerKeyFile(file);
  };

  const openFilePicker = () => {
    if (isExtractingFile) return;
    fileInputRef.current?.click();
  };

  const handleSaveAnswerKey = async () => {
    if (!selectedLesson) {
      setErrorMessage('Please select an existing interactive lesson first.');
      return;
    }
    if (!answerKey.trim()) {
      setErrorMessage('Please upload or paste an Answer Key before saving.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const existingData = selectedLesson.lessonData || {
        title: selectedLesson.title,
        blocks: []
      };

      // Preserve all existing blocks, audioUrl fields, and audioFilesMapped
      const updatedLessonData: InteractiveLessonData = {
        ...existingData,
        id: selectedLesson.id,
        title: existingData.title || selectedLesson.title,
        blocks: Array.isArray(existingData.blocks) ? existingData.blocks : [],
        ...(existingData.audioFilesMapped ? { audioFilesMapped: existingData.audioFilesMapped } : {}),
        autoGraded: true,
        answerKey: answerKey.trim(),
        evaluationGuidelines: evaluationGuidelines.trim() || DEFAULT_EVALUATION_GUIDELINES
      };

      await googleSheetService.saveLesson(
        updatedLessonData.title,
        updatedLessonData,
        selectedLesson.id
      );

      setLessons((prev) =>
        prev.map((item) =>
          item.id === selectedLesson.id
            ? {
                ...item,
                title: updatedLessonData.title,
                lessonData: updatedLessonData
              }
            : item
        )
      );

      setSuccessMessage(
        `Saved Answer Key & Evaluation Guidelines for "${updatedLessonData.title}". Auto-Grading is now enabled.`
      );
      if (onUpdated) {
        onUpdated(updatedLessonData);
      }
    } catch (err: any) {
      console.error('Failed to save answer key:', err);
      setErrorMessage(err?.message || 'Failed to save answer key onto the selected lesson.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedAudioCount = selectedLesson?.lessonData?.blocks?.filter((b) => b.type === 'audio').length || 0;
  const selectedQuestionCount =
    selectedLesson?.lessonData?.blocks?.reduce((count, block) => {
      if (block.type === 'freetext') return count + 1;
      if (block.type === 'smallfreetext' || block.type === 'text') {
        const matches = (block.content || '').match(/[\(\[]Entry:\s*Small\s*Free\s*Text[\)\]]/gi);
        if (matches && matches.length > 0) return count + matches.length;
        if (block.type === 'smallfreetext') return count + 1;
      }
      return count;
    }, 0) || 0;

  return (
    <div id="answer-key-uploader-container" className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 max-w-5xl mx-auto my-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-center text-tp-purple flex-shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Answer Key &amp; Auto-Grading Manager
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Attach answer keys and grading rubrics to already-uploaded interactive lessons without re-uploading .docx or audio files
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadLessons}
          disabled={isLoadingLessons}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-700 hover:text-tp-purple text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLessons ? 'animate-spin' : ''}`} />
          Refresh Lessons
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start gap-3 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          <div>{successMessage}</div>
        </div>
      )}

      {isLoadingLessons ? (
        <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 text-tp-purple animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider">Loading interactive lessons...</p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="py-14 px-6 text-center bg-slate-50/70 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No Interactive Lessons Found</p>
          <p className="text-xs text-slate-500">
            Upload an interactive .DOCX lesson first, then return here to attach its Answer Key.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Lesson Picker */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Select Uploaded Lesson ({lessons.length})
              </label>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by title or lesson ID..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-tp-purple focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredLessons.map((lesson) => {
                const isSelected = lesson.id === selectedLessonId;
                const isAutoGraded = Boolean(
                  lesson.lessonData?.autoGraded ||
                    (lesson.lessonData?.answerKey && lesson.lessonData.answerKey.trim().length > 0)
                );

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => selectLesson(lesson)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50/70 border-tp-purple shadow-sm'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {lesson.title}
                      </p>
                      <span
                        className={`flex-shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          isAutoGraded
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {isAutoGraded ? 'Auto-Graded' : 'No Key'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-1.5 truncate">
                      ID: {lesson.id}
                    </p>
                  </button>
                );
              })}

              {filteredLessons.length === 0 && (
                <div className="py-8 text-center text-xs font-semibold text-slate-400">
                  No lessons match "{searchQuery}".
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Answer Key & Guidelines Editor */}
          <div className="lg:col-span-7 space-y-5">
            {selectedLesson && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-tp-purple">
                    Selected Lesson
                  </p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">{selectedLesson.title}</p>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                    ID: {selectedLesson.id} • {selectedQuestionCount} Questions • {selectedAudioCount} Audio Tracks
                  </p>
                </div>
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg border ${
                    selectedLesson.lessonData?.autoGraded || selectedLesson.lessonData?.answerKey
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {selectedLesson.lessonData?.autoGraded || selectedLesson.lessonData?.answerKey
                    ? 'Auto-Graded Active'
                    : 'Not Yet Auto-Graded'}
                </span>
              </div>
            )}

            {/* File Upload Zone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                2. Upload Answer Key File (.docx, .txt, .md, .json)
              </label>
              <div
                onClick={openFilePicker}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openFilePicker();
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer select-none ${
                  isDragging
                    ? 'border-tp-purple bg-purple-50/80 ring-2 ring-tp-purple/20'
                    : 'border-slate-200 hover:border-tp-purple bg-slate-50/50 hover:bg-purple-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="answer-key-file-input"
                  type="file"
                  accept=".docx,.txt,.md,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isExtractingFile}
                />
                <div className="flex flex-col items-center gap-2.5">
                  {isExtractingFile ? (
                    <Loader2 className="w-7 h-7 text-tp-purple animate-spin" />
                  ) : (
                    <Upload className={`w-7 h-7 ${isDragging ? 'text-tp-purple scale-110' : 'text-tp-purple'} transition-transform`} />
                  )}
                  <span className="text-xs font-bold text-slate-800">
                    {isExtractingFile
                      ? 'Extracting answer key text...'
                      : isDragging
                        ? 'Drop your Answer Key file here'
                        : uploadedFilename
                          ? `Loaded from: ${uploadedFilename}`
                          : 'Drag & drop your .docx, .txt, .md, or .json Answer Key here'}
                  </span>
                  <button
                    type="button"
                    disabled={isExtractingFile}
                    onClick={(e) => {
                      e.stopPropagation();
                      openFilePicker();
                    }}
                    className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-tp-purple hover:text-tp-purple text-slate-700 text-xs font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {uploadedFilename ? 'Browse Replacement File' : 'Browse File'}
                  </button>
                  <span className="text-[11px] text-slate-400">
                    Extracted content populates the Answer Key editor below so you can review or edit before saving
                  </span>
                </div>
              </div>
            </div>

            {/* Answer Key Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="answer-key-textarea"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-tp-purple" />
                  3. Answer Key Content
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  {answerKey.trim().length} chars
                </span>
              </div>
              <textarea
                id="answer-key-textarea"
                rows={7}
                value={answerKey}
                onChange={(e) => setAnswerKey(e.target.value)}
                placeholder="Paste or edit the official answer key here (e.g., Q1: ..., Q2: ...)..."
                className="w-full p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-tp-purple focus:bg-white focus:ring-2 focus:ring-tp-purple/15 transition-all"
              />
            </div>

            {/* Evaluation Guidelines Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="evaluation-guidelines-textarea"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-tp-purple" />
                  4. Evaluation Guidelines
                </label>
                <button
                  type="button"
                  onClick={() => setEvaluationGuidelines(DEFAULT_EVALUATION_GUIDELINES)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-tp-purple transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Default
                </button>
              </div>
              <textarea
                id="evaluation-guidelines-textarea"
                rows={5}
                value={evaluationGuidelines}
                onChange={(e) => setEvaluationGuidelines(e.target.value)}
                placeholder="Describe grading rules, accepted paraphrases, tolerance for minor punctuation/capitalization differences..."
                className="w-full p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-tp-purple focus:bg-white focus:ring-2 focus:ring-tp-purple/15 transition-all"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-tp-purple font-medium">
              Saving will automatically mark this lesson as <strong>Auto-Graded</strong> and preserve all existing text blocks, audio tracks, and mapped audio URLs.
            </div>

            <button
              id="save-answer-key-btn"
              type="button"
              onClick={handleSaveAnswerKey}
              disabled={isSaving || !selectedLesson || !answerKey.trim()}
              className="w-full py-3.5 px-6 rounded-2xl bg-tp-purple hover:bg-tp-purple-light text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Answer Key &amp; Enabling Auto-Grading...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Answer Key &amp; Enable Auto-Grading
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnswerKeyUploader;
