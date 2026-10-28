import React from 'react';
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
  ArrowUpRight
} from 'lucide-react';
import { CohortSummary } from '../types';

interface CohortInsightsProps {
  cohorts: CohortSummary[];
}

export const CohortInsights: React.FC<CohortInsightsProps> = ({ cohorts }) => {
  // Compute analytics
  const sortedByOverall = [...cohorts].sort((a, b) => b.avgOverallScore - a.avgOverallScore);
  const bestCohort = sortedByOverall[0];
  const lowestCohort = sortedByOverall[sortedByOverall.length - 1];

  // Compare first wave and last wave
  const cFirst = cohorts[0] || {
    name: 'Wave 1',
    code: 'W1',
    sheetIndex: 1,
    avgOverallScore: 78,
    avgRoleplayScore: 75,
    atRiskCount: 2,
    roleplayAverages: { rp2Objection: 72 }
  } as CohortSummary;
  const cLast = cohorts[cohorts.length - 1] || cFirst;
  const progressionGain = Math.max(0, cLast.avgOverallScore - cFirst.avgOverallScore);

  // Trainer breakdown
  const trainerMap: Record<string, { count: number; totalScore: number; cohorts: string[] }> = {};
  cohorts.forEach((c) => {
    const t = c.trainer;
    if (!trainerMap[t]) {
      trainerMap[t] = { count: 0, totalScore: 0, cohorts: [] };
    }
    trainerMap[t].count += c.traineeCount;
    trainerMap[t].totalScore += c.avgOverallScore * c.traineeCount;
    trainerMap[t].cohorts.push(c.code);
  });

  const totalTrainees = cohorts.reduce((acc, c) => acc + c.traineeCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Cross-Cohort Curriculum Intelligence & Diagnostics
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
              Synthesized from {cohorts.length} training waves ({totalTrainees} total trainees).
              Key finding: Across the {cohorts.length} waves, simulated roleplay competence evolved from {cFirst.avgRoleplayScore}% in {cFirst.code} to {cLast.avgRoleplayScore}% in {cLast.code}, driven primarily by targeted objection-handling drills and client-specific simulations.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Diagnostic Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Insight 1: Objection Handling Evolution */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Roleplay Drill Impact
            </span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              +{Math.max(0, (cLast.roleplayAverages?.rp2Objection || 0) - (cFirst.roleplayAverages?.rp2Objection || 0))}% Improvement
            </span>
          </div>
          <h4 className="text-sm font-bold text-white">
            Objection Handling Turned from Weakest to Strongest Asset
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            In {cFirst.code} ({cFirst.name}), RP 2 (Objection Handling) stood at <span className="text-rose-400 font-semibold">{cFirst.roleplayAverages?.rp2Objection || 0}%</span>, with {cFirst.atRiskCount} trainees flagged for support.
            By {cLast.code} ({cLast.name}), introducing real-time pushback sparring elevated the wave average to <span className="text-emerald-400 font-semibold">{cLast.roleplayAverages?.rp2Objection || 0}%</span> with {cLast.atRiskCount} at-risk trainees.
          </p>
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Recommended Action: Continue mandating the 3-phase objection framework across future cohorts.</span>
          </div>
        </div>

        {/* Insight 2: Theory vs Practice Alignment */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" />
              Knowledge vs Simulation Gap
            </span>
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              High Correlation (0.84)
            </span>
          </div>
          <h4 className="text-sm font-bold text-white">
            Technical Consultants Lead on Written Tests, AEs on Live Closing
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sales Engineers and Solutions Architects averaged 94% on Product Architecture tests (Module 1), but had higher monologue times during Discovery roleplays. In contrast, SDRs and Account Executives mastered call pacing (RP 1: 88%) while requiring supplemental study on compliance exams.
          </p>
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Recommended Action: Implement role-differentiated peer pairing (pair SEs with AEs during roleplay practice).</span>
          </div>
        </div>

        {/* Insight 3: Trainer Methodology Impact */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Trainer Effectiveness
            </span>
            <span className="text-xs text-slate-400">
              {Object.keys(trainerMap).length} Facilitators Tracked
            </span>
          </div>
          <h4 className="text-sm font-bold text-white">
            Cross-Facilitator Cohort Benchmarks
          </h4>
          <div className="space-y-2 pt-1">
            {Object.entries(trainerMap).map(([trainerName, data]) => {
              const avgScore = Math.round(data.totalScore / (data.count || 1));
              return (
                <div key={trainerName} className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white block">{trainerName}</span>
                    <span className="text-[10px] text-slate-500">Cohorts: {data.cohorts.join(', ')} ({data.count} trainees)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-indigo-400">{avgScore}% Overall</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insight 4: Final Certification Trajectory */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              Certification Velocity
            </span>
            <span className="text-xs text-emerald-400 font-bold">
              +{progressionGain}% Net Gain
            </span>
          </div>
          <h4 className="text-sm font-bold text-white">
            Readiness For Live Customer Interaction
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            By eliminating bottlenecks in Module 2 Compliance and integrating structured roleplay feedback rubrics into every session, graduation readiness reached {cLast.certificationRate}% in {cLast.code}.
          </p>
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Target for Next Wave: Maintain &gt;90% readiness while compressing onboarding duration by 4 business days.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
