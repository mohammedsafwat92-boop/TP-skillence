import React, { useState } from 'react';
import {
  Layers,
  ArrowUpDown,
  Trophy,
  Users,
  Award,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Zap,
  GraduationCap
} from 'lucide-react';
import { CohortSummary } from '../types';

interface CohortComparisonMatrixProps {
  cohorts: CohortSummary[];
  onSelectCohort: (cohortId: string) => void;
  onCompareHeadToHead: (cohortAId: string, cohortBId: string) => void;
}

type SortField = 'sheetIndex' | 'avgOverallScore' | 'avgRoleplayScore' | 'avgTestScore' | 'certificationRate' | 'traineeCount';

export const CohortComparisonMatrix: React.FC<CohortComparisonMatrixProps> = ({
  cohorts,
  onSelectCohort,
  onCompareHeadToHead,
}) => {
  const [sortField, setSortField] = useState<SortField>('sheetIndex');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // default to highest first
    }
  };

  const sortedCohorts = [...cohorts].sort((a, b) => {
    let comp = 0;
    if (sortField === 'sheetIndex') comp = a.sheetIndex - b.sheetIndex;
    else if (sortField === 'avgOverallScore') comp = a.avgOverallScore - b.avgOverallScore;
    else if (sortField === 'avgRoleplayScore') comp = a.avgRoleplayScore - b.avgRoleplayScore;
    else if (sortField === 'avgTestScore') comp = a.avgTestScore - b.avgTestScore;
    else if (sortField === 'certificationRate') comp = a.certificationRate - b.certificationRate;
    else if (sortField === 'traineeCount') comp = a.traineeCount - b.traineeCount;
    return sortDirection === 'asc' ? comp : -comp;
  });

  const getRankBadge = (score: number) => {
    // Rank according to overall score
    const rankIndex = [...cohorts].sort((a, b) => b.avgOverallScore - a.avgOverallScore).findIndex((c) => c.avgOverallScore === score);
    if (rankIndex === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Trophy className="w-3 h-3 text-amber-400" />
          #1
        </span>
      );
    }
    if (rankIndex === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-400/15 text-slate-300 border border-slate-400/30">
          #2
        </span>
      );
    }
    if (rankIndex === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-700/15 text-amber-500 border border-amber-700/30">
          #3
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
        #{rankIndex + 1}
      </span>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 88) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 80) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    if (score >= 72) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Table Header Controls */}
      <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Cross-Cohort Performance Matrix
              <span className="text-xs font-normal text-slate-400">(All 6 Sheets)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Comparative benchmark across roleplay simulations and standardized test evaluations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Sort by:</span>
          <button
            onClick={() => handleSort('sheetIndex')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              sortField === 'sheetIndex'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Sheet Order (1-6)
          </button>
          <button
            onClick={() => handleSort('avgOverallScore')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              sortField === 'avgOverallScore'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Overall Score
          </button>
          <button
            onClick={() => handleSort('avgRoleplayScore')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              sortField === 'avgRoleplayScore'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Roleplays
          </button>
          <button
            onClick={() => handleSort('avgTestScore')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              sortField === 'avgTestScore'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Tests
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">Rank & Sheet</th>
              <th className="py-3.5 px-4">Cohort & Facilitator</th>
              <th className="py-3.5 px-3 text-center">Trainees</th>
              <th
                onClick={() => handleSort('avgRoleplayScore')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Roleplays Avg (5 Scenarios)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avgTestScore')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Tests Avg (5 Modules)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avgOverallScore')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Combined Score</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('certificationRate')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Cert Readiness</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-4">Top Performer</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {sortedCohorts.map((cohort) => (
              <tr
                key={cohort.id}
                className="hover:bg-slate-800/40 transition-colors group"
              >
                {/* Rank & Sheet Index */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getRankBadge(cohort.avgOverallScore)}
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      Sheet {cohort.sheetIndex}
                    </span>
                  </div>
                </td>

                {/* Cohort Name & Trainer */}
                <td className="py-3.5 px-4">
                  <div>
                    <div className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {cohort.name}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Trainer: <strong className="text-slate-300 font-medium">{cohort.trainer}</strong></span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400 font-mono text-[10px]">Tab: "{cohort.tabName}"</span>
                    </div>
                  </div>
                </td>

                {/* Trainee Count */}
                <td className="py-3.5 px-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700">
                    <Users className="w-3 h-3 text-indigo-400" />
                    {cohort.traineeCount}
                  </span>
                </td>

                {/* Roleplays Avg */}
                <td className="py-3.5 px-4">
                  <div className="space-y-1 max-w-[130px]">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-0.5 rounded font-bold border ${getScoreColor(cohort.avgRoleplayScore)}`}>
                        {cohort.avgRoleplayScore}%
                      </span>
                      <span className="text-[11px] text-slate-400">{cohort.roleplayPassRate}% pass</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full"
                        style={{ width: `${cohort.avgRoleplayScore}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Tests Avg */}
                <td className="py-3.5 px-4">
                  <div className="space-y-1 max-w-[130px]">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-0.5 rounded font-bold border ${getScoreColor(cohort.avgTestScore)}`}>
                        {cohort.avgTestScore}%
                      </span>
                      <span className="text-[11px] text-slate-400">{cohort.testPassRate}% cert</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-1.5 rounded-full"
                        style={{ width: `${cohort.avgTestScore}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Overall Score */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white">
                      {cohort.avgOverallScore}%
                    </span>
                    {cohort.avgOverallScore >= 85 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Top Tier
                      </span>
                    ) : cohort.avgOverallScore >= 78 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Target
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Ramping
                      </span>
                    )}
                  </div>
                </td>

                {/* Certification Rate */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-200">{cohort.certificationRate}%</span>
                    {cohort.atRiskCount > 0 ? (
                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                        ({cohort.atRiskCount} at-risk)
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400">100% on track</span>
                    )}
                  </div>
                </td>

                {/* Top Performer */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-white font-medium truncate max-w-[130px]">
                        {cohort.topPerformer.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Score: <span className="text-amber-400 font-semibold">{cohort.topPerformer.score}%</span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onSelectCohort(cohort.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer border border-slate-700"
                    >
                      View Trainees
                    </button>
                    {cohort.sheetIndex > 1 && (
                      <button
                        onClick={() => onCompareHeadToHead('cohort-1', cohort.id)}
                        className="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[11px] font-medium transition-colors cursor-pointer border border-indigo-500/30"
                        title="Compare with Cohort 1 baseline"
                      >
                        vs C1
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Table Footer Summary Row */}
          <tfoot className="bg-slate-950 font-semibold text-slate-300 border-t-2 border-slate-700">
            <tr>
              <td className="py-3 px-4 font-bold text-white uppercase text-[11px]">
                Program Average
              </td>
              <td className="py-3 px-4 text-[11px] text-slate-400">
                Collective All 6 Cohorts
              </td>
              <td className="py-3 px-3 text-center text-indigo-400 font-bold">
                {cohorts.reduce((acc, c) => acc + c.traineeCount, 0)}
              </td>
              <td className="py-3 px-4 text-indigo-400 font-bold">
                {Math.round(cohorts.reduce((acc, c) => acc + c.avgRoleplayScore, 0) / (cohorts.length || 1))}%
              </td>
              <td className="py-3 px-4 text-cyan-400 font-bold">
                {Math.round(cohorts.reduce((acc, c) => acc + c.avgTestScore, 0) / (cohorts.length || 1))}%
              </td>
              <td className="py-3 px-4 text-white font-extrabold text-sm">
                {Math.round(cohorts.reduce((acc, c) => acc + c.avgOverallScore, 0) / (cohorts.length || 1))}%
              </td>
              <td className="py-3 px-4 text-emerald-400 font-bold">
                {Math.round(cohorts.reduce((acc, c) => acc + c.certificationRate, 0) / (cohorts.length || 1))}%
              </td>
              <td className="py-3 px-4 text-slate-400 text-[11px]">
                6 Cohorts Evaluated
              </td>
              <td className="py-3 px-4 text-right text-[11px] text-emerald-400">
                Synchronized
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
