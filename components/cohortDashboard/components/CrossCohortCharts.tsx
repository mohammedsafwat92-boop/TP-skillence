import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Sparkles,
  Award,
  Layers,
  Zap,
  GraduationCap,
  Compass,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
} from 'lucide-react';
import { CohortSummary, BusinessAccount, Trainee } from '../types';

interface CrossCohortChartsProps {
  cohorts: CohortSummary[];
}

export type ChartView =
  | 'account_comparison'
  | 'wave_progression'
  | 'roleplay_scenarios'
  | 'test_modules'
  | 'rubric_dimensions'
  | 'theory_vs_practice';

export const CrossCohortCharts: React.FC<CrossCohortChartsProps> = ({ cohorts }) => {
  const [activeView, setActiveView] = useState<ChartView>('account_comparison');
  const [scaleMode, setScaleMode] = useState<'five_point' | 'percentage'>('five_point');
  const [scatterMode, setScatterMode] = useState<'centroids' | 'trainees'>('centroids');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<'all' | BusinessAccount>('all');
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  const filteredCohorts = useMemo(() => {
    if (selectedAccountFilter === 'all') return cohorts;
    return cohorts.filter((c) => c.account === selectedAccountFilter);
  }, [cohorts, selectedAccountFilter]);

  // Account rollups
  const accountStats = useMemo(() => {
    const accounts: BusinessAccount[] = ['Mobility', 'Teleco', 'Travel'];
    return accounts.map((acc) => {
      const cohortList = cohorts.filter((c) => c.account === acc);
      const trainees = cohortList.flatMap((c) => c.trainees || []);
      const count = trainees.length;

      const initialRP = count > 0 ? trainees.reduce((s, t) => s + (t.initialRP || 0), 0) / count : 0;
      const finalRP = count > 0 ? trainees.reduce((s, t) => s + (t.finalRP || 0), 0) / count : 0;
      const rpGain = finalRP - initialRP;
      const avgTest = count > 0 ? trainees.reduce((s, t) => s + (t.tests?.average || 0), 0) / count : 0;
      const avgModule = count > 0 ? trainees.reduce((s, t) => s + (t.moduleComp || 0), 0) / count : 0;

      const readyCount = trainees.filter((t) => t.status === 'Ready').length;
      const onTrackCount = trainees.filter((t) => t.status === 'On Track').length;
      const atRiskCount = trainees.filter((t) => t.status === 'At Risk').length;
      const remediateCount = trainees.filter((t) => t.status === 'Remediation Needed').length;

      return {
        account: acc,
        cohortsCount: cohortList.length,
        traineesCount: count,
        initialRP: Number(initialRP.toFixed(2)),
        finalRP: Number(finalRP.toFixed(2)),
        rpGain: Number(rpGain.toFixed(2)),
        avgTest: Math.round(avgTest),
        avgModule: Math.round(avgModule),
        readyCount,
        onTrackCount,
        atRiskCount,
        remediateCount,
        color: acc === 'Mobility' ? '#06C167' : acc === 'Teleco' ? '#3B82F6' : '#8B5CF6',
      };
    });
  }, [cohorts]);

  const roleplayScenarios = [
    { key: 'rp1Discovery', label: 'RP1: Discovery & Needs', icon: '🔍' },
    { key: 'rp2Objection', label: 'RP2: Objection Handling', icon: '🛡️' },
    { key: 'rp3ValuePitch', label: 'RP3: Value Prop & Pitch', icon: '💎' },
    { key: 'rp4Deescalation', label: 'RP4: De-escalation', icon: '🤝' },
    { key: 'rp5Closing', label: 'RP5: Negotiation & Close', icon: '🎯' },
  ] as const;

  const testModules = [
    { key: 'baselineTest', label: 'Pre-Training Baseline', icon: '📋' },
    { key: 'module1Test', label: 'Mod 1: Product Architecture', icon: '📘' },
    { key: 'module2Test', label: 'Mod 2: Methodology & Rules', icon: '⚖️' },
    { key: 'module3Test', label: 'Mod 3: Advanced Scenarios', icon: '🧩' },
    { key: 'finalExam', label: 'Final Certification Exam', icon: '🎓' },
  ] as const;

  const rubricDimensions = [
    { key: 'communication', label: 'Communication & Tone' },
    { key: 'productKnowledge', label: 'Product Knowledge' },
    { key: 'activeListening', label: 'Active Listening & Probing' },
    { key: 'objectionHandling', label: 'Objection Resolution' },
    { key: 'callControl', label: 'Call Control & Pacing' },
  ] as const;

  const getAccountColor = (account: BusinessAccount): string => {
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
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Chart Header & Tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#2E0854]" />
            Multi-Tiered Cohort &amp; Account Analytics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-referencing {cohorts.length} Waves across Mobility, Teleco, and Travel
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveView('account_comparison')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'account_comparison'
                ? 'bg-[#2E0854] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Account Benchmarks
          </button>
          <button
            onClick={() => setActiveView('wave_progression')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'wave_progression'
                ? 'bg-[#2E0854] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Wave RP Trajectory
          </button>
          <button
            onClick={() => setActiveView('roleplay_scenarios')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'roleplay_scenarios'
                ? 'bg-[#2E0854] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Roleplay Scenarios
          </button>
          <button
            onClick={() => setActiveView('test_modules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'test_modules'
                ? 'bg-[#2E0854] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Test Modules
          </button>
          <button
            onClick={() => setActiveView('rubric_dimensions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'rubric_dimensions'
                ? 'bg-[#2E0854] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rubric Dimensions
          </button>
          <button
            onClick={() => setActiveView('theory_vs_practice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'theory_vs_practice'
                ? 'bg-[#2E0854] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Theory vs Practice Matrix
          </button>
        </div>
      </div>

      {/* Cohort Legend Pills */}
      <div className="flex items-center flex-wrap justify-between gap-3 pt-1 text-xs">
        <div className="flex items-center flex-wrap gap-2">
          <span className="font-bold text-slate-500">Waves:</span>
          {cohorts.map((c) => {
            const color = getAccountColor(c.account);
            return (
              <div
                key={c.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-white border-slate-200 shadow-2xs"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-extrabold text-slate-900">{c.code}:</span>
                <span className="text-slate-600 truncate max-w-[150px]">{c.name}</span>
                <span className="text-slate-400 font-mono text-[10px]">({c.traineeCount})</span>
              </div>
            );
          })}
        </div>

        {/* Account Filter for deep dives */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-semibold text-[11px]">Filter:</span>
          <select
            value={selectedAccountFilter}
            onChange={(e) => setSelectedAccountFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-semibold text-slate-700"
          >
            <option value="all">All Accounts</option>
            <option value="Mobility">Mobility Only</option>
            <option value="Teleco">Teleco Only</option>
            <option value="Travel">Travel Only</option>
          </select>
        </div>
      </div>

      {/* VIEW 1: Account Benchmarks (Default View) */}
      {activeView === 'account_comparison' && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {accountStats.map((acc) => (
              <div
                key={acc.account}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4 hover:shadow-xs transition-all"
                style={{ borderTop: `4px solid ${acc.color}` }}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4" style={{ color: acc.color }} />
                    {acc.account} Account
                  </h4>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {acc.cohortsCount} {acc.cohortsCount === 1 ? 'Wave' : 'Waves'} · {acc.traineesCount} Agents
                  </span>
                </div>

                {/* Dumbbell Chart: RP Initial vs Final on 1.0 - 5.0 scale */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Roleplay Progression (1.0 – 5.0)</span>
                    <span className="text-emerald-700 font-mono">+{acc.rpGain} Net Gain</span>
                  </div>
                  <div className="relative pt-4 pb-2">
                    {/* Scale background track */}
                    <div className="h-2 bg-slate-100 rounded-full relative">
                      {/* Gain connecting bar */}
                      <div
                        className="absolute h-2 rounded-full"
                        style={{
                          left: `${((acc.initialRP - 1.0) / 4.0) * 100}%`,
                          width: `${(acc.rpGain / 4.0) * 100}%`,
                          backgroundColor: `${acc.color}40`,
                        }}
                      />
                      {/* Initial marker */}
                      <div
                        className="absolute w-4 h-4 rounded-full bg-slate-400 border-2 border-white shadow-sm -top-1 transform -translate-x-1/2 cursor-pointer"
                        style={{ left: `${((acc.initialRP - 1.0) / 4.0) * 100}%` }}
                        title={`Initial RP: ${acc.initialRP}`}
                      />
                      {/* Final marker */}
                      <div
                        className="absolute w-4 h-4 rounded-full border-2 border-white shadow-sm -top-1 transform -translate-x-1/2 cursor-pointer"
                        style={{
                          left: `${((acc.finalRP - 1.0) / 4.0) * 100}%`,
                          backgroundColor: acc.color,
                        }}
                        title={`Final RP: ${acc.finalRP}`}
                      />
                    </div>
                    {/* Scale Labels */}
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
                      <span>1.0</span>
                      <span>2.0</span>
                      <span>3.0</span>
                      <span>4.0</span>
                      <span>5.0</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs font-mono pt-1 text-slate-600">
                    <span>Initial: <strong className="text-slate-900">{acc.initialRP}</strong></span>
                    <span>Final: <strong className="text-slate-900">{acc.finalRP}</strong></span>
                  </div>
                </div>

                {/* Readiness Stacked Bar */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-700">
                    <span>Agent Readiness Distribution</span>
                    <span className="text-slate-500 font-mono">{acc.traineesCount} Total</span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full flex overflow-hidden">
                    {acc.traineesCount > 0 && (
                      <>
                        <div
                          style={{ width: `${(acc.readyCount / acc.traineesCount) * 100}%` }}
                          className="bg-emerald-500 transition-all"
                          title={`Ready: ${acc.readyCount}`}
                        />
                        <div
                          style={{ width: `${(acc.onTrackCount / acc.traineesCount) * 100}%` }}
                          className="bg-blue-500 transition-all"
                          title={`On Track: ${acc.onTrackCount}`}
                        />
                        <div
                          style={{ width: `${(acc.atRiskCount / acc.traineesCount) * 100}%` }}
                          className="bg-amber-500 transition-all"
                          title={`At Risk: ${acc.atRiskCount}`}
                        />
                        <div
                          style={{ width: `${(acc.remediateCount / acc.traineesCount) * 100}%` }}
                          className="bg-rose-500 transition-all"
                          title={`Remediation Needed: ${acc.remediateCount}`}
                        />
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 pt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Ready: <strong className="text-slate-900">{acc.readyCount}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      On Track: <strong className="text-slate-900">{acc.onTrackCount}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      At Risk: <strong className="text-slate-900">{acc.atRiskCount}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Remediate: <strong className="text-slate-900">{acc.remediateCount}</strong>
                    </span>
                  </div>
                </div>

                {/* Modules & Tests Bar */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                    <span className="text-slate-500 text-[11px] block">Test Average</span>
                    <strong className="text-sm font-mono text-slate-900">{acc.avgTest}%</strong>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                    <span className="text-slate-500 text-[11px] block">Module Comp.</span>
                    <strong className="text-sm font-mono text-slate-900">{acc.avgModule}%</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: Wave RP Progression Trajectory */}
      {activeView === 'wave_progression' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              Trajectory across RP1 (Discovery) to RP5 (Negotiation & Closing)
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
              <button
                onClick={() => setScaleMode('five_point')}
                className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                  scaleMode === 'five_point' ? 'bg-[#2E0854] text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                1.0 – 5.0 Scale
              </button>
              <button
                onClick={() => setScaleMode('percentage')}
                className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                  scaleMode === 'percentage' ? 'bg-[#2E0854] text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                0 – 100% Scale
              </button>
            </div>
          </div>

          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-6 overflow-x-auto">
            <div className="min-w-[650px] space-y-6">
              {filteredCohorts.map((cohort) => {
                const color = getAccountColor(cohort.account);
                const rps = [
                  cohort.roleplayAverages.rp1Discovery,
                  cohort.roleplayAverages.rp2Objection,
                  cohort.roleplayAverages.rp3ValuePitch,
                  cohort.roleplayAverages.rp4Deescalation,
                  cohort.roleplayAverages.rp5Closing,
                ];

                const formattedValues = rps.map((val) =>
                  scaleMode === 'five_point' ? Number(((val / 100) * 4 + 1).toFixed(2)) : val
                );

                return (
                  <div key={cohort.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-mono font-bold"
                          style={{ backgroundColor: `${color}20`, color }}
                        >
                          {cohort.code}
                        </span>
                        <strong className="text-slate-900 font-semibold">{cohort.name}</strong>
                        <span className="text-slate-400">({cohort.account})</span>
                      </div>
                      <span className="font-mono text-slate-600">
                        Avg: <strong className="text-slate-900">
                          {scaleMode === 'five_point'
                            ? ((cohort.avgRoleplayScore / 100) * 4 + 1).toFixed(2)
                            : `${cohort.avgRoleplayScore}%`}
                        </strong>
                      </span>
                    </div>

                    {/* Step-by-Step RP Node Pipeline */}
                    <div className="grid grid-cols-5 gap-2 relative">
                      {roleplayScenarios.map((sc, sIdx) => {
                        const score = formattedValues[sIdx];
                        const rawScore = rps[sIdx];
                        const isHigh = rawScore >= 80;
                        const isLow = rawScore < 65;

                        return (
                          <div
                            key={sc.key}
                            className={`p-2.5 rounded-lg border text-center transition-all ${
                              isHigh
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : isLow
                                ? 'bg-rose-50 border-rose-200 text-rose-900'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <span className="text-[11px] block font-medium truncate text-slate-500">
                              {sc.label.split(':')[0]}
                            </span>
                            <strong className="text-base font-mono block mt-0.5">
                              {score}{scaleMode === 'percentage' ? '%' : ''}
                            </strong>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {sc.label.split(':')[1]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Roleplay Scenarios Comparison */}
      {activeView === 'roleplay_scenarios' && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {roleplayScenarios.map((scenario) => {
              const scenarioScores = filteredCohorts.map((c) => ({
                cohort: c,
                score: c.roleplayAverages[scenario.key],
              }));
              scenarioScores.sort((a, b) => b.score - a.score);
              const best = scenarioScores[0];
              const lowest = scenarioScores[scenarioScores.length - 1];

              return (
                <div
                  key={scenario.key}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{scenario.icon}</span>
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">
                        {scenario.label}
                      </h4>
                    </div>

                    <div className="space-y-2 mt-4">
                      {scenarioScores.map(({ cohort, score }) => {
                        const color = getAccountColor(cohort.account);
                        return (
                          <div key={cohort.id} className="text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-mono text-[11px] font-bold text-slate-700">
                                {cohort.code}
                              </span>
                              <span className="font-mono font-bold text-slate-900">{score}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${score}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {best && lowest && (
                    <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] space-y-1 text-slate-500">
                      <div className="flex justify-between">
                        <span>Top:</span>
                        <strong className="text-emerald-700 font-mono">
                          {best.cohort.code} ({best.score}%)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Gap:</span>
                        <strong className="text-rose-700 font-mono">
                          {best.score - lowest.score} pts
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: Test Modules Benchmarks */}
      {activeView === 'test_modules' && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {testModules.map((test) => {
              const testScores = filteredCohorts.map((c) => ({
                cohort: c,
                score: c.testAverages[test.key],
              }));
              testScores.sort((a, b) => b.score - a.score);
              const best = testScores[0];
              const lowest = testScores[testScores.length - 1];

              return (
                <div
                  key={test.key}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{test.icon}</span>
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">
                        {test.label}
                      </h4>
                    </div>

                    <div className="space-y-2 mt-4">
                      {testScores.map(({ cohort, score }) => {
                        const color = getAccountColor(cohort.account);
                        return (
                          <div key={cohort.id} className="text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-mono text-[11px] font-bold text-slate-700">
                                {cohort.code}
                              </span>
                              <span className="font-mono font-bold text-slate-900">{score}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${score}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {best && lowest && (
                    <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] space-y-1 text-slate-500">
                      <div className="flex justify-between">
                        <span>Top:</span>
                        <strong className="text-emerald-700 font-mono">
                          {best.cohort.code} ({best.score}%)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Certification Delta:</span>
                        <strong className="text-blue-700 font-mono">
                          +{best.score - lowest.score}%
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 5: Rubric Dimensions Benchmarks */}
      {activeView === 'rubric_dimensions' && (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {rubricDimensions.map((rubric) => {
              const scores = filteredCohorts.map((c) => ({
                cohort: c,
                score: c.rubricAverages[rubric.key],
              }));
              scores.sort((a, b) => b.score - a.score);
              const best = scores[0];
              const lowest = scores[scores.length - 1];

              return (
                <div
                  key={rubric.key}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 mb-3">{rubric.label}</h4>
                    <div className="space-y-2">
                      {scores.map(({ cohort, score }) => {
                        const color = getAccountColor(cohort.account);
                        return (
                          <div key={cohort.id} className="text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-mono text-[11px] font-bold text-slate-700">
                                {cohort.code}
                              </span>
                              <span className="font-mono font-bold text-slate-900">{score}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${score}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {best && lowest && (
                    <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] space-y-1 text-slate-500">
                      <div className="flex justify-between">
                        <span>Benchmark High:</span>
                        <strong className="text-emerald-700 font-mono">{best.score}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Variance:</span>
                        <strong className="text-purple-700 font-mono">
                          {best.score - lowest.score} pts
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 6: Theory vs Practice Quadrant Scatter Plot */}
      {activeView === 'theory_vs_practice' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              Correlating Standardized Test Performance (X-Axis) vs Live Roleplay Execution (Y-Axis)
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
              <button
                onClick={() => setScatterMode('centroids')}
                className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                  scatterMode === 'centroids' ? 'bg-[#2E0854] text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                Wave Centroids ({filteredCohorts.length})
              </button>
              <button
                onClick={() => setScatterMode('trainees')}
                className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                  scatterMode === 'trainees' ? 'bg-[#2E0854] text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                Individual Trainees ({filteredCohorts.reduce((s, c) => s + c.traineeCount, 0)})
              </button>
            </div>
          </div>

          <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 relative">
            {/* Quadrant Canvas */}
            <div className="relative w-full h-[400px] border border-slate-300 rounded-xl bg-white overflow-hidden shadow-2xs">
              {/* Center dividing lines at 75% */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 border-dashed" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200 border-dashed" />

              {/* Quadrant Watermark Labels */}
              <div className="absolute top-3 right-4 text-[11px] font-bold uppercase tracking-wider text-emerald-600/60 bg-emerald-50/80 px-2.5 py-1 rounded-md border border-emerald-200">
                ⭐ Star Performers (Certified Ready)
              </div>
              <div className="absolute top-3 left-4 text-[11px] font-bold uppercase tracking-wider text-blue-600/60 bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-200">
                ⚡ Intuitive Practitioners (Needs Theory)
              </div>
              <div className="absolute bottom-3 right-4 text-[11px] font-bold uppercase tracking-wider text-amber-600/60 bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-200">
                📚 Knowledgeable but Hesitant (Needs RP Drill)
              </div>
              <div className="absolute bottom-3 left-4 text-[11px] font-bold uppercase tracking-wider text-rose-600/60 bg-rose-50/80 px-2.5 py-1 rounded-md border border-rose-200">
                ⚠️ Foundation Support Required (At Risk)
              </div>

              {/* Centroids Mode Points */}
              {scatterMode === 'centroids' &&
                filteredCohorts.map((cohort) => {
                  const color = getAccountColor(cohort.account);
                  // Map 50-100 score to 0-100% canvas position
                  const xPct = Math.max(5, Math.min(95, ((cohort.avgTestScore - 50) / 50) * 100));
                  const yPct = Math.max(5, Math.min(95, 100 - ((cohort.avgRoleplayScore - 50) / 50) * 100));

                  return (
                    <div
                      key={cohort.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10 transition-transform hover:scale-125"
                      style={{ left: `${xPct}%`, top: `${yPct}%` }}
                      onMouseEnter={() =>
                        setHoveredPoint({
                          title: `${cohort.code}: ${cohort.name}`,
                          sub: `${cohort.account} Account · ${cohort.traineeCount} Trainees`,
                          test: cohort.avgTestScore,
                          rp: cohort.avgRoleplayScore,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center font-mono text-[10px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {cohort.code}
                      </div>
                    </div>
                  );
                })}

              {/* Trainees Mode Points */}
              {scatterMode === 'trainees' &&
                filteredCohorts
                  .flatMap((c) => (c.trainees || []).map((t) => ({ ...t, waveCode: c.code, cohortColor: getAccountColor(c.account) })))
                  .map((t) => {
                    const testScore = t.tests?.average || t.moduleComp || 75;
                    const rpScore = t.roleplays?.average || t.overallScore || 75;
                    const xPct = Math.max(4, Math.min(96, ((testScore - 50) / 50) * 100));
                    const yPct = Math.max(4, Math.min(96, 100 - ((rpScore - 50) / 50) * 100));

                    return (
                      <div
                        key={t.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 hover:scale-150 transition-transform"
                        style={{ left: `${xPct}%`, top: `${yPct}%` }}
                        onMouseEnter={() =>
                          setHoveredPoint({
                            title: t.name,
                            sub: `${t.account} · ${t.waveCode} · Status: ${t.status}`,
                            test: testScore,
                            rp: rpScore,
                          })
                        }
                        onMouseLeave={() => setHoveredPoint(null)}
                      >
                        <div
                          className="w-3 h-3 rounded-full border border-white shadow-xs"
                          style={{ backgroundColor: t.cohortColor }}
                        />
                      </div>
                    );
                  })}

              {/* Hover Tooltip Box */}
              {hoveredPoint && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-slate-900 text-white px-3.5 py-2 rounded-xl shadow-xl text-xs space-y-0.5 border border-slate-700 pointer-events-none">
                  <div className="font-bold">{hoveredPoint.title}</div>
                  <div className="text-[11px] text-slate-400">{hoveredPoint.sub}</div>
                  <div className="text-[11px] font-mono text-emerald-400 pt-0.5">
                    Test Score: {hoveredPoint.test}% · RP Score: {hoveredPoint.rp}%
                  </div>
                </div>
              )}
            </div>

            {/* Axis Labels */}
            <div className="flex justify-between text-xs font-bold text-slate-500 mt-2 px-1">
              <span>50% Test Score</span>
              <span>Standardized Test Performance (Theory) →</span>
              <span>100% Test Score</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossCohortCharts;
