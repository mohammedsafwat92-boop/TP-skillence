import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_COHORTS_DATA } from './data/mockCohortsData';
import { BusinessAccount, CohortSummary, ViewTab } from './types';
import { Header, DataSourceMode } from './components/Header';
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
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

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

      // Refined account semantic tokens
      const theme =
        acc === 'Mobility'
          ? {
              color: '#059669',
              bgFill: '#ECFDF5',
              border: '#A7F3D0',
              text: '#065F46',
            }
          : acc === 'Teleco'
          ? {
              color: '#2563EB',
              bgFill: '#EFF6FF',
              border: '#BFDBFE',
              text: '#1E40AF',
            }
          : {
              color: '#7C3AED',
              bgFill: '#F5F3FF',
              border: '#DDD6FE',
              text: '#5B21B6',
            };

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
        ...theme,
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

  // Available waves for currently selected account
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

  const handleSelectWave = (waveCanonical: string) => {
    setInternalSelectedWave(waveCanonical);
    if (onSelectWave) onSelectWave(waveCanonical);
  };

  const handleUpdateCohorts = (newCohorts: CohortSummary[], sourceType: string = 'google_sheets') => {
    const refreshed = recalculateCohortSummariesFromDirectory(newCohorts);
    setCohorts(refreshed);
    const totalCount = refreshed.reduce((s, c) => s + c.traineeCount, 0);
    showToast(`Updated directory: ${refreshed.length} waves and ${totalCount} trainees synchronized.`);
  };

  const handleSwitchDataSourceMode = (mode: DataSourceMode) => {
    setDataSourceMode(mode);
    if (mode === 'cross_referenced') {
      const mapped = mapLiveUsersToCohorts(liveUsers, adminStats, INITIAL_COHORTS_DATA, waveConfigs, 'cross_referenced');
      setCohorts(mapped);
      showToast('Switched to Cross-Referenced Mode: Unified Live Roster with 6-Sheet Benchmarks.');
    } else if (mode === 'live_only') {
      const mapped = mapLiveUsersToCohorts(liveUsers, adminStats, INITIAL_COHORTS_DATA, waveConfigs, 'live_only');
      setCohorts(mapped);
      showToast(`Switched to Live Roster Only: Showing ${mapped.length} live waves from Skillence.`);
    } else {
      setCohorts(INITIAL_COHORTS_DATA);
      showToast('Switched to 6-Sheet Benchmark Only: Standard baseline cohorts.');
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
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0A1128] text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SINGLE CONSOLIDATED EXECUTIVE COMMAND BAR */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        cohorts={filteredCohorts}
        allCohorts={cohorts}
        onOpenDataManager={() => setIsDataManagerOpen(true)}
        onExportExcel={handleExportExcel}
        onDownloadTemplate={handleDownloadTemplate}
        onSyncLiveRoster={handleSyncLiveRoster}
        hasLiveRoster={liveUsers.length > 0}
        isSyncing={isSyncing}
        dataSourceMode={dataSourceMode}
        onSwitchDataSourceMode={handleSwitchDataSourceMode}
        accountFilter={accountFilter}
        onSelectAccountFilter={handleSelectAccountFilter}
        selectedWave={internalSelectedWave}
        onSelectWave={handleSelectWave}
        availableAccountWaves={availableAccountWaves}
        filterCounts={filterCounts}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* TAB 1: EXECUTIVE OVERVIEW (CLEAN 3-TIER EXECUTIVE LAYOUT) */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            {/* TIER 1: 4 High-Impact KPI Overview Cards */}
            <CohortOverviewCards cohorts={filteredCohorts} />

            {/* TIER 2: 3 Account Portfolio Benchmark Scorecards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Account Portfolio Benchmarks
                  </h3>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">
                    Live Uplift, Module Cadence &amp; Headcount Rollups
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Click any wave chip to inspect trainees
                </span>
              </div>

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
                      {/* Top Header: Account Badge + Wave/Headcount */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="px-2.5 py-0.5 rounded-md text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5 border"
                          style={{
                            backgroundColor: r.bgFill,
                            borderColor: r.border,
                            color: r.text,
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                          {r.account} Account
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-600">
                          {r.wavesCount} {r.wavesCount === 1 ? 'Wave' : 'Waves'} · {r.headcount} Agents
                        </span>
                      </div>

                      {/* Clickable Wave Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-3 pt-1">
                        {r.waveBreakdowns.map((wb) => (
                          <button
                            key={wb.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setAccountFilter(r.account);
                              handleSelectWave(wb.code);
                              setSelectedCohortForTrainees(wb.id);
                              setCurrentTab('trainees');
                            }}
                            className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all hover:scale-105 cursor-pointer border flex items-center gap-1"
                            style={{
                              backgroundColor: r.bgFill,
                              borderColor: r.border,
                              color: r.text,
                            }}
                            title={`${wb.name} (${wb.count} Trainees) — Click to view in Directory`}
                          >
                            <span>{wb.code}</span>
                            <span className="opacity-75">({wb.count})</span>
                          </button>
                        ))}
                      </div>

                      {/* Visual RP Uplift Bar (1.0 to 5.0 scale) */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 mb-3">
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-slate-500 font-medium">RP Progression</span>
                          <span className="font-mono font-bold" style={{ color: r.color }}>
                            +{r.gain.toFixed(2)} Net Gain
                          </span>
                        </div>
                        <div className="relative h-2 bg-slate-200/80 rounded-full overflow-hidden">
                          <div
                            className="absolute h-full rounded-full transition-all"
                            style={{
                              left: `${((r.initialRP - 1.0) / 4.0) * 100}%`,
                              width: `${(r.gain / 4.0) * 100}%`,
                              backgroundColor: r.color,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                          <span>{r.initialRP.toFixed(2)} Initial</span>
                          <span>{r.finalRP.toFixed(2)} Final</span>
                        </div>
                      </div>

                      {/* Bottom Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs tabular-nums">
                        <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100">
                          <span className="text-slate-500 text-[11px] block">Module Comp.</span>
                          <strong className="text-sm font-mono text-slate-900">
                            {r.moduleComp.toFixed(1)}%
                          </strong>
                        </div>
                        <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100">
                          <span className="text-slate-500 text-[11px] block">Attendance</span>
                          <strong className="text-sm font-mono text-slate-900">
                            {r.attendanceComp.toFixed(1)}%
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TIER 3: CrossCohortCharts Main Stage */}
            <CrossCohortCharts cohorts={filteredCohorts} />
          </div>
        )}

        {/* TAB 2: WAVE MATRIX */}
        {currentTab === 'matrix' && (
          <div className="space-y-6">
            <CohortOverviewCards cohorts={filteredCohorts} />
            <CohortComparisonMatrix
              cohorts={filteredCohorts}
              onSelectCohort={handleSelectCohortFromMatrix}
              onCompareHeadToHead={handleCompareHeadToHead}
            />
          </div>
        )}

        {/* TAB 3: HEAD-TO-HEAD */}
        {currentTab === 'comparison' && (
          <CohortHeadToHead
            cohorts={cohorts}
            initialCohortAId={headToHeadCohortA}
            initialCohortBId={headToHeadCohortB}
          />
        )}

        {/* TAB 4: TRAINEE DIRECTORY */}
        {currentTab === 'trainees' && (
          <TraineeDirectory
            cohorts={filteredCohorts}
            selectedCohortId={selectedCohortForTrainees}
            selectedAccount={accountFilter}
            onUpdateCohorts={(updated) => handleUpdateCohorts(updated, 'google_sheets')}
          />
        )}

        {/* TAB 5: CURRICULUM INSIGHTS */}
        {currentTab === 'insights' && (
          <CohortInsights cohorts={filteredCohorts} />
        )}

        {/* TAB 6: SHEETS SYNC WIZARD */}
        {currentTab === 'sheet_sync' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
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
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Template (.xlsx)</span>
                </button>
                <button
                  onClick={() => setIsDataManagerOpen(true)}
                  className="px-4 py-2 bg-[#2E0854] hover:bg-[#4B1D7C] text-white rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-purple-200" />
                  <span>Open 6-Sheet Sync Wizard</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sheets Data Manager Modal */}
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
