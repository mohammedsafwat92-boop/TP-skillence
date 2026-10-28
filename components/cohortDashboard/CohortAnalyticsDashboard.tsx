import React, { useState, useMemo } from 'react';
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
  exportCurrentCohortsToExcel
} from './utils/sheetParser';
import { mapLiveUsersToCohorts } from './utils/liveRosterMapper';
import { UserProfile } from '../../types';
import {
  FileSpreadsheet,
  CheckCircle2,
  Download,
  FileDown,
  RefreshCw,
  Sparkles,
  Users,
  RotateCcw
} from 'lucide-react';

export interface CohortAnalyticsDashboardProps {
  liveUsers?: UserProfile[];
  adminStats?: any;
  currentUser?: UserProfile;
  onRefreshUsers?: () => void;
}

export const CohortAnalyticsDashboard: React.FC<CohortAnalyticsDashboardProps> = ({
  liveUsers = [],
  adminStats,
  currentUser,
  onRefreshUsers
}) => {
  const [cohorts, setCohorts] = useState<CohortSummary[]>(INITIAL_COHORTS_DATA);
  const [accountFilter, setAccountFilter] = useState<'all' | BusinessAccount>('all');
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [isDataManagerOpen, setIsDataManagerOpen] = useState<boolean>(false);
  const [isSyncing] = useState<boolean>(false);
  const [sheetSourceType, setSheetSourceType] = useState<string>('google_sheets');
  const [selectedCohortForTrainees, setSelectedCohortForTrainees] = useState<string | null>(null);
  const [headToHeadCohortA, setHeadToHeadCohortA] = useState<string>('cohort-1');
  const [headToHeadCohortB, setHeadToHeadCohortB] = useState<string>('cohort-5');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredCohorts = useMemo(() => {
    if (accountFilter === 'all') return cohorts;
    return cohorts.filter((c) => c.account === accountFilter);
  }, [cohorts, accountFilter]);

  // Account rollups
  const accountRollups = useMemo(() => {
    const accounts: BusinessAccount[] = ['Mobility', 'Teleco', 'Travel'];
    return accounts.map((acc) => {
      const list = cohorts.filter((c) => c.account === acc);
      const totalHC = list.reduce((s, c) => s + c.traineeCount, 0) || 1;
      const initialRP = list.reduce((s, c) => s + c.initialRP * c.traineeCount, 0) / totalHC;
      const finalRP = list.reduce((s, c) => s + c.finalRP * c.traineeCount, 0) / totalHC;
      const moduleComp = list.reduce((s, c) => s + c.moduleCompletion * c.traineeCount, 0) / totalHC;
      const attendanceComp = list.reduce((s, c) => s + c.attendanceCompletion * c.traineeCount, 0) / totalHC;
      return {
        account: acc,
        wavesCount: list.length,
        headcount: totalHC,
        initialRP,
        finalRP,
        gain: finalRP - initialRP,
        moduleComp,
        attendanceComp,
        color: acc === 'Mobility' ? '#06C167' : acc === 'Teleco' ? '#3B82F6' : '#8B5CF6',
      };
    });
  }, [cohorts]);

  // Dynamic counts for tabs
  const filterCounts = useMemo(() => {
    const totalCount = cohorts.reduce((s, c) => s + c.traineeCount, 0);
    const mobilityWaves = cohorts.filter((c) => c.account === 'Mobility');
    const telecoWaves = cohorts.filter((c) => c.account === 'Teleco');
    const travelWaves = cohorts.filter((c) => c.account === 'Travel');

    return {
      totalWaves: cohorts.length,
      totalCount,
      mobilityWaves: mobilityWaves.length,
      mobilityCount: mobilityWaves.reduce((s, c) => s + c.traineeCount, 0),
      telecoWaves: telecoWaves.length,
      telecoCount: telecoWaves.reduce((s, c) => s + c.traineeCount, 0),
      travelWaves: travelWaves.length,
      travelCount: travelWaves.reduce((s, c) => s + c.traineeCount, 0),
    };
  }, [cohorts]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleSelectAccountFilter = (acc: 'all' | BusinessAccount) => {
    setAccountFilter(acc);
    setCurrentTab('dashboard');
  };

  const handleUpdateCohorts = (newCohorts: CohortSummary[], sourceType: string) => {
    setCohorts(newCohorts);
    setSheetSourceType(sourceType);
    showToast(`Synchronized ${newCohorts.length} training cohort sheets across Mobility, Teleco & Travel.`);
  };

  const handleSyncLiveRoster = () => {
    if (!liveUsers || liveUsers.length === 0) {
      showToast('Live roster is refreshing, please wait a moment...');
      if (onRefreshUsers) onRefreshUsers();
      return;
    }
    const liveCohorts = mapLiveUsersToCohorts(liveUsers, adminStats);
    if (liveCohorts.length === 0) {
      showToast('No active agent records found in live roster.');
      return;
    }
    setCohorts(liveCohorts);
    setSheetSourceType('live_skillence_roster');
    const totalLiveTrainees = liveCohorts.reduce((s, c) => s + c.traineeCount, 0);
    showToast(`Mapped ${liveCohorts.length} live cohort waves with ${totalLiveTrainees} agents from Skillence Roster!`);
  };

  const handleResetToDefaultSheets = () => {
    setCohorts(INITIAL_COHORTS_DATA);
    setSheetSourceType('google_sheets');
    showToast('Switched to standard 6-Sheet benchmark model.');
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
    <div className="min-h-screen bg-[#F4F5F8] text-[#111116] flex flex-col font-sans">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#050505] text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border border-[#06C167]">
          <CheckCircle2 className="w-4 h-4 text-[#06C167]" />
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
        sheetSourceType={sheetSourceType}
      />

      {/* Global Account Filter Bar */}
      <div className="bg-[#050505] border-b-2 border-[#06C167] text-white px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mr-1">
              Business Accounts:
            </span>
            <button
              onClick={() => handleSelectAccountFilter('all')}
              className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                accountFilter === 'all'
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 text-zinc-300 border border-zinc-700 hover:text-white'
              }`}
            >
              All Accounts ({filterCounts.totalWaves} Waves · {filterCounts.totalCount} Agents)
            </button>
            <button
              onClick={() => handleSelectAccountFilter('Mobility')}
              className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                accountFilter === 'Mobility'
                  ? 'bg-[#06C167] text-black'
                  : 'bg-zinc-900 text-emerald-400 border border-emerald-700/50 hover:bg-zinc-800'
              }`}
            >
              Mobility ({filterCounts.mobilityWaves} {filterCounts.mobilityWaves === 1 ? 'Wave' : 'Waves'} · {filterCounts.mobilityCount} Agents)
            </button>
            <button
              onClick={() => handleSelectAccountFilter('Teleco')}
              className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                accountFilter === 'Teleco'
                  ? 'bg-[#3B82F6] text-white'
                  : 'bg-zinc-900 text-blue-400 border border-blue-700/50 hover:bg-zinc-800'
              }`}
            >
              Teleco ({filterCounts.telecoWaves} {filterCounts.telecoWaves === 1 ? 'Wave' : 'Waves'} · {filterCounts.telecoCount} Agents)
            </button>
            <button
              onClick={() => handleSelectAccountFilter('Travel')}
              className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                accountFilter === 'Travel'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-zinc-900 text-purple-400 border border-purple-700/50 hover:bg-zinc-800'
              }`}
            >
              Travel ({filterCounts.travelWaves} {filterCounts.travelWaves === 1 ? 'Wave' : 'Waves'} · {filterCounts.travelCount} Agents)
            </button>
          </div>
          <div className="flex items-center gap-2">
            {sheetSourceType === 'live_skillence_roster' ? (
              <button
                onClick={handleResetToDefaultSheets}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold cursor-pointer"
                title="Switch back to standard 6-sheet benchmark data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Default 6 Sheets</span>
              </button>
            ) : (
              <button
                onClick={handleSyncLiveRoster}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold cursor-pointer"
                title="Sync from live Skillence Roster"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Sync Live Roster</span>
              </button>
            )}
            <span className="text-zinc-600">·</span>
            <button
              onClick={() => setIsDataManagerOpen(true)}
              className="text-[#06C167] hover:underline font-bold cursor-pointer"
            >
              Sync 6 Sheets
            </button>
            <span className="text-zinc-600">·</span>
            <button
              onClick={handleExportExcel}
              className="text-zinc-200 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#06C167]" />
              <span>Export .XLSX</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Account Portfolio Benchmark Scorecards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accountRollups.map((r) => (
            <div
              key={r.account}
              className="bg-white border border-[#E5E7EC] rounded-2xl p-5 shadow-sm"
              style={{ borderTop: `4px solid ${r.color}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="px-2.5 py-0.5 rounded text-xs font-extrabold uppercase"
                  style={{ backgroundColor: `${r.color}18`, color: r.color }}
                >
                  {r.account} Account
                </span>
                <span className="text-xs font-mono font-bold text-zinc-600">
                  {r.wavesCount} {r.wavesCount === 1 ? 'Wave' : 'Waves'} · {r.headcount} Agents
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 text-xs tabular-nums">
                <div>
                  <span className="text-zinc-500 block">Initial → Final</span>
                  <strong className="text-sm font-mono text-zinc-900">
                    {r.initialRP.toFixed(2)} → {r.finalRP.toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Net RP Uplift</span>
                  <strong className="text-sm font-mono text-[#08755D]">
                    +{r.gain.toFixed(2)} pts
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Modules / Att.</span>
                  <strong className="text-sm font-mono text-zinc-900">
                    {r.moduleComp.toFixed(1)}% · {r.attendanceComp.toFixed(1)}%
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>

        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            <CohortOverviewCards cohorts={filteredCohorts} />
            <CohortComparisonMatrix
              cohorts={filteredCohorts}
              onSelectCohort={handleSelectCohortFromMatrix}
              onCompareHeadToHead={handleCompareHeadToHead}
            />
            <CrossCohortCharts cohorts={filteredCohorts} />
            <TraineeDirectory
              cohorts={filteredCohorts}
              selectedCohortId={selectedCohortForTrainees}
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
          />
        )}

        {currentTab === 'insights' && (
          <CohortInsights cohorts={filteredCohorts} />
        )}

        {currentTab === 'sheet_sync' && (
          <div className="bg-white border border-[#E5E7EC] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#06C167]" />
                  6 Google Sheets Workbooks &amp; Account Hierarchy
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Connected across Mobility (Waves 1–2), Teleco (Wave 3), and Travel (Waves 4–6)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Template (.xlsx)</span>
                </button>
                <button
                  onClick={() => setIsDataManagerOpen(true)}
                  className="px-4 py-2 bg-[#06C167] hover:bg-[#05ad5c] text-black rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
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
