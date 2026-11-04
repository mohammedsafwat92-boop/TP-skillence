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
  FileDown,
  Database,
  Filter,
} from 'lucide-react';
import { ViewTab, CohortSummary, BusinessAccount } from '../types';

export type DataSourceMode = 'cross_referenced' | 'live_only' | 'benchmark_only';

interface HeaderProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  cohorts: CohortSummary[];
  allCohorts: CohortSummary[];
  onOpenDataManager: () => void;
  onExportExcel: () => void;
  onDownloadTemplate: () => void;
  onSyncLiveRoster?: () => void;
  hasLiveRoster?: boolean;
  isSyncing: boolean;
  dataSourceMode: DataSourceMode;
  onSwitchDataSourceMode: (mode: DataSourceMode) => void;
  accountFilter: 'all' | BusinessAccount;
  onSelectAccountFilter: (acc: 'all' | BusinessAccount) => void;
  selectedWave: string;
  onSelectWave: (wave: string) => void;
  availableAccountWaves: {
    id: string;
    code: string;
    name: string;
    tabName: string;
    count: number;
    account: BusinessAccount;
  }[];
  filterCounts: {
    totalWaves: number;
    totalCount: number;
    mobilityWaves: number;
    mobilityCount: number;
    telecoWaves: number;
    telecoCount: number;
    travelWaves: number;
    travelCount: number;
  };
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  cohorts,
  allCohorts,
  onOpenDataManager,
  onExportExcel,
  onDownloadTemplate,
  onSyncLiveRoster,
  hasLiveRoster,
  isSyncing,
  dataSourceMode,
  onSwitchDataSourceMode,
  accountFilter,
  onSelectAccountFilter,
  selectedWave,
  onSelectWave,
  availableAccountWaves,
  filterCounts,
}) => {
  const currentTotalTrainees = cohorts.reduce((acc, c) => acc + c.traineeCount, 0);

  return (
    <header className="border-b border-slate-200/90 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tier 1: Executive Brand, Navigation Tabs, and Quick Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between py-3 gap-3 border-b border-slate-100">
          {/* Brand + View Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-3">
            {/* TP Skillence Brand Badge */}
            <div className="flex items-center gap-2.5 pr-2 border-r border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-[#2E0854] flex items-center justify-center text-white shadow-xs">
                <Layers className="w-5 h-5 text-purple-200" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2E0854]">
                    TP Skillence
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Executive Analytics
                  </span>
                </div>
                <h1 className="text-sm font-extrabold text-[#0A1128] tracking-tight">
                  Cohort &amp; Wave Intelligence
                </h1>
              </div>
            </div>

            {/* View Switcher Tabs */}
            <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => onSelectTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-[#2E0854] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Executive Overview</span>
              </button>

              <button
                onClick={() => onSelectTab('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentTab === 'matrix'
                    ? 'bg-[#2E0854] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Wave Matrix</span>
              </button>

              <button
                onClick={() => onSelectTab('comparison')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentTab === 'comparison'
                    ? 'bg-[#2E0854] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Head-to-Head</span>
              </button>

              <button
                onClick={() => onSelectTab('trainees')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentTab === 'trainees'
                    ? 'bg-[#2E0854] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Trainee Directory</span>
              </button>

              <button
                onClick={() => onSelectTab('insights')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentTab === 'insights'
                    ? 'bg-[#2E0854] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Curriculum Insights</span>
              </button>
            </nav>
          </div>

          {/* Right Action Controls: Mode Switcher + Actions */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Intelligence Mode Segmented Dropdown / Pill */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1">
              <Database className="w-3.5 h-3.5 text-[#2E0854]" />
              <select
                value={dataSourceMode}
                onChange={(e) => onSwitchDataSourceMode(e.target.value as DataSourceMode)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                title="Select Data Source Pipeline"
              >
                <option value="cross_referenced">Cross-Referenced (Live + Benchmark)</option>
                <option value="live_only">Live Skillence Roster Only</option>
                <option value="benchmark_only">6-Sheet Benchmark Only</option>
              </select>
            </div>

            {/* Sync Live Roster Button */}
            {onSyncLiveRoster && (
              <button
                onClick={onSyncLiveRoster}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#059669] hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer"
                title="Sync live Skillence agents & assessments"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Live Roster</span>
              </button>
            )}

            {/* 6 Sheets Data Manager */}
            <button
              onClick={onOpenDataManager}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/90 transition-colors cursor-pointer"
              title="Open Google Sheets sync modal"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>6-Sheet Data Manager</span>
            </button>

            {/* Export .XLSX */}
            <button
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2E0854] hover:bg-[#4B1D7C] text-white shadow-2xs transition-all cursor-pointer"
              title="Export formatted workbook"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .XLSX</span>
            </button>
          </div>
        </div>

        {/* Tier 2: Interactive Account Filter Pills & Dynamic Wave Filter Chips */}
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Account Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              Account:
            </span>

            {/* All Accounts Pill */}
            <button
              onClick={() => onSelectAccountFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer border ${
                accountFilter === 'all'
                  ? 'bg-[#0A1128] text-white border-[#0A1128] shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              All Accounts ({filterCounts.totalWaves}W · {filterCounts.totalCount}A)
            </button>

            {/* Mobility Pill */}
            <button
              onClick={() => onSelectAccountFilter('Mobility')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer border flex items-center gap-1.5 ${
                accountFilter === 'Mobility'
                  ? 'bg-[#059669] text-white border-[#059669] shadow-2xs'
                  : 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] hover:bg-[#D1FAE5]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${accountFilter === 'Mobility' ? 'bg-white' : 'bg-[#059669]'}`} />
              <span>Mobility ({filterCounts.mobilityWaves}W · {filterCounts.mobilityCount}A)</span>
            </button>

            {/* Teleco Pill */}
            <button
              onClick={() => onSelectAccountFilter('Teleco')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer border flex items-center gap-1.5 ${
                accountFilter === 'Teleco'
                  ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-2xs'
                  : 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE] hover:bg-[#DBEAFE]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${accountFilter === 'Teleco' ? 'bg-white' : 'bg-[#2563EB]'}`} />
              <span>Teleco ({filterCounts.telecoWaves}W · {filterCounts.telecoCount}A)</span>
            </button>

            {/* Travel Pill */}
            <button
              onClick={() => onSelectAccountFilter('Travel')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer border flex items-center gap-1.5 ${
                accountFilter === 'Travel'
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-2xs'
                  : 'bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE] hover:bg-[#EDE9FE]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${accountFilter === 'Travel' ? 'bg-white' : 'bg-[#7C3AED]'}`} />
              <span>Travel ({filterCounts.travelWaves}W · {filterCounts.travelCount}A)</span>
            </button>

            {/* Divider */}
            <span className="text-slate-300 mx-1">|</span>

            {/* Wave Filter Chips */}
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-0.5">
              Wave:
            </span>

            <button
              onClick={() => onSelectWave('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer border ${
                selectedWave === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Waves ({availableAccountWaves.length})
            </button>

            {availableAccountWaves.map((w) => {
              const isSelected = selectedWave === w.tabName || selectedWave === w.code;
              const pillColor =
                w.account === 'Mobility'
                  ? 'text-[#059669] border-[#A7F3D0] bg-[#ECFDF5]'
                  : w.account === 'Teleco'
                  ? 'text-[#2563EB] border-[#BFDBFE] bg-[#EFF6FF]'
                  : 'text-[#7C3AED] border-[#DDD6FE] bg-[#F5F3FF]';

              return (
                <button
                  key={w.id}
                  onClick={() => onSelectWave(w.tabName)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#2E0854] text-white border-[#2E0854] shadow-xs'
                      : `${pillColor} hover:brightness-95`
                  }`}
                  title={`${w.name} (${w.count} Trainees)`}
                >
                  <span>{w.code}</span>
                  <span
                    className={`px-1 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-700 shadow-2xs'
                    }`}
                  >
                    {w.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Active Count Indicator */}
          <div className="text-[11px] font-mono text-slate-500 font-medium">
            Active Scope: <strong className="text-slate-900">{cohorts.length} Waves</strong> ·{' '}
            <strong className="text-slate-900">{currentTotalTrainees} Agents</strong>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
