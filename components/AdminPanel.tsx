
import React, { useState, useEffect, useMemo } from 'react';
import { shlService } from '../services/shlService';
import { geminiService } from '../services/geminiService';
import { googleSheetService } from '../services/googleSheetService';
import ResourceUploader from './admin/ResourceUploader';
import { ClipboardListIcon, UserIcon, DownloadIcon, BrainIcon, PlusIcon, SearchIcon, CheckCircleIcon } from './Icons';
import type { UserProfile, Resource } from '../types';

interface AdminPanelProps {
  onUpdateContent: () => void;
  currentUser: UserProfile;
  onFileProcessed?: (file: File) => Promise<void>;
  onImpersonate: (user: UserProfile) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onUpdateContent, currentUser, onFileProcessed, onImpersonate }) => {
  if (currentUser.role !== 'admin') return null;

  const [activeTab, setActiveTab] = useState<'onboarding' | 'users' | 'library' | 'content'>('users');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [globalResources, setGlobalResources] = useState<Resource[]>([]);
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (currentUser.role !== 'admin') return;
    setIsProcessing(true);
    try {
      const users = await googleSheetService.fetchAllUsers();
      setUserList(Array.isArray(users) ? users : []);
    } catch (err) {
      setUserList([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchResources = async () => {
    try {
      // Fix Admin Library Visibility: Pass role 'admin'
      const res = await googleSheetService.fetchUserPlan(currentUser.id, 'admin');
      setGlobalResources(Array.isArray(res) ? res : []);
    } catch (e) {
      setGlobalResources([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'library') {
      fetchUsers();
    }
    if (activeTab === 'library') {
      fetchResources();
    }
  }, [activeTab]);

  const handleManualAssign = async (resourceId: string) => {
    // Crucial: check if (!selectedUser)
    if (!selectedTargetUserId) {
      return alert('Please select a user first');
    }
    
    setIsProcessing(true);
    setAssignmentSuccess(null);
    try {
      // Correct Payload: targetUid, resourceId, adminId
      await googleSheetService.assignManualResource(selectedTargetUserId, resourceId, currentUser.id);
      
      const studentName = userList.find(u => u.id === selectedTargetUserId)?.name || 'Student';
      // UI Feedback: Assignment Saved
      setAssignmentSuccess(`Assignment Saved: Module synced for ${studentName}`);
      
      setTimeout(() => setAssignmentSuccess(null), 3000);
      onUpdateContent();
    } catch (e) {
      alert("Manual assignment failed. Please check registry connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredResources = useMemo(() => {
    if (!searchTerm) return globalResources;
    const low = searchTerm.toLowerCase();
    return globalResources.filter(r => 
      r.title.toLowerCase().includes(low) || 
      r.tags.some(t => t.toLowerCase().includes(low)) ||
      r.level.toLowerCase().includes(low)
    );
  }, [globalResources, searchTerm]);

  const exportToCsv = () => {
    if (userList.length === 0) return;
    const headers = ['UID', 'Name', 'Email', 'Role', 'Level', 'SVAR', 'WriteX', 'Assigned Coach'].join(',');
    const rows = userList.map(u => {
      const svar = u.shlData?.svar?.overall ?? 'N/A';
      const writex = u.shlData?.writex?.grammar ?? 'N/A';
      return [u.id, `"${u.name}"`, u.email || 'N/A', u.role, u.languageLevel || 'N/A', svar, writex, u.assignedCoach || 'Unassigned'].join(',');
    }).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Registry_Export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  return (
    <div className="bg-white rounded-[48px] shadow-2xl p-10 max-w-6xl mx-auto border border-gray-100 animate-fadeIn mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-black text-tp-purple flex items-center tracking-tight uppercase">
            <BrainIcon className="mr-4 text-tp-red" /> Registry Master
          </h1>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">Enterprise Console</p>
        </div>
        <div className="flex bg-tp-purple/5 p-1 rounded-2xl overflow-x-auto max-w-full shadow-inner">
          {[
            { id: 'users', label: 'Roster' },
            { id: 'library', label: 'Resource Library' },
            { id: 'onboarding', label: 'Onboarding' },
            { id: 'content', label: 'Import' }
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-tp-purple shadow-sm' : 'text-gray-500 hover:text-tp-purple'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {assignmentSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircleIcon className="w-5 h-5" filled />
          <span className="text-xs font-black uppercase tracking-widest">{assignmentSuccess}</span>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex justify-between items-center px-2">
             <h3 className="font-black text-tp-purple uppercase text-sm tracking-widest">Active Roster</h3>
             <button onClick={exportToCsv} disabled={userList.length === 0} className="flex items-center gap-3 bg-tp-navy text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-tp-purple transition-all shadow-xl disabled:opacity-50">
                <DownloadIcon className="w-4 h-4" /> Export Registry
             </button>
          </div>
          <div className="overflow-x-auto border border-gray-100 rounded-[32px] shadow-inner bg-gray-50/30">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                  <th className="px-8 py-5">Name</th>
                  <th className="px-4 py-5 text-center">Level</th>
                  <th className="px-4 py-5 text-center">SVAR</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {userList.map((user) => (
                  <tr key={user.id} className="hover:bg-tp-purple/[0.02] transition-colors group">
                    <td className="px-8 py-5">
                      <p className="font-bold text-tp-purple text-base leading-none">{user.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-1">{user.email}</p>
                    </td>
                    <td className="px-4 py-5 text-center font-black text-tp-red">{user.languageLevel}</td>
                    <td className="px-4 py-5 text-center font-black text-tp-purple">{user.shlData?.svar?.overall ?? '--'}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setSelectedTargetUserId(user.id); setActiveTab('library'); }} 
                          className="bg-tp-navy text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-tp-purple transition-all"
                        >
                          Manual Assign
                        </button>
                        <button 
                          onClick={() => onImpersonate(user)} 
                          className="bg-tp-purple text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-tp-red transition-all"
                        >
                          View Hub
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'library' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="sticky top-0 bg-tp-purple rounded-[32px] p-8 shadow-2xl flex flex-col gap-6 z-30 border border-white/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white/10 rounded-xl text-white">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white text-[10px] font-black uppercase tracking-[0.2em] mb-1">Target Student Selector</p>
                  <p className="text-white/50 text-[9px] font-medium uppercase italic">Assigned modules will sync immediately to their dashboard.</p>
                </div>
              </div>
              <select 
                value={selectedTargetUserId}
                onChange={(e) => setSelectedTargetUserId(e.target.value)}
                className="w-full md:w-auto md:min-w-[320px] bg-white text-tp-purple font-black text-[11px] uppercase tracking-widest px-6 py-4 rounded-2xl outline-none border-2 border-transparent focus:border-tp-red transition-all shadow-xl"
              >
                <option value="">Select an agent from the roster...</option>
                {userList.filter(u => u.role === 'agent').map(u => (
                  <option key={u.id} value={u.id}>{u.name} — {u.languageLevel}</option>
                ))}
              </select>
            </div>

            <div className="relative">
               <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/40">
                 <SearchIcon className="w-5 h-5" />
               </div>
               <input 
                 type="text"
                 placeholder="Search by module title, tag, or CEFR level..."
                 className="w-full bg-white/10 border border-white/20 rounded-2xl px-12 py-4 text-white text-sm outline-none focus:bg-white/20 transition-all placeholder:text-white/30"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map(res => (
              <div key={res.id} className="p-6 bg-white border border-gray-100 rounded-[32px] hover:shadow-2xl transition-all flex flex-col justify-between group h-[200px] hover:-translate-y-1">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-black bg-tp-purple/5 text-tp-purple px-2 py-1 rounded-lg uppercase tracking-widest">{res.tags[0]}</span>
                    <span className="text-[10px] font-black text-tp-red uppercase tracking-widest">{res.level}</span>
                  </div>
                  <h4 className="font-black text-tp-purple text-base leading-tight group-hover:text-tp-red transition-colors">{res.title}</h4>
                  <p className="text-[10px] text-gray-400 mt-2 line-clamp-2 italic font-medium">"{res.objective}"</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                   <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{res.type}</span>
                   <button 
                    onClick={() => handleManualAssign(res.id)}
                    disabled={isProcessing || !selectedTargetUserId}
                    className={`flex items-center gap-2 bg-tp-navy text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:bg-tp-red disabled:opacity-30`}
                    title={selectedTargetUserId ? "Assign to selected student" : "Select a student first"}
                  >
                    <PlusIcon className="w-4 h-4" /> Assign
                  </button>
                </div>
              </div>
            ))}
            {filteredResources.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-300 font-black uppercase text-xs tracking-[0.3em]">
                No matching resources found in the library.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div className="space-y-8 animate-fadeIn max-w-2xl mx-auto py-10">
          <div className="border-4 border-dashed border-tp-purple/5 rounded-[40px] p-16 text-center hover:border-tp-purple/20 transition-all bg-gray-50/50 shadow-inner">
            <ClipboardListIcon className="w-20 h-20 text-tp-purple mx-auto mb-8 opacity-40" />
            <h3 className="text-2xl font-black text-tp-purple mb-4 uppercase tracking-tight">Automated Onboarding Pipeline</h3>
            <p className="text-sm text-gray-500 mb-10 font-medium">Gemini 3 Pro handles deep extraction of SHL PDF metrics.</p>
            <label className="bg-tp-red text-white px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-pointer shadow-2xl hover:bg-tp-navy transition-all">
              {isProcessing ? 'Synchronizing Node...' : 'Upload Evaluation Report'}
              <input type="file" className="hidden" accept=".pdf" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsProcessing(true);
                try {
                  await shlService.processAndRegister(file);
                  alert("Success: Candidate intelligence integrated into registry.");
                  fetchUsers();
                } catch (err) { alert("Registration Failed: Sync Timeout"); }
                finally { setIsProcessing(false); }
              }} disabled={isProcessing} />
            </label>
          </div>
        </div>
      )}

      {activeTab === 'content' && <ResourceUploader onSuccess={onUpdateContent} />}
    </div>
  );
};

export default AdminPanel;
