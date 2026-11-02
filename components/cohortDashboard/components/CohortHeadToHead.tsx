import React, { useState, useMemo } from 'react';
import {
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Award,
  Users,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { CohortSummary, BusinessAccount } from '../types';

interface CohortHeadToHeadProps {
  cohorts: CohortSummary[];
  initialCohortAId?: string;
  initialCohortBId?: string;
}

export const CohortHeadToHead: React.FC<CohortHeadToHeadProps> = ({
  cohorts,
  initialCohortAId,
  initialCohortBId,
}) => {
  const [comparatorMode, setComparatorMode] = useState<'wave' | 'account'>('wave');
  const [cohortAId, setCohortAId] = useState<string>(
    initialCohortAId || cohorts[0]?.id || 'cohort-1'
  );
  const [cohortBId, setCohortBId] = useState<string>(
    initialCohortBId || (cohorts.length >= 6 ? cohorts[5]?.id : cohorts[1]?.id) || 'cohort-6'
  );

  const [accountA, setAccountA] = useState<BusinessAccount>('Mobility');
  const [accountB, setAccountB] = useState<BusinessAccount>('Travel');

  // Wave vs Wave cohorts
  const cohortA = cohorts.find((c) => c.id === cohortAId || c.code === cohortAId) || cohorts[0];
  const cohortB = cohorts.find((c) => c.id === cohortBId || c.code === cohortBId) || cohorts[cohorts.length - 1];

  // Account vs Account rollups
  const accountStats = useMemo(() => {
    const compute = (acc: BusinessAccount) => {
      const list = cohorts.filter((c) => c.account === acc);
      const allTrainees = list.flatMap((c) => c.trainees || []);
      const count = allTrainees.length;
      const avgOverall = count > 0 ? Math.round(allTrainees.reduce((s, t) => s + t.overallScore, 0) / count) : 0;
      const avgRP = count > 0 ? Math.round(allTrainees.reduce((s, t) => s + t.roleplays.average, 0) / count) : 0;
      const avgTest = count > 0 ? Math.round(allTrainees.reduce((s, t) => s + t.tests.average, 0) / count) : 0;
      const initialRP = count > 0 ? Number((allTrainees.reduce((s, t) => s + t.initialRP, 0) / count).toFixed(2)) : 0;
      const finalRP = count > 0 ? Number((allTrainees.reduce((s, t) => s + t.finalRP, 0) / count).toFixed(2)) : 0;
      const certRate = count > 0 ? Math.round((allTrainees.filter((t) => t.status === 'Ready').length / count) * 100) : 0;
      const atRiskCount = allTrainees.filter((t) => t.status === 'At Risk' || t.status === 'Remediation Needed').length;

      return {
        account: acc,
        wavesCount: list.length,
        traineeCount: count,
        avgOverallScore: avgOverall,
        avgRoleplayScore: avgRP,
        avgTestScore: avgTest,
        initialRP,
        finalRP,
        rpGain: Number((finalRP - initialRP).toFixed(2)),
        certificationRate: certRate,
        atRiskCount,
        color: acc === 'Mobility' ? '#06C167' : acc === 'Teleco' ? '#3B82F6' : '#8B5CF6',
      };
    };

    return {
      Mobility: compute('Mobility'),
      Teleco: compute('Teleco'),
      Travel: compute('Travel'),
    };
  }, [cohorts]);

  if (!cohortA || !cohortB) return null;

  const subjectA =
    comparatorMode === 'wave'
      ? {
          title: cohortA.name,
          code: cohortA.code,
          account: cohortA.account,
          trainer: cohortA.trainer,
          count: cohortA.traineeCount,
          overall: cohortA.avgOverallScore,
          rp: cohortA.avgRoleplayScore,
          test: cohortA.avgTestScore,
          cert: cohortA.certificationRate,
          initialRP: cohortA.initialRP,
          finalRP: cohortA.finalRP,
          gain: cohortA.rpGain,
          color: cohortA.account === 'Mobility' ? '#06C167' : cohortA.account === 'Teleco' ? '#3B82F6' : '#8B5CF6',
        }
      : {
          title: `${accountA} Account Portfolio`,
          code: accountA.slice(0, 3).toUpperCase(),
          account: accountA,
          trainer: `${accountStats[accountA].wavesCount} Waves`,
          count: accountStats[accountA].traineeCount,
          overall: accountStats[accountA].avgOverallScore,
          rp: accountStats[accountA].avgRoleplayScore,
          test: accountStats[accountA].avgTestScore,
          cert: accountStats[accountA].certificationRate,
          initialRP: accountStats[accountA].initialRP,
          finalRP: accountStats[accountA].finalRP,
          gain: accountStats[accountA].rpGain,
          color: accountStats[accountA].color,
        };

  const subjectB =
    comparatorMode === 'wave'
      ? {
          title: cohortB.name,
          code: cohortB.code,
          account: cohortB.account,
          trainer: cohortB.trainer,
          count: cohortB.traineeCount,
          overall: cohortB.avgOverallScore,
          rp: cohortB.avgRoleplayScore,
          test: cohortB.avgTestScore,
          cert: cohortB.certificationRate,
          initialRP: cohortB.initialRP,
          finalRP: cohortB.finalRP,
          gain: cohortB.rpGain,
          color: cohortB.account === 'Mobility' ? '#06C167' : cohortB.account === 'Teleco' ? '#3B82F6' : '#8B5CF6',
        }
      : {
          title: `${accountB} Account Portfolio`,
          code: accountB.slice(0, 3).toUpperCase(),
          account: accountB,
          trainer: `${accountStats[accountB].wavesCount} Waves`,
          count: accountStats[accountB].traineeCount,
          overall: accountStats[accountB].avgOverallScore,
          rp: accountStats[accountB].avgRoleplayScore,
          test: accountStats[accountB].avgTestScore,
          cert: accountStats[accountB].certificationRate,
          initialRP: accountStats[accountB].initialRP,
          finalRP: accountStats[accountB].finalRP,
          gain: accountStats[accountB].rpGain,
          color: accountStats[accountB].color,
        };

  const diffOverall = subjectB.overall - subjectA.overall;
  const diffRP = subjectB.rp - subjectA.rp;
  const diffTest = subjectB.test - subjectA.test;
  const diffCert = subjectB.cert - subjectA.cert;

  const roleplays = [
    { key: 'rp1Discovery', label: 'RP 1: Discovery & Needs Analysis' },
    { key: 'rp2Objection', label: 'RP 2: Objection Handling' },
    { key: 'rp3ValuePitch', label: 'RP 3: Value Prop & Pitch' },
    { key: 'rp4Deescalation', label: 'RP 4: Difficult Customer De-escalation' },
    { key: 'rp5Closing', label: 'RP 5: Negotiation & Closing' },
  ] as const;

  const tests = [
    { key: 'baselineTest', label: 'Pre-Training Baseline Assessment' },
    { key: 'module1Test', label: 'Module 1: Product Fundamentals' },
    { key: 'module2Test', label: 'Module 2: Sales Methodology & Compliance' },
    { key: 'module3Test', label: 'Module 3: Advanced Scenarios & Case Study' },
    { key: 'finalExam', label: 'Final Certification Exam' },
  ] as const;

  const rubrics = [
    { key: 'communication', label: 'Communication & Delivery' },
    { key: 'productKnowledge', label: 'Product Knowledge Depth' },
    { key: 'activeListening', label: 'Active Listening & Needs Probing' },
    { key: 'objectionHandling', label: 'Objection Resolution' },
    { key: 'callControl', label: 'Pacing & Call Control' },
  ] as const;

  const renderDelta = (delta: number, suffix = '%') => {
    if (delta > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-700">
          <TrendingUp className="w-3.5 h-3.5" />
          +{delta}{suffix}
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-700">
          <TrendingDown className="w-3.5 h-3.5" />
          {delta}{suffix}
        </span>
      );
    }
    return <span className="text-xs font-medium text-slate-400">0{suffix} (Equal)</span>;
  };

  return (
    <div className="space-y-6">
      {/* Comparator Selectors & Top Summary */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#2E0854]" />
              Head-to-Head Comparative Engine
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any two waves or business accounts to examine direct variance across modules and roleplays
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            {/* Mode Switcher */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
              <button
                onClick={() => setComparatorMode('wave')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  comparatorMode === 'wave' ? 'bg-[#2E0854] text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Wave vs Wave
              </button>
              <button
                onClick={() => setComparatorMode('account')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  comparatorMode === 'account' ? 'bg-[#2E0854] text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Account vs Account
              </button>
            </div>

            {comparatorMode === 'wave' ? (
              <div className="flex items-center gap-2 text-xs">
                {/* Cohort A Selector */}
                <select
                  value={cohortAId}
                  onChange={(e) => setCohortAId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold cursor-pointer"
                >
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.account} · {c.name} ({c.code})
                    </option>
                  ))}
                </select>

                <span className="font-extrabold text-slate-400">VS</span>

                {/* Cohort B Selector */}
                <select
                  value={cohortBId}
                  onChange={(e) => setCohortBId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold cursor-pointer"
                >
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.account} · {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={accountA}
                  onChange={(e) => setAccountA(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold cursor-pointer"
                >
                  <option value="Mobility">Mobility Account</option>
                  <option value="Teleco">Teleco Account</option>
                  <option value="Travel">Travel Account</option>
                </select>

                <span className="font-extrabold text-slate-400">VS</span>

                <select
                  value={accountB}
                  onChange={(e) => setAccountB(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold cursor-pointer"
                >
                  <option value="Mobility">Mobility Account</option>
                  <option value="Teleco">Teleco Account</option>
                  <option value="Travel">Travel Account</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Differential Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Combined Overall Score
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-mono font-bold text-slate-900">
                {subjectA.overall}% vs {subjectB.overall}%
              </span>
              {renderDelta(diffOverall)}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Roleplays Average
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-mono font-bold text-slate-900">
                {subjectA.rp}% vs {subjectB.rp}%
              </span>
              {renderDelta(diffRP)}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Standardized Tests Average
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-mono font-bold text-slate-900">
                {subjectA.test}% vs {subjectB.test}%
              </span>
              {renderDelta(diffTest)}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Certification Readiness
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-mono font-bold text-slate-900">
                {subjectA.cert}% vs {subjectB.cert}%
              </span>
              {renderDelta(diffCert)}
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Detailed Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roleplay Scenarios Side-by-Side */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <h4 className="font-bold text-sm text-slate-900 flex items-center justify-between">
            <span>Roleplay Scenarios Variance</span>
            <span className="text-xs font-mono font-normal text-slate-500">
              {subjectA.code} vs {subjectB.code}
            </span>
          </h4>

          <div className="space-y-3">
            {roleplays.map((r) => {
              const scoreA = cohortA.roleplayAverages[r.key];
              const scoreB = cohortB.roleplayAverages[r.key];
              const delta = scoreB - scoreA;

              return (
                <div key={r.key} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-800">
                    <span>{r.label}</span>
                    {renderDelta(delta)}
                  </div>
                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                        <span>{subjectA.code}</span>
                        <strong className="text-slate-900">{scoreA}%</strong>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${scoreA}%`, backgroundColor: subjectA.color }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                        <span>{subjectB.code}</span>
                        <strong className="text-slate-900">{scoreB}%</strong>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${scoreB}%`, backgroundColor: subjectB.color }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Standardized Tests Side-by-Side */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <h4 className="font-bold text-sm text-slate-900 flex items-center justify-between">
            <span>Standardized Tests Variance</span>
            <span className="text-xs font-mono font-normal text-slate-500">
              {subjectA.code} vs {subjectB.code}
            </span>
          </h4>

          <div className="space-y-3">
            {tests.map((t) => {
              const scoreA = cohortA.testAverages[t.key];
              const scoreB = cohortB.testAverages[t.key];
              const delta = scoreB - scoreA;

              return (
                <div key={t.key} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-800">
                    <span>{t.label}</span>
                    {renderDelta(delta)}
                  </div>
                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                        <span>{subjectA.code}</span>
                        <strong className="text-slate-900">{scoreA}%</strong>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${scoreA}%`, backgroundColor: subjectA.color }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                        <span>{subjectB.code}</span>
                        <strong className="text-slate-900">{scoreB}%</strong>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${scoreB}%`, backgroundColor: subjectB.color }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CohortHeadToHead;
