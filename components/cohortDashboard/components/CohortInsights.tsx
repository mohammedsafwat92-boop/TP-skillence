import React, { useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Award,
  CheckCircle2,
  Zap,
  GraduationCap,
  Users,
  Compass,
  ArrowUpRight,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import { CohortSummary, BusinessAccount } from '../types';

interface CohortInsightsProps {
  cohorts: CohortSummary[];
}

export const CohortInsights: React.FC<CohortInsightsProps> = ({ cohorts }) => {
  const totalTrainees = cohorts.reduce((acc, c) => acc + c.traineeCount, 0);

  // 1. Scenario Uplift Analytics
  const scenarioStats = useMemo(() => {
    const keys = [
      { key: 'rp1Discovery', name: 'RP1: Discovery & Needs Analysis' },
      { key: 'rp2Objection', name: 'RP2: Objection Handling' },
      { key: 'rp3ValuePitch', name: 'RP3: Value Proposition & Demo' },
      { key: 'rp4Deescalation', name: 'RP4: Difficult Customer De-escalation' },
      { key: 'rp5Closing', name: 'RP5: Commercial Negotiation & Closing' },
    ] as const;

    const list = keys.map(({ key, name }) => {
      const scores = cohorts.map((c) => c.roleplayAverages[key] || 0);
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const uplift = max - min;
      return { key, name, avg, min, max, uplift };
    });

    list.sort((a, b) => b.uplift - a.uplift);
    return {
      highestUplift: list[0] || { name: 'Objection Handling', uplift: 15, avg: 82 },
      lowestUplift: list[list.length - 1] || { name: 'Discovery', uplift: 6, avg: 86 },
    };
  }, [cohorts]);

  // 2. Account Leader & Bottleneck
  const accountInsights = useMemo(() => {
    const accounts: BusinessAccount[] = ['Mobility', 'Teleco', 'Travel'];
    const rollups = accounts.map((acc) => {
      const list = cohorts.filter((c) => c.account === acc);
      const trainees = list.flatMap((c) => c.trainees || []);
      const count = trainees.length;
      const certReady = trainees.filter((t) => t.status === 'Ready').length;
      const certRate = count > 0 ? Math.round((certReady / count) * 100) : 0;
      const atRiskCount = trainees.filter((t) => t.status === 'At Risk' || t.status === 'Remediation Needed').length;
      const avgOverall = count > 0 ? Math.round(trainees.reduce((s, t) => s + t.overallScore, 0) / count) : 0;

      return {
        account: acc,
        count,
        certRate,
        atRiskCount,
        avgOverall,
        color: acc === 'Mobility' ? '#06C167' : acc === 'Teleco' ? '#3B82F6' : '#8B5CF6',
      };
    });

    rollups.sort((a, b) => b.certRate - a.certRate);
    const leader = rollups[0];
    const bottleneck = [...rollups].sort((a, b) => b.atRiskCount - a.atRiskCount)[0];

    return { leader, bottleneck, rollups };
  }, [cohorts]);

  // 3. Trainer breakdown
  const trainerMap = useMemo(() => {
    const map: Record<string, { count: number; totalScore: number; cohorts: string[] }> = {};
    cohorts.forEach((c) => {
      const t = c.trainer || 'Lead Trainer';
      if (!map[t]) {
        map[t] = { count: 0, totalScore: 0, cohorts: [] };
      }
      map[t].count += c.traineeCount;
      map[t].totalScore += c.avgOverallScore * c.traineeCount;
      map[t].cohorts.push(c.code);
    });
    return map;
  }, [cohorts]);

  // 4. Total At-Risk Action Plan
  const atRiskTrainees = useMemo(() => {
    return cohorts
      .flatMap((c) => c.trainees || [])
      .filter((t) => t.status === 'At Risk' || t.status === 'Remediation Needed');
  }, [cohorts]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#2E0854] via-[#3d0b6e] to-[#2E0854] border border-purple-800 rounded-2xl p-6 shadow-sm text-white relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              Cross-Cohort Curriculum Intelligence &amp; Performance Diagnostics
            </h3>
            <p className="text-xs text-purple-100 mt-1 leading-relaxed max-w-3xl">
              Synthesized from {cohorts.length} training waves across {totalTrainees} total agents. Real-time diagnostic data evaluates variance across roleplay simulations, test mastery, facilitator execution, and graduation readiness.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Dynamic Diagnostic Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diagnostic 1: Roleplay Scenario Uplift */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#2E0854] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Scenario Progression Spread
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              +{scenarioStats.highestUplift.uplift}% Peak Spread
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-900">
            {scenarioStats.highestUplift.name} Shows Largest Trajectory Variance
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Performance on <strong>{scenarioStats.highestUplift.name}</strong> ranges from {scenarioStats.highestUplift.min}% in earlier waves to {scenarioStats.highestUplift.max}% in mature waves (mean: {scenarioStats.highestUplift.avg}%). In contrast, <strong>{scenarioStats.lowestUplift.name}</strong> showed consistent baseline execution ({scenarioStats.lowestUplift.min}% to {scenarioStats.lowestUplift.max}%).
          </p>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Recommended: Prioritize structured objection sparring in pre-work to accelerate trajectory in new waves.</span>
          </div>
        </div>

        {/* Diagnostic 2: Account Portfolio Leader & Bottleneck */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#2E0854] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              Account Portfolio Benchmark
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {accountInsights.leader.account} Leads at {accountInsights.leader.certRate}% Ready
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-900">
            {accountInsights.leader.account} Sets the Pace; {accountInsights.bottleneck.account} Concentrates Intervention Needs
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>{accountInsights.leader.account}</strong> achieved the highest combined certification readiness ({accountInsights.leader.certRate}%) with an average score of {accountInsights.leader.avgOverall}%. <strong>{accountInsights.bottleneck.account}</strong> has {accountInsights.bottleneck.atRiskCount} trainees flagged for high-priority support.
          </p>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Recommended: Reallocate mentor hours toward {accountInsights.bottleneck.account} agents to resolve compliance test gaps.</span>
          </div>
        </div>

        {/* Diagnostic 3: Trainer Methodology Impact */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#2E0854] uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-600" />
              Facilitator Effectiveness
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {Object.keys(trainerMap).length} Coaches Tracked
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-900">
            Cross-Facilitator Cohort Benchmarks
          </h4>

          <div className="space-y-2 pt-1">
            {(Object.entries(trainerMap) as [string, { count: number; totalScore: number; cohorts: string[] }][]).map(
              ([trainerName, data]) => {
                const avgScore = Math.round(data.totalScore / (data.count || 1));
                return (
                  <div
                    key={trainerName}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 block">{trainerName}</span>
                      <span className="text-[11px] text-slate-500">
                        Waves: {data.cohorts.join(', ')} · {data.count} trainees
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-[#2E0854]">{avgScore}% Combined</span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Diagnostic 4: At-Risk Action Plan */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              At-Risk Action Plan
            </span>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {atRiskTrainees.length} Agents Need Support
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-900">
            Targeted Remediation Protocol
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {atRiskTrainees.length} out of {totalTrainees} agents are currently in "At Risk" or "Remediation Needed" status. Common drivers include Module 2 compliance retakes and pacing on objection handling.
          </p>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Target: Initiate 1:1 coach sessions and schedule retake examinations for flagged trainees prior to cohort graduation.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CohortInsights;
