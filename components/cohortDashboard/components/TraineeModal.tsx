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
  Layers,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-[#2E0854] font-bold text-lg shadow-2xs">
              {trainee.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{trainee.name}</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {trainee.id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    trainee.status === 'Ready'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : trainee.status === 'On Track'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : trainee.status === 'At Risk'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {trainee.status}
                </span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  {trainee.role}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Layers className="w-3.5 h-3.5 text-[#2E0854]" />
                  {trainee.cohortName}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">Coach: {trainee.trainer}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Quick Scorecards Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Overall Combined</span>
                <span className="text-2xl font-black text-[#2E0854] font-mono">{trainee.overallScore}%</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-[#2E0854]">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Roleplays Average</span>
                <span className="text-2xl font-black text-[#059669] font-mono">{trainee.roleplays.average}%</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block font-semibold">Status: {trainee.roleplays.passStatus}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-[#059669]">
                <Zap className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Tests Average</span>
                <span className="text-2xl font-black text-[#2563EB] font-mono">{trainee.tests.average}%</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block font-semibold">Status: {trainee.tests.passStatus}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#2563EB]">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Roleplay Simulations */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Zap className="w-4 h-4 text-emerald-600" />
                Roleplay Simulations (5 Scenarios)
              </h4>
              <div className="space-y-2.5">
                {roleplaysList.map((rp, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700">{rp.name}</span>
                      <span className="font-bold text-slate-900 font-mono">{rp.score}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#059669] h-1.5 rounded-full"
                        style={{ width: `${rp.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Assessments */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                Test Assessments (5 Modules)
              </h4>
              <div className="space-y-2.5">
                {testsList.map((t, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700">{t.name}</span>
                      <span className="font-bold text-slate-900 font-mono">{t.score}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#2563EB] h-1.5 rounded-full"
                        style={{ width: `${t.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rubrics Breakdown */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-[#2E0854]" />
              Observed Rubric Competencies
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {rubricsList.map((r, i) => (
                <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 text-center shadow-2xs">
                  <div className="text-[11px] text-slate-500 mb-1 truncate" title={r.name}>{r.name}</div>
                  <div className="text-base font-extrabold text-slate-900 font-mono">{r.score}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trainer Notes & Recommendations */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-purple-700" />
              Trainer Feedback &amp; Remediation Plan:
            </h4>
            <p className="text-slate-700 italic bg-white p-3 rounded-lg border border-slate-200">
              "{trainee.roleplays.evaluatorNotes || 'Consistently demonstrating proficiency across core rubrics.'}"
            </p>
            {trainee.recommendations && trainee.recommendations.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Assigned Actions:
                </span>
                <ul className="space-y-1 list-disc pl-4 text-slate-700">
                  {trainee.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>Cohort: <strong className="text-slate-800">{trainee.cohortName}</strong> ({cohort?.trainer})</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition-colors cursor-pointer"
          >
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
};

export default TraineeModal;
