import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Sparkles,
  Award,
  Layers,
  Zap,
  GraduationCap,
  Compass
} from 'lucide-react';
import { CohortSummary } from '../types';

interface CrossCohortChartsProps {
  cohorts: CohortSummary[];
}

type ChartView = 'roleplay_scenarios' | 'test_modules' | 'rubric_dimensions' | 'theory_vs_practice' | 'cohort_evolution';

export const CrossCohortCharts: React.FC<CrossCohortChartsProps> = ({ cohorts }) => {
  const [activeView, setActiveView] = useState<ChartView>('roleplay_scenarios');

  // Palette for each of the 6 cohorts
  const cohortColors: Record<number, { bg: string; border: string; text: string; fill: string }> = {
    1: { bg: 'bg-rose-500/20', border: 'border-rose-500', text: 'text-rose-400', fill: '#f43f5e' },
    2: { bg: 'bg-amber-500/20', border: 'border-amber-500', text: 'text-amber-400', fill: '#f59e0b' },
    3: { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', fill: '#10b981' },
    4: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400', fill: '#06b6d4' },
    5: { bg: 'bg-indigo-500/20', border: 'border-indigo-500', text: 'text-indigo-400', fill: '#6366f1' },
    6: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400', fill: '#a855f7' },
  };

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

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Chart Header & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Cross-Cohort Comparative Analytics
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare performance across all 6 sheets to pinpoint curriculum strengths and skill gaps
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveView('roleplay_scenarios')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'roleplay_scenarios'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Roleplay Scenarios
          </button>
          <button
            onClick={() => setActiveView('test_modules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'test_modules'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Test Modules
          </button>
          <button
            onClick={() => setActiveView('rubric_dimensions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'rubric_dimensions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Rubric Dimensions
          </button>
          <button
            onClick={() => setActiveView('theory_vs_practice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'theory_vs_practice'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Theory vs Practice Matrix
          </button>
          <button
            onClick={() => setActiveView('cohort_evolution')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'cohort_evolution'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Progression Over Time
          </button>
        </div>
      </div>

      {/* Cohort Legend */}
      <div className="flex items-center flex-wrap gap-2.5 pt-1">
        <span className="text-xs font-semibold text-slate-400">Cohort Legend:</span>
        {cohorts.map((c) => {
          const style = cohortColors[c.sheetIndex] || cohortColors[1];
          return (
            <div
              key={c.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-slate-950 ${style.border}`}
            >
              <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: style.fill }}></span>
              <span className="text-white font-bold">C{c.sheetIndex}:</span>
              <span className="text-slate-300">{c.name.replace(/Cohort \d+ - /, '')}</span>
            </div>
          );
        })}
      </div>

      {/* VIEW 1: Roleplay Scenarios Comparison */}
      {activeView === 'roleplay_scenarios' && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {roleplayScenarios.map((scenario) => {
              // Find min and max cohort for this scenario
              const scenarioScores = cohorts.map((c) => ({
                cohort: c,
                score: c.roleplayAverages[scenario.key],
              }));
              scenarioScores.sort((a, b) => b.score - a.score);
              const best = scenarioScores[0];
              const lowest = scenarioScores[scenarioScores.length - 1];

              return (
                <div
                  key={scenario.key}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">{scenario.icon}</span>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Best: C{best.cohort.sheetIndex} ({best.score}%)
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">
                      {scenario.label}
                    </h4>
                  </div>

                  {/* Grouped bars for all 6 cohorts */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    {cohorts.map((c) => {
                      const score = c.roleplayAverages[scenario.key];
                      const style = cohortColors[c.sheetIndex] || cohortColors[1];
                      return (
                        <div key={c.id} className="space-y-0.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-mono">C{c.sheetIndex} ({c.code})</span>
                            <span className="font-bold text-slate-200">{score}%</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${score}%`, backgroundColor: style.fill }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
                    <span>Spread: <strong>{best.score - lowest.score}%</strong></span>
                    <span>Avg: <strong>{Math.round(cohorts.reduce((acc, c) => acc + c.roleplayAverages[scenario.key], 0) / cohorts.length)}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-200">Key Roleplay Insight:</strong> Objection Handling (RP2) exhibited the greatest performance gap across cohorts (C1: 71% vs C6: 86%), reflecting substantial curriculum enhancements introduced in the Delta and Zeta cohorts.
            </p>
          </div>
        </div>
      )}

      {/* VIEW 2: Test Modules Comparison */}
      {activeView === 'test_modules' && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {testModules.map((mod) => {
              const testScores = cohorts.map((c) => ({
                cohort: c,
                score: c.testAverages[mod.key],
              }));
              testScores.sort((a, b) => b.score - a.score);
              const best = testScores[0];
              const lowest = testScores[testScores.length - 1];

              return (
                <div
                  key={mod.key}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">{mod.icon}</span>
                      <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        Top: C{best.cohort.sheetIndex} ({best.score}%)
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">
                      {mod.label}
                    </h4>
                  </div>

                  {/* Grouped bars */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    {cohorts.map((c) => {
                      const score = c.testAverages[mod.key];
                      const style = cohortColors[c.sheetIndex] || cohortColors[1];
                      return (
                        <div key={c.id} className="space-y-0.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-mono">C{c.sheetIndex}</span>
                            <span className="font-bold text-slate-200">{score}%</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${score}%`, backgroundColor: style.fill }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
                    <span>Gain over Base: <strong>+{mod.key === 'baselineTest' ? 0 : Math.max(0, best.score - 72)}%</strong></span>
                    <span>Avg: <strong>{Math.round(cohorts.reduce((acc, c) => acc + c.testAverages[mod.key], 0) / cohorts.length)}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
            <GraduationCap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-200">Knowledge Retention Trend:</strong> Final Exam scores climbed steadily from Cohort 1 (84%) through Cohort 6 (94%), demonstrating that question banking and quiz remediation between modules effectively reduced exam retakes by 65%.
            </p>
          </div>
        </div>
      )}

      {/* VIEW 3: Rubric Dimensions */}
      {activeView === 'rubric_dimensions' && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {rubricDimensions.map((rubric) => {
              const rubricScores = cohorts.map((c) => ({
                cohort: c,
                score: c.rubricAverages[rubric.key],
              }));
              rubricScores.sort((a, b) => b.score - a.score);
              const best = rubricScores[0];

              return (
                <div key={rubric.key} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">{rubric.label}</h4>
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      Best: C{best.cohort.sheetIndex}
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    {cohorts.map((c) => {
                      const score = c.rubricAverages[rubric.key];
                      const style = cohortColors[c.sheetIndex] || cohortColors[1];
                      return (
                        <div key={c.id}>
                          <div className="flex justify-between items-center text-[10px] mb-0.5">
                            <span className="text-slate-400">Cohort {c.sheetIndex}</span>
                            <span className="font-bold text-white">{score}%</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full"
                              style={{ width: `${score}%`, backgroundColor: style.fill }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: Theory vs Practice Quadrant Matrix */}
      {activeView === 'theory_vs_practice' && (
        <div className="space-y-6 pt-2">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  Theory (Tests) vs. Practice (Roleplays) Quadrant Analysis
                </h4>
                <p className="text-xs text-slate-400">
                  Compares test knowledge proficiency (X-axis) against real-time live simulation execution (Y-axis)
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">Threshold: 75% RP | 80% Test</span>
            </div>

            {/* 4 Quadrants Background Grid */}
            <div className="relative border border-slate-800 rounded-xl bg-slate-950 h-80 p-4 flex flex-col justify-between overflow-hidden">
              {/* Top Left Quadrant Label: High Practice, Lower Theory */}
              <div className="absolute top-3 left-4 text-[10px] text-amber-400/70 font-semibold uppercase tracking-wider">
                Natural Roleplayers (High Practice, Lower Theory)
              </div>
              {/* Top Right Quadrant Label: Elite Performers */}
              <div className="absolute top-3 right-4 text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Elite Performers (Mastered Both)
              </div>
              {/* Bottom Left: Needs Remediation */}
              <div className="absolute bottom-3 left-4 text-[10px] text-rose-400/70 font-semibold uppercase tracking-wider">
                Needs Full Remediation (Below Target)
              </div>
              {/* Bottom Right: High Theory, Lower Practice */}
              <div className="absolute bottom-3 right-4 text-[10px] text-cyan-400/70 font-semibold uppercase tracking-wider">
                Academic Theorists (High Theory, Needs Live Sparring)
              </div>

              {/* Grid dividers */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-800/80 dashed" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-800/80 dashed" />

              {/* Plot Cohort Centroids */}
              <div className="relative w-full h-full">
                {cohorts.map((c) => {
                  // Normalize coordinates to 60-100% range
                  const xPct = Math.min(95, Math.max(5, ((c.avgTestScore - 65) / 35) * 100));
                  const yPct = Math.min(95, Math.max(5, 100 - ((c.avgRoleplayScore - 65) / 35) * 100));
                  const style = cohortColors[c.sheetIndex] || cohortColors[1];

                  return (
                    <div
                      key={c.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10 cursor-pointer"
                      style={{ left: `${xPct}%`, top: `${yPct}%` }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-lg border-2 transition-transform group-hover:scale-125"
                        style={{ backgroundColor: style.fill, borderColor: '#ffffff40' }}
                      >
                        C{c.sheetIndex}
                      </div>

                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs shadow-2xl w-48 pointer-events-none z-20">
                        <span className="font-bold text-white">{c.name}</span>
                        <span className="text-[11px] text-slate-400">Trainer: {c.trainer}</span>
                        <div className="flex justify-between mt-1 text-[11px] pt-1 border-t border-slate-800">
                          <span className="text-cyan-400">Test: {c.avgTestScore}%</span>
                          <span className="text-indigo-400">RP: {c.avgRoleplayScore}%</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                          {c.certificationRate}% Ready for Deploy
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-2">
              <span>← Lower Test Knowledge (65%)</span>
              <span className="font-semibold text-slate-400">Test Assessment Score (X)</span>
              <span>Higher Test Knowledge (100%) →</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: Cohort Evolution Line / Trend */}
      {activeView === 'cohort_evolution' && (
        <div className="space-y-6 pt-2">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Chronological Performance Progression (Cohort 1 through Cohort 6)
            </h4>

            <div className="space-y-4">
              {cohorts.map((c) => {
                const style = cohortColors[c.sheetIndex] || cohortColors[1];
                return (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center font-mono text-white" style={{ backgroundColor: style.fill }}>
                          C{c.sheetIndex}
                        </span>
                        <span className="font-semibold text-white">{c.name}</span>
                        <span className="text-[11px] text-slate-500 font-normal">({c.trainer})</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-slate-400">RP: <strong className="text-indigo-300">{c.avgRoleplayScore}%</strong></span>
                        <span className="text-slate-400">Test: <strong className="text-cyan-300">{c.avgTestScore}%</strong></span>
                        <span className="font-bold text-white">Overall: {c.avgOverallScore}%</span>
                        <span className="text-emerald-400 font-semibold">{c.certificationRate}% Cert</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden flex">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${c.avgRoleplayScore / 2}%` }}
                        title={`Roleplay: ${c.avgRoleplayScore}%`}
                      />
                      <div
                        className="h-full bg-cyan-500 transition-all duration-500"
                        style={{ width: `${c.avgTestScore / 2}%` }}
                        title={`Test: ${c.avgTestScore}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-indigo-500"></span> Roleplays Component (50%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-cyan-500"></span> Tests Component (50%)
                </span>
              </div>
              <span className="text-emerald-400 font-semibold">
                +14% Total Program Gain from Cohort 1 to Cohort 6
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
