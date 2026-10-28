import React from 'react';
import {
  X,
  Award,
  Zap,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Mail,
  Briefcase,
  Layers
} from 'lucide-react';
import { Trainee, CohortSummary } from '../types';

interface TraineeModalProps {
  trainee: Trainee | null;
  cohort: CohortSummary | null;
  onClose: () => void;
}

export const TraineeModal: React.FC<TraineeModalProps> = ({ trainee, cohort, onClose }) => {
  if (!trainee) return null;

  const roleplaysList = [
    { name: 'RP 1: Discovery & Needs Analysis', score: trainee.roleplays.rp1Discovery },
    { name: 'RP 2: Objection Handling', score: trainee.roleplays.rp2Objection },
    { name: 'RP 3: Value Prop & Pitch', score: trainee.roleplays.rp3ValuePitch },
    { name: 'RP 4: De-escalation', score: trainee.roleplays.rp4Deescalation },
    { name: 'RP 5: Commercial Negotiation & Closing', score: trainee.roleplays.rp5Closing },
  ];

  const testsList = [
    { name: 'Pre-Training Baseline', score: trainee.tests.baselineTest },
    { name: 'Module 1: Product Fundamentals', score: trainee.tests.module1Test },
    { name: 'Module 2: Sales Methodology & Compliance', score: trainee.tests.module2Test },
    { name: 'Module 3: Advanced Scenarios', score: trainee.tests.module3Test },
    { name: 'Final Certification Knowledge Exam', score: trainee.tests.finalExam },
  ];

  const rubricsList = [
    { name: 'Communication & Tone', score: trainee.roleplays.rubric.communication },
    { name: 'Product & Architecture Knowledge', score: trainee.roleplays.rubric.productKnowledge },
    { name: 'Active Listening & Needs Probing', score: trainee.roleplays.rubric.activeListening },
    { name: 'Objection Resolution', score: trainee.roleplays.rubric.objectionHandling },
    { name: 'Call Control & Pacing', score: trainee.roleplays.rubric.callControl },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
              {trainee.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{trainee.name}</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {trainee.id}
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  trainee.status === 'Ready'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : trainee.status === 'On Track'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {trainee.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-slate-500" />
                  {trainee.role}
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-500" />
                  {trainee.cohortName}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">Trainer: {trainee.trainer}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Quick Scorecards Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Overall Combined</span>
                <span className="text-2xl font-black text-white">{trainee.overallScore}%</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Roleplays Average</span>
                <span className="text-2xl font-black text-indigo-400">{trainee.roleplays.average}%</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Status: {trainee.roleplays.passStatus}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Zap className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Tests Average</span>
                <span className="text-2xl font-black text-cyan-400">{trainee.tests.average}%</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Status: {trainee.tests.passStatus}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Roleplay Simulations */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Zap className="w-4 h-4 text-indigo-400" />
                Roleplay Simulations (5 Scenarios)
              </h4>
              <div className="space-y-2.5">
                {roleplaysList.map((rp, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{rp.name}</span>
                      <span className="font-bold text-white">{rp.score}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full"
                        style={{ width: `${rp.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Assessments */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <GraduationCap className="w-4 h-4 text-cyan-400" />
                Test Assessments (5 Modules)
              </h4>
              <div className="space-y-2.5">
                {testsList.map((t, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{t.name}</span>
                      <span className="font-bold text-white">{t.score}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-1.5 rounded-full"
                        style={{ width: `${t.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rubrics Breakdown */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-emerald-400" />
              Observed Rubric Competencies
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {rubricsList.map((r, i) => (
                <div key={i} className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400 mb-1 truncate" title={r.name}>{r.name}</div>
                  <div className="text-base font-extrabold text-white">{r.score}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trainer Notes & Recommendations */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <h4 className="font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              Trainer Feedback & Remediation Plan:
            </h4>
            <p className="text-slate-300 italic bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              "{trainee.roleplays.evaluatorNotes || 'Consistently demonstrating proficiency across core rubrics.'}"
            </p>
            {trainee.recommendations && trainee.recommendations.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Assigned Actions:
                </span>
                <ul className="space-y-1 list-disc pl-4 text-slate-300">
                  {trainee.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Cohort: {trainee.cohortName} ({cohort?.trainer})</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
};
