import React, { useState, useMemo } from 'react';
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
  GraduationCap,
  Building2,
  GitCompare,
} from 'lucide-react';
import { CohortSummary, BusinessAccount } from '../types';

interface CohortComparisonMatrixProps {
  cohorts: CohortSummary[];
  onSelectCohort: (cohortId: string) => void;
  onCompareHeadToHead: (cohortAId: string, cohortBId: string) => void;
}

type SortField =
  | 'sheetIndex'
  | 'avgOverallScore'
  | 'avgRoleplayScore'
  | 'avgTestScore'
  | 'certificationRate'
  | 'traineeCount'
  | 'rpGain';

export const CohortComparisonMatrix: React.FC<CohortComparisonMatrixProps> = ({
  cohorts,
  onSelectCohort,
  onCompareHeadToHead,
}) => {
  const [sortField, setSortField] = useState<SortField>('sheetIndex');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [groupByAccount, setGroupByAccount] = useState<boolean>(true);
  const [showDeltaVsBaseline, setShowDeltaVsBaseline] = useState<boolean>(false);

  const baselineCohort = cohorts[0] || null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortFunction = (a: CohortSummary, b: CohortSummary) => {
    let comp = 0;
    if (sortField === 'sheetIndex') comp = a.sheetIndex - b.sheetIndex;
    else if (sortField === 'avgOverallScore') comp = a.avgOverallScore - b.avgOverallScore;
    else if (sortField === 'avgRoleplayScore') comp = a.avgRoleplayScore - b.avgRoleplayScore;
    else if (sortField === 'avgTestScore') comp = a.avgTestScore - b.avgTestScore;
    else if (sortField === 'certificationRate') comp = a.certificationRate - b.certificationRate;
    else if (sortField === 'traineeCount') comp = a.traineeCount - b.traineeCount;
    else if (sortField === 'rpGain') comp = a.rpGain - b.rpGain;
    return sortDirection === 'asc' ? comp : -comp;
  };

  const sortedCohorts = useMemo(() => {
    return [...cohorts].sort(sortFunction);
  }, [cohorts, sortField, sortDirection]);

  // Grouped by account
  const accountGroups = useMemo(() => {
    const accounts: BusinessAccount[] = ['Mobility', 'Teleco', 'Travel'];
    return accounts
      .map((acc) => {
        const groupCohorts = cohorts.filter((c) => c.account === acc).sort(sortFunction);
        const totalTrainees = groupCohorts.reduce((s, c) => s + c.traineeCount, 0);
        const avgOverall =
          totalTrainees > 0
            ? Math.round(groupCohorts.reduce((s, c) => s + c.avgOverallScore * c.traineeCount, 0) / totalTrainees)
            : 0;
        const avgRP =
          totalTrainees > 0
            ? Math.round(groupCohorts.reduce((s, c) => s + c.avgRoleplayScore * c.traineeCount, 0) / totalTrainees)
            : 0;
        const avgTest =
          totalTrainees > 0
            ? Math.round(groupCohorts.reduce((s, c) => s + c.avgTestScore * c.traineeCount, 0) / totalTrainees)
            : 0;
        const avgGain =
          totalTrainees > 0
            ? Number(
                (groupCohorts.reduce((s, c) => s + c.rpGain * c.traineeCount, 0) / totalTrainees).toFixed(2)
              )
            : 0;

        const color = acc === 'Mobility' ? '#059669' : acc === 'Teleco' ? '#2563EB' : '#7C3AED';
        const bgFill = acc === 'Mobility' ? '#ECFDF5' : acc === 'Teleco' ? '#EFF6FF' : '#F5F3FF';
        const border = acc === 'Mobility' ? '#A7F3D0' : acc === 'Teleco' ? '#BFDBFE' : '#DDD6FE';
        const text = acc === 'Mobility' ? '#065F46' : acc === 'Teleco' ? '#1E40AF' : '#5B21B6';

        return {
          account: acc,
          cohorts: groupCohorts,
          totalTrainees,
          avgOverall,
          avgRP,
          avgTest,
          avgGain,
          color,
          bgFill,
          border,
          text,
        };
      })
      .filter((g) => g.cohorts.length > 0);
  }, [cohorts, sortField, sortDirection]);

  const getRankBadge = (score: number) => {
    const rankIndex = [...cohorts]
      .sort((a, b) => b.avgOverallScore - a.avgOverallScore)
      .findIndex((c) => c.avgOverallScore === score);
    if (rankIndex === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Trophy className="w-3 h-3 text-amber-600" />
          #1
        </span>
      );
    }
    if (rankIndex === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
          #2
        </span>
      );
    }
    if (rankIndex === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
          #3
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        #{rankIndex + 1}
      </span>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 88) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 80) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (score >= 72) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const renderCohortRow = (cohort: CohortSummary) => {
    const deltaOverall = baselineCohort ? cohort.avgOverallScore - baselineCohort.avgOverallScore : 0;
    const deltaRP = baselineCohort ? cohort.avgRoleplayScore - baselineCohort.avgRoleplayScore : 0;

    return (
      <tr key={cohort.id} className="hover:bg-slate-50/80 transition-colors group">
        {/* Rank & Wave Index */}
        <td className="py-3 px-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
            {getRankBadge(cohort.avgOverallScore)}
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
              {cohort.code}
            </span>
          </div>
        </td>

        {/* Cohort Name, Account Badge & Trainer */}
        <td className="py-3 px-4">
          <div>
            <div className="flex items-center flex-wrap gap-1.5">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 border"
                style={{
                  backgroundColor: cohort.account === 'Mobility' ? '#ECFDF5' : cohort.account === 'Teleco' ? '#EFF6FF' : '#F5F3FF',
                  borderColor: cohort.account === 'Mobility' ? '#A7F3D0' : cohort.account === 'Teleco' ? '#BFDBFE' : '#DDD6FE',
                  color: cohort.account === 'Mobility' ? '#065F46' : cohort.account === 'Teleco' ? '#1E40AF' : '#5B21B6',
                }}
              >
                {cohort.account}
              </span>
              <span className="font-bold text-slate-900 group-hover:text-[#2E0854] transition-colors">
                {cohort.name}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Trainer: <strong className="text-slate-700 font-medium">{cohort.trainer}</strong></span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400 font-mono text-[10px]">Tab: "{cohort.tabName}"</span>
            </div>
          </div>
        </td>

        {/* Trainee Count */}
        <td className="py-3 px-3 text-center">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            <Users className="w-3 h-3 text-purple-700" />
            {cohort.traineeCount}
          </span>
        </td>

        {/* Initial → Final RP (1-5 Scale) & Net Gain */}
        <td className="py-3 px-4">
          <div className="space-y-0.5">
            <div className="text-xs font-mono font-bold text-slate-900">
              {cohort.initialRP?.toFixed(2) || '0.00'} → {cohort.finalRP?.toFixed(2) || '0.00'}
            </div>
            <div className="text-[11px] font-mono text-emerald-700 font-bold">
              +{cohort.rpGain?.toFixed(2) || '0.00'} pts
            </div>
          </div>
        </td>

        {/* Roleplays Avg */}
        <td className="py-3 px-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded font-bold border text-xs font-mono ${getScoreColor(cohort.avgRoleplayScore)}`}>
                {cohort.avgRoleplayScore}%
              </span>
              {showDeltaVsBaseline && baselineCohort && cohort.id !== baselineCohort.id && (
                <span className={`text-[10px] font-mono font-bold ${deltaRP >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {deltaRP >= 0 ? `+${deltaRP}` : deltaRP}%
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Tests Avg */}
        <td className="py-3 px-4">
          <span className={`px-2 py-0.5 rounded font-bold border text-xs font-mono ${getScoreColor(cohort.avgTestScore)}`}>
            {cohort.avgTestScore}%
          </span>
        </td>

        {/* Overall Score */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-md font-extrabold border text-xs font-mono ${getScoreColor(cohort.avgOverallScore)}`}>
              {cohort.avgOverallScore}%
            </span>
            {showDeltaVsBaseline && baselineCohort && cohort.id !== baselineCohort.id && (
              <span className={`text-[10px] font-mono font-bold ${deltaOverall >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {deltaOverall >= 0 ? `+${deltaOverall}` : deltaOverall}%
              </span>
            )}
          </div>
        </td>

        {/* Certification Readiness */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${cohort.certificationRate}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-slate-800">
              {cohort.certificationRate}%
            </span>
          </div>
        </td>

        {/* Top Performer */}
        <td className="py-3 px-4">
          <div className="text-xs">
            <span className="font-bold text-slate-900 block truncate max-w-[120px]">
              {cohort.topPerformer?.name || 'N/A'}
            </span>
            <span className="text-[11px] font-mono text-emerald-700 font-semibold">
              Score: {cohort.topPerformer?.score}%
            </span>
          </div>
        </td>

        {/* Actions */}
        <td className="py-3 px-4 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => onSelectCohort(cohort.id)}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-purple-100 hover:text-[#2E0854] text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              title="Inspect individual trainees in Directory"
            >
              Directory
            </button>
            <button
              onClick={() => onCompareHeadToHead(baselineCohort?.id || cohort.id, cohort.id)}
              className="px-2.5 py-1 rounded bg-[#2E0854] hover:bg-[#4B1D7C] text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
              title="Compare Head-to-Head against baseline"
            >
              <GitCompare className="w-3 h-3" />
              <span>H2H</span>
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-[#2E0854]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Cross-Cohort Performance Matrix
              <span className="text-xs font-normal text-slate-500">
                ({cohorts.length} Waves · {cohorts.reduce((s, c) => s + c.traineeCount, 0)} Trainees)
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Comparative benchmark across roleplay simulations and standardized test evaluations
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Group by Account Toggle */}
          <button
            onClick={() => setGroupByAccount(!groupByAccount)}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              groupByAccount
                ? 'bg-[#2E0854] text-white border-[#2E0854]'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Group by Account</span>
          </button>

          {/* Delta vs Baseline Toggle */}
          <button
            onClick={() => setShowDeltaVsBaseline(!showDeltaVsBaseline)}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              showDeltaVsBaseline
                ? 'bg-purple-100 text-[#2E0854] border-purple-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title={`Compare metrics delta vs ${baselineCohort?.code || 'W1'} baseline`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>vs {baselineCohort?.code || 'Baseline'}</span>
          </button>

          <span className="text-slate-300">|</span>

          {/* Sort Buttons */}
          <span className="text-slate-500 font-semibold">Sort:</span>
          <button
            onClick={() => handleSort('sheetIndex')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              sortField === 'sheetIndex'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Wave
          </button>
          <button
            onClick={() => handleSort('avgOverallScore')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              sortField === 'avgOverallScore'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Overall
          </button>
          <button
            onClick={() => handleSort('rpGain')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              sortField === 'rpGain'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            RP Gain
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Rank & Wave</th>
              <th className="py-3 px-4">Cohort & Facilitator</th>
              <th className="py-3 px-3 text-center">Trainees</th>
              <th onClick={() => handleSort('rpGain')} className="py-3 px-4 cursor-pointer hover:text-slate-900">
                <div className="flex items-center gap-1">
                  <span>RP 1-5 Scale & Gain</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th onClick={() => handleSort('avgRoleplayScore')} className="py-3 px-4 cursor-pointer hover:text-slate-900">
                <div className="flex items-center gap-1">
                  <span>Roleplays Avg</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th onClick={() => handleSort('avgTestScore')} className="py-3 px-4 cursor-pointer hover:text-slate-900">
                <div className="flex items-center gap-1">
                  <span>Tests Avg</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th onClick={() => handleSort('avgOverallScore')} className="py-3 px-4 cursor-pointer hover:text-slate-900">
                <div className="flex items-center gap-1">
                  <span>Combined Score</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th onClick={() => handleSort('certificationRate')} className="py-3 px-4 cursor-pointer hover:text-slate-900">
                <div className="flex items-center gap-1">
                  <span>Cert Readiness</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Top Performer</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {groupByAccount ? (
              accountGroups.map((group) => (
                <React.Fragment key={group.account}>
                  {/* Account Subheader & Subtotals */}
                  <tr className="bg-slate-50/90 border-y border-slate-200 font-bold">
                    <td colSpan={2} className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-slate-900 uppercase tracking-wide text-xs">
                          {group.account} Account Portfolio
                        </span>
                        <span className="text-slate-500 font-normal">
                          ({group.cohorts.length} Waves · {group.totalTrainees} Trainees)
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {group.totalTrainees}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-emerald-700">
                      +{group.avgGain} avg gain
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">
                      {group.avgRP}%
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">
                      {group.avgTest}%
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#2E0854]">
                      {group.avgOverall}%
                    </td>
                    <td colSpan={3} className="py-2.5 px-4" />
                  </tr>
                  {group.cohorts.map(renderCohortRow)}
                </React.Fragment>
              ))
            ) : (
              sortedCohorts.map(renderCohortRow)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CohortComparisonMatrix;
