import React from 'react';
import {
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  Layers,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { CohortSummary } from '../types';

interface CohortOverviewCardsProps {
  cohorts: CohortSummary[];
  onSelectCohort?: (cohortId: string) => void;
}

export const CohortOverviewCards: React.FC<CohortOverviewCardsProps> = ({ cohorts, onSelectCohort }) => {
  const totalTrainees = cohorts.reduce((acc, c) => acc + c.traineeCount, 0);

  const crossRoleplayAvg = Math.round(
    cohorts.reduce((acc, c) => acc + c.avgRoleplayScore * c.traineeCount, 0) / (totalTrainees || 1)
  );

  const crossTestAvg = Math.round(
    cohorts.reduce((acc, c) => acc + c.avgTestScore * c.traineeCount, 0) / (totalTrainees || 1)
  );

  const totalCertified = cohorts.reduce(
    (acc, c) => acc + c.trainees.filter((t) => t.status === 'Ready').length,
    0
  );

  const totalAtRisk = cohorts.reduce(
    (acc, c) => acc + c.atRiskCount,
    0
  );

  const certRate = Math.round((totalCertified / (totalTrainees || 1)) * 100);

  // Find highest performing cohort
  const sortedCohorts = [...cohorts].sort((a, b) => b.avgOverallScore - a.avgOverallScore);
  const topCohort = sortedCohorts[0];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Cohorts & Trainees */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Wave Coverage
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-[#2E0854]">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#0A1128] tracking-tight font-mono">
            {cohorts.length}
          </span>
          <span className="text-xs font-semibold text-slate-500">Waves Active</span>
        </div>
        {/* Progress track */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-[#2E0854] rounded-full w-full" />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5 text-purple-700" />
            {totalTrainees} Active Trainees
          </span>
          <span className="font-bold text-[#059669]">100% Synced</span>
        </div>
      </div>

      {/* Card 2: Roleplay Simulation Avg */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Cross-Cohort Roleplays
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB]">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#0A1128] tracking-tight font-mono">
            {crossRoleplayAvg}%
          </span>
          <span className="text-xs font-semibold text-[#059669] flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            5 Scenarios
          </span>
        </div>
        {/* Progress track */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-[#2563EB] rounded-full transition-all" style={{ width: `${crossRoleplayAvg}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
          <span className="text-slate-500">Pass Threshold: 75%</span>
          <span className="font-bold text-[#2563EB]">
            {Math.round(cohorts.reduce((acc, c) => acc + c.roleplayPassRate, 0) / (cohorts.length || 1))}% Pass Rate
          </span>
        </div>
      </div>

      {/* Card 3: Tests & Assessments Avg */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Standardized Test Avg
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-[#7C3AED]">
            <GraduationCap className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#0A1128] tracking-tight font-mono">
            {crossTestAvg}%
          </span>
          <span className="text-xs font-semibold text-[#7C3AED]">
            Pre &amp; Mod 1–3 + Exam
          </span>
        </div>
        {/* Progress track */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-[#7C3AED] rounded-full transition-all" style={{ width: `${crossTestAvg}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
          <span className="text-slate-500">Cert Threshold: 80%</span>
          <span className="font-bold text-[#7C3AED]">
            {Math.round(cohorts.reduce((acc, c) => acc + c.testPassRate, 0) / (cohorts.length || 1))}% Pass Rate
          </span>
        </div>
      </div>

      {/* Card 4: Certification Readiness & Top Cohort */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Certification Readiness
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669]">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#0A1128] tracking-tight font-mono">
            {certRate}%
          </span>
          <span className="text-xs font-semibold text-[#059669]">
            {totalCertified} of {totalTrainees} Ready
          </span>
        </div>
        {/* Progress track */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-[#059669] rounded-full transition-all" style={{ width: `${certRate}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
          <span className="text-slate-600 truncate max-w-[140px] text-xs">
            Top: <strong className="text-slate-900">{topCohort?.code || 'W1'} ({topCohort?.avgOverallScore}%)</strong>
          </span>
          <span className="font-bold text-amber-700 flex items-center gap-1">
            {totalAtRisk > 0 ? (
              <>
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                {totalAtRisk} At-Risk
              </>
            ) : (
              'All On Track'
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CohortOverviewCards;
