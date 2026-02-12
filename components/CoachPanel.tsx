
import React, { useState, useEffect } from 'react';
import { googleSheetService } from '../services/googleSheetService';
import { shlService } from '../services/shlService';
import { ClipboardListIcon, BrainIcon, UserIcon, DownloadIcon, XIcon, PlusIcon } from './Icons';
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
      const res = await googleSheetService.fetchGlobalResources();
      setGlobalResources(Array.isArray(res) ? res : []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchMyStudents();
    fetchResources();
  }, [currentUser.email, activeTab]);

  const handleManualAssign = async (resourceId: string) => {
    if (!selectedTargetUserId) {
      alert("Please select a student first.");
      return;
    }
    setIsProcessing(true);
    try {
      await googleSheetService.assignManualResource(selectedTargetUserId, resourceId);
      alert(`Assigned module successfully.`);
      onUpdateContent();
    } catch (e) {
      alert("Manual assignment failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-[48px] shadow-2xl p-10 max-w-6xl mx-auto border border-gray-100 animate-fadeIn mt-6 relative">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-black text-tp-purple flex items-center uppercase tracking-tight">
            <BrainIcon className="mr-4 text-tp-red" /> Coaching Roster
          </h1>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">Managed by {currentUser.name}</p>
        </div>
        <div className="flex bg-tp-purple/5 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('roster')} 
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'roster' ? 'bg-white text-tp-purple shadow-sm' : 'text-gray-500 hover:text-tp-purple'}`}
          >
            My Agents
          </button>
          <button 
            onClick={() => setActiveTab('library')} 
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'library' ? 'bg-white text-tp-purple shadow-sm' : 'text-gray-500 hover:text-tp-purple'}`}
          >
            Module Library
          </button>
        </div>
      </div>

      {activeTab === 'roster' && (
        <div className="space-y-10 animate-fadeIn">
          <div className="border-4 border-dashed border-tp-purple/5 rounded-[40px] p-10 text-center bg-gray-50/50 hover:border-tp-purple/20 transition-all">
            <h3 className="text-xl font-black text-tp-purple mb-4 uppercase">Direct Onboarding</h3>
            <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">Upload evaluation for auto-roster assignment.</p>
            <label className={`bg-tp-purple text-white px-10 py-4 rounded-2xl font-black uppercase text-xs cursor-pointer hover:bg-tp-navy transition-all shadow-xl inline-block ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
              {isProcessing ? 'Syncing...' : 'Upload Performance File'}
              <input type="file" className="hidden" accept=".pdf" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsProcessing(true);
                try {
                  await shlService.processAndRegister(file, currentUser.email);
                  alert(`Onboarded successfully.`);
                  fetchMyStudents();
                  onUpdateContent();
                } catch (err) { alert("Onboarding Failed"); }
                finally { setIsProcessing(false); }
              }} />
            </label>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-[32px] shadow-inner bg-gray-50/30">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                  <th className="px-8 py-5">Agent</th>
                  <th className="px-4 py-5 text-center">CEFR</th>
                  <th className="px-4 py-5 text-center">SVAR</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {userList.map((user) => (
                  <tr key={user.id} className="hover:bg-tp-purple/[0.02] transition-colors group">
                    <td className="px-8 py-5">
                      <p className="font-bold text-tp-purple">{user.name}</p>
                      <p className="text-[10px] text-gray-400">{user.email}</p>
                    </td>
                    <td className="px-4 py-5 text-center font-black text-tp-red">{user.languageLevel}</td>
                    <td className="px-4 py-5 text-center font-black text-tp-purple">{user.shlData?.svar?.overall ?? '--'}</td>
                    <td className="px-8 py-5 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => { setSelectedTargetUserId(user.id); setActiveTab('library'); }} 
                        className="bg-tp-navy text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-tp-purple transition-all"
                      >
                        Assign
                      </button>
                      <button onClick={() => onImpersonate(user)} className="bg-tp-purple text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-tp-red transition-all">View Hub</button>
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
          <div className="sticky top-0 bg-tp-navy rounded-[24px] p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 z-30">
            <div className="flex items-center gap-4 text-white">
              <UserIcon className="w-5 h-5 opacity-50" />
              <p className="text-[10px] font-black uppercase tracking-widest">Assigning to:</p>
            </div>
            <select 
              value={selectedTargetUserId}
              onChange={(e) => setSelectedTargetUserId(e.target.value)}
              className="flex-1 max-w-md bg-white text-tp-purple font-bold px-6 py-3 rounded-xl outline-none"
            >
              <option value="">Select an agent from your roster...</option>
              {userList.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.languageLevel})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {globalResources.map(res => (
              <div key={res.id} className="p-6 bg-white border border-gray-100 rounded-[32px] hover:shadow-lg transition-all flex justify-between items-center">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[8px] font-black bg-tp-purple/5 text-tp-purple px-2 py-0.5 rounded uppercase">{res.tags[0]}</span>
                    <span className="text-[9px] font-black text-tp-red uppercase tracking-widest">{res.level}</span>
                  </div>
                  <h4 className="font-black text-tp-purple text-base leading-tight">{res.title}</h4>
                </div>
                <button 
                  onClick={() => handleManualAssign(res.id)}
                  disabled={isProcessing}
                  className="bg-tp-purple text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-tp-red transition-all shadow-lg disabled:opacity-50"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachPanel;
