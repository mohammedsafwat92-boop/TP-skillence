
import React, { useState, useEffect, useMemo } from 'react';
import { googleSheetService } from '../services/googleSheetService';
import { shlService } from '../services/shlService';
import { ClipboardListIcon, BrainIcon, UserIcon, PlusIcon, SearchIcon, CheckCircleIcon } from './Icons';
import type { UserProfile, Resource } from '../types';

interface CoachPanelProps {
  onUpdateContent: () => void;
  currentUser: UserProfile;
  onImpersonate: (user: UserProfile) => void;
}

const CoachPanel: React.FC<CoachPanelProps> = ({ onUpdateContent, currentUser, onImpersonate }) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'library'>('roster');
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalResources, setGlobalResources] = useState<Resource[]>([]);
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);

  const fetchMyStudents = async () => {
    setIsProcessing(true);
    try {
      const users = await googleSheetService.fetchAllUsers();
      const filtered = (Array.isArray(users) ? users : []).filter(u => 
        u.role === 'agent' && u.assignedCoach === currentUser.email
      );
      setUserList(filtered);
    } catch (err) {
      setUserList([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchResources = async () => {
    try {
      // Fix: Fetch the library via getUserPlan with role 'coach'
      const res = await googleSheetService.fetchUserPlan(currentUser.id, 'coach');
      setGlobalResources(Array.isArray(res) ? res : []);
    } catch (e) {
      setGlobalResources([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'roster' || activeTab === 'library') {
      fetchMyStudents();
    }
    if (activeTab === 'library') {
      fetchResources();
    }
  }, [currentUser.email, activeTab]);

  const handleManualAssign = async (resourceId: string) => {
    if (!selectedTargetUserId) {
      alert("Please select an agent first from your roster dropdown.");
      return;
    }
    
    setIsProcessing(true);
    setAssignmentSuccess(null);
    try {
      // Correct Payload: targetUid, resourceId, adminId (using current coach's ID)
      await googleSheetService.assignManualResource(selectedTargetUserId, resourceId, currentUser.id);
      
      const studentName = userList.find(u => u.id === selectedTargetUserId)?.name || 'Agent';
      setAssignmentSuccess(`Assignment Saved: Module synced for ${studentName}`);
      
      // Auto-clear success message
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
      r.tags.some(t => t.toLowerCase().includes(low))
    );
  }, [globalResources, searchTerm]);

  return (
    <div className="bg-white rounded-[48px] shadow-2xl p-10 max-w-6xl mx-auto border border-gray-100 animate-fadeIn mt-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-black text-tp-purple flex items-center uppercase tracking-tight">
            <BrainIcon className="mr-4 text-tp-red" /> Coaching Roster
          </h1>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">Direct oversight: {currentUser.name}</p>
        </div>
        <div className="flex bg-tp-purple/5 p-1 rounded-2xl shadow-inner">
          <button 
            onClick={() => setActiveTab('roster')} 
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'roster' ? 'bg-white text-tp-purple shadow-sm' : 'text-gray-500 hover:text-tp-purple'}`}
          >
            Agent Directory
          </button>
          <button 
            onClick={() => setActiveTab('library')} 
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'library' ? 'bg-white text-tp-purple shadow-sm' : 'text-gray-500 hover:text-tp-purple'}`}
          >
            Resource Library
          </button>
        </div>
      </div>

      {assignmentSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircleIcon className="w-5 h-5" filled />
          <span className="text-xs font-black uppercase tracking-widest">{assignmentSuccess}</span>
        </div>
      )}

      {activeTab === 'roster' && (
        <div className="space-y-10 animate-fadeIn">
          <div className="border-4 border-dashed border-tp-purple/5 rounded-[40px] p-10 text-center bg-gray-50/50 hover:border-tp-purple/20 transition-all shadow-inner">
            <h3 className="text-xl font-black text-tp-purple mb-4 uppercase tracking-tight">Direct Agent Onboarding</h3>
            <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto font-medium">Upload performance PDF to auto-assign to your roster.</p>
            <label className={`bg-tp-purple text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-tp-navy transition-all shadow-2xl inline-block ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
              {isProcessing ? 'Synchronizing Registry...' : 'Ingest New Evaluation'}
              <input type="file" className="hidden" accept=".pdf" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsProcessing(true);
                try {
                  await shlService.processAndRegister(file, currentUser.email);
                  alert(`Success: Integrated to your coaching roster.`);
                  fetchMyStudents();
                  onUpdateContent();
                } catch (err) { alert("Sync Failure: Registry timed out."); }
                finally { setIsProcessing(false); }
              }} />
            </label>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-[32px] shadow-inner bg-gray-50/30">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                  <th className="px-8 py-5">Agent Name</th>
                  <th className="px-4 py-5 text-center">CEFR</th>
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
                      <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setSelectedTargetUserId(user.id); setActiveTab('library'); }} 
                          className="bg-tp-navy text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-tp-purple transition-all"
                        >
                          Assign
                        </button>
                        <button onClick={() => onImpersonate(user)} className="bg-tp-purple text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-tp-red transition-all">View Hub</button>
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
          <div className="sticky top-0 bg-tp-navy rounded-[32px] p-8 shadow-2xl flex flex-col gap-6 z-30 border border-white/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-white">
                <UserIcon className="w-5 h-5 opacity-40" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Assignment Target</p>
                  <p className="text-sm font-black uppercase tracking-tight">Select active agent</p>
                </div>
              </div>
              <select 
                value={selectedTargetUserId}
                onChange={(e) => setSelectedTargetUserId(e.target.value)}
                className="w-full md:w-auto md:min-w-[300px] bg-white text-tp-purple font-black text-[11px] uppercase tracking-widest px-6 py-4 rounded-2xl shadow-xl outline-none"
              >
                <option value="">Choose an agent from your roster...</option>
                {userList.map(u => (
                  <option key={u.id} value={u.id}>{u.name} — {u.languageLevel}</option>
                ))}
              </select>
            </div>

            <div className="relative">
               <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/30">
                 <SearchIcon className="w-5 h-5" />
               </div>
               <input 
                 type="text"
                 placeholder="Search module library by keyword..."
                 className="w-full bg-white/5 border border-white/10 rounded-2xl px-12 py-4 text-white text-sm outline-none focus:bg-white/10 transition-all placeholder:text-white/20"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map(res => (
              <div key={res.id} className="p-6 bg-white border border-gray-100 rounded-[32px] hover:shadow-2xl transition-all flex flex-col justify-between group h-[180px] hover:-translate-y-1">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[8px] font-black bg-tp-purple/5 text-tp-purple px-2 py-0.5 rounded uppercase tracking-widest">{res.tags[0]}</span>
                    <span className="text-[9px] font-black text-tp-red uppercase tracking-widest">{res.level}</span>
                  </div>
                  <h4 className="font-black text-tp-purple text-base leading-tight group-hover:text-tp-red transition-colors line-clamp-2">{res.title}</h4>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                   <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{res.type}</span>
                   <button 
                    onClick={() => handleManualAssign(res.id)}
                    disabled={isProcessing || !selectedTargetUserId}
                    className="bg-tp-purple text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-tp-red transition-all shadow-lg disabled:opacity-20"
                  >
                    Assign
                  </button>
                </div>
              </div>
            ))}
            {filteredResources.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-300 font-black uppercase text-xs tracking-[0.3em]">
                Empty Library Search Result.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachPanel;
