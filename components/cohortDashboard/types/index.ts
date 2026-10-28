export type BusinessAccount = 'Mobility' | 'Teleco' | 'Travel';

export interface RubricBreakdown {
  communication: number; // 0-100
  productKnowledge: number;
  activeListening: number;
  objectionHandling: number;
  callControl: number;
}

export interface RoleplayPerformance {
  rp1Discovery: number;      // 0-100 (Discovery & Needs Analysis)
  rp2Objection: number;      // 0-100 (Objection Handling)
  rp3ValuePitch: number;     // 0-100 (Value Proposition & Demo)
  rp4Deescalation: number;   // 0-100 (Difficult Customer / Escalation)
  rp5Closing: number;        // 0-100 (Negotiation & Closing)
  average: number;
  passStatus: 'Pass' | 'Remediate' | 'Borderline';
  rubric: RubricBreakdown;
  evaluatorNotes?: string;
}

export interface TestPerformance {
  baselineTest: number;     // 0-100 (Pre-training Assessment)
  module1Test: number;      // 0-100 (Product Fundamentals)
  module2Test: number;      // 0-100 (Sales Methodology & Compliance)
  module3Test: number;      // 0-100 (Advanced Scenarios)
  finalExam: number;        // 0-100 (Certification Exam)
  average: number;
  passStatus: 'Certified' | 'Retake Required' | 'Passed';
  attemptsCount: number;
}

export interface Trainee {
  id: string;
  name: string;
  email: string;
  account: BusinessAccount;
  cohortId: string;
  cohortName: string;
  trainer: string;
  role: string;
  startDate: string;
  completionDate?: string;
  overallScore: number;
  initialRP: number;
  finalRP: number;
  rpGain: number;
  moduleComp: number;
  attendanceComp: number;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Ready' | 'On Track' | 'At Risk' | 'Remediation Needed';
  roleplays: RoleplayPerformance;
  tests: TestPerformance;
  recommendations: string[];
}

export interface CohortSummary {
  id: string;
  sheetIndex: number; // 1 to 6
  spreadsheetId: string;
  account: BusinessAccount;
  accountBadgeColor: string;
  name: string;
  code: string;
  tabName: string;
  trainer: string;
  traineeCount: number;
  startDate: string;
  endDate: string;
  initialRP: number;
  finalRP: number;
  rpGain: number;
  moduleCompletion: number;
  attendanceCompletion: number;
  avgRoleplayScore: number;
  avgTestScore: number;
  avgOverallScore: number;
  roleplayPassRate: number;
  testPassRate: number;
  certificationRate: number;
  atRiskCount: number;
  topPerformer: {
    name: string;
    score: number;
  };
  rubricAverages: RubricBreakdown;
  roleplayAverages: {
    rp1Discovery: number;
    rp2Objection: number;
    rp3ValuePitch: number;
    rp4Deescalation: number;
    rp5Closing: number;
  };
  testAverages: {
    baselineTest: number;
    module1Test: number;
    module2Test: number;
    module3Test: number;
    finalExam: number;
  };
  trainees: Trainee[];
}

export interface SheetConfig {
  sheetIndex: number;
  spreadsheetId?: string;
  account?: BusinessAccount;
  tabName: string;
  gid?: string;
  status: 'synced' | 'loading' | 'error' | 'idle';
  rowCount: number;
  lastUpdated?: string;
  errorMessage?: string;
}

export interface MultiSheetDataSource {
  sourceType: 'google_sheets' | 'excel_file' | 'csv_files' | 'sample_data';
  spreadsheetUrlOrId: string;
  sheets: SheetConfig[];
  autoRefreshIntervalMinutes?: number;
  lastSyncTime?: string;
}

export type ViewTab = 'dashboard' | 'comparison' | 'matrix' | 'trainees' | 'insights' | 'sheet_sync';
