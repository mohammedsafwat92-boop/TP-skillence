import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Award,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Zap,
  GraduationCap
} from 'lucide-react';
import { CohortSummary, Trainee } from '../types';
import { TraineeModal } from './TraineeModal';

interface TraineeDirectoryProps {
  cohorts: CohortSummary[];
  selectedCohortId?: string | null;
}

export const TraineeDirectory: React.FC<TraineeDirectoryProps> = ({
  cohorts,
  selectedCohortId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCohortId, setFilterCohortId] = useState<string>(selectedCohortId || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'overall' | 'roleplays' | 'tests' | 'name'>('overall');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);

  // Collect all trainees across all 6 cohorts
  const allTrainees: Array<{ trainee: Trainee; cohort: CohortSummary }> = [];
  cohorts.forEach((c) => {
    c.trainees.forEach((t) => {
      allTrainees.push({ trainee: t, cohort: c });
    });
  });

  // Extract unique roles
  const roles = Array.from(new Set(allTrainees.map((item) => item.trainee.role)));

  // Filter
  const filtered = allTrainees.filter(({ trainee, cohort }) => {
    if (filterCohortId !== 'all' && cohort.id !== filterCohortId) return false;
    if (filterStatus !== 'all' && trainee.status !== filterStatus) return false;
    if (filterRole !== 'all' && trainee.role !== filterRole) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = trainee.name.toLowerCase().includes(q);
      const matchEmail = trainee.email.toLowerCase().includes(q);
      const matchId = trainee.id.toLowerCase().includes(q);
      const matchCohort = cohort.name.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId && !matchCohort) return false;
    }

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    let comp = 0;
    if (sortBy === 'overall') comp = a.trainee.overallScore - b.trainee.overallScore;
    else if (sortBy === 'roleplays') comp = a.trainee.roleplays.average - b.trainee.roleplays.average;
    else if (sortBy === 'tests') comp = a.trainee.tests.average - b.trainee.tests.average;
    else if (sortBy === 'name') comp = a.trainee.name.localeCompare(b.trainee.name);
    return sortOrder === 'asc' ? comp : -comp;
  });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const selectedCohort = selectedTrainee
    ? cohorts.find((c) => c.code === selectedTrainee.cohortId) || null
    : null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-4">
      {/* Header & Search Bar */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/60 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Cross-Cohort Trainee Directory
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                {filtered.length} Trainees shown
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Drill down into individual roleplay simulations, rubric evaluations, and test certificates
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search trainee name, ID or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex items-center flex-wrap gap-3 pt-1">
          {/* Cohort Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Cohort:</span>
            <select
              value={filterCohortId}
              onChange={(e) => setFilterCohortId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
            >
              <option value="all">All 6 Cohorts</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  Sheet {c.sheetIndex}: {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Ready">Ready (Certified)</option>
              <option value="On Track">On Track</option>
              <option value="At Risk">At Risk</option>
              <option value="Remediation Needed">Remediation Needed</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Role:</span>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button if filtered */}
          {(filterCohortId !== 'all' || filterStatus !== 'all' || filterRole !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilterCohortId('all');
                setFilterStatus('all');
                setFilterRole('all');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Trainees Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Trainee</th>
              <th className="py-3 px-3">Cohort & Sheet</th>
              <th className="py-3 px-3">Role</th>
              <th
                onClick={() => toggleSort('roleplays')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Roleplay Avg</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('tests')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Test Avg</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('overall')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Overall Combined</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map(({ trainee, cohort }) => (
              <tr
                key={trainee.id}
                className="hover:bg-slate-800/40 transition-colors group"
              >
                {/* Name */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-500/20">
                      {trainee.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {trainee.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {trainee.email}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Cohort */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    <span className="font-bold text-indigo-400">Sheet {cohort.sheetIndex}:</span>
                    <span>{cohort.code}</span>
                  </span>
                </td>

                {/* Role */}
                <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                  {trainee.role}
                </td>

                {/* Roleplays Avg */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      trainee.roleplays.average >= 80 ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-300'
                    }`}>
                      {trainee.roleplays.average}%
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({trainee.roleplays.passStatus})
                    </span>
                  </div>
                </td>

                {/* Tests Avg */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      trainee.tests.average >= 85 ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-300'
                    }`}>
                      {trainee.tests.average}%
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({trainee.tests.passStatus})
                    </span>
                  </div>
                </td>

                {/* Overall Score */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm font-extrabold text-white">
                    {trainee.overallScore}%
                  </span>
                </td>

                {/* Status */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    trainee.status === 'Ready'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : trainee.status === 'On Track'
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      : trainee.status === 'At Risk'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {trainee.status}
                  </span>
                </td>

                {/* Action */}
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <button
                    onClick={() => setSelectedTrainee(trainee)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-[11px] font-medium transition-all cursor-pointer border border-slate-700"
                  >
                    View Scorecard
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trainee Modal */}
      <TraineeModal
        trainee={selectedTrainee}
        cohort={selectedCohort}
        onClose={() => setSelectedTrainee(null)}
      />
    </div>
  );
};
