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
  Zap
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

  const crossOverallAvg = Math.round(
    cohorts.reduce((acc, c) => acc + c.avgOverallScore * c.traineeCount, 0) / (totalTrainees || 1)
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
  const mostImprovedCohort = sortedCohorts.length >= 2 ? sortedCohorts[0] : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Cohorts & Trainees */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Cohort Coverage
          </span>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {cohorts.length}
          </span>
          <span className="text-xs font-medium text-slate-400">Sheets Synced</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            {totalTrainees} Active Trainees
          </span>
          <span className="font-semibold text-emerald-400">100% Sheets Loaded</span>
        </div>
      </div>

      {/* Card 2: Roleplay Simulation Avg */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-all" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Cross-Cohort Roleplays
          </span>
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {crossRoleplayAvg}%
          </span>
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            5 Scenarios Evaluated
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80">
          <span className="text-slate-400">Passing Threshold: 75%</span>
          <span className="font-semibold text-cyan-300">
            {Math.round((cohorts.reduce((acc, c) => acc + c.roleplayPassRate, 0) / (cohorts.length || 1)))}% Pass Rate
          </span>
        </div>
      </div>

      {/* Card 3: Tests & Assessments Avg */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-all" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Cross-Cohort Test Avg
          </span>
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <GraduationCap className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {crossTestAvg}%
          </span>
          <span className="text-xs font-medium text-purple-300">
            Pre & Modules 1-3 + Final
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80">
          <span className="text-slate-400">Cert Threshold: 80%</span>
          <span className="font-semibold text-purple-300">
            {Math.round((cohorts.reduce((acc, c) => acc + c.testPassRate, 0) / (cohorts.length || 1)))}% Pass Rate
          </span>
        </div>
      </div>

      {/* Card 4: Certification Readiness & Top Cohort */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Certification Readiness
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {certRate}%
          </span>
          <span className="text-xs font-medium text-emerald-400">
            {totalCertified} of {totalTrainees} Ready
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80">
          <span className="text-slate-400 truncate max-w-[140px]">
            Top: <strong className="text-slate-200">{topCohort?.name.split('-')[1] || topCohort?.name}</strong>
          </span>
          <span className="font-semibold text-amber-400 flex items-center gap-1">
            {totalAtRisk > 0 ? (
              <>
                <AlertTriangle className="w-3 h-3" />
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
