import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CohortSummary, Trainee, RubricBreakdown } from '../types';

/**
 * Extracts Google Sheet ID from raw user input (URL or plain ID)
 */
export function extractGoogleSheetId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return trimmed;
}

/**
 * Fetches a single sheet/tab from a Google Sheet using the Google Visualization CSV endpoint.
 * Works seamlessly for any Google Sheet that has "Anyone with the link can view" permissions.
 */
export async function fetchGoogleSheetTabCsv(
  spreadsheetId: string,
  sheetName: string,
  gid?: string
): Promise<string> {
  let url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    sheetName
  )}`;
  if (gid) {
    url += `&gid=${gid}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch tab "${sheetName}": HTTP ${response.status} (${response.statusText}). Ensure sheet sharing is set to "Anyone with the link can view".`
    );
  }

  const text = await response.text();
  if (text.includes('<!DOCTYPE html>') || text.includes('accounts.google.com')) {
    throw new Error(
      `Access denied for tab "${sheetName}". Please ensure the Google Sheet is shared with "Anyone with the link can view".`
    );
  }

  return text;
}

/**
 * Helper to safely extract numeric values from raw row objects with multiple potential column aliases
 */
function findNumber(row: Record<string, any>, aliases: string[], defaultValue = 75): number {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const lowerAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of keys) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === lowerAlias || cleanKey.includes(lowerAlias)) {
        const val = parseFloat(String(row[key]).replace(/[^0-9.]/g, ''));
        if (!isNaN(val)) {
          return Math.min(100, Math.max(0, val));
        }
      }
    }
  }
  return defaultValue;
}

function findString(row: Record<string, any>, aliases: string[], defaultValue = ''): string {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const lowerAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of keys) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === lowerAlias || cleanKey.includes(lowerAlias)) {
        const val = String(row[key]).trim();
        if (val) return val;
      }
    }
  }
  return defaultValue;
}

/**
 * Parses raw CSV text or JSON rows into a standardized CohortSummary
 */
export function parseCohortData(
  rawData: Array<Record<string, any>>,
  sheetIndex: number,
  sheetTabName: string,
  trainerFallback = 'Lead Trainer'
): CohortSummary {
  if (!rawData || rawData.length === 0) {
    throw new Error(`Sheet tab "${sheetTabName}" has no data rows.`);
  }

  const code = `C${sheetIndex}`;
  const cohortName = `Cohort ${sheetIndex} - ${sheetTabName}`;
  const trainer = findString(rawData[0], ['trainer', 'instructor', 'facilitator', 'lead'], trainerFallback);

  const trainees: Trainee[] = rawData.map((row, idx) => {
    const name = findString(row, ['name', 'traineename', 'learner', 'student', 'participant', 'employee'], `Trainee ${sheetIndex}-${idx + 1}`);
    const email = findString(row, ['email', 'emailaddress', 'traineeemail'], `${name.toLowerCase().replace(/\s+/g, '.')}@training.internal`);
    const role = findString(row, ['role', 'title', 'position', 'jobtitle'], 'Sales Professional');

    // Roleplay scores (0-100)
    const rp1 = findNumber(row, ['rp1', 'discovery', 'roleplay1', 'rp1discovery', 'needsanalysis'], 78);
    const rp2 = findNumber(row, ['rp2', 'objection', 'roleplay2', 'rp2objection', 'objectionhandling'], 74);
    const rp3 = findNumber(row, ['rp3', 'pitch', 'roleplay3', 'rp3valuepitch', 'productpitch', 'demo'], 80);
    const rp4 = findNumber(row, ['rp4', 'deescalation', 'roleplay4', 'rp4deescalation', 'difficultcustomer'], 82);
    const rp5 = findNumber(row, ['rp5', 'closing', 'roleplay5', 'rp5closing', 'negotiation'], 76);

    const rpAvg = Math.round((rp1 + rp2 + rp3 + rp4 + rp5) / 5);

    // Rubric breakdown (0-100)
    const comm = findNumber(row, ['communication', 'comm', 'clarity', 'presence'], Math.min(100, Math.round(rpAvg * 1.02)));
    const prod = findNumber(row, ['productknowledge', 'product', 'knowledge'], Math.min(100, Math.round(rpAvg * 0.98)));
    const listen = findNumber(row, ['activelistening', 'listening', 'empathy'], Math.min(100, Math.round(rpAvg * 1.01)));
    const obj = findNumber(row, ['objectionhandling', 'objectionres', 'objectionskill'], rp2);
    const ctrl = findNumber(row, ['callcontrol', 'control', 'pacing'], Math.min(100, Math.round(rpAvg * 0.99)));

    // Test scores (0-100)
    const tBase = findNumber(row, ['baseline', 'pretest', 'baselinetest', 'pretraining'], 68);
    const t1 = findNumber(row, ['module1', 'mod1', 'test1', 'producttest'], 84);
    const t2 = findNumber(row, ['module2', 'mod2', 'test2', 'methodology'], 82);
    const t3 = findNumber(row, ['module3', 'mod3', 'test3', 'scenarios'], 86);
    const tFinal = findNumber(row, ['finalexam', 'finaltest', 'exam', 'certificationtest'], 85);

    const testAvg = Math.round((tBase + t1 + t2 + t3 + tFinal) / 5);
    const overall = Math.round(rpAvg * 0.5 + testAvg * 0.5);

    let status: Trainee['status'] = 'Ready';
    if (overall < 70 || rpAvg < 65 || testAvg < 65) {
      status = 'Remediation Needed';
    } else if (overall < 76 || rpAvg < 72 || testAvg < 72) {
      status = 'At Risk';
    } else if (overall < 84) {
      status = 'On Track';
    } else {
      status = 'Ready';
    }

    const notes = findString(row, ['notes', 'feedback', 'evaluatornotes', 'comments'], 'Completed all simulation modules with consistent rubric marks.');
    const recs = [
      rp2 < 75 ? 'Recommended targeted objection sparring session' : 'Solid objection handling demonstrated',
      testAvg < 75 ? 'Module review suggested before live customer deployment' : 'High retention on core curriculum'
    ];

    const accountMap: Record<number, 'Mobility' | 'Teleco' | 'Travel'> = {
      1: 'Mobility',
      2: 'Mobility',
      3: 'Teleco',
      4: 'Travel',
      5: 'Travel',
      6: 'Travel',
    };
    const account = accountMap[sheetIndex] || 'Mobility';
    const initialRP = Number((rp1 / 20).toFixed(2));
    const finalRP = Number((rp5 / 20).toFixed(2));
    const rpGain = Number((finalRP - initialRP).toFixed(2));
    const priority: 'High' | 'Medium' | 'Low' =
      status === 'Remediation Needed' || status === 'At Risk'
        ? 'High'
        : status === 'On Track'
        ? 'Medium'
        : 'Low';

    return {
      id: `${code}-T${String(idx + 1).padStart(2, '0')}`,
      name,
      email,
      account,
      cohortId: code,
      cohortName,
      trainer,
      role,
      startDate: '2026-01-01',
      overallScore: overall,
      initialRP,
      finalRP,
      rpGain,
      moduleComp: testAvg,
      attendanceComp: Math.min(100, Math.round(overall * 1.02)),
      priority,
      status,
      roleplays: {
        rp1Discovery: rp1,
        rp2Objection: rp2,
        rp3ValuePitch: rp3,
        rp4Deescalation: rp4,
        rp5Closing: rp5,
        average: rpAvg,
        passStatus: rpAvg >= 75 ? 'Pass' : rpAvg >= 68 ? 'Borderline' : 'Remediate',
        rubric: {
          communication: comm,
          productKnowledge: prod,
          activeListening: listen,
          objectionHandling: obj,
          callControl: ctrl,
        },
        evaluatorNotes: notes,
      },
      tests: {
        baselineTest: tBase,
        module1Test: t1,
        module2Test: t2,
        module3Test: t3,
        finalExam: tFinal,
        average: testAvg,
        passStatus: testAvg >= 80 ? 'Certified' : testAvg >= 72 ? 'Passed' : 'Retake Required',
        attemptsCount: testAvg < 75 ? 2 : 1,
      },
      recommendations: recs,
    };
  });

  const count = trainees.length;
  const avgRoleplayScore = Math.round(
    trainees.reduce((acc, t) => acc + t.roleplays.average, 0) / count
  );
  const avgTestScore = Math.round(
    trainees.reduce((acc, t) => acc + t.tests.average, 0) / count
  );
  const avgOverallScore = Math.round(
    trainees.reduce((acc, t) => acc + t.overallScore, 0) / count
  );

  const roleplayPassRate = Math.round(
    (trainees.filter((t) => t.roleplays.average >= 75).length / count) * 100
  );
  const testPassRate = Math.round(
    (trainees.filter((t) => t.tests.average >= 75).length / count) * 100
  );
  const certificationRate = Math.round(
    (trainees.filter((t) => t.status === 'Ready' || (t.overallScore >= 80 && t.roleplays.average >= 75 && t.tests.average >= 75)).length / count) * 100
  );
  const atRiskCount = trainees.filter(
    (t) => t.status === 'At Risk' || t.status === 'Remediation Needed'
  ).length;

  const topSorted = [...trainees].sort((a, b) => b.overallScore - a.overallScore);

  const rubricAverages: RubricBreakdown = {
    communication: Math.round(
      trainees.reduce((acc, t) => acc + t.roleplays.rubric.communication, 0) / count
    ),
    productKnowledge: Math.round(
      trainees.reduce((acc, t) => acc + t.roleplays.rubric.productKnowledge, 0) / count
    ),
    activeListening: Math.round(
      trainees.reduce((acc, t) => acc + t.roleplays.rubric.activeListening, 0) / count
    ),
    objectionHandling: Math.round(
      trainees.reduce((acc, t) => acc + t.roleplays.rubric.objectionHandling, 0) / count
    ),
    callControl: Math.round(
      trainees.reduce((acc, t) => acc + t.roleplays.rubric.callControl, 0) / count
    ),
  };

  const roleplayAverages = {
    rp1Discovery: Math.round(
      trainees.reduce((acc, t) => acc + t.roleplays.rp1Discovery, 0) / count
    ),
    rp2Objection: Math.round(
      trainees.reduce((acc, t) => acc + t.roleplays.rp2Objection, 0) / count
    ),
    rp3ValuePitch: Math.round(
      trainees.reduce((acc, t) => acc + t.roleplays.rp3ValuePitch, 0) / count
    ),
    rp4Deescalation: Math.round(
      trainees.reduce((acc, t) => acc + t.roleplays.rp4Deescalation, 0) / count
    ),
    rp5Closing: Math.round(
      trainees.reduce((acc, t) => acc + t.roleplays.rp5Closing, 0) / count
    ),
  };

  const testAverages = {
    baselineTest: Math.round(
      trainees.reduce((acc, t) => acc + t.tests.baselineTest, 0) / count
    ),
    module1Test: Math.round(
      trainees.reduce((acc, t) => acc + t.tests.module1Test, 0) / count
    ),
    module2Test: Math.round(
      trainees.reduce((acc, t) => acc + t.tests.module2Test, 0) / count
    ),
    module3Test: Math.round(
      trainees.reduce((acc, t) => acc + t.tests.module3Test, 0) / count
    ),
    finalExam: Math.round(
      trainees.reduce((acc, t) => acc + t.tests.finalExam, 0) / count
    ),
  };

  const sheetIds: Record<number, string> = {
    1: '1daSzD8B5CK2feH92acO2ls08B09e31wj',
    2: '1L0VyV7RoloD_-KeHdIuIEvupvskoxmcB',
    3: '1wUsml9P0blF1KvKfYAW5SmpyfNON9iNL',
    4: '1EOCX5M_UlNIvM6ccd6_-xVRJIuvjctkO',
    5: '1UefbamxCifwdUSkPlxBWntUgKHGLhaEz',
    6: '16-xMw5namKzVluHQFXhjPBsKanql4Cl5',
  };
  const account: 'Mobility' | 'Teleco' | 'Travel' =
    sheetIndex <= 2 ? 'Mobility' : sheetIndex === 3 ? 'Teleco' : 'Travel';
  const accountBadgeColor =
    account === 'Mobility' ? '#06C167' : account === 'Teleco' ? '#3B82F6' : '#8B5CF6';
  const initialRP = Number((roleplayAverages.rp1Discovery / 20).toFixed(2));
  const finalRP = Number((roleplayAverages.rp5Closing / 20).toFixed(2));

  return {
    id: `cohort-${sheetIndex}`,
    sheetIndex,
    spreadsheetId: sheetIds[sheetIndex] || sheetIds[1],
    account,
    accountBadgeColor,
    name: cohortName,
    code,
    tabName: sheetTabName,
    trainer,
    traineeCount: count,
    startDate: '2026-01-01',
    endDate: '2026-03-01',
    initialRP,
    finalRP,
    rpGain: Number((finalRP - initialRP).toFixed(2)),
    moduleCompletion: avgTestScore,
    attendanceCompletion: Math.min(100, Math.round(avgOverallScore * 1.02)),
    avgRoleplayScore,
    avgTestScore,
    avgOverallScore,
    roleplayPassRate,
    testPassRate,
    certificationRate,
    atRiskCount,
    topPerformer: {
      name: topSorted[0]?.name || 'N/A',
      score: topSorted[0]?.overallScore || 0,
    },
    rubricAverages,
    roleplayAverages,
    testAverages,
    trainees,
  };
}

/**
 * Parses raw CSV string for a tab
 */
export function parseCsvTextForTab(csvText: string, sheetIndex: number, sheetTabName: string): CohortSummary {
  const result = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors && result.errors.length > 0 && (!result.data || result.data.length === 0)) {
    throw new Error(`CSV Parsing error for ${sheetTabName}: ${result.errors[0]?.message}`);
  }

  return parseCohortData(result.data, sheetIndex, sheetTabName);
}

/**
 * Parses an Excel Workbook (.xlsx) with 6 sheets
 */
export async function parseExcelWorkbook(file: File): Promise<CohortSummary[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error('The uploaded Excel workbook contains no sheets.');
  }

  const cohorts: CohortSummary[] = [];

  for (let i = 0; i < Math.min(6, sheetNames.length); i++) {
    const tabName = sheetNames[i];
    const worksheet = workbook.Sheets[tabName];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

    if (jsonRows.length > 0) {
      const cohort = parseCohortData(jsonRows, i + 1, tabName);
      cohorts.push(cohort);
    }
  }

  if (cohorts.length === 0) {
    throw new Error('No valid trainee rows found in the uploaded workbook.');
  }

  return cohorts;
}

/**
 * Generates and triggers download of a standardized 6-sheet Excel Template
 */
export function downloadSixSheetExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  for (let i = 1; i <= 6; i++) {
    const sheetName = `Cohort ${i}`;
    const sampleRows = [
      {
        'Trainee Name': `Alex Johnson (Cohort ${i})`,
        'Email': `alex.c${i}@company.com`,
        'Role': 'Account Executive',
        'Trainer': i % 2 === 0 ? 'Marcus Vance' : 'Sarah Jenkins',
        'RP 1 Discovery': 84,
        'RP 2 Objection': 78,
        'RP 3 Value Pitch': 82,
        'RP 4 De-escalation': 88,
        'RP 5 Closing': 80,
        'Communication': 85,
        'Product Knowledge': 82,
        'Active Listening': 86,
        'Objection Handling': 79,
        'Call Control': 83,
        'Baseline Test': 68,
        'Module 1 Test': 86,
        'Module 2 Test': 84,
        'Module 3 Test': 88,
        'Final Exam': 87,
        'Notes': `Strong engagement throughout Cohort ${i} curriculum.`
      },
      {
        'Trainee Name': `Sam Taylor (Cohort ${i})`,
        'Email': `sam.c${i}@company.com`,
        'Role': 'Commercial SDR',
        'Trainer': i % 2 === 0 ? 'Marcus Vance' : 'Sarah Jenkins',
        'RP 1 Discovery': 89,
        'RP 2 Objection': 82,
        'RP 3 Value Pitch': 85,
        'RP 4 De-escalation': 90,
        'RP 5 Closing': 84,
        'Communication': 90,
        'Product Knowledge': 85,
        'Active Listening': 92,
        'Objection Handling': 83,
        'Call Control': 87,
        'Baseline Test': 72,
        'Module 1 Test': 90,
        'Module 2 Test': 88,
        'Module 3 Test': 91,
        'Final Exam': 90,
        'Notes': 'Excellent objection turnaround and crisp pacing.'
      },
      {
        'Trainee Name': `Morgan Lee (Cohort ${i})`,
        'Email': `morgan.c${i}@company.com`,
        'Role': 'Sales Engineer',
        'Trainer': i % 2 === 0 ? 'Marcus Vance' : 'Sarah Jenkins',
        'RP 1 Discovery': 79,
        'RP 2 Objection': 72,
        'RP 3 Value Pitch': 88,
        'RP 4 De-escalation': 76,
        'RP 5 Closing': 77,
        'Communication': 80,
        'Product Knowledge': 95,
        'Active Listening': 78,
        'Objection Handling': 73,
        'Call Control': 79,
        'Baseline Test': 78,
        'Module 1 Test': 94,
        'Module 2 Test': 91,
        'Module 3 Test': 93,
        'Final Exam': 94,
        'Notes': 'High product architecture depth; work on dialogue pauses.'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, 'training_cohorts_6_sheets_template.xlsx');
}

/**
 * Exports current 6 cohorts data to Excel
 */
export function exportCurrentCohortsToExcel(cohorts: CohortSummary[]): void {
  const wb = XLSX.utils.book_new();

  // 1. Summary sheet comparing all 6 cohorts
  const summaryRows = cohorts.map((c) => ({
    'Sheet Index': c.sheetIndex,
    'Cohort Name': c.name,
    'Tab Name': c.tabName,
    'Trainer': c.trainer,
    'Trainee Count': c.traineeCount,
    'Avg Roleplay Score': c.avgRoleplayScore,
    'Avg Test Score': c.avgTestScore,
    'Overall Combined Score': c.avgOverallScore,
    'Roleplay Pass Rate (%)': c.roleplayPassRate,
    'Test Pass Rate (%)': c.testPassRate,
    'Certification Readiness (%)': c.certificationRate,
    'At Risk Count': c.atRiskCount,
    'Top Performer': `${c.topPerformer.name} (${c.topPerformer.score}%)`
  }));
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Cohort Comparison Summary');

  // 2. Individual sheets for each of the 6 cohorts
  cohorts.forEach((c) => {
    const traineeRows = c.trainees.map((t) => ({
      'Trainee ID': t.id,
      'Name': t.name,
      'Email': t.email,
      'Role': t.role,
      'Status': t.status,
      'Overall Score': t.overallScore,
      'RP Average': t.roleplays.average,
      'RP 1 Discovery': t.roleplays.rp1Discovery,
      'RP 2 Objection': t.roleplays.rp2Objection,
      'RP 3 Value Pitch': t.roleplays.rp3ValuePitch,
      'RP 4 De-escalation': t.roleplays.rp4Deescalation,
      'RP 5 Closing': t.roleplays.rp5Closing,
      'Test Average': t.tests.average,
      'Baseline Test': t.tests.baselineTest,
      'Module 1 Test': t.tests.module1Test,
      'Module 2 Test': t.tests.module2Test,
      'Module 3 Test': t.tests.module3Test,
      'Final Exam': t.tests.finalExam,
      'Communication Rubric': t.roleplays.rubric.communication,
      'Product Knowledge Rubric': t.roleplays.rubric.productKnowledge,
      'Active Listening Rubric': t.roleplays.rubric.activeListening,
      'Objection Handling Rubric': t.roleplays.rubric.objectionHandling,
      'Call Control Rubric': t.roleplays.rubric.callControl,
      'Trainer Notes': t.roleplays.evaluatorNotes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(traineeRows);
    XLSX.utils.book_append_sheet(wb, ws, c.tabName || `Cohort ${c.sheetIndex}`);
  });

  XLSX.writeFile(wb, `all_6_cohorts_performance_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Computes every wave's traineeCount, initialRP, finalRP, rpGain, moduleCompletion,
 * attendanceCompletion, avgRoleplayScore, avgTestScore, avgOverallScore, roleplayPassRate,
 * testPassRate, certificationRate, atRiskCount, topPerformer, rubricAverages, roleplayAverages,
 * and testAverages directly from its trainees[] list.
 */
export function recalculateCohortSummariesFromDirectory(cohorts: CohortSummary[]): CohortSummary[] {
  return cohorts.map((cohort, idx) => {
    const trainees = cohort.trainees || [];
    const count = trainees.length;

    if (count === 0) {
      return {
        ...cohort,
        sheetIndex: cohort.sheetIndex || idx + 1,
        traineeCount: 0,
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
      };
    }

    const initialRP = +(trainees.reduce((s, t) => s + (t.initialRP || 0), 0) / count).toFixed(2);
    const finalRP = +(trainees.reduce((s, t) => s + (t.finalRP || 0), 0) / count).toFixed(2);
    const rpGain = +(finalRP - initialRP).toFixed(2);
    const moduleCompletion = +(trainees.reduce((s, t) => s + (t.moduleComp || 0), 0) / count).toFixed(1);
    const attendanceCompletion = +(trainees.reduce((s, t) => s + (t.attendanceComp || 0), 0) / count).toFixed(1);

    const avgRoleplayScore = Math.round(trainees.reduce((s, t) => s + (t.roleplays?.average || 0), 0) / count);
    const avgTestScore = Math.round(trainees.reduce((s, t) => s + (t.tests?.average || 0), 0) / count);
    const avgOverallScore = Math.round(trainees.reduce((s, t) => s + (t.overallScore || 0), 0) / count);

    const roleplayPassRate = Math.round(
      (trainees.filter((t) => (t.finalRP >= 3.0 || t.roleplays?.passStatus === 'Pass')).length / count) * 100
    );
    const testPassRate = Math.round(
      (trainees.filter((t) => (t.moduleComp >= 75 || t.tests?.passStatus !== 'Retake Required')).length / count) * 100
    );
    const certificationRate = Math.round(
      (trainees.filter((t) => t.priority !== 'High' && t.status !== 'Remediation Needed').length / count) * 100
    );
    const atRiskCount = trainees.filter(
      (t) => t.priority === 'High' || t.status === 'At Risk' || t.status === 'Remediation Needed'
    ).length;

    const topSorted = [...trainees].sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
    const topPerformer = {
      name: topSorted[0]?.name || 'N/A',
      score: topSorted[0]?.overallScore || 0,
    };

    const rubricAverages: RubricBreakdown = {
      communication: Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rubric?.communication || 0), 0) / count),
      productKnowledge: Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rubric?.productKnowledge || 0), 0) / count),
      activeListening: Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rubric?.activeListening || 0), 0) / count),
      objectionHandling: Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rubric?.objectionHandling || 0), 0) / count),
      callControl: Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rubric?.callControl || 0), 0) / count),
    };

    const roleplayAverages = {
      rp1Discovery: Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rp1Discovery || 0), 0) / count),
      rp2Objection: Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rp2Objection || 0), 0) / count),
      rp3ValuePitch: Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rp3ValuePitch || 0), 0) / count),
      rp4Deescalation: Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rp4Deescalation || 0), 0) / count),
      rp5Closing: Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rp5Closing || 0), 0) / count),
    };

    const testAverages = {
      baselineTest: Math.round(trainees.reduce((s, t) => s + (t.tests?.baselineTest || 0), 0) / count),
      module1Test: Math.round(trainees.reduce((s, t) => s + (t.tests?.module1Test || 0), 0) / count),
      module2Test: Math.round(trainees.reduce((s, t) => s + (t.tests?.module2Test || 0), 0) / count),
      module3Test: Math.round(trainees.reduce((s, t) => s + (t.tests?.module3Test || 0), 0) / count),
      finalExam: Math.round(trainees.reduce((s, t) => s + (t.tests?.finalExam || 0), 0) / count),
    };

    return {
      ...cohort,
      sheetIndex: cohort.sheetIndex || idx + 1,
      traineeCount: count,
      initialRP,
      finalRP,
      rpGain,
      moduleCompletion,
      attendanceCompletion,
      avgRoleplayScore,
      avgTestScore,
      avgOverallScore,
      roleplayPassRate,
      testPassRate,
      certificationRate,
      atRiskCount,
      topPerformer,
      rubricAverages,
      roleplayAverages,
      testAverages,
      trainees,
    };
  });
}
