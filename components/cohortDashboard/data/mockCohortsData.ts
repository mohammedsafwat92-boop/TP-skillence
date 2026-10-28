import { CohortSummary, Trainee, RubricBreakdown, BusinessAccount } from '../types';

export const DEFAULT_SHEET_NAMES = [
  'Wave 1 (EOT) — Mobility',
  'Wave 2 (EOT) — Mobility',
  'Wave 3 (Perf Tracker) — Teleco',
  'Wave 4 (Waves 65–66) — Travel',
  'Wave 5 (Wave 66 Ops) — Travel',
  'Wave 6 (Monitors) — Travel',
];

interface WaveAgentSeed {
  id: string;
  name: string;
  role: string;
  rp1: number;
  rp2: number;
  rp3: number;
  rp4: number;
  rp5: number;
  initial: number;
  final: number;
  gain: number;
  module: number;
  attendance: number;
  priority: 'High' | 'Medium' | 'Low';
}

function buildOfficialCohort(params: {
  sheetIndex: number;
  spreadsheetId: string;
  account: BusinessAccount;
  accountBadgeColor: string;
  name: string;
  code: string;
  tabName: string;
  trainer: string;
  startDate: string;
  endDate: string;
  initialRP: number;
  finalRP: number;
  rpGain: number;
  moduleCompletion: number;
  attendanceCompletion: number;
  agents: WaveAgentSeed[];
}): CohortSummary {
  const trainees: Trainee[] = params.agents.map((a) => {
    const rp1Pct = Math.round((a.rp1 / 5) * 100);
    const rp2Pct = Math.round((a.rp2 / 5) * 100);
    const rp3Pct = Math.round((a.rp3 / 5) * 100);
    const rp4Pct = Math.round((a.rp4 / 5) * 100);
    const rp5Pct = Math.round((a.final / 5) * 100);
    const rpAvg = Math.round((rp1Pct + rp2Pct + rp3Pct + rp4Pct + rp5Pct) / 5);
    const testAvg = Math.round(a.module);
    const overall = Math.round(rpAvg * 0.55 + testAvg * 0.45);

    const status: Trainee['status'] =
      a.priority === 'High'
        ? a.final < 2.3
          ? 'Remediation Needed'
          : 'At Risk'
        : a.priority === 'Medium'
        ? 'On Track'
        : 'Ready';

    return {
      id: a.id,
      name: a.name,
      email: `${a.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@tpskillence.com`,
      account: params.account,
      cohortId: params.code,
      cohortName: params.name,
      trainer: params.trainer,
      role: a.role,
      startDate: params.startDate,
      completionDate: params.endDate,
      overallScore: overall,
      initialRP: a.initial,
      finalRP: a.final,
      rpGain: a.gain,
      moduleComp: a.module,
      attendanceComp: a.attendance,
      priority: a.priority,
      status,
      roleplays: {
        rp1Discovery: rp1Pct,
        rp2Objection: rp2Pct,
        rp3ValuePitch: rp3Pct,
        rp4Deescalation: rp4Pct,
        rp5Closing: rp5Pct,
        average: rpAvg,
        passStatus: a.final >= 3.5 ? 'Pass' : a.final >= 2.75 ? 'Borderline' : 'Remediate',
        rubric: {
          communication: Math.min(100, Math.round(rp5Pct * 1.02)),
          productKnowledge: Math.min(100, Math.round(rp5Pct * 0.98)),
          activeListening: Math.min(100, Math.round(rp5Pct * 1.01)),
          objectionHandling: Math.min(100, Math.round(rp3Pct * 0.97)),
          callControl: Math.min(100, Math.round(rp4Pct * 0.99)),
        },
        evaluatorNotes: `${params.account} Account (${params.name}): RP1 ${a.initial.toFixed(2)} -> Final RP ${a.final.toFixed(2)} (${a.gain >= 0 ? '+' : ''}${a.gain.toFixed(2)} pts).`,
      },
      tests: {
        baselineTest: Math.max(45, Math.round(a.module * 0.78)),
        module1Test: Math.min(100, Math.round(a.module * 0.95)),
        module2Test: Math.min(100, Math.round(a.module * 0.98)),
        module3Test: Math.min(100, Math.round(a.module)),
        finalExam: Math.min(100, Math.round(a.module * 1.02)),
        average: testAvg,
        passStatus: testAvg >= 85 ? 'Certified' : testAvg >= 75 ? 'Passed' : 'Retake Required',
        attemptsCount: a.priority === 'High' ? 2 : 1,
      },
      recommendations: [
        `Focus on ${params.account} Account call-flow rubric consistency`,
        a.attendance < 75 ? 'Schedule mandatory attendance make-up session' : 'Maintain current module & attendance cadence',
      ],
    };
  });

  const count = trainees.length;
  const avgRoleplayScore = Math.round(trainees.reduce((s, t) => s + t.roleplays.average, 0) / count);
  const avgTestScore = Math.round(trainees.reduce((s, t) => s + t.tests.average, 0) / count);
  const avgOverallScore = Math.round(trainees.reduce((s, t) => s + t.overallScore, 0) / count);
  const topSorted = [...trainees].sort((a, b) => b.finalRP - a.finalRP);

  const rubricAverages: RubricBreakdown = {
    communication: Math.round(trainees.reduce((s, t) => s + t.roleplays.rubric.communication, 0) / count),
    productKnowledge: Math.round(trainees.reduce((s, t) => s + t.roleplays.rubric.productKnowledge, 0) / count),
    activeListening: Math.round(trainees.reduce((s, t) => s + t.roleplays.rubric.activeListening, 0) / count),
    objectionHandling: Math.round(trainees.reduce((s, t) => s + t.roleplays.rubric.objectionHandling, 0) / count),
    callControl: Math.round(trainees.reduce((s, t) => s + t.roleplays.rubric.callControl, 0) / count),
  };

  return {
    id: `cohort-${params.sheetIndex}`,
    sheetIndex: params.sheetIndex,
    spreadsheetId: params.spreadsheetId,
    account: params.account,
    accountBadgeColor: params.accountBadgeColor,
    name: params.name,
    code: params.code,
    tabName: params.tabName,
    trainer: params.trainer,
    traineeCount: count,
    startDate: params.startDate,
    endDate: params.endDate,
    initialRP: params.initialRP,
    finalRP: params.finalRP,
    rpGain: params.rpGain,
    moduleCompletion: params.moduleCompletion,
    attendanceCompletion: params.attendanceCompletion,
    avgRoleplayScore,
    avgTestScore,
    avgOverallScore,
    roleplayPassRate: Math.round((trainees.filter((t) => t.finalRP >= 3.0).length / count) * 100),
    testPassRate: Math.round((trainees.filter((t) => t.moduleComp >= 75).length / count) * 100),
    certificationRate: Math.round((trainees.filter((t) => t.priority !== 'High').length / count) * 100),
    atRiskCount: trainees.filter((t) => t.priority === 'High').length,
    topPerformer: {
      name: topSorted[0]?.name || 'N/A',
      score: topSorted[0]?.overallScore || 0,
    },
    rubricAverages,
    roleplayAverages: {
      rp1Discovery: Math.round(trainees.reduce((s, t) => s + t.roleplays.rp1Discovery, 0) / count),
      rp2Objection: Math.round(trainees.reduce((s, t) => s + t.roleplays.rp2Objection, 0) / count),
      rp3ValuePitch: Math.round(trainees.reduce((s, t) => s + t.roleplays.rp3ValuePitch, 0) / count),
      rp4Deescalation: Math.round(trainees.reduce((s, t) => s + t.roleplays.rp4Deescalation, 0) / count),
      rp5Closing: Math.round(trainees.reduce((s, t) => s + t.roleplays.rp5Closing, 0) / count),
    },
    testAverages: {
      baselineTest: Math.round(trainees.reduce((s, t) => s + t.tests.baselineTest, 0) / count),
      module1Test: Math.round(trainees.reduce((s, t) => s + t.tests.module1Test, 0) / count),
      module2Test: Math.round(trainees.reduce((s, t) => s + t.tests.module2Test, 0) / count),
      module3Test: Math.round(trainees.reduce((s, t) => s + t.tests.module3Test, 0) / count),
      finalExam: Math.round(trainees.reduce((s, t) => s + t.tests.finalExam, 0) / count),
    },
    trainees,
  };
}

export const INITIAL_COHORTS_DATA: CohortSummary[] = [
  // Wave 1: Mobility Account (13 Agents)
  buildOfficialCohort({
    sheetIndex: 1,
    spreadsheetId: '1daSzD8B5CK2feH92acO2ls08B09e31wj',
    account: 'Mobility',
    accountBadgeColor: '#06C167',
    name: 'Wave 1 (EOT) — 10-Day Training EOT Dashboard',
    code: 'W1',
    tabName: 'Main Sheet',
    trainer: 'Anwar',
    startDate: '2026-08-05',
    endDate: '2026-09-03',
    initialRP: 1.74,
    finalRP: 2.75,
    rpGain: 1.01,
    moduleCompletion: 80.1,
    attendanceCompletion: 71.5,
    agents: [
      { name: 'Nermine Abdelaty', id: '6176024', role: 'Level 3 Specialist', rp1: 2.38, rp2: 2.92, rp3: 3.22, rp4: 3.34, rp5: 4.00, initial: 2.38, final: 4.00, gain: 1.62, module: 100, attendance: 65, priority: 'Low' },
      { name: 'Fatma Abdelhalim', id: '5937562', role: 'Level 1 Associate', rp1: 2.25, rp2: 2.30, rp3: 2.40, rp4: 2.50, rp5: 2.60, initial: 2.25, final: 2.60, gain: 0.35, module: 100, attendance: 35, priority: 'High' },
      { name: 'Sahar Hussein', id: '6176057', role: 'Level 1 Associate', rp1: 1.80, rp2: 2.08, rp3: 1.97, rp4: 2.13, rp5: 2.39, initial: 1.80, final: 2.39, gain: 0.59, module: 61, attendance: 55, priority: 'Medium' },
      { name: 'Rahma Elsayed', id: '6176033', role: 'Level 1 Associate', rp1: 1.00, rp2: 1.25, rp3: 1.66, rp4: 2.09, rp5: 2.23, initial: 1.00, final: 2.23, gain: 1.23, module: 90, attendance: 95, priority: 'Medium' },
      { name: 'Nada Elkathery', id: '5806198', role: 'Level 1 Associate', rp1: 1.40, rp2: 1.85, rp3: 1.94, rp4: 2.10, rp5: 2.49, initial: 1.40, final: 2.49, gain: 1.09, module: 39, attendance: 75, priority: 'High' },
      { name: 'Christine Marcos', id: '5619401', role: 'Level 2 Specialist', rp1: 2.00, rp2: 2.55, rp3: 2.67, rp4: 2.92, rp5: 3.20, initial: 2.00, final: 3.20, gain: 1.20, module: 100, attendance: 70, priority: 'Low' },
      { name: 'Gehad Moursy', id: '6176008', role: 'Level 2 Specialist', rp1: 1.63, rp2: 1.88, rp3: 2.25, rp4: 2.54, rp5: 2.92, initial: 1.63, final: 2.92, gain: 1.29, module: 39, attendance: 95, priority: 'Medium' },
      { name: 'Omnia Mahmoud', id: '6176029', role: 'Level 1 Associate', rp1: 1.48, rp2: 1.93, rp3: 1.91, rp4: 2.23, rp5: 2.32, initial: 1.48, final: 2.32, gain: 0.84, module: 94, attendance: 65, priority: 'Medium' },
      { name: 'Reem Shafie', id: '6176038', role: 'Level 1 Associate', rp1: 1.35, rp2: 1.93, rp3: 1.89, rp4: 2.13, rp5: 2.57, initial: 1.35, final: 2.57, gain: 1.22, module: 100, attendance: 100, priority: 'Low' },
      { name: 'Madona Lotfy', id: '6176049', role: 'Level 2 Specialist', rp1: 2.17, rp2: 2.58, rp3: 2.57, rp4: 2.91, rp5: 3.17, initial: 2.17, final: 3.17, gain: 1.00, module: 44, attendance: 55, priority: 'High' },
      { name: 'Eslam Abdelhafeez', id: '6231068', role: 'Level 1 Associate', rp1: 1.50, rp2: 2.10, rp3: 2.14, rp4: 2.40, rp5: 2.68, initial: 1.50, final: 2.68, gain: 1.18, module: 100, attendance: 75, priority: 'Medium' },
      { name: 'Youssef Fouad', id: '6230910', role: 'Level 1 Associate', rp1: 1.37, rp2: 1.78, rp3: 1.86, rp4: 2.05, rp5: 2.21, initial: 1.37, final: 2.21, gain: 0.84, module: 100, attendance: 75, priority: 'High' },
      { name: 'Eslam Mohamed', id: '6231067', role: 'Level 1 Associate', rp1: 2.33, rp2: 2.52, rp3: 2.27, rp4: 2.65, rp5: 3.00, initial: 2.33, final: 3.00, gain: 0.67, module: 100, attendance: 70, priority: 'Medium' },
    ],
  }),

  // Wave 2: Mobility Account (17 Agents)
  buildOfficialCohort({
    sheetIndex: 2,
    spreadsheetId: '1L0VyV7RoloD_-KeHdIuIEvupvskoxmcB',
    account: 'Mobility',
    accountBadgeColor: '#06C167',
    name: 'Wave 2 (EOT) — 20-Day Program Performance',
    code: 'W2',
    tabName: 'Main Sheet',
    trainer: 'Anwar',
    startDate: '2026-09-10',
    endDate: '2026-10-14',
    initialRP: 1.87,
    finalRP: 2.90,
    rpGain: 1.04,
    moduleCompletion: 78.4,
    attendanceCompletion: 82.6,
    agents: [
      { name: 'Nada Ali', id: '5701505', role: 'Level 1 Associate', rp1: 1.43, rp2: 1.61, rp3: 1.87, rp4: 2.03, rp5: 2.51, initial: 1.43, final: 2.50, gain: 1.07, module: 100, attendance: 68, priority: 'High' },
      { name: 'Radwa Ali', id: '5741644', role: 'Level 1 Associate', rp1: 1.91, rp2: 1.88, rp3: 1.72, rp4: 2.14, rp5: 2.64, initial: 1.91, final: 2.44, gain: 0.53, module: 89, attendance: 98, priority: 'High' },
      { name: 'Mai Ismail', id: '5703816', role: 'Level 2 Specialist', rp1: 1.45, rp2: 1.89, rp3: 2.44, rp4: 2.44, rp5: 3.15, initial: 1.45, final: 3.11, gain: 1.66, module: 44, attendance: 93, priority: 'High' },
      { name: 'Mennatullah Sayed', id: '5701224', role: 'Level 2 Specialist', rp1: 2.06, rp2: 2.16, rp3: 2.37, rp4: 2.64, rp5: 3.29, initial: 2.06, final: 3.38, gain: 1.32, module: 61, attendance: 100, priority: 'High' },
      { name: 'Shorouk Abdelhafez', id: '5772881', role: 'Level 1 Associate', rp1: 1.48, rp2: 2.14, rp3: 1.76, rp4: 1.93, rp5: 2.36, initial: 1.48, final: 2.31, gain: 0.83, module: 61, attendance: 83, priority: 'High' },
      { name: 'Nehal Karamoukou', id: '5703819', role: 'Level 2 Specialist', rp1: 2.00, rp2: 2.33, rp3: 2.83, rp4: 2.40, rp5: 3.08, initial: 2.00, final: 3.13, gain: 1.13, module: 72, attendance: 90, priority: 'High' },
      { name: 'Shimaa Hussein', id: '5619399', role: 'Level 1 Associate', rp1: 1.00, rp2: 1.18, rp3: 1.21, rp4: 1.62, rp5: 1.64, initial: 1.00, final: 1.81, gain: 0.81, module: 67, attendance: 93, priority: 'High' },
      { name: 'Wessam Fawzy', id: '5620780', role: 'Level 1 Associate', rp1: 1.44, rp2: 1.76, rp3: 1.58, rp4: 1.39, rp5: 1.96, initial: 1.44, final: 1.88, gain: 0.44, module: 94, attendance: 88, priority: 'High' },
      { name: 'Rahma Amer', id: '5701245', role: 'Level 3 Specialist', rp1: 2.62, rp2: 2.84, rp3: 3.49, rp4: 3.28, rp5: 3.87, initial: 2.62, final: 4.15, gain: 1.53, module: 94, attendance: 100, priority: 'High' },
      { name: 'Walaa Ibrahim', id: '5701249', role: 'Level 3 Specialist', rp1: 2.89, rp2: 3.41, rp3: 3.74, rp4: 3.45, rp5: 4.29, initial: 2.89, final: 4.52, gain: 1.63, module: 83, attendance: 98, priority: 'High' },
      { name: 'Ashraqat Ahmed', id: '5505442', role: 'Level 3 Specialist', rp1: 1.97, rp2: 2.72, rp3: 2.86, rp4: 2.26, rp5: 2.92, initial: 1.97, final: 3.71, gain: 1.74, module: 89, attendance: 100, priority: 'High' },
      { name: 'Taghreed Maimon', id: '5553388', role: 'Level 1 Associate', rp1: 1.00, rp2: 1.16, rp3: 1.10, rp4: 1.15, rp5: 1.20, initial: 1.00, final: 1.25, gain: 0.25, module: 100, attendance: 80, priority: 'High' },
      { name: 'Alaa Ali', id: '5506275', role: 'Level 1 Associate', rp1: 2.04, rp2: 2.00, rp3: 2.00, rp4: 2.00, rp5: 2.00, initial: 2.04, final: 2.04, gain: 0.00, module: 100, attendance: 25, priority: 'High' },
      { name: 'Esraa Abdelhamid', id: '5619400', role: 'Level 1 Associate', rp1: 1.49, rp2: 1.26, rp3: 1.26, rp4: 1.26, rp5: 1.26, initial: 1.49, final: 1.26, gain: -0.23, module: 100, attendance: 15, priority: 'High' },
      { name: 'Yara Hassan', id: '5704380', role: 'Level 2 Specialist', rp1: 2.41, rp2: 2.30, rp3: 2.58, rp4: 2.40, rp5: 3.26, initial: 2.41, final: 3.35, gain: 0.94, module: 67, attendance: 83, priority: 'High' },
      { name: 'Habiba Abdelhafeez', id: '5701243', role: 'Level 2 Specialist', rp1: 2.16, rp2: 2.27, rp3: 2.10, rp4: 1.98, rp5: 2.52, initial: 2.16, final: 2.89, gain: 0.73, module: 67, attendance: 100, priority: 'High' },
      { name: 'Radwa Khalid Sayed', id: '5619506', role: 'Level 2 Specialist', rp1: 2.22, rp2: 2.66, rp3: 2.86, rp4: 2.16, rp5: 2.85, initial: 2.22, final: 3.15, gain: 0.93, module: 94, attendance: 95, priority: 'High' },
    ],
  }),

  // Wave 3: Teleco Account (16 Agents)
  buildOfficialCohort({
    sheetIndex: 3,
    spreadsheetId: '1wUsml9P0blF1KvKfYAW5SmpyfNON9iNL',
    account: 'Teleco',
    accountBadgeColor: '#3B82F6',
    name: 'Wave 3 (Perf Tracker) — TPS Performance Tracker',
    code: 'W3',
    tabName: 'Improvement Status',
    trainer: 'Lead Coach',
    startDate: '2026-08-18',
    endDate: '2026-09-25',
    initialRP: 3.03,
    finalRP: 3.85,
    rpGain: 0.82,
    moduleCompletion: 84.2,
    attendanceCompletion: 88.0,
    agents: [
      { name: 'Abdelrahman Ali Saber Ali', id: 'TP-301', role: 'Senior Care Specialist', rp1: 3.10, rp2: 3.30, rp3: 3.60, rp4: 4.00, rp5: 4.10, initial: 3.10, final: 4.10, gain: 1.00, module: 88, attendance: 92, priority: 'Low' },
      { name: 'Taher Khaled Mohamed', id: 'TP-302', role: 'Customer Specialist', rp1: 3.10, rp2: 3.45, rp3: 4.20, rp4: 4.50, rp5: 4.80, initial: 3.10, final: 4.80, gain: 1.70, module: 94, attendance: 96, priority: 'Low' },
      { name: 'Ali Mohamoud Shousha', id: 'TP-303', role: 'Technical Consultant', rp1: 2.90, rp2: 3.60, rp3: 4.30, rp4: 4.65, rp5: 4.80, initial: 2.90, final: 4.80, gain: 1.90, module: 91, attendance: 90, priority: 'Low' },
      { name: 'Ahmed Hussein Mohamed Kamel', id: 'TP-304', role: 'Customer Care', rp1: 2.30, rp2: 3.20, rp3: 4.10, rp4: 4.30, rp5: 4.40, initial: 2.30, final: 4.40, gain: 2.10, module: 85, attendance: 86, priority: 'Low' },
      { name: 'Abdelrahman Medhat Refaat', id: 'TP-305', role: 'Customer Care', rp1: 2.10, rp2: 2.70, rp3: 3.50, rp4: 3.95, rp5: 4.20, initial: 2.10, final: 4.20, gain: 2.10, module: 79, attendance: 82, priority: 'Low' },
      { name: 'Amr Mohamed', id: 'TP-306', role: 'Technical Support', rp1: 3.00, rp2: 3.15, rp3: 3.50, rp4: 3.75, rp5: 3.90, initial: 3.00, final: 3.90, gain: 0.90, module: 81, attendance: 84, priority: 'Medium' },
      { name: 'Hisham Zeinelabdeen', id: 'TP-307', role: 'Billing & Retention', rp1: 3.25, rp2: 3.40, rp3: 3.60, rp4: 3.75, rp5: 3.85, initial: 3.25, final: 3.85, gain: 0.60, module: 86, attendance: 90, priority: 'Medium' },
      { name: 'Abdullah Ahmed Abdullah Mohamed', id: 'TP-308', role: 'Network Support', rp1: 3.15, rp2: 3.30, rp3: 3.45, rp4: 3.65, rp5: 3.75, initial: 3.15, final: 3.75, gain: 0.60, module: 83, attendance: 88, priority: 'Medium' },
      { name: 'Maged Kamal Abdelbary Mostafa', id: 'TP-309', role: 'Customer Specialist', rp1: 3.20, rp2: 3.35, rp3: 3.55, rp4: 3.70, rp5: 3.80, initial: 3.20, final: 3.80, gain: 0.60, module: 84, attendance: 89, priority: 'Medium' },
      { name: 'Mohamed Abdelaziz Eid', id: 'TP-310', role: 'Technical Support', rp1: 3.30, rp2: 3.45, rp3: 3.60, rp4: 3.75, rp5: 3.85, initial: 3.30, final: 3.85, gain: 0.55, module: 86, attendance: 91, priority: 'Medium' },
      { name: 'Omar Hossam Hassan Hosny', id: 'TP-311', role: 'Subscriber Care', rp1: 3.10, rp2: 3.25, rp3: 3.40, rp4: 3.55, rp5: 3.65, initial: 3.10, final: 3.65, gain: 0.55, module: 82, attendance: 86, priority: 'Medium' },
      { name: 'Mostafa Mahmoud Abdelmoamen', id: 'TP-312', role: 'Billing Specialist', rp1: 3.35, rp2: 3.50, rp3: 3.65, rp4: 3.75, rp5: 3.85, initial: 3.35, final: 3.85, gain: 0.50, module: 88, attendance: 92, priority: 'Medium' },
      { name: 'Yasmine Saad Hussein Rizk', id: 'TP-313', role: 'Customer Care', rp1: 3.20, rp2: 3.35, rp3: 3.50, rp4: 3.60, rp5: 3.70, initial: 3.20, final: 3.70, gain: 0.50, module: 85, attendance: 89, priority: 'Medium' },
      { name: 'Dina Ibrahim Mohamed Elsayed', id: 'TP-314', role: 'Escalations Agent', rp1: 3.40, rp2: 3.50, rp3: 3.60, rp4: 3.70, rp5: 3.75, initial: 3.40, final: 3.75, gain: 0.35, module: 84, attendance: 87, priority: 'Medium' },
      { name: 'Karim Tarek El-Sayed', id: 'TP-315', role: 'Tier 1 Support', rp1: 2.95, rp2: 3.00, rp3: 3.05, rp4: 3.10, rp5: 3.15, initial: 2.95, final: 3.15, gain: 0.20, module: 76, attendance: 80, priority: 'High' },
      { name: 'Nourhan Adel Mahmoud', id: 'TP-316', role: 'Tier 1 Support', rp1: 3.05, rp2: 3.00, rp3: 3.02, rp4: 3.05, rp5: 3.05, initial: 3.05, final: 3.05, gain: 0.00, module: 75, attendance: 86, priority: 'High' },
    ],
  }),

  // Wave 4: Travel Account (18 Agents)
  buildOfficialCohort({
    sheetIndex: 4,
    spreadsheetId: '1EOCX5M_UlNIvM6ccd6_-xVRJIuvjctkO',
    account: 'Travel',
    accountBadgeColor: '#8B5CF6',
    name: 'Wave 4 (Waves 65–66) — TPS Role Play Tracker',
    code: 'W4',
    tabName: 'Daily RP Tracker',
    trainer: 'Operations Trainer',
    startDate: '2026-07-15',
    endDate: '2026-08-28',
    initialRP: 3.20,
    finalRP: 3.92,
    rpGain: 0.72,
    moduleCompletion: 91.4,
    attendanceCompletion: 89.5,
    agents: [
      { name: 'Kareem Mahmoud El-Husseiny', id: 'TP-401', role: 'Wave 65 Reservations', rp1: 3.20, rp2: 3.65, rp3: 3.95, rp4: 4.15, rp5: 4.40, initial: 3.20, final: 4.40, gain: 1.20, module: 95, attendance: 94, priority: 'Low' },
      { name: 'Nour Emad El-Wakil', id: 'TP-402', role: 'Wave 65 Ticketing', rp1: 3.00, rp2: 3.45, rp3: 3.80, rp4: 4.00, rp5: 4.20, initial: 3.00, final: 4.20, gain: 1.20, module: 92, attendance: 91, priority: 'Low' },
      { name: 'Sherif Hany Abdelrahim', id: 'TP-403', role: 'Wave 66 Rebooking', rp1: 3.40, rp2: 3.70, rp3: 4.00, rp4: 4.30, rp5: 4.50, initial: 3.40, final: 4.50, gain: 1.10, module: 96, attendance: 96, priority: 'Low' },
      { name: 'Salma Tarek El-Gendy', id: 'TP-404', role: 'Wave 65 VIP Desk', rp1: 3.50, rp2: 3.75, rp3: 3.95, rp4: 4.15, rp5: 4.30, initial: 3.50, final: 4.30, gain: 0.80, module: 94, attendance: 93, priority: 'Low' },
      { name: 'Habiba Tamer Shawkat', id: 'TP-405', role: 'Wave 66 Reservations', rp1: 2.90, rp2: 3.30, rp3: 3.60, rp4: 3.75, rp5: 3.90, initial: 2.90, final: 3.90, gain: 1.00, module: 88, attendance: 88, priority: 'Medium' },
      { name: 'Ziad Walid El-Shazly', id: 'TP-406', role: 'Wave 65 Disruptions', rp1: 3.25, rp2: 3.50, rp3: 3.70, rp4: 3.85, rp5: 4.00, initial: 3.25, final: 4.00, gain: 0.75, module: 92, attendance: 90, priority: 'Medium' },
      { name: 'Mariam Osama Farouk', id: 'TP-407', role: 'Wave 65 Ticketing', rp1: 3.30, rp2: 3.50, rp3: 3.75, rp4: 3.90, rp5: 4.00, initial: 3.30, final: 4.00, gain: 0.70, module: 93, attendance: 91, priority: 'Medium' },
      { name: 'Youssef Ashraf Nabil', id: 'TP-408', role: 'Wave 65 Reservations', rp1: 3.15, rp2: 3.40, rp3: 3.60, rp4: 3.75, rp5: 3.90, initial: 3.15, final: 3.90, gain: 0.75, module: 91, attendance: 89, priority: 'Medium' },
      { name: 'Farah Khaled Mansour', id: 'TP-409', role: 'Wave 65 Baggage Care', rp1: 3.10, rp2: 3.35, rp3: 3.55, rp4: 3.70, rp5: 3.85, initial: 3.10, final: 3.85, gain: 0.75, module: 90, attendance: 88, priority: 'Medium' },
      { name: 'Hassan Sherif El-Masry', id: 'TP-410', role: 'Wave 66 Ticketing', rp1: 3.35, rp2: 3.55, rp3: 3.70, rp4: 3.85, rp5: 3.95, initial: 3.35, final: 3.95, gain: 0.60, module: 92, attendance: 90, priority: 'Medium' },
      { name: 'Aya Mahmoud Soliman', id: 'TP-411', role: 'Wave 66 Reservations', rp1: 3.20, rp2: 3.40, rp3: 3.60, rp4: 3.75, rp5: 3.85, initial: 3.20, final: 3.85, gain: 0.65, module: 91, attendance: 89, priority: 'Medium' },
      { name: 'Seif Eldin Magdy', id: 'TP-412', role: 'Wave 66 Rebooking', rp1: 3.25, rp2: 3.45, rp3: 3.65, rp4: 3.80, rp5: 3.90, initial: 3.25, final: 3.90, gain: 0.65, module: 93, attendance: 91, priority: 'Medium' },
      { name: 'Nadine Hesham Bakr', id: 'TP-413', role: 'Wave 66 Loyalty Desk', rp1: 3.30, rp2: 3.50, rp3: 3.65, rp4: 3.80, rp5: 3.90, initial: 3.30, final: 3.90, gain: 0.60, module: 92, attendance: 90, priority: 'Medium' },
      { name: 'Tarek Amr El-Desouky', id: 'TP-414', role: 'Wave 65 Reservations', rp1: 3.15, rp2: 3.35, rp3: 3.50, rp4: 3.65, rp5: 3.80, initial: 3.15, final: 3.80, gain: 0.65, module: 90, attendance: 88, priority: 'Medium' },
      { name: 'Rana Wael Abdelmageed', id: 'TP-415', role: 'Wave 66 Ticketing', rp1: 3.20, rp2: 3.40, rp3: 3.55, rp4: 3.70, rp5: 3.80, initial: 3.20, final: 3.80, gain: 0.60, module: 91, attendance: 89, priority: 'Medium' },
      { name: 'Mostafa Hany El-Kholy', id: 'TP-416', role: 'Wave 66 Reservations', rp1: 3.30, rp2: 3.45, rp3: 3.60, rp4: 3.70, rp5: 3.80, initial: 3.30, final: 3.80, gain: 0.50, module: 91, attendance: 89, priority: 'Medium' },
      { name: 'Omar Yasser El-Banna', id: 'TP-417', role: 'Wave 66 Customer Care', rp1: 2.80, rp2: 3.05, rp3: 3.20, rp4: 3.30, rp5: 3.35, initial: 2.80, final: 3.35, gain: 0.55, module: 84, attendance: 80, priority: 'High' },
      { name: 'Menna Khaled El-Sawy', id: 'TP-418', role: 'Wave 65 Customer Care', rp1: 3.25, rp2: 3.20, rp3: 3.18, rp4: 3.15, rp5: 3.16, initial: 3.25, final: 3.16, gain: -0.09, module: 89, attendance: 85, priority: 'High' },
    ],
  }),

  // Wave 5: Travel Account (6 Agents)
  buildOfficialCohort({
    sheetIndex: 5,
    spreadsheetId: '1UefbamxCifwdUSkPlxBWntUgKHGLhaEz',
    account: 'Travel',
    accountBadgeColor: '#8B5CF6',
    name: 'Wave 5 (Wave 66 Ops) — Language & R&T Training Report',
    code: 'W5',
    tabName: 'Main Sheet',
    trainer: 'Mai Medhat Awad',
    startDate: '2026-06-13',
    endDate: '2026-07-20',
    initialRP: 3.80,
    finalRP: 4.55,
    rpGain: 0.75,
    moduleCompletion: 92.6,
    attendanceCompletion: 94.0,
    agents: [
      { name: 'Ahmed Essam Elsayed Mostafa', id: '6372995', role: 'R&T Specialist', rp1: 4.20, rp2: 4.45, rp3: 4.65, rp4: 4.80, rp5: 4.90, initial: 4.20, final: 4.90, gain: 0.70, module: 98.4, attendance: 98, priority: 'Low' },
      { name: 'Mohamed Elhamy Faisal Hashem', id: '6373022', role: 'R&T Specialist', rp1: 3.80, rp2: 4.05, rp3: 4.25, rp4: 4.40, rp5: 4.50, initial: 3.80, final: 4.50, gain: 0.70, module: 89.6, attendance: 92, priority: 'Low' },
      { name: 'Nada Hamed Saad Ibrahim', id: '6372997', role: 'R&T Specialist', rp1: 3.60, rp2: 3.90, rp3: 4.15, rp4: 4.35, rp5: 4.50, initial: 3.60, final: 4.50, gain: 0.90, module: 90.2, attendance: 94, priority: 'Low' },
      { name: 'Sama Sayed Abdelaal Ali', id: '6373047', role: 'R&T Specialist', rp1: 4.00, rp2: 4.30, rp3: 4.55, rp4: 4.75, rp5: 4.90, initial: 4.00, final: 4.90, gain: 0.90, module: 94.3, attendance: 96, priority: 'Low' },
      { name: 'Zeinab Ahmed Elgabaly', id: '5518686', role: 'R&T Specialist', rp1: 3.50, rp2: 3.75, rp3: 3.95, rp4: 4.10, rp5: 4.20, initial: 3.50, final: 4.20, gain: 0.70, module: 86.1, attendance: 90, priority: 'Medium' },
      { name: 'Zeinab Tarek Fawzy Mohamed', id: '3868260', role: 'R&T Specialist', rp1: 3.70, rp2: 3.90, rp3: 4.05, rp4: 4.20, rp5: 4.30, initial: 3.70, final: 4.30, gain: 0.60, module: 97.0, attendance: 94, priority: 'Medium' },
    ],
  }),

  // Wave 6: Travel Account (12 Agents)
  buildOfficialCohort({
    sheetIndex: 6,
    spreadsheetId: '16-xMw5namKzVluHQFXhjPBsKanql4Cl5',
    account: 'Travel',
    accountBadgeColor: '#8B5CF6',
    name: 'Wave 6 (Monitors) — Roleplays Monitors Daily Report Waves 273–277',
    code: 'W6',
    tabName: 'Daily Monitors',
    trainer: 'Quality Monitors',
    startDate: '2026-09-01',
    endDate: '2026-10-14',
    initialRP: 3.20,
    finalRP: 3.78,
    rpGain: 0.58,
    moduleCompletion: 91.7,
    attendanceCompletion: 92.5,
    agents: [
      { name: 'Mahmoud Reda El-Shenawy', id: 'W273-01', role: 'Travel Care QA', rp1: 3.40, rp2: 3.60, rp3: 3.85, rp4: 4.00, rp5: 4.15, initial: 3.40, final: 4.15, gain: 0.75, module: 95, attendance: 95, priority: 'Low' },
      { name: 'Heba Salah El-Din', id: 'W273-02', role: 'Ticketing Desk', rp1: 3.30, rp2: 3.55, rp3: 3.80, rp4: 3.95, rp5: 4.10, initial: 3.30, final: 4.10, gain: 0.80, module: 94, attendance: 94, priority: 'Low' },
      { name: 'Ibrahim Adel Rostom', id: 'W274-01', role: 'Rebooking Specialist', rp1: 3.35, rp2: 3.55, rp3: 3.75, rp4: 3.90, rp5: 4.05, initial: 3.35, final: 4.05, gain: 0.70, module: 94, attendance: 94, priority: 'Low' },
      { name: 'Sara Mamdouh Khalil', id: 'W274-02', role: 'Loyalty Support', rp1: 3.25, rp2: 3.50, rp3: 3.70, rp4: 3.85, rp5: 4.00, initial: 3.25, final: 4.00, gain: 0.75, module: 93, attendance: 93, priority: 'Low' },
      { name: 'Khaled Walid Tantawy', id: 'W275-01', role: 'Core Travel Care', rp1: 3.20, rp2: 3.40, rp3: 3.55, rp4: 3.70, rp5: 3.80, initial: 3.20, final: 3.80, gain: 0.60, module: 92, attendance: 93, priority: 'Medium' },
      { name: 'Noha Gamal El-Deeb', id: 'W275-02', role: 'Core Travel Care', rp1: 3.15, rp2: 3.35, rp3: 3.50, rp4: 3.65, rp5: 3.75, initial: 3.15, final: 3.75, gain: 0.60, module: 91, attendance: 92, priority: 'Medium' },
      { name: 'Amgad Fouad El-Sayed', id: 'W275-03', role: 'Disruption Desk', rp1: 3.10, rp2: 3.30, rp3: 3.45, rp4: 3.60, rp5: 3.70, initial: 3.10, final: 3.70, gain: 0.60, module: 91, attendance: 92, priority: 'Medium' },
      { name: 'Laila Hany Badr', id: 'W276-01', role: 'Reservations Care', rp1: 3.20, rp2: 3.40, rp3: 3.55, rp4: 3.65, rp5: 3.75, initial: 3.20, final: 3.75, gain: 0.55, module: 92, attendance: 92, priority: 'Medium' },
      { name: 'Yasser Tamer Helmy', id: 'W276-02', role: 'Reservations Care', rp1: 3.15, rp2: 3.30, rp3: 3.45, rp4: 3.55, rp5: 3.65, initial: 3.15, final: 3.65, gain: 0.50, module: 90, attendance: 91, priority: 'Medium' },
      { name: 'Rania Sherif Gabr', id: 'W277-01', role: 'Baggage & Claims', rp1: 3.10, rp2: 3.25, rp3: 3.40, rp4: 3.55, rp5: 3.65, initial: 3.10, final: 3.65, gain: 0.55, module: 90, attendance: 92, priority: 'Medium' },
      { name: 'Wael Hossam Zaki', id: 'W277-02', role: 'Ticketing Desk', rp1: 3.20, rp2: 3.35, rp3: 3.45, rp4: 3.55, rp5: 3.60, initial: 3.20, final: 3.60, gain: 0.40, module: 90, attendance: 92, priority: 'Medium' },
      { name: 'Basma Adel El-Refai', id: 'W277-03', role: 'Core Travel Care', rp1: 3.00, rp2: 3.05, rp3: 3.10, rp4: 3.12, rp5: 3.16, initial: 3.00, final: 3.16, gain: 0.16, module: 88, attendance: 90, priority: 'High' },
    ],
  }),
];
