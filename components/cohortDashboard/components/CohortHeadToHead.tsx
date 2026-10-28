import React, { useState } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { CohortSummary } from '../types';

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
  const [cohortAId, setCohortAId] = useState<string>(
    initialCohortAId || cohorts[0]?.id || 'cohort-1'
  );
  const [cohortBId, setCohortBId] = useState<string>(
    initialCohortBId || (cohorts.length >= 6 ? cohorts[5]?.id : cohorts[1]?.id) || 'cohort-6'
  );

  const cohortA = cohorts.find((c) => c.id === cohortAId) || cohorts[0];
  const cohortB = cohorts.find((c) => c.id === cohortBId) || cohorts[cohorts.length - 1];

  if (!cohortA || !cohortB) return null;

  const diffOverall = cohortB.avgOverallScore - cohortA.avgOverallScore;
  const diffRP = cohortB.avgRoleplayScore - cohortA.avgRoleplayScore;
  const diffTest = cohortB.avgTestScore - cohortA.avgTestScore;
  const diffCert = cohortB.certificationRate - cohortA.certificationRate;

  const roleplays = [
    { key: 'rp1Discovery', label: 'RP 1: Discovery & Needs Analysis' },
    { key: 'rp2Objection', label: 'RP 2: Objection Handling' },
    { key: 'rp3ValuePitch', label: 'RP 3: Value Prop & Pitch' },
    { key: 'rp4Deescalation', label: 'RP 4: Difficult Customer De-escalation' },
    { key: 'rp5Closing', label: 'RP 5: Commercial Negotiation & Closing' },
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
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-400">
          <TrendingUp className="w-3.5 h-3.5" />
          +{delta}{suffix}
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-400">
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
              Head-to-Head Cohort Comparator
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any two cohorts to examine variance across specific roleplays, test modules, and trainer tactics
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Cohort A Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-400 uppercase">Cohort A:</span>
              <select
                value={cohortAId}
                onChange={(e) => setCohortAId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500 font-semibold cursor-pointer"
              >
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    Sheet {c.sheetIndex}: {c.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-bold text-slate-500">VS</span>

            {/* Cohort B Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-400 uppercase">Cohort B:</span>
              <select
                value={cohortBId}
                onChange={(e) => setCohortBId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500 font-semibold cursor-pointer"
              >
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    Sheet {c.sheetIndex}: {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Differential Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400">Overall Score Delta</span>
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-indigo-400">{cohortA.avgOverallScore}%</span>
                <span className="text-xs text-slate-500">vs</span>
                <span className="text-xl font-bold text-cyan-400">{cohortB.avgOverallScore}%</span>
              </div>
              {renderDelta(diffOverall, '%')}
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400">Roleplay Simulation Delta</span>
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-indigo-400">{cohortA.avgRoleplayScore}%</span>
                <span className="text-xs text-slate-500">vs</span>
                <span className="text-xl font-bold text-cyan-400">{cohortB.avgRoleplayScore}%</span>
              </div>
              {renderDelta(diffRP, '%')}
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400">Test Knowledge Delta</span>
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-indigo-400">{cohortA.avgTestScore}%</span>
                <span className="text-xs text-slate-500">vs</span>
                <span className="text-xl font-bold text-cyan-400">{cohortB.avgTestScore}%</span>
              </div>
              {renderDelta(diffTest, '%')}
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400">Certification Readiness</span>
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-indigo-400">{cohortA.certificationRate}%</span>
                <span className="text-xs text-slate-500">vs</span>
                <span className="text-xl font-bold text-cyan-400">{cohortB.certificationRate}%</span>
              </div>
              {renderDelta(diffCert, '%')}
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Detailed Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roleplays Scenario Delta Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center justify-between">
            <span>Roleplay Simulations Head-to-Head</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-indigo-400">■ C{cohortA.sheetIndex}</span>
              <span className="text-cyan-400">■ C{cohortB.sheetIndex}</span>
            </div>
          </h4>

          <div className="space-y-3.5 pt-2">
            {roleplays.map((rp) => {
              const scoreA = cohortA.roleplayAverages[rp.key];
              const scoreB = cohortB.roleplayAverages[rp.key];
              const delta = scoreB - scoreA;

              return (
                <div key={rp.key} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{rp.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400 font-bold">{scoreA}%</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-cyan-400 font-bold">{scoreB}%</span>
                      {renderDelta(delta, '%')}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full"
                        style={{ width: `${scoreA}%` }}
                      />
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-1.5 rounded-full"
                        style={{ width: `${scoreB}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Test Assessments Modules Head-to-Head */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center justify-between">
            <span>Test Assessments Modules Head-to-Head</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-indigo-400">■ C{cohortA.sheetIndex}</span>
              <span className="text-cyan-400">■ C{cohortB.sheetIndex}</span>
            </div>
          </h4>

          <div className="space-y-3.5 pt-2">
            {tests.map((t) => {
              const scoreA = cohortA.testAverages[t.key];
              const scoreB = cohortB.testAverages[t.key];
              const delta = scoreB - scoreA;

              return (
                <div key={t.key} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{t.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400 font-bold">{scoreA}%</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-cyan-400 font-bold">{scoreB}%</span>
                      {renderDelta(delta, '%')}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full"
                        style={{ width: `${scoreA}%` }}
                      />
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-1.5 rounded-full"
                        style={{ width: `${scoreB}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Qualitative Cohort Summary Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold text-xs border border-indigo-500/20">
              Sheet {cohortA.sheetIndex}: {cohortA.name}
            </span>
            <span className="text-xs text-slate-400">Trainer: {cohortA.trainer}</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Top Performer: <strong className="text-white">{cohortA.topPerformer.name}</strong> ({cohortA.topPerformer.score}%).
            Trainee count is {cohortA.traineeCount}. Pass rate on roleplays is {cohortA.roleplayPassRate}% and test certification rate is {cohortA.testPassRate}%.
          </p>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 font-bold text-xs border border-cyan-500/20">
              Sheet {cohortB.sheetIndex}: {cohortB.name}
            </span>
            <span className="text-xs text-slate-400">Trainer: {cohortB.trainer}</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Top Performer: <strong className="text-white">{cohortB.topPerformer.name}</strong> ({cohortB.topPerformer.score}%).
            Trainee count is {cohortB.traineeCount}. Pass rate on roleplays is {cohortB.roleplayPassRate}% and test certification rate is {cohortB.testPassRate}%.
          </p>
        </div>
      </div>
    </div>
  );
};
