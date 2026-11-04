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
  Radar,
  Info,
} from 'lucide-react';
import { CohortSummary, BusinessAccount, Trainee } from '../types';

interface CrossCohortChartsProps {
  cohorts: CohortSummary[];
}

export type ChartTab =
  | 'account_wave_overview'
  | 'competency_radar'
  | 'roleplay_scenarios'
  | 'test_modules'
  | 'theory_vs_practice';

export const CrossCohortCharts: React.FC<CrossCohortChartsProps> = ({ cohorts }) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('account_wave_overview');
  const [radarFilter, setRadarFilter] = useState<'accounts' | 'waves'>('accounts');
  const [selectedRadarWaveId, setSelectedRadarWaveId] = useState<string>(cohorts[0]?.id || '');
  const [scatterMode, setScatterMode] = useState<'centroids' | 'trainees'>('centroids');
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  // Refined account color tokens
  const getAccountColor = (account: BusinessAccount): string => {
    switch (account) {
      case 'Mobility':
        return '#059669';
      case 'Teleco':
        return '#2563EB';
      case 'Travel':
        return '#7C3AED';
      default:
        return '#059669';
    }
  };

  const getAccountBadge = (account: BusinessAccount) => {
    switch (account) {
      case 'Mobility':
        return { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' };
      case 'Teleco':
        return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' };
      case 'Travel':
        return { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' };
      default:
        return { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' };
    }
  };

  // Rollups per business account
  const accountStats = useMemo(() => {
    const accounts: BusinessAccount[] = ['Mobility', 'Teleco', 'Travel'];
    return accounts.map((acc) => {
      const cohortList = cohorts.filter((c) => c.account === acc);
      const trainees = cohortList.flatMap((c) => c.trainees || []);
      const count = trainees.length;

      const initialRP = count > 0 ? trainees.reduce((s, t) => s + (t.initialRP || 0), 0) / count : 0;
      const finalRP = count > 0 ? trainees.reduce((s, t) => s + (t.finalRP || 0), 0) / count : 0;
      const rpGain = finalRP - initialRP;
      const avgRP = count > 0 ? trainees.reduce((s, t) => s + (t.roleplays?.average || 0), 0) / count : 0;
      const avgTest = count > 0 ? trainees.reduce((s, t) => s + (t.tests?.average || 0), 0) / count : 0;
      const avgModule = count > 0 ? trainees.reduce((s, t) => s + (t.moduleComp || 0), 0) / count : 0;
      const certRate = count > 0 ? (trainees.filter((t) => t.status === 'Ready').length / count) * 100 : 0;

      const readyCount = trainees.filter((t) => t.status === 'Ready').length;
      const onTrackCount = trainees.filter((t) => t.status === 'On Track').length;
      const atRiskCount = trainees.filter((t) => t.status === 'At Risk').length;
      const remediateCount = trainees.filter((t) => t.status === 'Remediation Needed').length;

      // Rubrics
      const rubric = {
        communication: count > 0 ? Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rubric?.communication || 0), 0) / count) : 0,
        productKnowledge: count > 0 ? Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rubric?.productKnowledge || 0), 0) / count) : 0,
        activeListening: count > 0 ? Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rubric?.activeListening || 0), 0) / count) : 0,
        objectionHandling: count > 0 ? Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rubric?.objectionHandling || 0), 0) / count) : 0,
        callControl: count > 0 ? Math.round(trainees.reduce((s, t) => s + (t.roleplays?.rubric?.callControl || 0), 0) / count) : 0,
      };

      return {
        account: acc,
        cohortsCount: cohortList.length,
        traineesCount: count,
        initialRP: Number(initialRP.toFixed(2)),
        finalRP: Number(finalRP.toFixed(2)),
        rpGain: Number(rpGain.toFixed(2)),
        avgRP: Math.round(avgRP),
        avgTest: Math.round(avgTest),
        avgModule: Math.round(avgModule),
        certRate: Math.round(certRate),
        readyCount,
        onTrackCount,
        atRiskCount,
        remediateCount,
        rubric,
        color: getAccountColor(acc),
        badge: getAccountBadge(acc),
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

  // Radar chart mathematical coordinates helper
  // 5 dimensions arranged in a circle, top vertex at -90 deg
  const radarDimensions = rubricDimensions.map((dim, i) => {
    const angle = ((2 * Math.PI) / 5) * i - Math.PI / 2;
    return { ...dim, angle };
  });

  const getRadarPoint = (value: number, angle: number, radius: number, cx: number, cy: number) => {
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const buildPolygonPoints = (scores: Record<string, number>, radius: number, cx: number, cy: number) => {
    return radarDimensions
      .map((dim) => {
        const val = scores[dim.key] || 0;
        const pt = getRadarPoint(val, dim.angle, radius, cx, cy);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E0854]" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2E0854]">
              Multi-Tiered Visual Analytics
            </span>
          </div>
          <h3 className="text-base font-extrabold text-[#0A1128] mt-0.5">
            Cross-Cohort &amp; Account Comparative Engine
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive benchmarking across {cohorts.length} Waves and 3 Business Accounts
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center flex-wrap gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('account_wave_overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'account_wave_overview'
                ? 'bg-[#2E0854] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Account &amp; Wave Overview
          </button>

          <button
            onClick={() => setActiveTab('competency_radar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'competency_radar'
                ? 'bg-[#2E0854] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Competency Radar &amp; Rubrics
          </button>

          <button
            onClick={() => setActiveTab('roleplay_scenarios')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'roleplay_scenarios'
                ? 'bg-[#2E0854] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Roleplays (RP1–RP5)
          </button>

          <button
            onClick={() => setActiveTab('test_modules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'test_modules'
                ? 'bg-[#2E0854] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Test Modules
          </button>

          <button
            onClick={() => setActiveTab('theory_vs_practice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'theory_vs_practice'
                ? 'bg-[#2E0854] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Theory vs Practice Quadrant
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: ACCOUNT & WAVE OVERVIEW (VERTICAL COLUMNS + DUMBBELL + STACKED) */}
      {/* ============================================================== */}
      {activeTab === 'account_wave_overview' && (
        <div className="space-y-8 pt-1">
          {/* Section A: Grouped Vertical Column Chart comparing Accounts */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#2E0854]" />
                  Cross-Account Performance Benchmark (Grouped Vertical Columns)
                </h4>
                <p className="text-xs text-slate-500">
                  Side-by-side comparison across Roleplays, Standardized Tests, Module Cadence, and Readiness
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-3 text-xs">
                {accountStats.map((acc) => (
                  <span key={acc.account} className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: acc.color }} />
                    {acc.account}
                  </span>
                ))}
              </div>
            </div>

            {/* Vertical Columns Canvas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
              {[
                { title: 'Roleplay Simulation Avg', key: 'avgRP', suffix: '%' },
                { title: 'Standardized Test Avg', key: 'avgTest', suffix: '%' },
                { title: 'Module Completion', key: 'avgModule', suffix: '%' },
                { title: 'Certification Readiness', key: 'certRate', suffix: '%' },
              ].map((metric) => (
                <div key={metric.key} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
                  <span className="text-xs font-bold text-slate-700 block mb-4 text-center">
                    {metric.title}
                  </span>

                  {/* Vertical Column Group */}
                  <div className="h-44 flex items-end justify-center gap-3 px-2 border-b border-slate-200 pb-1">
                    {accountStats.map((acc) => {
                      const val = (acc as any)[metric.key] || 0;
                      const heightPct = Math.max(8, val);

                      return (
                        <div key={acc.account} className="flex-1 flex flex-col items-center group relative">
                          {/* Value tooltip label on hover/top */}
                          <span className="text-[11px] font-mono font-bold text-slate-800 mb-1">
                            {val}{metric.suffix}
                          </span>
                          <div
                            className="w-full max-w-[36px] rounded-t-md transition-all group-hover:brightness-110 shadow-2xs"
                            style={{
                              height: `${heightPct}%`,
                              backgroundColor: acc.color,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Column Labels */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-2 text-center">
                    {accountStats.map((acc) => (
                      <span key={acc.account} className="flex-1 truncate">
                        {acc.account.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: RP1 -> RP5 Uplift Dumbbell Chart for every Wave */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#059669]" />
                  Wave RP Uplift Dumbbell Chart (1.0 to 5.0 Scale)
                </h4>
                <p className="text-xs text-slate-500">
                  Visual track connecting Initial RP baseline to Final RP score with net gain
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  Initial RP
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                  Final RP
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {cohorts.map((cohort) => {
                const color = getAccountColor(cohort.account);
                const badge = getAccountBadge(cohort.account);
                const initialPos = Math.max(0, Math.min(100, ((cohort.initialRP - 1.0) / 4.0) * 100));
                const finalPos = Math.max(0, Math.min(100, ((cohort.finalRP - 1.0) / 4.0) * 100));
                const widthPct = Math.max(2, finalPos - initialPos);

                return (
                  <div key={cohort.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border font-mono"
                          style={{
                            backgroundColor: badge.bg,
                            borderColor: badge.border,
                            color: badge.text,
                          }}
                        >
                          {cohort.account}
                        </span>
                        <span className="font-mono font-bold text-slate-900">{cohort.code}:</span>
                        <span className="font-semibold text-slate-800">{cohort.name}</span>
                        <span className="text-slate-400 font-mono text-[11px]">({cohort.traineeCount} Agents)</span>
                      </div>

                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-500 text-[11px]">
                          {cohort.initialRP.toFixed(2)} → <strong className="text-slate-900">{cohort.finalRP.toFixed(2)}</strong>
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold border"
                          style={{
                            backgroundColor: badge.bg,
                            borderColor: badge.border,
                            color: badge.text,
                          }}
                        >
                          +{cohort.rpGain.toFixed(2)} pts
                        </span>
                      </div>
                    </div>

                    {/* Dumbbell Track */}
                    <div className="relative pt-3 pb-1 px-2">
                      <div className="h-2 bg-slate-100 rounded-full relative">
                        {/* Connecting bar */}
                        <div
                          className="absolute h-2 rounded-full"
                          style={{
                            left: `${initialPos}%`,
                            width: `${widthPct}%`,
                            backgroundColor: `${color}40`,
                          }}
                        />
                        {/* Initial marker */}
                        <div
                          className="absolute w-4 h-4 rounded-full bg-slate-400 border-2 border-white shadow-xs -top-1 transform -translate-x-1/2 cursor-pointer"
                          style={{ left: `${initialPos}%` }}
                          title={`Initial: ${cohort.initialRP}`}
                        />
                        {/* Final marker */}
                        <div
                          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-xs -top-1 transform -translate-x-1/2 cursor-pointer"
                          style={{
                            left: `${finalPos}%`,
                            backgroundColor: color,
                          }}
                          title={`Final: ${cohort.finalRP}`}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
                        <span>1.0</span>
                        <span>2.0</span>
                        <span>3.0</span>
                        <span>4.0</span>
                        <span>5.0</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section C: 100% Stacked Readiness Bar per Wave & per Account */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  100% Stacked Readiness Distribution (Per Account &amp; Per Wave)
                </h4>
                <p className="text-xs text-slate-500">
                  Exact distribution of Ready (Certified), On Track, At Risk, and Remediation Needed
                </p>
              </div>

              <div className="flex items-center flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Ready
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  On Track
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  At Risk
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Remediation
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
              {cohorts.map((c) => {
                const total = c.traineeCount || 1;
                const ready = c.trainees.filter((t) => t.status === 'Ready').length;
                const onTrack = c.trainees.filter((t) => t.status === 'On Track').length;
                const atRisk = c.trainees.filter((t) => t.status === 'At Risk').length;
                const remediate = c.trainees.filter((t) => t.status === 'Remediation Needed').length;

                return (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-2xs">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">
                        {c.code}: {c.name}
                      </span>
                      <span className="font-mono text-slate-500">{total} Trainees</span>
                    </div>

                    <div className="h-3.5 bg-slate-100 rounded-full flex overflow-hidden">
                      <div style={{ width: `${(ready / total) * 100}%` }} className="bg-emerald-500" title={`Ready: ${ready}`} />
                      <div style={{ width: `${(onTrack / total) * 100}%` }} className="bg-blue-500" title={`On Track: ${onTrack}`} />
                      <div style={{ width: `${(atRisk / total) * 100}%` }} className="bg-amber-500" title={`At Risk: ${atRisk}`} />
                      <div style={{ width: `${(remediate / total) * 100}%` }} className="bg-rose-500" title={`Remediation Needed: ${remediate}`} />
                    </div>

                    <div className="flex justify-between text-[11px] font-mono text-slate-600 pt-0.5">
                      <span className="text-emerald-700 font-semibold">{ready} Ready</span>
                      <span className="text-blue-700 font-semibold">{onTrack} On Track</span>
                      <span className="text-amber-700 font-semibold">{atRisk} At Risk</span>
                      <span className="text-rose-700 font-semibold">{remediate} Remediate</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: COMPETENCY RADAR & RUBRICS (5-AXIS SVG RADAR CHART) */}
      {/* ============================================================== */}
      {activeTab === 'competency_radar' && (
        <div className="space-y-6 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Radar className="w-4 h-4 text-[#2E0854]" />
                5-Axis Competency Radar &amp; Rubric Architecture
              </h4>
              <p className="text-xs text-slate-500">
                Interactive spider chart evaluating Communication, Product Knowledge, Active Listening, Objection Handling, and Call Control
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="inline-flex rounded-lg bg-white p-0.5 border border-slate-200 shadow-2xs">
                <button
                  onClick={() => setRadarFilter('accounts')}
                  className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                    radarFilter === 'accounts' ? 'bg-[#2E0854] text-white' : 'text-slate-600'
                  }`}
                >
                  Accounts (3)
                </button>
                <button
                  onClick={() => setRadarFilter('waves')}
                  className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                    radarFilter === 'waves' ? 'bg-[#2E0854] text-white' : 'text-slate-600'
                  }`}
                >
                  By Specific Wave
                </button>
              </div>

              {radarFilter === 'waves' && (
                <select
                  value={selectedRadarWaveId}
                  onChange={(e) => setSelectedRadarWaveId(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}: {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Radar Visualization + Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* SVG Radar Chart (Left 7 Cols) */}
            <div className="lg:col-span-7 bg-slate-50/60 border border-slate-200/90 rounded-2xl p-6 flex flex-col items-center justify-center relative shadow-2xs">
              <svg width="360" height="340" viewBox="0 0 360 340" className="overflow-visible">
                {/* Concentric rings at 20%, 40%, 60%, 80%, 100% */}
                {[20, 40, 60, 80, 100].map((level) => {
                  const pts = radarDimensions
                    .map((dim) => {
                      const pt = getRadarPoint(level, dim.angle, 130, 180, 170);
                      return `${pt.x},${pt.y}`;
                    })
                    .join(' ');

                  return (
                    <g key={level}>
                      <polygon points={pts} fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray={level === 100 ? 'none' : '3 3'} />
                      <text x="184" y={170 - (level / 100) * 130 + 3} fontSize="9" fill="#94A3B8" fontFamily="monospace">
                        {level}%
                      </text>
                    </g>
                  );
                })}

                {/* 5 Spoke Axis Lines */}
                {radarDimensions.map((dim) => {
                  const pt = getRadarPoint(100, dim.angle, 130, 180, 170);
                  return <line key={dim.key} x1="180" y1="170" x2={pt.x} y2={pt.y} stroke="#CBD5E1" strokeWidth="1" />;
                })}

                {/* Render Polygons for Accounts Mode */}
                {radarFilter === 'accounts' &&
                  accountStats.map((acc) => {
                    const pts = buildPolygonPoints(acc.rubric, 130, 180, 170);
                    return (
                      <g key={acc.account}>
                        <polygon
                          points={pts}
                          fill={`${acc.color}25`}
                          stroke={acc.color}
                          strokeWidth="2.5"
                          className="transition-all hover:fill-opacity-40"
                        />
                        {radarDimensions.map((dim) => {
                          const pt = getRadarPoint(acc.rubric[dim.key as keyof typeof acc.rubric] || 0, dim.angle, 130, 180, 170);
                          return <circle key={dim.key} cx={pt.x} cy={pt.y} r="3.5" fill={acc.color} stroke="#FFFFFF" strokeWidth="1.5" />;
                        })}
                      </g>
                    );
                  })}

                {/* Render Polygon for Selected Wave Mode */}
                {radarFilter === 'waves' && (() => {
                  const selectedCohort = cohorts.find((c) => c.id === selectedRadarWaveId) || cohorts[0];
                  if (!selectedCohort) return null;
                  const color = getAccountColor(selectedCohort.account);
                  const pts = buildPolygonPoints(selectedCohort.rubricAverages as any, 130, 180, 170);

                  return (
                    <g key={selectedCohort.id}>
                      <polygon points={pts} fill={`${color}30`} stroke={color} strokeWidth="3" />
                      {radarDimensions.map((dim) => {
                        const pt = getRadarPoint((selectedCohort.rubricAverages as any)[dim.key] || 0, dim.angle, 130, 180, 170);
                        return <circle key={dim.key} cx={pt.x} cy={pt.y} r="4" fill={color} stroke="#FFFFFF" strokeWidth="2" />;
                      })}
                    </g>
                  );
                })()}

                {/* Axis Labels at Vertices */}
                {radarDimensions.map((dim) => {
                  const pt = getRadarPoint(120, dim.angle, 130, 180, 170);
                  let textAnchor: 'middle' | 'start' | 'end' = 'middle';
                  if (pt.x > 195) textAnchor = 'start';
                  if (pt.x < 165) textAnchor = 'end';

                  return (
                    <text
                      key={dim.key}
                      x={pt.x}
                      y={pt.y}
                      textAnchor={textAnchor}
                      fontSize="10"
                      fontWeight="bold"
                      fill="#334155"
                    >
                      {dim.label}
                    </text>
                  );
                })}
              </svg>

              {/* Radar Legend */}
              <div className="flex items-center gap-4 mt-3 text-xs font-bold">
                {radarFilter === 'accounts' ? (
                  accountStats.map((acc) => (
                    <span key={acc.account} className="flex items-center gap-1.5" style={{ color: acc.color }}>
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.color }} />
                      {acc.account} Account
                    </span>
                  ))
                ) : (
                  <span className="text-slate-700 font-mono">
                    Showing Rubric Shape for {cohorts.find((c) => c.id === selectedRadarWaveId)?.name || 'Wave'}
                  </span>
                )}
              </div>
            </div>

            {/* Rubrics Breakdown Table (Right 5 Cols) */}
            <div className="lg:col-span-5 space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Dimension Score Matrix
              </h5>
              <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Rubric Dimension</th>
                      <th className="py-2.5 px-2 text-center text-[#059669]">Mobility</th>
                      <th className="py-2.5 px-2 text-center text-[#2563EB]">Teleco</th>
                      <th className="py-2.5 px-2 text-center text-[#7C3AED]">Travel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {rubricDimensions.map((dim) => {
                      const mob = accountStats.find((a) => a.account === 'Mobility')?.rubric[dim.key] || 0;
                      const tel = accountStats.find((a) => a.account === 'Teleco')?.rubric[dim.key] || 0;
                      const tra = accountStats.find((a) => a.account === 'Travel')?.rubric[dim.key] || 0;

                      return (
                        <tr key={dim.key} className="hover:bg-white transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{dim.label}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">{mob}%</td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">{tel}%</td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">{tra}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200/80 text-[11px] text-purple-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                  Key Rubric Observation
                </div>
                <p className="text-purple-800">
                  Mobility leads in Product Knowledge depth, while Travel demonstrates highest Call Control and Pacing agility.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ROLEPLAY SCENARIOS RP1–RP5 (CLEAN COMPARATIVE CARDS + BENCHMARK) */}
      {/* ============================================================== */}
      {activeTab === 'roleplay_scenarios' && (
        <div className="space-y-6 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {roleplayScenarios.map((scenario) => {
              const scenarioScores = cohorts.map((c) => ({
                cohort: c,
                score: c.roleplayAverages[scenario.key] || 0,
              }));
              scenarioScores.sort((a, b) => b.score - a.score);
              const best = scenarioScores[0];
              const lowest = scenarioScores[scenarioScores.length - 1];

              return (
                <div
                  key={scenario.key}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">{scenario.icon}</span>
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">
                        {scenario.label}
                      </h4>
                    </div>

                    <div className="space-y-2.5">
                      {scenarioScores.map(({ cohort, score }) => {
                        const color = getAccountColor(cohort.account);
                        const badge = getAccountBadge(cohort.account);
                        const isPassing = score >= 75;

                        return (
                          <div key={cohort.id} className="text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700">
                                <span
                                  className="px-1 py-0.2 rounded text-[9px] font-extrabold uppercase border"
                                  style={{
                                    backgroundColor: badge.bg,
                                    borderColor: badge.border,
                                    color: badge.text,
                                  }}
                                >
                                  {cohort.account.slice(0, 3)}
                                </span>
                                {cohort.code}
                              </span>
                              <span className="font-mono font-bold text-slate-900">{score}%</span>
                            </div>

                            {/* Bar with 75% Benchmark Dashed Line */}
                            <div className="h-2 bg-slate-200 rounded-full relative overflow-hidden">
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

                  {/* Benchmark & Summary Footer */}
                  <div className="pt-3 border-t border-slate-200 text-[11px] space-y-1 text-slate-500">
                    <div className="flex justify-between font-mono">
                      <span>Threshold:</span>
                      <strong className="text-slate-700">75% Pass</strong>
                    </div>
                    {best && lowest && (
                      <div className="flex justify-between font-mono">
                        <span>Top Wave:</span>
                        <strong className="text-emerald-700 font-bold">
                          {best.cohort.code} ({best.score}%)
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: TEST MODULES (CLEAN COMPARATIVE CARDS + BENCHMARK) */}
      {/* ============================================================== */}
      {activeTab === 'test_modules' && (
        <div className="space-y-6 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {testModules.map((test) => {
              const testScores = cohorts.map((c) => ({
                cohort: c,
                score: c.testAverages[test.key] || 0,
              }));
              testScores.sort((a, b) => b.score - a.score);
              const best = testScores[0];
              const lowest = testScores[testScores.length - 1];

              return (
                <div
                  key={test.key}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">{test.icon}</span>
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">
                        {test.label}
                      </h4>
                    </div>

                    <div className="space-y-2.5">
                      {testScores.map(({ cohort, score }) => {
                        const color = getAccountColor(cohort.account);
                        const badge = getAccountBadge(cohort.account);

                        return (
                          <div key={cohort.id} className="text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700">
                                <span
                                  className="px-1 py-0.2 rounded text-[9px] font-extrabold uppercase border"
                                  style={{
                                    backgroundColor: badge.bg,
                                    borderColor: badge.border,
                                    color: badge.text,
                                  }}
                                >
                                  {cohort.account.slice(0, 3)}
                                </span>
                                {cohort.code}
                              </span>
                              <span className="font-mono font-bold text-slate-900">{score}%</span>
                            </div>

                            {/* Bar with 80% Benchmark Line */}
                            <div className="h-2 bg-slate-200 rounded-full relative overflow-hidden">
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

                  <div className="pt-3 border-t border-slate-200 text-[11px] space-y-1 text-slate-500">
                    <div className="flex justify-between font-mono">
                      <span>Certification Line:</span>
                      <strong className="text-slate-700">80% Pass</strong>
                    </div>
                    {best && lowest && (
                      <div className="flex justify-between font-mono">
                        <span>Top Wave:</span>
                        <strong className="text-blue-700 font-bold">
                          {best.cohort.code} ({best.score}%)
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: THEORY VS PRACTICE QUADRANT (LIGHT-THEMED SCATTER PLOT) */}
      {/* ============================================================== */}
      {activeTab === 'theory_vs_practice' && (
        <div className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#2E0854]" />
                Theory vs. Practice Correlation Quadrant
              </h4>
              <p className="text-xs text-slate-500">
                Correlating Standardized Test Knowledge (X-Axis) vs. Live Roleplay Execution (Y-Axis)
              </p>
            </div>

            <div className="inline-flex rounded-lg bg-white p-0.5 border border-slate-200 shadow-2xs text-xs">
              <button
                onClick={() => setScatterMode('centroids')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                  scatterMode === 'centroids' ? 'bg-[#2E0854] text-white' : 'text-slate-600'
                }`}
              >
                Wave Centroids ({cohorts.length})
              </button>
              <button
                onClick={() => setScatterMode('trainees')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                  scatterMode === 'trainees' ? 'bg-[#2E0854] text-white' : 'text-slate-600'
                }`}
              >
                Individual Trainees ({cohorts.reduce((s, c) => s + c.traineeCount, 0)})
              </button>
            </div>
          </div>

          <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 relative">
            {/* Quadrant Canvas */}
            <div className="relative w-full h-[420px] border border-slate-300 rounded-xl bg-white overflow-hidden shadow-2xs">
              {/* Subtle Quadrant Shading */}
              <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-emerald-500/[0.04] pointer-events-none" />
              <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-500/[0.03] pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-amber-500/[0.03] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-rose-500/[0.04] pointer-events-none" />

              {/* Center dividing dashed lines at 75% */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 border-dashed" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-300 border-dashed" />

              {/* Quadrant Labels */}
              <div className="absolute top-3 right-4 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50/90 px-2.5 py-1 rounded-md border border-emerald-200">
                ⭐ Star Performers (Certified Ready)
              </div>
              <div className="absolute top-3 left-4 text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50/90 px-2.5 py-1 rounded-md border border-blue-200">
                ⚡ Intuitive Practitioners (Needs Theory)
              </div>
              <div className="absolute bottom-3 right-4 text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50/90 px-2.5 py-1 rounded-md border border-amber-200">
                📚 Knowledgeable but Hesitant (Needs RP Drill)
              </div>
              <div className="absolute bottom-3 left-4 text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50/90 px-2.5 py-1 rounded-md border border-rose-200">
                ⚠️ Foundation Support Required (At Risk)
              </div>

              {/* Centroids Mode */}
              {scatterMode === 'centroids' &&
                cohorts.map((cohort) => {
                  const color = getAccountColor(cohort.account);
                  const xPct = Math.max(6, Math.min(94, ((cohort.avgTestScore - 50) / 50) * 100));
                  const yPct = Math.max(6, Math.min(94, 100 - ((cohort.avgRoleplayScore - 50) / 50) * 100));

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

              {/* Trainees Mode */}
              {scatterMode === 'trainees' &&
                cohorts
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
                          className="w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                          style={{ backgroundColor: t.cohortColor }}
                        />
                      </div>
                    );
                  })}

              {/* Hover Tooltip Box */}
              {hoveredPoint && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-slate-900 text-white px-3.5 py-2 rounded-xl shadow-xl text-xs space-y-0.5 border border-slate-700 pointer-events-none animate-fade-in">
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
