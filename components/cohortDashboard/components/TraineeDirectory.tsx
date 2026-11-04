import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Award,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Zap,
  GraduationCap,
  Plus,
  Trash2,
  ArrowRightLeft,
  FolderPlus,
  UserPlus,
  X,
  Building2,
  Briefcase,
} from 'lucide-react';
import { CohortSummary, Trainee, BusinessAccount, RubricBreakdown } from '../types';
import { TraineeModal } from './TraineeModal';
import { recalculateCohortSummariesFromDirectory } from '../utils/sheetParser';

interface TraineeDirectoryProps {
  cohorts: CohortSummary[];
  selectedCohortId?: string | null;
  selectedAccount?: 'all' | BusinessAccount;
  onUpdateCohorts?: (updatedCohorts: CohortSummary[]) => void;
}

export const TraineeDirectory: React.FC<TraineeDirectoryProps> = ({
  cohorts,
  selectedCohortId,
  selectedAccount = 'all',
  onUpdateCohorts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAccount, setFilterAccount] = useState<'all' | BusinessAccount>(selectedAccount);
  const [filterCohortId, setFilterCohortId] = useState<string>(selectedCohortId || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'overall' | 'roleplays' | 'tests' | 'name'>('overall');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);

  // Management Modal state
  const [activeModal, setActiveModal] = useState<null | 'add_trainee' | 'add_wave'>(null);

  // New Trainee Form State
  const [traineeName, setTraineeName] = useState('');
  const [traineeEmail, setTraineeEmail] = useState('');
  const [traineeRole, setTraineeRole] = useState('Customer Care Specialist');
  const [traineeCohortId, setTraineeCohortId] = useState<string>(cohorts[0]?.id || '');
  const [traineeInitialRP, setTraineeInitialRP] = useState<number>(2.5);
  const [traineeFinalRP, setTraineeFinalRP] = useState<number>(3.6);
  const [traineeModule, setTraineeModule] = useState<number>(88);
  const [traineeAttendance, setTraineeAttendance] = useState<number>(92);
  const [traineePriority, setTraineePriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // New Wave Form State
  const [waveName, setWaveName] = useState('');
  const [waveCode, setWaveCode] = useState('');
  const [waveAccount, setWaveAccount] = useState<BusinessAccount>('Mobility');
  const [waveTrainer, setWaveTrainer] = useState('Senior Facilitator');

  // Sync external filters if props change
  useEffect(() => {
    if (selectedCohortId) {
      setFilterCohortId(selectedCohortId);
    }
  }, [selectedCohortId]);

  useEffect(() => {
    if (selectedAccount) {
      setFilterAccount(selectedAccount);
    }
  }, [selectedAccount]);

  // Flatten all trainees across cohorts
  const allTrainees: Array<{ trainee: Trainee; cohort: CohortSummary }> = [];
  cohorts.forEach((c) => {
    (c.trainees || []).forEach((t) => {
      allTrainees.push({ trainee: t, cohort: c });
    });
  });

  // Extract unique roles
  const roles = Array.from(new Set(allTrainees.map((item) => item.trainee.role).filter(Boolean)));

  // Account colors map
  const getAccountColor = (account: BusinessAccount): string => {
    switch (account) {
      case 'Mobility':
        return '#059669';
      case 'Teleco':
        return '#2563EB';
      case 'Travel':
        return '#7C3AED';
      default:
        return '#059669';
    }
  };

  const getAccountTheme = (account: BusinessAccount) => {
    switch (account) {
      case 'Mobility':
        return { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' };
      case 'Teleco':
        return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' };
      case 'Travel':
        return { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' };
      default:
        return { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' };
    }
  };

  // 1. Quick Reassign Trainee
  const handleQuickReassign = (traineeId: string, currentCohortId: string, targetCohortId: string) => {
    if (!onUpdateCohorts || currentCohortId === targetCohortId) return;

    const sourceCohort = cohorts.find((c) => c.id === currentCohortId);
    const targetCohort = cohorts.find((c) => c.id === targetCohortId);
    if (!sourceCohort || !targetCohort) return;

    const movingTrainee = (sourceCohort.trainees || []).find((t) => t.id === traineeId);
    if (!movingTrainee) return;

    const updatedCohorts = cohorts.map((c) => {
      if (c.id === currentCohortId) {
        return {
          ...c,
          trainees: (c.trainees || []).filter((t) => t.id !== traineeId),
        };
      }
      if (c.id === targetCohortId) {
        const reassignedTrainee: Trainee = {
          ...movingTrainee,
          account: targetCohort.account,
          cohortId: targetCohort.code || `W${targetCohort.sheetIndex}`,
          cohortName: targetCohort.name,
          trainer: targetCohort.trainer,
        };
        return {
          ...c,
          trainees: [...(c.trainees || []), reassignedTrainee],
        };
      }
      return c;
    });

    const recalculated = recalculateCohortSummariesFromDirectory(updatedCohorts);
    onUpdateCohorts(recalculated);
  };

  // 2. Remove Trainee with Confirmation
  const handleRemoveTrainee = (traineeId: string, traineeName: string, cohortId: string) => {
    if (!onUpdateCohorts) return;
    const confirmed = window.confirm(`Are you sure you want to remove ${traineeName} from this wave? This will immediately recalculate wave headcounts and metrics.`);
    if (!confirmed) return;

    const updatedCohorts = cohorts.map((c) => {
      if (c.id === cohortId) {
        return {
          ...c,
          trainees: (c.trainees || []).filter((t) => t.id !== traineeId),
        };
      }
      return c;
    });

    const recalculated = recalculateCohortSummariesFromDirectory(updatedCohorts);
    onUpdateCohorts(recalculated);
  };

  // 3. Add New Trainee Form Submit
  const handleAddTraineeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateCohorts) return;
    const targetCohort = cohorts.find((c) => c.id === traineeCohortId) || cohorts[0];
    if (!targetCohort) return;

    const rp1Pct = Math.min(100, Math.round((traineeInitialRP / 5) * 100));
    const rp5Pct = Math.min(100, Math.round((traineeFinalRP / 5) * 100));
    const rpAvg = Math.round((rp1Pct + rp5Pct) / 2);
    const overall = Math.round(rpAvg * 0.55 + traineeModule * 0.45);

    const status: Trainee['status'] =
      traineePriority === 'High'
        ? traineeFinalRP < 2.3
          ? 'Remediation Needed'
          : 'At Risk'
        : traineePriority === 'Medium'
        ? 'On Track'
        : 'Ready';

    const newTrainee: Trainee = {
      id: `${targetCohort.code || 'W'}-${Date.now().toString().slice(-4)}`,
      name: traineeName.trim(),
      email: traineeEmail.trim() || `${traineeName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@tp-skillence.com`,
      account: targetCohort.account,
      cohortId: targetCohort.code || `W${targetCohort.sheetIndex}`,
      cohortName: targetCohort.name,
      trainer: targetCohort.trainer,
      role: traineeRole,
      startDate: targetCohort.startDate || new Date().toISOString().slice(0, 10),
      completionDate: targetCohort.endDate,
      overallScore: overall,
      initialRP: traineeInitialRP,
      finalRP: traineeFinalRP,
      rpGain: Number((traineeFinalRP - traineeInitialRP).toFixed(2)),
      moduleComp: traineeModule,
      attendanceComp: traineeAttendance,
      priority: traineePriority,
      status,
      roleplays: {
        rp1Discovery: rp1Pct,
        rp2Objection: Math.round(rp1Pct * 0.95),
        rp3ValuePitch: Math.round((rp1Pct + rp5Pct) / 2),
        rp4Deescalation: Math.round(rp5Pct * 0.9),
        rp5Closing: rp5Pct,
        average: rpAvg,
        passStatus: rpAvg >= 75 ? 'Pass' : rpAvg >= 60 ? 'Borderline' : 'Remediate',
        rubric: {
          communication: Math.round((rpAvg + overall) / 2),
          productKnowledge: traineeModule,
          activeListening: rp1Pct,
          objectionHandling: Math.round(rp5Pct * 0.95),
          callControl: Math.round(traineeAttendance),
        },
        evaluatorNotes: 'Enrolled via Trainee Management Directory.',
      },
      tests: {
        baselineTest: Math.max(40, traineeModule - 15),
        module1Test: Math.min(100, traineeModule + 5),
        module2Test: Math.min(100, traineeModule + 2),
        module3Test: traineeModule,
        finalExam: Math.min(100, traineeModule + 4),
        average: traineeModule,
        passStatus: traineeModule >= 80 ? 'Certified' : 'Passed',
        attemptsCount: 1,
      },
      recommendations: [
        'Enrolled into live active cohort directory.',
        'Review rubric checkpoints after first module completion.',
      ],
    };

    const updatedCohorts = cohorts.map((c) => {
      if (c.id === targetCohort.id) {
        return {
          ...c,
          trainees: [...(c.trainees || []), newTrainee],
        };
      }
      return c;
    });

    const recalculated = recalculateCohortSummariesFromDirectory(updatedCohorts);
    onUpdateCohorts(recalculated);

    // Reset form & close modal
    setTraineeName('');
    setTraineeEmail('');
    setActiveModal(null);
  };

  // 4. Add New Wave Form Submit
  const handleAddWaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateCohorts) return;
    const waveNum = cohorts.length + 1;
    const code = waveCode.trim().toUpperCase() || `W${waveNum}`;
    const name = waveName.trim() || `Wave ${waveNum} — ${waveAccount} Track`;
    const newId = `cohort-${Date.now()}`;
    const color = getAccountColor(waveAccount);

    const newCohort: CohortSummary = {
      id: newId,
      sheetIndex: waveNum,
      spreadsheetId: `wave-sheet-${waveNum}`,
      account: waveAccount,
      accountBadgeColor: color,
      name,
      code,
      tabName: `Wave ${waveNum}`,
      trainer: waveTrainer.trim() || 'Lead Trainer',
      traineeCount: 0,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      initialRP: 0,
      finalRP: 0,
      rpGain: 0,
      moduleCompletion: 0,
      attendanceCompletion: 0,
      avgRoleplayScore: 0,
      avgTestScore: 0,
      avgOverallScore: 0,
      roleplayPassRate: 0,
      testPassRate: 0,
      certificationRate: 0,
      atRiskCount: 0,
      topPerformer: { name: 'None', score: 0 },
      rubricAverages: {
        communication: 0,
        productKnowledge: 0,
        activeListening: 0,
        objectionHandling: 0,
        callControl: 0,
      },
      roleplayAverages: {
        rp1Discovery: 0,
        rp2Objection: 0,
        rp3ValuePitch: 0,
        rp4Deescalation: 0,
        rp5Closing: 0,
      },
      testAverages: {
        baselineTest: 0,
        module1Test: 0,
        module2Test: 0,
        module3Test: 0,
        finalExam: 0,
      },
      trainees: [],
    };

    const updatedCohorts = [...cohorts, newCohort];
    const recalculated = recalculateCohortSummariesFromDirectory(updatedCohorts);
    onUpdateCohorts(recalculated);

    // Reset form & close modal
    setWaveName('');
    setWaveCode('');
    setActiveModal(null);
  };

  // Filtering & Search
  let filtered = allTrainees.filter(({ trainee, cohort }) => {
    if (filterAccount !== 'all' && cohort.account !== filterAccount) return false;
    if (filterCohortId !== 'all' && cohort.id !== filterCohortId) return false;
    if (filterStatus !== 'all' && trainee.status !== filterStatus) return false;
    if (filterRole !== 'all' && trainee.role !== filterRole) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = trainee.name.toLowerCase().includes(q);
      const matchEmail = trainee.email.toLowerCase().includes(q);
      const matchId = trainee.id.toLowerCase().includes(q);
      const matchCohort = cohort.name.toLowerCase().includes(q) || cohort.code.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId && !matchCohort) return false;
    }
    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    let diff = 0;
    if (sortBy === 'overall') diff = a.trainee.overallScore - b.trainee.overallScore;
    else if (sortBy === 'roleplays') diff = (a.trainee.roleplays?.average || 0) - (b.trainee.roleplays?.average || 0);
    else if (sortBy === 'tests') diff = (a.trainee.tests?.average || 0) - (b.trainee.tests?.average || 0);
    else if (sortBy === 'name') diff = a.trainee.name.localeCompare(b.trainee.name);
    return sortOrder === 'asc' ? diff : -diff;
  });

  const selectedCohort = cohorts.find((c) => c.id === selectedTrainee?.cohortId) || cohorts[0] || null;

  // Breakdown metrics for distribution header
  const accountsList: BusinessAccount[] = ['Mobility', 'Teleco', 'Travel'];
  const accountBreakdowns = accountsList.map((acc) => {
    const list = cohorts.filter((c) => c.account === acc);
    const waves = list.map((c) => ({
      id: c.id,
      code: c.code || `W${c.sheetIndex}`,
      name: c.name,
      count: (c.trainees || []).length,
    }));
    const totalCount = waves.reduce((s, w) => s + w.count, 0);
    return {
      account: acc,
      waves,
      totalCount,
      color: getAccountColor(acc),
      theme: getAccountTheme(acc),
    };
  });

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden space-y-4">
      {/* 1. WAVE & ACCOUNT DISTRIBUTION BREAKDOWN BAR */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#2E0854]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Wave &amp; Account Distribution Breakdown
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              ({cohorts.length} Waves · {allTrainees.length} Total Trainees)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onUpdateCohorts && (
              <>
                <button
                  onClick={() => setActiveModal('add_trainee')}
                  className="px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title="Add a new trainee to any wave"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add Trainee</span>
                </button>
                <button
                  onClick={() => setActiveModal('add_wave')}
                  className="px-3 py-1.5 rounded-lg bg-[#2E0854] hover:bg-[#4B1D7C] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title="Create a new wave under an account"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ New Wave</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Visual summary strip grouping by Account with nested wave chips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {accountBreakdowns.map((ab) => {
            const isAccountActive = filterAccount === ab.account;
            return (
              <div
                key={ab.account}
                className={`p-3.5 rounded-xl border transition-all ${
                  isAccountActive
                    ? 'bg-white shadow-xs ring-2 ring-offset-1'
                    : 'bg-white border-slate-200/90 hover:border-slate-300'
                }`}
                style={{
                  borderColor: isAccountActive ? ab.color : undefined,
                  boxShadow: isAccountActive ? `0 0 0 2px ${ab.color}` : undefined,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => {
                      if (filterAccount === ab.account && filterCohortId === 'all') {
                        setFilterAccount('all');
                      } else {
                        setFilterAccount(ab.account);
                        setFilterCohortId('all');
                      }
                    }}
                    className="text-xs font-bold flex items-center gap-1.5 cursor-pointer text-left"
                    style={{ color: ab.color }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ab.color }} />
                    <span>{ab.account} Account</span>
                    <span className="text-slate-500 font-mono text-[11px] font-normal">
                      ({ab.totalCount} Trainees)
                    </span>
                  </button>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 font-mono">
                    {ab.waves.length} {ab.waves.length === 1 ? 'Wave' : 'Waves'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {ab.waves.map((w) => {
                    const isWaveActive = filterCohortId === w.id;
                    return (
                      <button
                        key={w.id}
                        onClick={() => {
                          if (filterCohortId === w.id) {
                            setFilterCohortId('all');
                          } else {
                            setFilterAccount(ab.account);
                            setFilterCohortId(w.id);
                          }
                        }}
                        className="px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer border"
                        style={{
                          backgroundColor: isWaveActive ? ab.color : ab.theme.bg,
                          borderColor: isWaveActive ? ab.color : ab.theme.border,
                          color: isWaveActive ? '#FFFFFF' : ab.theme.text,
                        }}
                        title={`${w.name}: ${w.count} Trainees`}
                      >
                        {w.code} ({w.count})
                      </button>
                    );
                  })}
                  {ab.waves.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic">No waves assigned</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. HEADER CONTROLS & FILTER ROW */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#2E0854]" />
              Cross-Cohort Trainee Directory
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                {filtered.length} Trainees shown
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live directory with real-time wave reassignment, trainee enrollment, and dynamic headcount rollups
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search trainee name, ID or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-[#2E0854] focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex items-center flex-wrap gap-3 pt-1">
          {/* Business Account Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Account:</span>
            <select
              value={filterAccount}
              onChange={(e) => {
                setFilterAccount(e.target.value as any);
                setFilterCohortId('all');
              }}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">All Accounts ({allTrainees.length} Trainees)</option>
              {accountsList.map((acc) => {
                const count = allTrainees.filter((t) => t.cohort.account === acc).length;
                return (
                  <option key={acc} value={acc}>
                    {acc} ({count} Trainees)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Cohort / Wave Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Wave:</span>
            <select
              value={filterCohortId}
              onChange={(e) => setFilterCohortId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">
                All Waves ({cohorts.length} Waves · {allTrainees.length} Trainees)
              </option>
              {cohorts
                .filter((c) => filterAccount === 'all' || c.account === filterAccount)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}: {c.name} ({(c.trainees || []).length} Trainees)
                  </option>
                ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Ready">Ready (Certified)</option>
              <option value="On Track">On Track</option>
              <option value="At Risk">At Risk</option>
              <option value="Remediation Needed">Remediation Needed</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Role:</span>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">All Track Roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {(filterAccount !== 'all' || filterCohortId !== 'all' || filterStatus !== 'all' || filterRole !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilterAccount('all');
                setFilterCohortId('all');
                setFilterStatus('all');
                setFilterRole('all');
                setSearchQuery('');
              }}
              className="text-xs text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 3. TRAINEES TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Trainee &amp; ID</th>
              <th className="py-3 px-3">Account &amp; Wave (Reassign)</th>
              <th className="py-3 px-3">Role / Track</th>
              <th
                onClick={() => {
                  setSortBy('roleplays');
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                }}
                className="py-3 px-4 cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center gap-1">
                  <span>Roleplay Avg</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">RP Scale (Init → Final)</th>
              <th
                onClick={() => {
                  setSortBy('tests');
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                }}
                className="py-3 px-4 cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center gap-1">
                  <span>Tests Avg</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => {
                  setSortBy('overall');
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                }}
                className="py-3 px-4 cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center gap-1">
                  <span>Overall Score</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Readiness Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filtered.map(({ trainee, cohort }) => {
              const accColor = getAccountColor(cohort.account);
              const accTheme = getAccountTheme(cohort.account);

              return (
                <tr
                  key={trainee.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Name & ID */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg font-bold flex items-center justify-center text-xs border"
                        style={{
                          backgroundColor: accTheme.bg,
                          borderColor: accTheme.border,
                          color: accTheme.text,
                        }}
                      >
                        {(trainee.name || 'T')
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-[#2E0854] transition-colors">
                          {trainee.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {trainee.email} · ID: {trainee.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Account & Wave (Color-Coded Badge + Wave Code + Quick Reassign) */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border"
                          style={{
                            backgroundColor: accTheme.bg,
                            borderColor: accTheme.border,
                            color: accTheme.text,
                          }}
                        >
                          {cohort.account}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {cohort.code || `W${cohort.sheetIndex}`}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>Coach: {cohort.trainer}</span>
                        {onUpdateCohorts && (
                          <>
                            <span>·</span>
                            <select
                              value={cohort.id}
                              onChange={(e) => handleQuickReassign(trainee.id, cohort.id, e.target.value)}
                              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] text-purple-700 hover:text-purple-900 font-semibold cursor-pointer"
                              title="Reassign to another wave"
                            >
                              {cohorts.map((c) => (
                                <option key={c.id} value={c.id}>
                                  Move to {c.code} ({c.account})
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                    {trainee.role}
                  </td>

                  {/* Roleplays Avg */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                    {trainee.roleplays?.average || 0}%
                  </td>

                  {/* RP Scale (Init -> Final) */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                    <span className="text-slate-500">{trainee.initialRP}</span>
                    <span className="text-slate-400 mx-1">→</span>
                    <strong className="text-slate-900">{trainee.finalRP}</strong>
                    <span className="ml-1 text-[11px] font-bold text-emerald-700">
                      (+{trainee.rpGain})
                    </span>
                  </td>

                  {/* Tests Avg */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                    {trainee.tests?.average || 0}%
                  </td>

                  {/* Overall Combined Score */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono font-extrabold text-sm text-[#2E0854]">
                    {trainee.overallScore}%
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                        trainee.status === 'Ready'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : trainee.status === 'On Track'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : trainee.status === 'At Risk'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {trainee.status}
                    </span>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedTrainee(trainee)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-[#2E0854] hover:text-white text-slate-700 text-[11px] font-bold transition-all cursor-pointer border border-slate-200"
                      >
                        View Scorecard
                      </button>
                      {onUpdateCohorts && (
                        <button
                          onClick={() => handleRemoveTrainee(trainee.id, trainee.name, cohort.id)}
                          className="p-1 rounded bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white transition-colors cursor-pointer border border-rose-200"
                          title="Remove trainee from wave"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-900">No trainees match the current filters.</p>
            <p className="text-xs text-slate-500">Try adjusting your search query, Account filter, or Wave selection.</p>
          </div>
        )}
      </div>

      {/* Trainee Modal (Scorecard Detail) */}
      <TraineeModal
        trainee={selectedTrainee}
        cohort={selectedCohort}
        onClose={() => setSelectedTrainee(null)}
      />

      {/* MODALS FOR ADDING TRAINEE / CREATING WAVE */}
      {activeModal === 'add_trainee' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-900 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Enroll New Trainee</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTraineeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mostafa Nabil Hassan"
                  value={traineeName}
                  onChange={(e) => setTraineeName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:border-[#2E0854] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="agent@tpskillence.com"
                    value={traineeEmail}
                    onChange={(e) => setTraineeEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:border-[#2E0854] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Role</label>
                  <input
                    type="text"
                    value={traineeRole}
                    onChange={(e) => setTraineeRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:border-[#2E0854] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Assigned Wave &amp; Account *</label>
                <select
                  value={traineeCohortId}
                  onChange={(e) => setTraineeCohortId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:border-[#2E0854] focus:bg-white cursor-pointer"
                >
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}: {c.name} ({c.account} Account · Coach {c.trainer})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Initial RP (1.0–5.0)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="5.0"
                    value={traineeInitialRP}
                    onChange={(e) => setTraineeInitialRP(parseFloat(e.target.value) || 2.5)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:border-[#2E0854] focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Final RP (1.0–5.0)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="5.0"
                    value={traineeFinalRP}
                    onChange={(e) => setTraineeFinalRP(parseFloat(e.target.value) || 3.5)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:border-[#2E0854] focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Module Comp (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={traineeModule}
                    onChange={(e) => setTraineeModule(parseInt(e.target.value, 10) || 80)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:border-[#2E0854] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Attendance (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={traineeAttendance}
                    onChange={(e) => setTraineeAttendance(parseInt(e.target.value, 10) || 90)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:border-[#2E0854] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Support Priority</label>
                  <select
                    value={traineePriority}
                    onChange={(e) => setTraineePriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:border-[#2E0854] cursor-pointer"
                  >
                    <option value="Low">Low (On Track)</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High (At Risk)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#2E0854] hover:bg-[#4B1D7C] text-white font-bold cursor-pointer shadow-xs"
                >
                  Enroll Trainee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE WAVE MODAL */}
      {activeModal === 'add_wave' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-900 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-purple-700" />
                <h3 className="text-sm font-bold text-slate-900">Create New Wave (Cohort)</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWaveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Wave Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wave 7 — Mobility Operations"
                  value={waveName}
                  onChange={(e) => setWaveName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:border-[#2E0854] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Wave Code (e.g. W7)</label>
                  <input
                    type="text"
                    placeholder="W7"
                    value={waveCode}
                    onChange={(e) => setWaveCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:border-[#2E0854] focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Business Account *</label>
                  <select
                    value={waveAccount}
                    onChange={(e) => setWaveAccount(e.target.value as BusinessAccount)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:border-[#2E0854] cursor-pointer"
                  >
                    <option value="Mobility">Mobility Account</option>
                    <option value="Teleco">Teleco Account</option>
                    <option value="Travel">Travel Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Assigned Lead Trainer</label>
                <input
                  type="text"
                  placeholder="Senior Facilitator"
                  value={waveTrainer}
                  onChange={(e) => setWaveTrainer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:border-[#2E0854] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#2E0854] hover:bg-[#4B1D7C] text-white font-bold cursor-pointer shadow-xs"
                >
                  Create Wave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TraineeDirectory;
