import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Globe,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Sparkles,
  Link2,
  HelpCircle,
  Info,
  Database
} from 'lucide-react';
import { CohortSummary, SheetConfig } from '../types';
import {
  extractGoogleSheetId,
  fetchGoogleSheetTabCsv,
  parseCsvTextForTab,
  parseExcelWorkbook,
  downloadSixSheetExcelTemplate
} from '../utils/sheetParser';
import { INITIAL_COHORTS_DATA, DEFAULT_SHEET_NAMES } from '../data/mockCohortsData';

interface SheetsDataManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohorts: CohortSummary[];
  onUpdateCohorts: (newCohorts: CohortSummary[], sourceType: string) => void;
}

export const SheetsDataManagerModal: React.FC<SheetsDataManagerModalProps> = ({
  isOpen,
  onClose,
  cohorts,
  onUpdateCohorts,
}) => {
  const [activeTab, setActiveTab] = useState<'google_sheets' | 'excel_upload' | 'sample_data'>('google_sheets');
  const [googleSheetInput, setGoogleSheetInput] = useState<string>('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit');
  const [tabNames, setTabNames] = useState<string[]>(
    cohorts.length === 6 ? cohorts.map((c) => c.tabName) : DEFAULT_SHEET_NAMES
  );
  const [isFetchingAll, setIsFetchingAll] = useState<boolean>(false);
  const [sheetStatuses, setSheetStatuses] = useState<Record<number, { status: 'idle' | 'loading' | 'success' | 'error'; message?: string; count?: number }>>({
    1: { status: 'success', count: cohorts[0]?.traineeCount || 8 },
    2: { status: 'success', count: cohorts[1]?.traineeCount || 8 },
    3: { status: 'success', count: cohorts[2]?.traineeCount || 8 },
    4: { status: 'success', count: cohorts[3]?.traineeCount || 8 },
    5: { status: 'success', count: cohorts[4]?.traineeCount || 8 },
    6: { status: 'success', count: cohorts[5]?.traineeCount || 8 },
  });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTabNameChange = (index: number, val: string) => {
    const updated = [...tabNames];
    updated[index] = val;
    setTabNames(updated);
  };

  const handleFetchAllGoogleSheets = async () => {
    setGlobalError(null);
    setGlobalSuccess(null);
    const sheetId = extractGoogleSheetId(googleSheetInput);

    if (!sheetId) {
      setGlobalError('Please enter a valid Google Sheet URL or Spreadsheet ID.');
      return;
    }

    setIsFetchingAll(true);
    const newStatuses: typeof sheetStatuses = {};
    const parsedCohorts: CohortSummary[] = [];
    const errors: string[] = [];

    for (let i = 0; i < 6; i++) {
      const sheetIndex = i + 1;
      const tabName = tabNames[i] || `Cohort ${sheetIndex}`;
      newStatuses[sheetIndex] = { status: 'loading' };
      setSheetStatuses({ ...newStatuses });

      try {
        const csvText = await fetchGoogleSheetTabCsv(sheetId, tabName);
        const cohort = parseCsvTextForTab(csvText, sheetIndex, tabName);
        parsedCohorts.push(cohort);
        newStatuses[sheetIndex] = {
          status: 'success',
          count: cohort.traineeCount,
          message: `Successfully loaded ${cohort.traineeCount} trainees`
        };
      } catch (err: any) {
        console.warn(`Error fetching tab "${tabName}":`, err);
        errors.push(`${tabName}: ${err.message || 'Failed to fetch'}`);
        newStatuses[sheetIndex] = {
          status: 'error',
          message: err.message || 'Failed to fetch tab'
        };
      }
      setSheetStatuses({ ...newStatuses });
    }

    setIsFetchingAll(false);

    if (parsedCohorts.length > 0) {
      // If some succeeded and some failed, merge with existing or fallback
      const fullList: CohortSummary[] = [];
      for (let i = 0; i < 6; i++) {
        const matched = parsedCohorts.find((c) => c.sheetIndex === i + 1);
        if (matched) {
          fullList.push(matched);
        } else if (cohorts[i]) {
          fullList.push(cohorts[i]);
        } else {
          fullList.push(INITIAL_COHORTS_DATA[i]);
        }
      }

      onUpdateCohorts(fullList, 'google_sheets');
      if (errors.length === 0) {
        setGlobalSuccess(`Successfully grabbed data from all 6 sheets! Total trainees: ${fullList.reduce((acc, c) => acc + c.traineeCount, 0)}.`);
      } else {
        setGlobalSuccess(`Grabbed data from ${parsedCohorts.length} of 6 sheets. (Retained previous data for failed tabs).`);
        setGlobalError(`Some tabs could not be read: ${errors.join(' | ')}`);
      }
    } else {
      setGlobalError(`Could not grab data from the Google Sheet. Please verify that:
1) The Google Sheet sharing is set to "Anyone with the link can view".
2) The tab names match your sheet exactly (e.g. "Cohort 1", "Cohort 2", etc.).`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalError(null);
    setGlobalSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseExcelWorkbook(file);
      if (parsed.length > 0) {
        // Pad to 6 if workbook had fewer than 6 sheets
        const fullList: CohortSummary[] = [];
        for (let i = 0; i < 6; i++) {
          if (parsed[i]) {
            fullList.push(parsed[i]);
          } else {
            fullList.push(INITIAL_COHORTS_DATA[i]);
          }
        }
        onUpdateCohorts(fullList, 'excel_file');
        setTabNames(fullList.map((c) => c.tabName));
        setGlobalSuccess(`Successfully imported ${parsed.length} cohort sheets from "${file.name}"!`);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to parse Excel workbook.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadSampleDataset = () => {
    onUpdateCohorts(INITIAL_COHORTS_DATA, 'sample_data');
    setTabNames(DEFAULT_SHEET_NAMES);
    const newStatuses: typeof sheetStatuses = {};
    INITIAL_COHORTS_DATA.forEach((c) => {
      newStatuses[c.sheetIndex] = {
        status: 'success',
        count: c.traineeCount,
        message: 'Preloaded benchmark cohort data'
      };
    });
    setSheetStatuses(newStatuses);
    setGlobalSuccess('Reset to standardized 6-cohort benchmark dataset.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                6 Sheets Data Connector & Manager
              </h2>
              <p className="text-xs text-slate-400">
                Synchronize roleplay simulations and test assessment scores across all 6 cohort sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('google_sheets')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'google_sheets'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Google Sheets Live Sync (6 Tabs)</span>
          </button>

          <button
            onClick={() => setActiveTab('excel_upload')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'excel_upload'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload 6-Sheet Excel / Workbook</span>
          </button>

          <button
            onClick={() => setActiveTab('sample_data')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'sample_data'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Benchmark Dataset & Templates</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {globalError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Sync Notice</p>
                <p className="text-red-300/90 whitespace-pre-line">{globalError}</p>
              </div>
            </div>
          )}

          {globalSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <p>{globalSuccess}</p>
            </div>
          )}

          {activeTab === 'google_sheets' && (
            <div className="space-y-6">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-indigo-400" />
                    Google Spreadsheet URL or Sheet ID
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Must be set to "Anyone with link can view"
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={googleSheetInput}
                    onChange={(e) => setGoogleSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit or spreadsheet ID"
                    className="flex-1 bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                  <button
                    onClick={handleFetchAllGoogleSheets}
                    disabled={isFetchingAll}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
                  >
                    {isFetchingAll ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Grabbing 6 Sheets...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Sync All 6 Sheets</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 6 Tabs Configuration Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <span>Individual Sheet Tab Names & Status</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      (Each tab represents one of the 6 training cohorts)
                    </span>
                  </h3>
                  <button
                    onClick={() => setTabNames(DEFAULT_SHEET_NAMES)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    Reset tab names to default
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((sheetNum) => {
                    const statusInfo = sheetStatuses[sheetNum] || { status: 'idle' };
                    const currentCohort = cohorts.find((c) => c.sheetIndex === sheetNum);

                    return (
                      <div
                        key={sheetNum}
                        className="bg-slate-950/40 border border-slate-800 rounded-xl p-3.5 space-y-2.5 relative group hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/20">
                              S{sheetNum}
                            </span>
                            <span className="text-xs font-bold text-white">
                              Sheet {sheetNum}
                            </span>
                          </div>
                          {statusInfo.status === 'loading' && (
                            <span className="flex items-center gap-1 text-[11px] text-amber-400">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Fetching...
                            </span>
                          )}
                          {statusInfo.status === 'success' && (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Synced ({currentCohort?.traineeCount || statusInfo.count || 0})
                            </span>
                          )}
                          {statusInfo.status === 'error' && (
                            <span className="flex items-center gap-1 text-[11px] text-red-400">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Error
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            Tab Name in Google Sheet:
                          </label>
                          <input
                            type="text"
                            value={tabNames[sheetNum - 1] || ''}
                            onChange={(e) => handleTabNameChange(sheetNum - 1, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs text-white outline-none"
                            placeholder={`Cohort ${sheetNum}`}
                          />
                        </div>

                        {currentCohort && (
                          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                            <span>RP: <strong className="text-indigo-300">{currentCohort.avgRoleplayScore}%</strong></span>
                            <span>Test: <strong className="text-cyan-300">{currentCohort.avgTestScore}%</strong></span>
                            <span>Cert: <strong className="text-emerald-400">{currentCohort.certificationRate}%</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Troubleshooting note */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-xs text-slate-400 flex items-start gap-3">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-300 mb-0.5">How Google Sheets Multi-Tab Grab Works</p>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    The applet uses the Google Visualization API to query all 6 tabs in parallel directly from your browser.
                    Your Google Sheet must have sharing permissions set to <strong className="text-slate-200">"Anyone with the link can view"</strong> (File → Share → Share with others → General access: Anyone with the link).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'excel_upload' && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/40 hover:bg-indigo-950/10 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 transition-colors">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Upload Multi-Sheet Excel Workbook (.xlsx)
                </h3>
                <p className="text-xs text-slate-400 max-w-md mb-4">
                  Drag and drop your spreadsheet here or click to browse. The parser will extract up to 6 cohort sheets automatically.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  Choose Excel File (.xlsx)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    Supported Column Headers
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-2">
                    The parser automatically detects flexible column variations:
                  </p>
                  <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4">
                    <li><strong className="text-slate-200">Trainee Name:</strong> Name, Learner, Student, Participant</li>
                    <li><strong className="text-slate-200">Roleplays:</strong> RP 1, RP 2, RP 3, RP 4, RP 5 (or Discovery, Objection, Pitch, Deescalation, Closing)</li>
                    <li><strong className="text-slate-200">Tests:</strong> Baseline, Module 1, Module 2, Module 3, Final Exam</li>
                    <li><strong className="text-slate-200">Rubrics:</strong> Communication, Product Knowledge, Active Listening, Objection Handling, Call Control</li>
                  </ul>
                </div>

                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                    <FileDown className="w-4 h-4 text-cyan-400" />
                    Need a Pre-Formatted Template?
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Download our official 6-sheet template workbook pre-configured with the exact columns and sample data.
                  </p>
                  <button
                    onClick={downloadSixSheetExcelTemplate}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-cyan-400" />
                    <span>Download 6-Sheet Template (.xlsx)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sample_data' && (
            <div className="space-y-6">
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Official 6-Cohort Training Benchmark Dataset
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Includes {INITIAL_COHORTS_DATA.reduce((s, c) => s + c.traineeCount, 0)} fully detailed trainees across 6 official waves: Mobility [W1: {INITIAL_COHORTS_DATA.find(c => c.code === 'W1')?.traineeCount || 13}, W2: {INITIAL_COHORTS_DATA.find(c => c.code === 'W2')?.traineeCount || 17}], Teleco [W3: {INITIAL_COHORTS_DATA.find(c => c.code === 'W3')?.traineeCount || 16}], and Travel [W4: {INITIAL_COHORTS_DATA.find(c => c.code === 'W4')?.traineeCount || 18}, W5: {INITIAL_COHORTS_DATA.find(c => c.code === 'W5')?.traineeCount || 6}, W6: {INITIAL_COHORTS_DATA.find(c => c.code === 'W6')?.traineeCount || 12}] with comprehensive simulation scores, rubric breakdowns, test progression, and trainer evaluations.
                    </p>
                  </div>
                  <button
                    onClick={handleLoadSampleDataset}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Load Benchmark Dataset</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {INITIAL_COHORTS_DATA.map((c) => (
                    <div key={c.id} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs">
                      <div className="font-semibold text-white truncate">{c.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Trainer: {c.trainer}</div>
                      <div className="flex justify-between items-center mt-2 text-[11px]">
                        <span className="text-slate-400">{c.traineeCount} Trainees</span>
                        <span className="font-bold text-indigo-400">{c.avgOverallScore}% Avg</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Download Standard 6-Sheet Excel Template</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Useful for distributing to trainers or importing into your team's Google Drive.
                  </p>
                </div>
                <button
                  onClick={downloadSixSheetExcelTemplate}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-emerald-400" />
                  <span>Download Template</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Currently tracking {cohorts.length} cohorts ({cohorts.reduce((acc, c) => acc + c.traineeCount, 0)} total trainees)</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close & View Analytics
          </button>
        </div>
      </div>
    </div>
  );
};
