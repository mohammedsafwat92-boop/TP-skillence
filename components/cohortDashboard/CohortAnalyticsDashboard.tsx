import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_COHORTS_DATA } from './data/mockCohortsData';
import { BusinessAccount, CohortSummary, ViewTab } from './types';
import { Header } from './components/Header';
import { CohortOverviewCards } from './components/CohortOverviewCards';
import { CohortComparisonMatrix } from './components/CohortComparisonMatrix';
import { CrossCohortCharts } from './components/CrossCohortCharts';
import { CohortHeadToHead } from './components/CohortHeadToHead';
import { TraineeDirectory } from './components/TraineeDirectory';
import { CohortInsights } from './components/CohortInsights';
import { SheetsDataManagerModal } from './components/SheetsDataManagerModal';
import {
  downloadSixSheetExcelTemplate,
  exportCurrentCohortsToExcel,
  recalculateCohortSummariesFromDirectory,
} from './utils/sheetParser';
import { mapLiveUsersToCohorts, normalizeWaveKey } from './utils/liveRosterMapper';
import { UserProfile } from '../../types';
import {
  FileSpreadsheet,
  CheckCircle2,
  Download,
  FileDown,
  RefreshCw,
  Sparkles,
  Users,
  RotateCcw,
  Layers,
  Database,
  Filter,
} from 'lucide-react';

export type DataSourceMode = 'cross_referenced' | 'live_only' | 'benchmark_only';

export interface CohortAnalyticsDashboardProps {
  liveUsers?: UserProfile[];
  adminStats?: any;
  currentUser?: UserProfile;
  onRefreshUsers?: () => void;
  activeWave?: string;
  onSelectWave?: (wave: string) => void;
  waveConfigs?: Record<string, any>;
}

export const CohortAnalyticsDashboard: React.FC<CohortAnalyticsDashboardProps> = ({
  liveUsers = [],
  adminStats,
  currentUser,
  onRefreshUsers,
  activeWave,
  onSelectWave,
  waveConfigs = {},
}) => {
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>('cross_referenced');
  const [cohorts, setCohorts] = useState<CohortSummary[]>(() =>
    mapLiveUsersToCohorts(liveUsers, adminStats, INITIAL_COHORTS_DATA, waveConfigs, 'cross_referenced')
  );
  const [accountFilter, setAccountFilter] = useState<'all' | BusinessAccount>('all');
  const [internalSelectedWave, setInternalSelectedWave] = useState<string>('all');
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [isDataManagerOpen, setIsDataManagerOpen] = useState<boolean>(false);
  const [isSyncing] = useState<boolean>(false);
  const [sheetSourceType, setSheetSourceType] = useState<string>('google_sheets');
  const [selectedCohortForTrainees, setSelectedCohortForTrainees] = useState<string | null>(null);
  const [headToHeadCohortA, setHeadToHeadCohortA] = useState<string>('W1');
  const [headToHeadCohortB, setHeadToHeadCohortB] = useState<string>('W5');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync internal selected wave with external prop activeWave if provided
  useEffect(() => {
    if (activeWave) {
      const norm = normalizeWaveKey(activeWave);
      setInternalSelectedWave(norm.canonical);
    }
  }, [activeWave]);

  // Synchronize cohorts when liveUsers, adminStats, or dataSourceMode changes
  useEffect(() => {
    const updated = mapLiveUsersToCohorts(
      liveUsers,
      adminStats,
      INITIAL_COHORTS_DATA,
      waveConfigs,
      dataSourceMode
    );
    setCohorts(updated);
  }, [liveUsers, adminStats, dataSourceMode, waveConfigs]);

  // Filter cohorts by account AND wave (if a specific wave is selected)
  const filteredCohorts = useMemo(() => {
    let list = cohorts;
    if (accountFilter !== 'all') {
      list = list.filter((c) => c.account === accountFilter);
    }
    if (internalSelectedWave !== 'all') {
      const normSelected = normalizeWaveKey(internalSelectedWave);
      const waveFiltered = list.filter(
        (c) =>
          normalizeWaveKey(c.tabName).waveNum === normSelected.waveNum ||
          normalizeWaveKey(c.name).waveNum === normSelected.waveNum ||
          c.code.toLowerCase() === normSelected.shortCode.toLowerCase()
      );
      if (waveFiltered.length > 0) {
        list = waveFiltered;
      }
    }
    return list;
  }, [cohorts, accountFilter, internalSelectedWave]);

  // Account rollups strictly derived from active trainees in each cohort
  const accountRollups = useMemo(() => {
    const accounts: BusinessAccount[] = ['Mobility', 'Teleco', 'Travel'];
    return accounts.map((acc) => {
      const list = cohorts.filter((c) => c.account === acc);
      const allActiveTrainees = list.flatMap((c) => c.trainees || []);
      const totalHC = allActiveTrainees.length;

      const initialRP = totalHC > 0 ? allActiveTrainees.reduce((s, t) => s + (t.initialRP || 0), 0) / totalHC : 0;
      const finalRP = totalHC > 0 ? allActiveTrainees.reduce((s, t) => s + (t.finalRP || 0), 0) / totalHC : 0;
      const moduleComp = totalHC > 0 ? allActiveTrainees.reduce((s, t) => s + (t.moduleComp || 0), 0) / totalHC : 0;
      const attendanceComp = totalHC > 0 ? allActiveTrainees.reduce((s, t) => s + (t.attendanceComp || 0), 0) / totalHC : 0;

      const waveBreakdowns = list.map((c) => ({
        id: c.id,
        code: c.code || `W${c.sheetIndex}`,
        name: c.name,
        count: (c.trainees || []).length,
      }));

      return {
        account: acc,
        wavesCount: list.length,
        headcount: totalHC,
        waveBreakdowns,
        initialRP,
        finalRP,
        gain: finalRP - initialRP,
        moduleComp,
        attendanceComp,
        color: acc === 'Mobility' ? '#06C167' : acc === 'Teleco' ? '#3B82F6' : '#8B5CF6',
      };
    });
  }, [cohorts]);

  // Dynamic counts for tabs derived strictly from active trainees
  const filterCounts = useMemo(() => {
    const totalCount = cohorts.reduce((s, c) => s + (c.trainees?.length || 0), 0);
    const mobilityWaves = cohorts.filter((c) => c.account === 'Mobility');
    const telecoWaves = cohorts.filter((c) => c.account === 'Teleco');
    const travelWaves = cohorts.filter((c) => c.account === 'Travel');

    return {
      totalWaves: cohorts.length,
      totalCount,
      mobilityWaves: mobilityWaves.length,
      mobilityCount: mobilityWaves.reduce((s, c) => s + (c.trainees?.length || 0), 0),
      telecoWaves: telecoWaves.length,
      telecoCount: telecoWaves.reduce((s, c) => s + (c.trainees?.length || 0), 0),
      travelWaves: travelWaves.length,
      travelCount: travelWaves.reduce((s, c) => s + (c.trainees?.length || 0), 0),
    };
  }, [cohorts]);

  // Available waves for the currently selected account
  const availableAccountWaves = useMemo(() => {
    const relevant = accountFilter === 'all' ? cohorts : cohorts.filter((c) => c.account === accountFilter);
    return relevant.map((c) => ({
      id: c.id,
      code: c.code || `W${c.sheetIndex}`,
      name: c.name,
      tabName: c.tabName || `Wave ${c.sheetIndex}`,
      count: c.traineeCount || (c.trainees || []).length,
      account: c.account,
    }));
  }, [cohorts, accountFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleSelectAccountFilter = (acc: 'all' | BusinessAccount) => {
    setAccountFilter(acc);
    setInternalSelectedWave('all');
    if (onSelectWave) onSelectWave('all');
    setSelectedCohortForTrainees(null);
  };

  const handleSelectWavePill = (waveCanonical: string) => {
    setInternalSelectedWave(waveCanonical);
    if (onSelectWave) onSelectWave(waveCanonical);
  };

  const handleUpdateCohorts = (newCohorts: CohortSummary[], sourceType: string = sheetSourceType) => {
    const refreshed = recalculateCohortSummariesFromDirectory(newCohorts);
    setCohorts(refreshed);
    setSheetSourceType(sourceType);
    const totalCount = refreshed.reduce((s, c) => s + c.traineeCount, 0);
    showToast(`Updated directory: ${refreshed.length} waves and ${totalCount} trainees synchronized.`);
  };

  const handleSwitchDataSourceMode = (mode: DataSourceMode) => {
    setDataSourceMode(mode);
    if (mode === 'cross_referenced') {
      const mapped = mapLiveUsersToCohorts(liveUsers, adminStats, INITIAL_COHORTS_DATA, waveConfigs, 'cross_referenced');
      setCohorts(mapped);
      setSheetSourceType('cross_referenced');
      showToast(`Switched to Cross-Referenced Mode: Unified Live Roster with 6-Sheet Benchmarks.`);
    } else if (mode === 'live_only') {
      const mapped = mapLiveUsersToCohorts(liveUsers, adminStats, INITIAL_COHORTS_DATA, waveConfigs, 'live_only');
      setCohorts(mapped);
      setSheetSourceType('live_skillence_roster');
      showToast(`Switched to Live Roster Only: Showing ${mapped.length} live waves from Skillence.`);
    } else {
      setCohorts(INITIAL_COHORTS_DATA);
      setSheetSourceType('google_sheets');
      showToast(`Switched to 6-Sheet Benchmark Only: Standard baseline cohorts.`);
    }
  };

  const handleSyncLiveRoster = () => {
    if (!liveUsers || liveUsers.length === 0) {
      showToast('Live roster is refreshing, please wait a moment...');
      if (onRefreshUsers) onRefreshUsers();
      return;
    }
    handleSwitchDataSourceMode('cross_referenced');
  };

  const handleExportExcel = () => {
    try {
      exportCurrentCohortsToExcel(cohorts);
      showToast('Downloaded multi-account Excel workbook (.xlsx).');
    } catch (err: any) {
      showToast(`Export error: ${err.message}`);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadSixSheetExcelTemplate();
      showToast('Downloaded 6-sheet training data template (.xlsx).');
    } catch (err: any) {
      showToast(`Template download error: ${err.message}`);
    }
  };

  const handleSelectCohortFromMatrix = (cohortId: string) => {
    setSelectedCohortForTrainees(cohortId);
    setCurrentTab('trainees');
  };

  const handleCompareHeadToHead = (cohortAId: string, cohortBId: string) => {
    setHeadToHeadCohortA(cohortAId);
    setHeadToHeadCohortB(cohortBId);
    setCurrentTab('comparison');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#2E0854] text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border border-purple-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        cohorts={filteredCohorts}
        onOpenDataManager={() => setIsDataManagerOpen(true)}
        onExportExcel={handleExportExcel}
        onDownloadTemplate={handleDownloadTemplate}
        onSyncLiveRoster={handleSyncLiveRoster}
        hasLiveRoster={liveUsers.length > 0}
        isSyncing={isSyncing}
        sheetSourceType={dataSourceMode}
      />

      {/* 3-Mode Data Source Switcher & Top Utility Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-purple-700" />
              Intelligence Mode:
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
              <button
                onClick={() => handleSwitchDataSourceMode('cross_referenced')}
                className={`px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                  dataSourceMode === 'cross_referenced'
                    ? 'bg-[#2E0854] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Seamlessly merges live Skillence trainees & SVAR metrics into 6-Sheet benchmarks"
              >
                Cross-Referenced (App + Benchmark)
              </button>
              <button
                onClick={() => handleSwitchDataSourceMode('live_only')}
                className={`px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                  dataSourceMode === 'live_only'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Strictly display live users registered in Skillence Roster"
              >
                Live Skillence Roster Only
              </button>
              <button
                onClick={() => handleSwitchDataSourceMode('benchmark_only')}
                className={`px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                  dataSourceMode === 'benchmark_only'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Standard 6-Sheet baseline data"
              >
                6-Sheet Benchmark Only
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setIsDataManagerOpen(true)}
              className="text-[#2E0854] hover:text-[#4B1D7C] hover:underline font-bold cursor-pointer flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Configure 6 Sheets</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleExportExcel}
              className="text-slate-600 hover:text-slate-900 flex items-center gap-1 font-bold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-purple-600" />
              <span>Export .XLSX</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Account Filter Bar */}
      <div className="bg-[#2E0854] border-b border-purple-900 text-white px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-200 mr-1">
              Business Accounts:
            </span>
            <button
              onClick={() => handleSelectAccountFilter('all')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                accountFilter === 'all'
                  ? 'bg-white text-[#2E0854] shadow-sm'
                  : 'bg-white/10 text-purple-100 hover:bg-white/20'
              }`}
            >
              All Accounts ({filterCounts.totalWaves} Waves · {filterCounts.totalCount} Agents)
            </button>
            <button
              onClick={() => handleSelectAccountFilter('Mobility')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                accountFilter === 'Mobility'
                  ? 'bg-[#06C167] text-white shadow-sm'
                  : 'bg-white/10 text-emerald-300 hover:bg-white/20'
              }`}
            >
              Mobility ({filterCounts.mobilityWaves} Waves · {filterCounts.mobilityCount} Agents)
            </button>
            <button
              onClick={() => handleSelectAccountFilter('Teleco')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                accountFilter === 'Teleco'
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'bg-white/10 text-blue-300 hover:bg-white/20'
              }`}
            >
              Teleco ({filterCounts.telecoWaves} Waves · {filterCounts.telecoCount} Agents)
            </button>
            <button
              onClick={() => handleSelectAccountFilter('Travel')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                accountFilter === 'Travel'
                  ? 'bg-[#8B5CF6] text-white shadow-sm'
                  : 'bg-white/10 text-purple-300 hover:bg-white/20'
              }`}
            >
              Travel ({filterCounts.travelWaves} Waves · {filterCounts.travelCount} Agents)
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Wave Filter Pill Bar */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            Wave Selection:
          </span>
          <button
            onClick={() => handleSelectWavePill('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer border ${
              internalSelectedWave === 'all'
                ? 'bg-white text-[#2E0854] border-purple-300 shadow-xs'
                : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'
            }`}
          >
            All Waves ({cohorts.length})
          </button>
          {availableAccountWaves.map((w) => {
            const isSelected = internalSelectedWave === w.tabName || internalSelectedWave === w.code;
            return (
              <button
                key={w.id}
                onClick={() => handleSelectWavePill(w.tabName)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#2E0854] text-white border-[#2E0854] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{w.code}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {w.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Account Portfolio Benchmark Scorecards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accountRollups.map((r) => {
            const isSelected = accountFilter === r.account;
            return (
              <div
                key={r.account}
                onClick={() => handleSelectAccountFilter(r.account)}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all cursor-pointer hover:shadow-md ${
                  isSelected ? 'ring-2 ring-offset-1 border-transparent' : 'border-slate-200/90'
                }`}
                style={{
                  borderTop: `4px solid ${r.color}`,
                  boxShadow: isSelected ? `0 0 0 2px ${r.color}` : undefined,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="px-2.5 py-0.5 rounded text-xs font-extrabold uppercase flex items-center gap-1.5"
                    style={{ backgroundColor: `${r.color}18`, color: r.color }}
                  >
                    {r.account} Account
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    {r.wavesCount} {r.wavesCount === 1 ? 'Wave' : 'Waves'} · {r.headcount} Trainees
                  </span>
                </div>

                {/* Exact wave badges and trainee counts per wave (e.g. W1 (13), W2 (17)) */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3 pt-1">
                  {r.waveBreakdowns.map((wb) => (
                    <button
                      key={wb.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAccountFilter(r.account);
                        handleSelectWavePill(wb.code);
                        setSelectedCohortForTrainees(wb.id);
                        setCurrentTab('trainees');
                      }}
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all hover:scale-105 cursor-pointer border"
                      style={{
                        backgroundColor: `${r.color}12`,
                        borderColor: `${r.color}40`,
                        color: r.color,
                      }}
                      title={`${wb.name} (${wb.count} Trainees) — Click to view in Directory`}
                    >
                      {wb.code} ({wb.count})
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs tabular-nums">
                  <div>
                    <span className="text-slate-500 block">Initial → Final</span>
                    <strong className="text-sm font-mono text-slate-900">
                      {r.initialRP.toFixed(2)} → {r.finalRP.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Net RP Uplift</span>
                    <strong className="text-sm font-mono text-[#06C167]">
                      +{r.gain.toFixed(2)} pts
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Modules / Att.</span>
                    <strong className="text-sm font-mono text-slate-900">
                      {r.moduleComp.toFixed(1)}% · {r.attendanceComp.toFixed(1)}%
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            <CohortOverviewCards cohorts={filteredCohorts} />
            <CrossCohortCharts cohorts={filteredCohorts} />
            <CohortComparisonMatrix
              cohorts={filteredCohorts}
              onSelectCohort={handleSelectCohortFromMatrix}
              onCompareHeadToHead={handleCompareHeadToHead}
            />
            <TraineeDirectory
              cohorts={filteredCohorts}
              selectedCohortId={selectedCohortForTrainees}
              selectedAccount={accountFilter}
              onUpdateCohorts={(updated) => handleUpdateCohorts(updated, sheetSourceType)}
            />
          </div>
        )}

        {currentTab === 'matrix' && (
          <div className="space-y-6">
            <CohortOverviewCards cohorts={filteredCohorts} />
            <CohortComparisonMatrix
              cohorts={filteredCohorts}
              onSelectCohort={handleSelectCohortFromMatrix}
              onCompareHeadToHead={handleCompareHeadToHead}
            />
            <CrossCohortCharts cohorts={filteredCohorts} />
          </div>
        )}

        {currentTab === 'comparison' && (
          <CohortHeadToHead
            cohorts={cohorts}
            initialCohortAId={headToHeadCohortA}
            initialCohortBId={headToHeadCohortB}
          />
        )}

        {currentTab === 'trainees' && (
          <TraineeDirectory
            cohorts={filteredCohorts}
            selectedCohortId={selectedCohortForTrainees}
            selectedAccount={accountFilter}
            onUpdateCohorts={(updated) => handleUpdateCohorts(updated, sheetSourceType)}
          />
        )}

        {currentTab === 'insights' && (
          <CohortInsights cohorts={filteredCohorts} />
        )}

        {currentTab === 'sheet_sync' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  6 Google Sheets Workbooks &amp; Account Hierarchy
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connected across Mobility (Waves 1–2), Teleco (Wave 3), and Travel (Waves 4–6)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Template (.xlsx)</span>
                </button>
                <button
                  onClick={() => setIsDataManagerOpen(true)}
                  className="px-4 py-2 bg-[#2E0854] hover:bg-[#4B1D7C] text-white rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-purple-200" />
                  <span>Open 6-Sheet Sync Wizard</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <SheetsDataManagerModal
        isOpen={isDataManagerOpen}
        onClose={() => setIsDataManagerOpen(false)}
        cohorts={cohorts}
        onUpdateCohorts={handleUpdateCohorts}
      />
    </div>
  );
};

export default CohortAnalyticsDashboard;
