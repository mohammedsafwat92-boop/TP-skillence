import React from 'react';
import {
  Layers,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Sparkles,
  BarChart3,
  Users,
  Compass,
  ArrowRightLeft,
  CheckCircle2,
  FileDown
} from 'lucide-react';
import { ViewTab, CohortSummary } from '../types';

interface HeaderProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  cohorts: CohortSummary[];
  onOpenDataManager: () => void;
  onExportExcel: () => void;
  onDownloadTemplate: () => void;
  onSyncLiveRoster?: () => void;
  hasLiveRoster?: boolean;
  isSyncing: boolean;
  sheetSourceType: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  cohorts,
  onOpenDataManager,
  onExportExcel,
  onDownloadTemplate,
  onSyncLiveRoster,
  hasLiveRoster,
  isSyncing,
  sheetSourceType,
}) => {
  const totalTrainees = cohorts.reduce((acc, c) => acc + c.traineeCount, 0);

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          {/* Logo & Main Info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#2E0854] flex items-center justify-center text-white shadow-xs">
              <Layers className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  Cohort Performance Intelligence
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {sheetSourceType === 'live_only'
                    ? 'Live Roster Active'
                    : sheetSourceType === 'benchmark_only'
                    ? '6-Sheet Baseline'
                    : 'Cross-Referenced (App + Benchmark)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Roleplays &amp; Standardized Tests Benchmark Engine across {cohorts.length} Cohort Waves ({totalTrainees} Trainees)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {onSyncLiveRoster && (
              <button
                onClick={onSyncLiveRoster}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                title="Sync and map live Skillence trainees, waves, and assessments into this dashboard"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Sync Live Roster</span>
              </button>
            )}

            <button
              onClick={onOpenDataManager}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors cursor-pointer"
              title="Configure and grab data from all 6 sheets"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>6 Sheets Data Manager</span>
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 text-purple-600 animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={onDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              title="Download empty 6-sheet Excel template for training data"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Template</span>
            </button>

            <button
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2E0854] hover:bg-[#4B1D7C] text-white shadow-xs transition-all cursor-pointer"
              title="Export all cohorts to formatted multi-sheet Excel file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .XLSX</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar border-t border-slate-200 pt-1 pb-2">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'dashboard'
                ? 'bg-purple-50 text-[#2E0854] border border-purple-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Executive Overview</span>
          </button>

          <button
            onClick={() => onSelectTab('matrix')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'matrix'
                ? 'bg-purple-50 text-[#2E0854] border border-purple-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Comparison Matrix</span>
          </button>

          <button
            onClick={() => onSelectTab('comparison')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'comparison'
                ? 'bg-purple-50 text-[#2E0854] border border-purple-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Head-to-Head Comparator</span>
          </button>

          <button
            onClick={() => onSelectTab('trainees')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'trainees'
                ? 'bg-purple-50 text-[#2E0854] border border-purple-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Trainee Directory ({totalTrainees})</span>
          </button>

          <button
            onClick={() => onSelectTab('insights')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'insights'
                ? 'bg-purple-50 text-[#2E0854] border border-purple-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Curriculum Insights</span>
          </button>

          <button
            onClick={() => onSelectTab('sheet_sync')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'sheet_sync'
                ? 'bg-purple-50 text-[#2E0854] border border-purple-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Sheets Sync Wizard</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
