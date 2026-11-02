import { UserProfile } from '../../../types';
import { CohortSummary, Trainee, BusinessAccount, RubricBreakdown } from '../types';
import { INITIAL_COHORTS_DATA } from '../data/mockCohortsData';
import { recalculateCohortSummariesFromDirectory } from './sheetParser';

export interface NormalizedWave {
  canonical: string; // e.g. "Wave 1"
  shortCode: string; // e.g. "W1"
  waveNum: number;   // e.g. 1
  raw: string;
}

/**
 * Normalizes any wave string (e.g. "Wave 1", "W1", "1", "Wave 1 (EOT) — Mobility")
 * into a structured object with canonical name, short code, and numeric index.
 */
export function normalizeWaveKey(raw: string = ''): NormalizedWave {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return { canonical: 'Wave 1', shortCode: 'W1', waveNum: 1, raw: '' };
  }

  // Check for "Wave X", "W X", or standalone "X"
  const waveMatch =
    trimmed.match(/wave\s*(\d+)/i) ||
    trimmed.match(/\bW(\d+)\b/i) ||
    trimmed.match(/^(\d+)$/);

  if (waveMatch && waveMatch[1]) {
    const num = parseInt(waveMatch[1], 10);
    return {
      canonical: `Wave ${num}`,
      shortCode: `W${num}`,
      waveNum: num,
      raw: trimmed,
    };
  }

  // Fallback if no digit found: clean string
  return {
    canonical: trimmed,
    shortCode: trimmed.slice(0, 3).toUpperCase(),
    waveNum: 1,
    raw: trimmed,
  };
}

/**
 * Determines business account with priority:
 * 1. Explicit user.account
 * 2. waveConfigs metadata
 * 3. String keywords (mobility, teleco, travel)
 * 4. Wave number convention (1-2 Mobility, 3 Teleco, 4+ Travel)
 */
export function getAccountForWave(
  waveName: string,
  waveNum: number,
  explicitAccount?: string,
  waveConfigs: Record<string, any> = {}
): BusinessAccount {
  if (explicitAccount === 'Mobility' || explicitAccount === 'Teleco' || explicitAccount === 'Travel') {
    return explicitAccount;
  }

  const configured = waveConfigs[waveName]?.account || waveConfigs[`Wave ${waveNum}`]?.account;
  if (configured === 'Mobility' || configured === 'Teleco' || configured === 'Travel') {
    return configured;
  }

  const lower = waveName.toLowerCase();
  if (lower.includes('teleco') || lower.includes('telecom')) return 'Teleco';
  if (lower.includes('travel') || lower.includes('airline')) return 'Travel';
  if (lower.includes('mobility') || lower.includes('ride') || lower.includes('auto')) return 'Mobility';

  if (!isNaN(waveNum)) {
    if (waveNum <= 2) return 'Mobility';
    if (waveNum === 3) return 'Teleco';
    return 'Travel';
  }

  return 'Mobility';
}

export function getAccountColor(account: BusinessAccount): string {
  switch (account) {
    case 'Mobility':
      return '#06C167';
    case 'Teleco':
      return '#3B82F6';
    case 'Travel':
      return '#8B5CF6';
    default:
      return '#06C167';
  }
}

/**
 * Converts a live UserProfile into a Trainee record with simulated roleplays and tests
 * grounded in the user's real SVAR / fluency / grammar metrics and overall progress.
 */
export function createTraineeFromUserProfile(
  u: UserProfile,
  stats: any = {},
  cohortCode: string,
  cohortName: string,
  account: BusinessAccount,
  index: number
): Trainee {
  const overallProgress = u.overallProgress ?? stats.overallProgress ?? 75;
  const weeklyProgress = u.weeklyProgress ?? (stats.weeklyMinutes ? Math.min(100, Math.round((stats.weeklyMinutes / 180) * 100)) : 80);

  const m = u.metrics || {};
  const fluency = Math.min(100, Math.max(30, Math.round(m.fluency || m.svar?.fluency || 72)));
  const vocabulary = Math.min(100, Math.max(30, Math.round(m.vocabulary || m.svar?.vocabulary || 76)));
  const grammar = Math.min(100, Math.max(30, Math.round(m.grammar || m.svar?.grammar || 70)));
  const pronunciation = Math.min(100, Math.max(30, Math.round(m.pronunciation || m.svar?.pronunciation || 74)));
  const coherence = Math.min(100, Math.max(30, Math.round(m.coherence || m.svar?.coherence || 75)));

  // Roleplay scores out of 100
  const rp1 = Math.round(Math.min(100, Math.max(40, vocabulary * 0.95 + 4)));
  const rp2 = Math.round(Math.min(100, Math.max(40, fluency * 0.9 + 7)));
  const rp3 = Math.round(Math.min(100, Math.max(40, (vocabulary + pronunciation) / 2)));
  const rp4 = Math.round(Math.min(100, Math.max(40, coherence * 0.95 + 3)));
  const rp5 = Math.round(Math.min(100, Math.max(40, (fluency + grammar) / 2)));
  const rpAvg = Math.round((rp1 + rp2 + rp3 + rp4 + rp5) / 5);

  // 1.0 - 5.0 scaled roleplay score
  const initialRP = Number(((rpAvg / 100) * 2.2 + 1.8).toFixed(2));
  const finalRP = Number(Math.min(5.0, initialRP + (overallProgress / 100) * 1.4).toFixed(2));
  const rpGain = Number((finalRP - initialRP).toFixed(2));

  // Tests out of 100
  const baselineTest = Math.round(Math.max(40, (grammar + vocabulary) / 2 - 12));
  const module1Test = Math.round(Math.min(100, Math.max(50, vocabulary + 4)));
  const module2Test = Math.round(Math.min(100, Math.max(50, grammar + 6)));
  const module3Test = Math.round(Math.min(100, Math.max(50, coherence + 3)));
  const finalExam = Math.round(Math.min(100, Math.max(55, overallProgress || 80)));
  const testAvg = Math.round((baselineTest + module1Test + module2Test + module3Test + finalExam) / 5);

  const overallScore = Math.round(rpAvg * 0.55 + testAvg * 0.45);

  const priority: 'High' | 'Medium' | 'Low' =
    overallScore < 55 ? 'High' : overallScore < 75 ? 'Medium' : 'Low';

  const status: 'Ready' | 'On Track' | 'At Risk' | 'Remediation Needed' =
    overallScore < 48
      ? 'Remediation Needed'
      : overallScore < 65
      ? 'At Risk'
      : overallScore < 82
      ? 'On Track'
      : 'Ready';

  const roleplayPassStatus: 'Pass' | 'Remediate' | 'Borderline' =
    rpAvg >= 75 ? 'Pass' : rpAvg >= 60 ? 'Borderline' : 'Remediate';

  const testPassStatus: 'Certified' | 'Passed' | 'Retake Required' =
    finalExam >= 80 ? 'Certified' : testAvg >= 70 ? 'Passed' : 'Retake Required';

  const recommendations: string[] = [];
  if (fluency < 70) recommendations.push('Focus on conversational cadence and transition phrases.');
  if (grammar < 70) recommendations.push('Reinforce past-tense agreement in customer issue documentation.');
  if (coherence < 70) recommendations.push('Use structured 3-part de-escalation frameworks.');
  if (recommendations.length === 0) {
    recommendations.push('Maintain high performance and explore mentor shadow roles.');
  }

  return {
    id: u.id || `live-${cohortCode}-${index + 1}`,
    name: u.name,
    email: u.email || `${u.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@tp-skillence.com`,
    account,
    cohortId: cohortCode,
    cohortName,
    trainer: u.assignedCoach || 'Senior Coach',
    role: `Agent (${u.languageLevel || 'B2'})`,
    startDate: '2025-01-15',
    completionDate: '2025-03-30',
    overallScore,
    initialRP,
    finalRP,
    rpGain,
    moduleComp: overallProgress,
    attendanceComp: Math.min(100, Math.max(70, Math.round(75 + weeklyProgress * 0.25))),
    priority,
    status,
    roleplays: {
      rp1Discovery: rp1,
      rp2Objection: rp2,
      rp3ValuePitch: rp3,
      rp4Deescalation: rp4,
      rp5Closing: rp5,
      average: rpAvg,
      passStatus: roleplayPassStatus,
      rubric: {
        communication: fluency,
        productKnowledge: Math.round(overallProgress),
        activeListening: coherence,
        objectionHandling: grammar,
        callControl: pronunciation,
      },
      evaluatorNotes: `Evaluated live via Skillence platform for ${u.languageLevel || 'B2'} track.`,
    },
    tests: {
      baselineTest,
      module1Test,
      module2Test,
      module3Test,
      finalExam,
      average: testAvg,
      passStatus: testPassStatus,
      attemptsCount: 1,
    },
    recommendations,
  };
}

/**
 * Maps live Skillence UserProfile[] and adminStats into the CohortSummary[] and Trainee[]
 * data structure expected by CohortAnalyticsDashboard.
 *
 * Supports three modes:
 * - 'cross_referenced' (default): Hybrid merge where live roster agents augment benchmark cohorts.
 * - 'live_only': Pure live roster cohorts without seed agents.
 * - 'benchmark_only': Standard benchmark cohorts.
 */
export function mapLiveUsersToCohorts(
  liveUsers: UserProfile[] = [],
  adminStats?: any,
  existingCohorts: CohortSummary[] = INITIAL_COHORTS_DATA,
  waveConfigs: Record<string, any> = {},
  mode: 'cross_referenced' | 'live_only' | 'benchmark_only' = 'cross_referenced'
): CohortSummary[] {
  if (mode === 'benchmark_only') {
    return existingCohorts.length > 0 ? existingCohorts : INITIAL_COHORTS_DATA;
  }

  // Filter agents (or non-admin users)
  const agents = liveUsers.filter((u) => u.role === 'agent');
  const pool = agents.length > 0 ? agents : liveUsers.filter((u) => u.role !== 'admin');

  if (mode === 'live_only') {
    if (pool.length === 0) return [];

    // Group live users by wave
    const waveMap = new Map<string, UserProfile[]>();
    pool.forEach((user) => {
      const norm = normalizeWaveKey(user.waveNumber || user.wave || 'Wave 1');
      const list = waveMap.get(norm.canonical) || [];
      list.push(user);
      waveMap.set(norm.canonical, list);
    });

    const sortedWaveKeys = Array.from(waveMap.keys()).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    const cohorts: CohortSummary[] = sortedWaveKeys.map((waveKey, waveIndex) => {
      const usersInWave = waveMap.get(waveKey) || [];
      const waveNum = parseInt(waveKey.replace(/\D/g, ''), 10) || waveIndex + 1;
      const account = getAccountForWave(waveKey, waveNum, usersInWave[0]?.account, waveConfigs);
      const color = getAccountColor(account);
      const shortCode = `W${waveNum}`;
      const cohortName = `${waveKey} – ${account}`;

      const trainees: Trainee[] = usersInWave.map((u, idx) => {
        const stats = adminStats?.userStats?.find((s: any) => s.userId === u.id) || {};
        return createTraineeFromUserProfile(u, stats, shortCode, cohortName, account, idx);
      });

      return {
        id: `cohort-${waveNum}`,
        sheetIndex: waveNum,
        spreadsheetId: `live-roster-${waveKey.toLowerCase().replace(/\s+/g, '-')}`,
        account,
        accountBadgeColor: color,
        name: cohortName,
        code: shortCode,
        tabName: waveKey,
        trainer: usersInWave[0]?.assignedCoach || 'Senior Coach',
        traineeCount: trainees.length,
        startDate: '2025-01-15',
        endDate: '2025-03-30',
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
        topPerformer: { name: 'N/A', score: 0 },
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
        trainees,
      };
    });

    return recalculateCohortSummariesFromDirectory(cohorts);
  }

  // MODE: 'cross_referenced' (Hybrid Merge)
  // Base from existingCohorts or INITIAL_COHORTS_DATA
  const baseCohorts = (existingCohorts.length > 0 ? existingCohorts : INITIAL_COHORTS_DATA).map((c) => ({
    ...c,
    // Ensure clean wave code (e.g. W1, W2, etc.)
    code: c.code && c.code.startsWith('W') ? c.code : `W${c.sheetIndex}`,
    name: c.name.includes('—') || c.name.includes('–') ? c.name : `Wave ${c.sheetIndex} – ${c.account}`,
    tabName: c.tabName || `Wave ${c.sheetIndex}`,
    trainees: [...(c.trainees || [])],
  }));

  if (pool.length === 0) {
    return recalculateCohortSummariesFromDirectory(baseCohorts);
  }

  // Group live users by normalized wave number
  const liveByWaveNum = new Map<number, UserProfile[]>();
  pool.forEach((user) => {
    const norm = normalizeWaveKey(user.waveNumber || user.wave || 'Wave 1');
    const list = liveByWaveNum.get(norm.waveNum) || [];
    list.push(user);
    liveByWaveNum.set(norm.waveNum, list);
  });

  // Track existing wave numbers
  const processedWaveNums = new Set<number>();

  const updatedCohorts: CohortSummary[] = baseCohorts.map((cohort) => {
    const waveNum = cohort.sheetIndex;
    processedWaveNums.add(waveNum);
    const liveUsersInWave = liveByWaveNum.get(waveNum) || [];

    if (liveUsersInWave.length === 0) {
      return cohort;
    }

    const currentTrainees = [...cohort.trainees];
    const account = cohort.account;

    liveUsersInWave.forEach((u, uIdx) => {
      const stats = adminStats?.userStats?.find((s: any) => s.userId === u.id) || {};
      const newTrainee = createTraineeFromUserProfile(
        u,
        stats,
        cohort.code,
        cohort.name,
        account,
        uIdx
      );

      // Match by id, email, or normalized name
      const existingIdx = currentTrainees.findIndex(
        (t) =>
          (u.id && t.id === u.id) ||
          (u.email && t.email && t.email.toLowerCase() === u.email.toLowerCase()) ||
          t.name.trim().toLowerCase() === u.name.trim().toLowerCase()
      );

      if (existingIdx >= 0) {
        // Merge live progress and metrics into existing trainee
        currentTrainees[existingIdx] = {
          ...currentTrainees[existingIdx],
          ...newTrainee,
          id: u.id || currentTrainees[existingIdx].id,
          trainer: u.assignedCoach || cohort.trainer,
        };
      } else {
        currentTrainees.push(newTrainee);
      }
    });

    return {
      ...cohort,
      trainees: currentTrainees,
    };
  });

  // Add any live waves that are not in existing cohorts
  liveByWaveNum.forEach((usersInWave, waveNum) => {
    if (!processedWaveNums.has(waveNum)) {
      const waveKey = `Wave ${waveNum}`;
      const account = getAccountForWave(waveKey, waveNum, usersInWave[0]?.account, waveConfigs);
      const color = getAccountColor(account);
      const shortCode = `W${waveNum}`;
      const cohortName = `${waveKey} – ${account}`;

      const trainees: Trainee[] = usersInWave.map((u, idx) => {
        const stats = adminStats?.userStats?.find((s: any) => s.userId === u.id) || {};
        return createTraineeFromUserProfile(u, stats, shortCode, cohortName, account, idx);
      });

      updatedCohorts.push({
        id: `cohort-${waveNum}`,
        sheetIndex: waveNum,
        spreadsheetId: `live-roster-wave-${waveNum}`,
        account,
        accountBadgeColor: color,
        name: cohortName,
        code: shortCode,
        tabName: waveKey,
        trainer: usersInWave[0]?.assignedCoach || 'Senior Coach',
        traineeCount: trainees.length,
        startDate: '2025-01-15',
        endDate: '2025-03-30',
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
        topPerformer: { name: 'N/A', score: 0 },
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
        trainees,
      });
    }
  });

  return recalculateCohortSummariesFromDirectory(updatedCohorts);
}
