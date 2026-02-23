import React, { useState, useEffect, useMemo } from 'react';
import { shlService } from '../services/shlService';
import { geminiService } from '../services/geminiService';
import { googleSheetService } from '../services/googleSheetService';
import ResourceUploader from './admin/ResourceUploader';
import UserUploader from './admin/UserUploader';
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
      // Fix Admin Library Visibility: Fetch full library using role 'admin'
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
    // Step 2: Crucial validation check for selected user
    if (!selectedTargetUserId) {
      return alert('Please select a target user from the dropdown first');
    }
    
    setIsProcessing(true);
    setAssignmentSuccess(null);
    try {
      // Step 2: Call with correct payload targetUid, resourceId, adminId
      await googleSheetService.assignManualResource(selectedTargetUserId, resourceId, currentUser.id);
      
      const studentName = userList.find(u => u.id === selectedTargetUserId)?.name || 'Student';
      // Step 2 & 4: Visual Feedback
      setAssignmentSuccess(`Assignment Saved: Module synced for ${studentName}`);
      
      setTimeout(() => setAssignmentSuccess(null), 4000);
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
    <div className="bg-white rounded-[48px] shadow-2xl p-8 md:p-12 max-w-7xl mx-auto border border-gray-100 animate-fadeIn mt-8 mb-20 shadow-tp-purple/5">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-8">
        <div>
          <h1 className="text-4xl font-black text-tp-purple flex items-center tracking-tight uppercase">
            <BrainIcon className="mr-5 text-tp-red w-8 h-8" /> Registry Master
          </h1>
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest mt-2 ml-1">Enterprise Console</p>
        </div>
        <div className="flex bg-tp-purple/5 p-1.5 rounded-2xl overflow-x-auto max-w-full shadow-inner border border-tp-purple/10">
          {[
            { id: 'users', label: 'Roster' },
            { id: 'library', label: 'Resource Library' },
            { id: 'onboarding', label: 'Onboarding' },
            { id: 'content', label: 'Import' }
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-tp-purple shadow-md border border-tp-purple/5' : 'text-gray-500 hover:text-tp-purple'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {assignmentSuccess && (
        <div className="mb-10 bg-green-50 border border-green-200 text-green-700 p-6 rounded-[32px] flex items-center gap-5 animate-fadeIn shadow-xl shadow-green-100/50">
          <div className="bg-green-100 p-2.5 rounded-xl">
            <CheckCircleIcon className="w-6 h-6" filled />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">{assignmentSuccess}</span>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-10 animate-fadeIn">
          <div className="flex justify-between items-center px-4">
             <h3 className="font-black text-tp-purple uppercase text-sm tracking-widest">Active Roster</h3>
             <button onClick={exportToCsv} disabled={userList.length === 0} className="flex items-center gap-3 bg-tp-navy text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-tp-purple transition-all shadow-xl disabled:opacity-50">
                <DownloadIcon className="w-4 h-4" /> Export Registry
             </button>
          </div>
          <div className="overflow-x-auto border border-gray-100 rounded-[40px] shadow-inner bg-gray-50/30">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                  <th className="px-10 py-6">Name</th>
                  <th className="px-6 py-6 text-center">Level</th>
                  <th className="px-6 py-6 text-center">SVAR</th>
                  <th className="px-10 py-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {userList.map((user) => (
                  <tr key={user.id} className="hover:bg-tp-purple/[0.02] transition-colors group">
                    <td className="px-10 py-6">
                      <p className="font-bold text-tp-purple text-lg leading-none">{user.name}</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-2">{user.email}</p>
                    </td>
                    <td className="px-6 py-6 text-center font-black text-tp-red text-base">{user.languageLevel}</td>
                    <td className="px-6 py-6 text-center font-black text-tp-purple text-base">{user.shlData?.svar?.overall ?? '--'}</td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setSelectedTargetUserId(user.id); setActiveTab('library'); }} 
                          className="bg-tp-navy text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-tp-purple transition-all shadow-md"
                        >
                          Manual Assign
                        </button>
                        <button 
                          onClick={() => onImpersonate(user)} 
                          className="bg-tp-purple text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-tp-red transition-all shadow-md"
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
        <div className="space-y-10 animate-fadeIn">
          <div className="sticky top-0 bg-tp-purple rounded-[40px] p-10 shadow-2xl flex flex-col gap-8 z-30 border border-white/10 shadow-tp-purple/20">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-white/10 rounded-xl text-white">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-white text-[11px] font-black uppercase tracking-[0.2em] mb-1.5">Target Student Selector</p>
                  <p className="text-white/50 text-[10px] font-medium uppercase italic">Assigned modules will sync immediately to their dashboard.</p>
                </div>
              </div>
              <select 
                value={selectedTargetUserId}
                onChange={(e) => setSelectedTargetUserId(e.target.value)}
                className="w-full lg:w-auto lg:min-w-[400px] bg-white text-tp-purple font-black text-[12px] uppercase tracking-widest px-8 py-5 rounded-2xl outline-none border-2 border-transparent focus:border-tp-red transition-all shadow-xl"
              >
                <option value="">Select an agent from the roster...</option>
                {userList.filter(u => u.role === 'agent').map(u => (
                  <option key={u.id} value={u.id}>{u.name} — {u.languageLevel}</option>
                ))}
              </select>
            </div>

            <div className="relative">
               <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/40">
                 <SearchIcon className="w-6 h-6" />
               </div>
               <input 
                 type="text"
                 placeholder="Search by module title, tag, or CEFR level..."
                 className="w-full bg-white/10 border border-white/20 rounded-2xl px-14 py-5 text-white text-base outline-none focus:bg-white/20 transition-all placeholder:text-white/30"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-16">
            {filteredResources.map(res => (
              <div key={res.id} className="p-8 bg-white border border-gray-100 rounded-[40px] hover:shadow-2xl transition-all flex flex-col justify-between group h-[260px] hover:-translate-y-2 shadow-md">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black bg-tp-purple/5 text-tp-purple px-3 py-1.5 rounded-xl uppercase tracking-widest">{res.tags[0]}</span>
                    <span className="text-[11px] font-black text-tp-red uppercase tracking-widest">{res.level}</span>
                  </div>
                  <h4 className="font-black text-tp-purple text-xl leading-tight group-hover:text-tp-red transition-colors">{res.title}</h4>
                  <p className="text-[11px] text-gray-500 mt-3 line-clamp-2 italic font-medium">"{res.objective}"</p>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{res.type}</span>
                   <button 
                    onClick={() => handleManualAssign(res.id)}
                    disabled={isProcessing || !selectedTargetUserId}
                    className={`flex items-center gap-2 bg-tp-navy text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg hover:bg-tp-red disabled:opacity-30 active:scale-95`}
                    title={selectedTargetUserId ? "Assign to selected student" : "Select a student first"}
                  >
                    <PlusIcon className="w-4 h-4" /> Assign
                  </button>
                </div>
              </div>
            ))}
            {filteredResources.length === 0 && (
              <div className="col-span-full py-24 text-center text-gray-400 font-black uppercase text-sm tracking-[0.3em]">
                No matching resources found in the library.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'onboarding' && (
        <UserUploader currentUser={currentUser} onUserCreated={fetchUsers} />
      )}

      {activeTab === 'content' && <ResourceUploader onUploadComplete={onUpdateContent} />}
    </div>
  );
};

export default AdminPanel;