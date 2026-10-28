import React, { useState, useEffect, useMemo } from 'react';
import { shlService } from '../services/shlService';
import { geminiService } from '../services/geminiService';
import { googleSheetService } from '../services/googleSheetService';
import ResourceUploader from './admin/ResourceUploader';
import UserUploader from './admin/UserUploader';
import QuickAddAgent from './admin/QuickAddAgent';
import InteractiveLessonUploader from './admin/InteractiveLessonUploader';
import LessonAssigner from './admin/LessonAssigner';
import { MetricsDrillDown } from './admin/MetricsDrillDown';
import CohortAnalyticsDashboard from './cohortDashboard/CohortAnalyticsDashboard';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  Filter, 
  Download, 
  ExternalLink,
  ChevronRight,
  MoreHorizontal,
  Brain,
  Plus,
  CheckCircle,
  ClipboardList,
  Layers
} from 'lucide-react';
import { ExitIcon } from './Icons';
import type { UserProfile, Resource } from '../types';

interface AdminPanelProps {
  onUpdateContent: () => void;
  currentUser: UserProfile;
  onFileProcessed?: (file: File) => Promise<void>;
  onImpersonate: (user: UserProfile) => void;
  initialTab?: string;
}

export const LIVE_COACH_SCENARIOS = [
  { id: 'sim-NB001', title: 'Simulation: First-Time Traveler', type: 'Simulation', url: 'NB001', duration: 15 },
  { id: 'sim-NC001', title: 'Simulation: Minor Name Spelling Update', type: 'Simulation', url: 'NC001', duration: 15 },
  { id: 'sim-FC003', title: 'Simulation: Fare Difference Explanation', type: 'Simulation', url: 'FC003', duration: 15 },
  { id: 'sim-TA003', title: 'Simulation: Agency vs Airline Responsibility Clarification', type: 'Simulation', url: 'TA003', duration: 15 },
  { id: 'sim-AS008', title: 'Simulation: Bassinet Availability Limitation', type: 'Simulation', url: 'AS008', duration: 15 }
];

const AdminPanel: React.FC<AdminPanelProps> = ({ onUpdateContent, currentUser, onFileProcessed, onImpersonate, initialTab }) => {
  if (currentUser.role !== 'admin' && currentUser.role !== 'coach') return null;

  const [activeTab, setActiveTab] = useState<'onboarding' | 'users' | 'cohort-analytics' | 'library' | 'content' | 'interactive' | 'assigner'>(
    () => (initialTab as any) || 'users'
  );

  useEffect(() => {
    if (initialTab && (initialTab === 'cohort-analytics' || initialTab === 'users' || initialTab === 'library' || initialTab === 'interactive' || initialTab === 'assigner' || initialTab === 'onboarding' || initialTab === 'content')) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [globalResources, setGlobalResources] = useState<Resource[]>([]);
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStagnant, setShowStagnant] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);
  const [adminStats, setAdminStats] = useState<any>(() => googleSheetService.getCachedAdminStats(currentUser.email, currentUser.role));
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string>('overall');
  const [weeklyAssignments, setWeeklyAssignments] = useState<Record<number, string[]>>(() => googleSheetService.getCachedWeeklyAssignments() || {});
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [targetWeek, setTargetWeek] = useState<number>(1);
  const [activeWave, setActiveWave] = useState<string>('all');
  const [drilldownUser, setDrilldownUser] = useState<UserProfile | null>(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const [waveConfigs, setWaveConfigs] = useState<Record<string, any>>(() => googleSheetService.getCachedWaveConfigs() || {});
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [defaultGoalInput, setDefaultGoalInput] = useState<string>('');
  const [weeklyOverrideInput, setWeeklyOverrideInput] = useState<string>('');

  useEffect(() => {
    if (activeWave !== 'all') {
      const config = waveConfigs[activeWave] || {};
      setDefaultGoalInput(String(config.defaultGoal ?? 180));
      setWeeklyOverrideInput(String(config.currentWeekGoal ?? ''));
    }
  }, [activeWave, waveConfigs]);

  const availableWaves = useMemo(() => {
    if (!userList) return [];
    return Array.from(new Set(userList.map(u => u.waveNumber).filter(Boolean))).sort();
  }, [userList]);

  const availableWeeks = useMemo(() => {
    if (!adminStats?.userStats) return [];
    const weeks = new Set<string>();
    adminStats.userStats.forEach((s: any) => {
      s.weeklyHistory?.forEach((w: any) => weeks.add(w.weekLabel));
    });
    return Array.from(weeks).sort();
  }, [adminStats]);

  const combinedStats = useMemo(() => {
    if (!userList || !adminStats?.userStats) return [];
    
    let activeUsers = userList.filter(u => u.role === 'agent');
    if (activeWave !== 'all') {
      activeUsers = activeUsers.filter(u => u.wave === activeWave || u.waveNumber === activeWave);
    }
    
    return activeUsers
      .map(user => {
        const stats = adminStats.userStats.find((s: any) => s.userId === user.id) || {
          weeklyMinutes: 0,
          overallProgress: 0,
          totalCompleted: 0,
          totalAssigned: 0,
          weeklyHistory: []
        };

        if (selectedWeek !== 'overall' && stats.weeklyHistory) {
          const weekData = stats.weeklyHistory.find((w: any) => w.weekLabel === selectedWeek);
          return {
            ...user,
            ...stats,
            weeklyMinutes: weekData ? weekData.minutes : 0,
            overallProgress: weekData ? weekData.progress : 0,
            totalCompleted: weekData ? weekData.completedCount : 0
          };
        }

        return {
          ...user,
          ...stats
        };
      });
  }, [userList, adminStats, selectedWeek, activeWave]);

  const filteredStats = useMemo(() => {
    return combinedStats.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStagnant = !showStagnant || user.weeklyMinutes === 0;
      return matchesSearch && matchesStagnant;
    });
  }, [combinedStats, searchTerm, showStagnant]);

  const metrics = useMemo(() => {
    const totalAgents = combinedStats.length;
    const totalProgress = combinedStats.reduce((acc, u) => acc + (u.overallProgress || 0), 0);
    const avgProgress = totalAgents > 0 ? Math.round(totalProgress / totalAgents) : 0;
    
    const totalWeeklyProgress = combinedStats.reduce((acc, u) => acc + (u.weeklyProgress || 0), 0);
    const avgWeeklyProgress = totalAgents > 0 ? Math.round(totalWeeklyProgress / totalAgents) : 0;
    const atRisk = combinedStats.filter(u => u.overallProgress < 30).length;
    return { totalAgents, avgProgress, avgWeeklyProgress, atRisk };
  }, [combinedStats]);

  const fetchUsers = async () => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'coach') return;
    setIsProcessing(true);
    try {
      const users = await googleSheetService.fetchAllUsers(currentUser.email, currentUser.role);
      setUserList(Array.isArray(users) ? users : []);
    } catch (err) {
      setUserList([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await googleSheetService.fetchUserPlan(currentUser.id, 'admin', (fresh) => {
        if (fresh && fresh.resources) {
          setGlobalResources(fresh.resources);
        } else if (Array.isArray(fresh)) {
          setGlobalResources(fresh);
        }
      });
      if (res && res.resources) {
        setGlobalResources(res.resources);
      } else {
        setGlobalResources(Array.isArray(res) ? res : []);
      }
    } catch (e) {
      setGlobalResources([]);
    }
  };

  const loadAdminStats = async () => {
    try {
      const data = await googleSheetService.getAdminStats(currentUser.email, currentUser.role, (fresh) => {
        if (fresh) setAdminStats(fresh);
      });
      if (data) setAdminStats(data);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    }
  };

  const loadWaveConfigs = async () => {
    try {
      const configs = await googleSheetService.getWaveConfigs((fresh) => {
        if (fresh) setWaveConfigs(fresh);
      });
      if (configs) setWaveConfigs(configs);
    } catch (err) {
      console.error('Error fetching wave configs:', err);
    }
  };

  const loadData = async () => {
    await Promise.all([
      fetchUsers(),
      loadAdminStats(),
      loadWaveConfigs()
    ]);
  };

  const fetchWeeklyAssignments = async () => {
    try {
      const data = await googleSheetService.getWeeklyAssignments((fresh) => {
        if (fresh) setWeeklyAssignments(fresh);
      });
      if (data) setWeeklyAssignments(data);
    } catch (err) {
      console.error('Error fetching weekly assignments:', err);
    }
  };

  const handleBulkAssignRoster = async () => {
    if (!currentUser) return;
    const targetGroup = activeWave === 'all' ? 'EVERY trainee in the system' : `EVERY trainee in ${activeWave}`;
    if (!window.confirm(`This will assign ALL eligible courses to ${targetGroup}. The system will then automatically drip them 3 hours a week based on their cohort start date. Proceed?`)) return;

    setIsBulkAssigning(true);
    try {
      const targetWaveParam = activeWave === 'all' ? undefined : activeWave;
      const selectedWave = activeWave === 'all' ? 'all waves' : 'wave ' + activeWave;
      
      const response = await googleSheetService.bulkAssignRoster(currentUser.id, targetWaveParam);
      
      let msg = "";
      if (response && response.newAssignments !== undefined) {
        if (response.newAssignments === 0 && response.updatedAssignments === 0) {
          msg = `No new assignments were needed for ${selectedWave}. All agents already have matching resources.`;
        } else {
          msg = `Success! Created ${response.newAssignments} new assignments and updated ${response.updatedAssignments} existing ones for ${selectedWave}.`;
        }
      } else {
        msg = `Successfully processed bulk assignment for ${selectedWave}.`;
      }
      
      alert(msg);
      setAssignmentSuccess(msg);
      setTimeout(() => setAssignmentSuccess(null), 8000);
      await loadData();
    } catch (err) {
      alert("Error during bulk curriculum assignment: " + (err as Error).message);
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleManualAssign = async (resourceId: string) => {
    if (!selectedTargetUserId) return;
    setIsProcessing(true);
    try {
      const selectedUser = userList.find(u => u.id === selectedTargetUserId);
      const selectedWave = selectedUser?.wave || selectedUser?.waveNumber || 'All';
      await googleSheetService.assignToWeek(targetWeek, [resourceId], selectedTargetUserId, selectedWave);
      setAssignmentSuccess("Module assigned successfully to student!");
      setTimeout(() => setAssignmentSuccess(null), 5000);
      fetchWeeklyAssignments();
    } catch (err) {
      alert("Failed to manual assign module: " + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignToWeek = async () => {
    if (!selectedTargetUserId || selectedResourceIds.length === 0) return;
    setIsProcessing(true);
    try {
      const selectedUser = userList.find(u => u.id === selectedTargetUserId);
      const selectedWave = selectedUser?.wave || selectedUser?.waveNumber || 'All';
      await googleSheetService.assignToWeek(targetWeek, selectedResourceIds, selectedTargetUserId, selectedWave);
      setAssignmentSuccess(`Successfully assigned ${selectedResourceIds.length} modules to Week ${targetWeek}!`);
      setSelectedResourceIds([]);
      setTimeout(() => setAssignmentSuccess(null), 5000);
      fetchWeeklyAssignments();
    } catch (err) {
      alert("Failed to complete assignment batch: " + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredResources = useMemo(() => {
    return globalResources.filter(res => {
      const matchSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          res.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (res.objective && res.objective.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (res.type && res.type.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [globalResources, searchTerm]);

  const getAssignedWeek = (resourceId: string) => {
    for (const [weekNum, ids] of Object.entries(weeklyAssignments)) {
      if (Array.isArray(ids) && ids.includes(resourceId)) return weekNum;
    }
    return null;
  };

  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'library') {
      loadData();
    }
    if (activeTab === 'library') {
      fetchResources();
      fetchWeeklyAssignments();
    }
  }, [activeTab]);

  const exportToCsv = () => {
    if (!filteredStats.length) return;
    const headers = [
      'Name',
      'Email',
      'Role',
      'CEFR Level',
      'Fluency',
      'Vocabulary',
      'Grammar',
      'Pronunciation',
      'Coherence',
      'Assigned Coach'
    ].join(',');

    const rows = filteredStats.map(u => {
      const m = u.metrics || {};
      return [
        `"${u.name}"`,
        `"${u.email}"`,
        u.role, 
        u.languageLevel || 'N/A', 
        m.fluency || 0, 
        m.vocabulary || 0, 
        m.grammar || 0, 
        m.pronunciation || 0, 
        m.coherence || 0, 
        u.assignedCoach || 'Unassigned'
      ].join(',');
    }).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Registry_Export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  return (
    <div id="admin-panel-container" className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 md:p-8 max-w-7xl mx-auto animate-fadeIn my-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center tracking-tight">
            <Brain className="mr-3 text-tp-purple w-7 h-7" /> Registry Master
          </h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1.5 ml-0.5">Enterprise Console</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Cohort Wave Dropdown Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-tp-purple uppercase tracking-wider">Cohort:</span>
            <select
              value={activeWave}
              onChange={(e) => setActiveWave(e.target.value)}
              className="bg-white text-tp-purple font-bold text-xs uppercase tracking-wider px-2.5 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-tp-purple/20 cursor-pointer"
            >
              <option value="all">🌐 All Waves</option>
              {availableWaves.map(wave => (
                <option key={wave} value={wave}>🌊 {wave}</option>
              ))}
            </select>
          </div>

          <div className="flex bg-slate-100/80 p-1 rounded-xl overflow-x-auto max-w-full border border-slate-200/60">
          {[
            { id: 'users', label: 'Roster' },
            ...(currentUser.role === 'admin' ? [{ id: 'cohort-analytics', label: 'Cohort Analytics', badge: '6 Waves' }] : []),
            { id: 'library', label: 'Resource Library' },
            { id: 'interactive', label: 'Interactive .DOCX' },
            { id: 'assigner', label: 'Assign Lessons' },
            { id: 'onboarding', label: 'Onboarding' },
            { id: 'content', label: 'Import' }
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${activeTab === tab.id ? 'bg-white text-tp-purple shadow-sm font-extrabold' : 'text-slate-600 hover:text-tp-purple hover:bg-white/50'}`}
            >
              <span>{tab.label}</span>
              {(tab as any).badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200">
                  {(tab as any).badge}
                </span>
              )}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Dual-Mode Target Goal Settings Manager */}
      {activeWave !== 'all' && activeTab !== 'cohort-analytics' && (
        <div id="goal-settings-card" className="w-full bg-slate-50/80 rounded-2xl p-6 border border-slate-200 shadow-sm mb-8 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-tp-purple flex items-center gap-2">
                🎯 Target Goal Settings : Wave {activeWave}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Manage target parameters for this wave group
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Currently Active Goal:</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                {waveConfigs[activeWave]?.activeGoal || 180} mins / week
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Permanent Default Goal */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Permanent Default Goal</h4>
                <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                  This is the lifetime baseline target parameter for this group. It applies automatically to subsequent weeks.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  type="number"
                  value={defaultGoalInput}
                  onChange={(e) => setDefaultGoalInput(e.target.value)}
                  placeholder="180"
                  className="w-[100px] bg-slate-50 text-slate-900 font-bold text-xs text-center px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-tp-purple/20 focus:border-tp-purple"
                  disabled={isSavingGoal}
                  min="0"
                />
                <button
                  onClick={async () => {
                    if (!defaultGoalInput || isNaN(Number(defaultGoalInput))) return;
                    setIsSavingGoal(true);
                    try {
                      const goalNum = Number(defaultGoalInput);
                      const updated = await googleSheetService.setWaveConfig(activeWave, 'default', goalNum);
                      setWaveConfigs(prev => ({
                        ...prev,
                        [activeWave]: updated?.[activeWave] || {
                          ...prev[activeWave],
                          defaultGoal: goalNum,
                          activeGoal: updated?.[activeWave]?.activeGoal || goalNum
                        }
                      }));
                      await loadData();
                    } catch (err) {
                      console.error("Failed to save default wave goal config:", err);
                      alert("Failed to save default goal: " + (err as Error).message);
                    } finally {
                      setIsSavingGoal(false);
                    }
                  }}
                  disabled={isSavingGoal}
                  className="flex-1 bg-tp-purple hover:bg-tp-purple-light active:bg-tp-purple text-white font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-xl transition-all disabled:opacity-50 cursor-pointer text-center shadow-sm"
                >
                  {isSavingGoal ? 'Saving...' : 'Set for Good'}
                </button>
              </div>
            </div>

            {/* This Week's Override */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">This Week's Override</h4>
                <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                  Temporary target that expires on Monday. Enter a custom value or leave empty to clear individual temporary target.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  type="number"
                  value={weeklyOverrideInput}
                  onChange={(e) => setWeeklyOverrideInput(e.target.value)}
                  placeholder="e.g. 240"
                  className="w-[100px] bg-slate-50 text-slate-900 font-bold text-xs text-center px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-tp-purple/20 focus:border-tp-purple"
                  disabled={isSavingGoal}
                  min="0"
                />
                <button
                  onClick={async () => {
                    setIsSavingGoal(true);
                    try {
                      const goalNum = weeklyOverrideInput ? Number(weeklyOverrideInput) : 0;
                      const updated = await googleSheetService.setWaveConfig(activeWave, 'weekly', goalNum);
                      setWaveConfigs(prev => ({
                        ...prev,
                        [activeWave]: updated?.[activeWave] || {
                          ...prev[activeWave],
                          currentWeekGoal: goalNum || null,
                          activeGoal: updated?.[activeWave]?.activeGoal || prev[activeWave]?.defaultGoal || 180
                        }
                      }));
                      await loadData();
                    } catch (err) {
                      console.error("Failed to save weekly override config:", err);
                      alert("Failed to save override: " + (err as Error).message);
                    } finally {
                      setIsSavingGoal(false);
                    }
                  }}
                  disabled={isSavingGoal}
                  className="flex-1 bg-tp-purple hover:bg-tp-purple-light active:bg-tp-purple text-white font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-xl transition-all disabled:opacity-50 cursor-pointer text-center shadow-sm"
                >
                  {isSavingGoal ? 'Saving...' : 'Set for This Week'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assignmentSuccess && (
        <div id="assignment-success-banner" className="mb-8 bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-2xl flex items-center gap-4 animate-fadeIn shadow-xs">
          <div className="bg-emerald-100 p-2 rounded-xl">
            <CheckCircle className="w-5 h-5 text-emerald-700" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">{assignmentSuccess}</span>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div id="stat-total-agents" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-50 rounded-lg text-tp-purple">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Agents</span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-extrabold text-slate-900">{metrics.totalAgents}</h3>
                <span className="text-xs font-medium text-slate-500">Active</span>
              </div>
            </div>

            <div id="stat-avg-progress" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Progress</span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-extrabold text-slate-900">{metrics.avgProgress}%</h3>
                <span className="text-xs font-medium text-emerald-600">Overall</span>
              </div>
            </div>

            <div id="stat-weekly-overview" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-tp-purple/10 rounded-lg text-tp-purple">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weekly Overview</span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-extrabold text-slate-900">{metrics.avgWeeklyProgress}%</h3>
                <span className="text-xs font-medium text-tp-purple">Weekly Avg</span>
              </div>
            </div>

            <div id="stat-agents-risk" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agents at Risk</span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-extrabold text-slate-900">{metrics.atRisk}</h3>
                <span className="text-xs font-medium text-rose-600">Under 30%</span>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                id="search-agent-input"
                type="text" 
                placeholder="Search by agent name or email..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-tp-purple/20 focus:border-tp-purple transition-all text-xs sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              <select 
                id="week-select-filter"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="px-3 py-1.5 bg-white text-tp-purple rounded-lg text-xs font-bold uppercase tracking-wider outline-none border-none focus:ring-0 cursor-pointer"
              >
                <option value="overall">Overall View</option>
                {availableWeeks.map(week => (
                  <option key={week} value={week}>{week}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              <button 
                id="filter-show-all-btn"
                onClick={() => setShowStagnant(false)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${!showStagnant ? 'bg-tp-purple text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Show All
              </button>
              <button 
                id="filter-show-stagnant-btn"
                onClick={() => setShowStagnant(true)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${showStagnant ? 'bg-tp-red text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Show Stagnant
              </button>
            </div>
            <button 
              id="export-csv-btn"
              onClick={exportToCsv}
              className="flex items-center gap-2 bg-tp-navy text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-tp-purple transition-all shadow-sm cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80">
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Agent ID</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Cohort/Wave</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                      {selectedWeek === 'overall' ? 'Weekly Mins' : `${selectedWeek} Minutes`}
                    </th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {selectedWeek === 'overall' ? 'Overall Progress' : `${selectedWeek} Progress (%)`}
                    </th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                      {selectedWeek === 'overall' ? 'Completed' : `${selectedWeek} Completed`}
                    </th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStats.map((user, idx) => (
                    <tr key={`user-row-${user.id || idx}`} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-tp-purple/10 rounded-xl flex items-center justify-center text-tp-purple font-bold text-xs shrink-0">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-tp-purple transition-colors text-sm">{user.name}</p>
                            <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-tp-purple">
                          {user.wave || 'Pilot/Unassigned'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold ${user.weeklyMinutes === 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-purple-50 text-tp-purple'}`}>
                          {user.weeklyMinutes}m
                        </span>
                      </td>
                      <td className="px-5 py-4 min-w-[180px]">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${
                                user.overallProgress >= 80 ? 'bg-emerald-600' : user.overallProgress >= 40 ? 'bg-tp-purple' : 'bg-rose-500'
                              }`}
                              style={{ width: `${user.overallProgress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-bold text-slate-700 w-10">
                            {user.overallProgress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <p className="text-sm font-bold text-slate-900">{user.totalCompleted}</p>
                        <p className="text-xs text-slate-400 font-semibold">/ {user.totalAssigned}</p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => { setDrilldownUser(user); setIsDrilldownOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-tp-purple hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="Audit Metrics"
                          >
                            <Brain className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onImpersonate(user)}
                            className="p-1.5 text-slate-400 hover:text-tp-purple hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="View Hub"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { setSelectedTargetUserId(user.id); setActiveTab('library'); }}
                            className="p-1.5 text-slate-400 hover:text-tp-purple hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="Assign Module"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredStats.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-slate-400 font-semibold uppercase text-xs tracking-wider">No agents found matching your criteria.</p>
              </div>
            )}
          </div>

          <div className="flex justify-center pt-4">
            <button
              id="bulk-assign-roster-btn"
              onClick={handleBulkAssignRoster}
              disabled={isBulkAssigning}
              className="bg-tp-purple hover:bg-tp-purple-light text-white px-8 py-3.5 rounded-xl transition-all disabled:opacity-50 shadow-sm font-bold uppercase text-xs tracking-wider flex items-center gap-2.5 cursor-pointer"
            >
              {isBulkAssigning ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <ClipboardList className="w-4 h-4" />
              )}
              {isBulkAssigning ? 'Processing Roster...' : activeWave === 'all' ? 'Bulk Assign All to Roster' : `Bulk Assign ${activeWave} to Roster`}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'library' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="sticky top-4 bg-tp-purple rounded-2xl p-5 shadow-lg flex flex-col gap-4 z-30 border border-white/10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white text-xs font-bold uppercase tracking-wider">Target Student Selector</p>
                  <p className="text-white/60 text-xs font-normal">Assigned modules will sync immediately to their dashboard.</p>
                </div>
              </div>
              <select 
                id="target-student-dropdown"
                value={selectedTargetUserId}
                onChange={(e) => setSelectedTargetUserId(e.target.value)}
                className="w-full lg:w-auto lg:min-w-[360px] bg-white text-tp-purple font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl outline-none shadow-sm cursor-pointer"
              >
                <option value="">Select an agent from the roster...</option>
                {userList.filter(u => u.role === 'agent').map((u, idx) => (
                  <option key={`student-opt-${u.id || idx}`} value={u.id}>{u.name} — {u.languageLevel}</option>
                ))}
              </select>
            </div>

            {selectedResourceIds.length > 0 && (
              <div className="bg-white/10 p-4 rounded-xl border border-white/20 flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <span className="text-white text-xs font-bold uppercase tracking-wider">
                    {selectedResourceIds.length} Resources Selected
                  </span>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <label className="text-white text-xs font-semibold uppercase tracking-wider">Target Week:</label>
                    <input 
                      id="target-week-input"
                      type="number" 
                      min="1"
                      value={targetWeek}
                      onChange={(e) => setTargetWeek(parseInt(e.target.value) || 1)}
                      className="w-16 bg-white text-tp-purple font-bold text-xs px-3 py-1.5 rounded-lg outline-none text-center"
                    />
                  </div>
                  <button 
                    id="batch-assign-to-week-btn"
                    onClick={handleAssignToWeek}
                    disabled={isProcessing}
                    className="bg-tp-red text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-all shadow-sm flex-1 md:flex-none cursor-pointer"
                  >
                    {isProcessing ? 'Assigning...' : `Assign to Week ${targetWeek}`}
                  </button>
                </div>
              </div>
            )}

            <div className="relative">
               <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-white/50">
                 <Search className="w-4 h-4" />
               </div>
               <input 
                 id="search-resources-input"
                 type="text"
                 placeholder="Search by module title, tag, or CEFR level..."
                 className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-xs sm:text-sm outline-none focus:bg-white/20 transition-all placeholder:text-white/40"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-12">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80">
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Select</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Module Title</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">CEFR</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Curriculum Week</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResources.map((res, idx) => {
                    const assignedWeek = getAssignedWeek(res.id);
                    return (
                      <tr key={`resource-row-${res.id || idx}`} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-5 py-4">
                          <input 
                            type="checkbox"
                            checked={selectedResourceIds.includes(res.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedResourceIds(prev => [...prev, res.id]);
                              } else {
                                setSelectedResourceIds(prev => prev.filter(id => id !== res.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-tp-purple focus:ring-tp-purple cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-tp-purple transition-colors text-sm">{res.title}</p>
                            <p className="text-xs text-slate-400 font-normal line-clamp-1 mt-0.5">{res.objective}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-bold text-tp-red uppercase tracking-wider">{res.level}</span>
                        </td>
                        <td className="px-5 py-4">
                          {assignedWeek ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-tp-purple">
                              Assigned: Week {assignedWeek}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-normal">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{res.type}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button 
                            onClick={() => handleManualAssign(res.id)}
                            disabled={isProcessing || !selectedTargetUserId}
                            className={`inline-flex items-center gap-1.5 bg-tp-navy text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm hover:bg-tp-red disabled:opacity-30 active:scale-95 ml-auto cursor-pointer`}
                            title={selectedTargetUserId ? "Assign to selected student" : "Select a student first"}
                          >
                            <Plus className="w-3.5 h-3.5" /> Assign
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredResources.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-slate-400 font-semibold uppercase text-xs tracking-wider">No matching resources found in the library.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          <QuickAddAgent onAgentAdded={fetchUsers} />
          <div className="relative flex py-5 items-center max-w-4xl mx-auto">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">or batch ingest pdf reports</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>
          <UserUploader currentUser={currentUser} onUserCreated={fetchUsers} />
        </div>
      )}

      {activeTab === 'interactive' && (
        <div className="space-y-6">
          <InteractiveLessonUploader onSuccess={onUpdateContent} />
          <LessonAssigner currentAdminId={currentUser.id || currentUser.email} />
        </div>
      )}

      {activeTab === 'cohort-analytics' && currentUser.role === 'admin' && (
        <div className="w-full mt-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <CohortAnalyticsDashboard
            liveUsers={userList}
            adminStats={adminStats}
            currentUser={currentUser}
            onRefreshUsers={fetchUsers}
          />
        </div>
      )}

      {activeTab === 'assigner' && <LessonAssigner currentAdminId={currentUser.id || currentUser.email} />}

      {activeTab === 'content' && <ResourceUploader onUploadComplete={onUpdateContent} />}
      
      <MetricsDrillDown 
        isOpen={isDrilldownOpen}
        onClose={() => { setIsDrilldownOpen(false); setDrilldownUser(null); }}
        user={drilldownUser}
        adminStats={adminStats}
        currentUser={currentUser}
        onRefresh={loadData}
      />
    </div>
  );
};

export default AdminPanel;
