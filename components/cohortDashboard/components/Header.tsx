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
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          {/* Logo & Main Info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Layers className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Cohort Performance Intelligence
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  {sheetSourceType === 'live_skillence_roster' ? 'Live Roster Connected' : '6 Sheets Connected'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Roleplays & Tests Benchmark Engine across {cohorts.length} Cohort Waves ({totalTrainees} Trainees)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            {onSyncLiveRoster && (
              <button
                onClick={onSyncLiveRoster}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                title="Sync and map live Skillence trainees, waves, and assessments into this dashboard"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Sync Live Roster</span>
              </button>
            )}

            <button
              onClick={onOpenDataManager}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors shadow-sm cursor-pointer"
              title="Configure and grab data from all 6 sheets"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>6 Sheets Data Manager</span>
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={onDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors cursor-pointer"
              title="Download empty 6-sheet Excel template for training data"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-400" />
              <span>6-Sheet Template</span>
            </button>

            <button
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              title="Export all cohorts to formatted multi-sheet Excel file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .XLSX</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar border-t border-slate-800/80 pt-1 pb-2">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'dashboard'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Executive Overview</span>
          </button>

          <button
            onClick={() => onSelectTab('matrix')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'matrix'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>6-Cohort Comparison Matrix</span>
          </button>

          <button
            onClick={() => onSelectTab('comparison')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'comparison'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Head-to-Head Comparator</span>
          </button>

          <button
            onClick={() => onSelectTab('trainees')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'trainees'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Trainee Scorecards & Directory</span>
          </button>

          <button
            onClick={() => onSelectTab('insights')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'insights'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Curriculum Insights & Trends</span>
          </button>

          <button
            onClick={() => onSelectTab('sheet_sync')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'sheet_sync'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>6-Sheet Data Connector</span>
          </button>
        </div>
      </div>
    </header>
  );
};
