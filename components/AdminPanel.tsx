
import React, { useState, useEffect } from 'react';
import { shlService } from '../services/shlService';
import { geminiService } from '../services/geminiService';
import { googleSheetService } from '../services/googleSheetService';
import ResourceUploader from './admin/ResourceUploader';
import { ClipboardListIcon, UserIcon, DownloadIcon, BrainIcon, PlusIcon, LightningIcon, CheckCircleIcon, XIcon, TableIcon } from './Icons';
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

  const fetchUsers = async () => {
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
      const res = await googleSheetService.fetchGlobalResources();
      setGlobalResources(Array.isArray(res) ? res : []);
    } catch (e) {
      setGlobalResources([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchResources();
  }, [activeTab]);

  const handleManualAssign = async (resourceId: string) => {
    if (!selectedTargetUserId) {
      alert("Please select a target student first.");
      return;
    }
    setIsProcessing(true);
    try {
      await googleSheetService.assignManualResource(selectedTargetUserId, resourceId);
      const studentName = userList.find(u => u.id === selectedTargetUserId)?.name || 'Student';
      alert(`Successfully assigned to ${studentName}`);
      onUpdateContent();
    } catch (e) {
      alert("Manual assignment failed.");
    } finally {
      setIsProcessing(false);
    }
  };

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
        <div className="flex bg-tp-purple/5 p-1 rounded-2xl overflow-x-auto max-w-full">
          {[
            { id: 'users', label: 'Roster' },
            { id: 'library', label: 'Library' },
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

      {activeTab === 'users' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex justify-between items-center">
             <h3 className="font-black text-tp-purple uppercase text-sm tracking-widest">Active Roster</h3>
             <button onClick={exportToCsv} disabled={userList.length === 0} className="flex items-center gap-3 bg-tp-navy text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-tp-purple transition-all shadow-xl disabled:opacity-50">
                <DownloadIcon className="w-4 h-4" /> Export
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
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedTargetUserId(user.id); setActiveTab('library'); }} 
                          className="bg-tp-navy text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-tp-purple transition-all"
                        >
                          Assign
                        </button>
                        <button 
                          onClick={() => onImpersonate(user)} 
                          className="bg-tp-purple text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-tp-red transition-all"
                        >
                          View
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
          <div className="sticky top-0 bg-tp-purple rounded-[24px] p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 z-30">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-white/10 rounded-xl text-white">
                <UserIcon className="w-5 h-5" />
              </div>
              <p className="text-white text-[10px] font-black uppercase tracking-widest">Target Student:</p>
            </div>
            <select 
              value={selectedTargetUserId}
              onChange={(e) => setSelectedTargetUserId(e.target.value)}
              className="flex-1 max-w-md bg-white text-tp-purple font-bold px-6 py-3 rounded-xl outline-none border-2 border-transparent focus:border-tp-red transition-all"
            >
              <option value="">Select a student to assign modules...</option>
              {userList.filter(u => u.role === 'agent').map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.languageLevel})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {globalResources.map(res => (
              <div key={res.id} className="p-6 bg-white border border-gray-100 rounded-[32px] hover:shadow-xl transition-all flex justify-between items-center group">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[8px] font-black bg-tp-purple/5 text-tp-purple px-2 py-0.5 rounded uppercase">{res.tags[0]}</span>
                    <span className="text-[9px] font-black text-tp-red uppercase tracking-widest">{res.level}</span>
                  </div>
                  <h4 className="font-black text-tp-purple text-base leading-tight">{res.title}</h4>
                  <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{res.objective}</p>
                </div>
                <button 
                  onClick={() => handleManualAssign(res.id)}
                  disabled={isProcessing}
                  className="bg-tp-navy text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-tp-red transition-all shadow-lg disabled:opacity-50"
                  title="Assign to selected user"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div className="space-y-8 animate-fadeIn max-w-2xl mx-auto py-10">
          <div className="border-4 border-dashed border-tp-purple/5 rounded-[40px] p-16 text-center hover:border-tp-purple/20 transition-all bg-gray-50/50">
            <ClipboardListIcon className="w-20 h-20 text-tp-purple mx-auto mb-8" />
            <h3 className="text-2xl font-black text-tp-purple mb-4 uppercase">Automated Onboarding</h3>
            <p className="text-sm text-gray-500 mb-10">Upload evaluation PDFs for intelligent parsing.</p>
            <label className="bg-tp-red text-white px-12 py-5 rounded-2xl font-black uppercase text-xs cursor-pointer shadow-xl hover:bg-tp-navy transition-all">
              {isProcessing ? 'Syncing...' : 'Upload Report'}
              <input type="file" className="hidden" accept=".pdf" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsProcessing(true);
                try {
                  await shlService.processAndRegister(file);
                  alert("Success! Agent registered.");
                  fetchUsers();
                } catch (err) { alert("Registration Failed"); }
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
