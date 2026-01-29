
import React, { useState, useEffect } from 'react';
import { shlService } from '../services/shlService';
import { geminiService } from '../services/geminiService';
import { googleSheetService } from '../services/googleSheetService';
import { ClipboardListIcon, UserIcon, DownloadIcon, BrainIcon, PlusIcon, TableIcon, LightningIcon } from './Icons';
import type { UserProfile, Module, Resource } from '../types';

interface AdminPanelProps {
  onUpdateContent: () => void;
  currentUser: UserProfile;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onUpdateContent, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'content' | 'users'>('onboarding');
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [userList, setUserList] = useState<any[]>([]);
  const [unlockId, setUnlockId] = useState('');

  const fetchUsers = async () => {
    setIsProcessing(true);
    try {
      const users = await googleSheetService.fetchAllUsers();
      setUserList(users);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      await shlService.processAndRegister(file);
      alert(`Success! Candidate profile initialized from SHL report.`);
      onUpdateContent();
    } catch (err) {
      alert("Parsing Failed: " + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlAnalysis = async () => {
    if (!urlInput) return;
    setIsProcessing(true);
    try {
      const analysis = await geminiService.analyzeResourceUrl(urlInput);
      await googleSheetService.importResource({ 
        title: analysis.title,
        level: analysis.level,
        tags: [analysis.skillTag],
        objective: analysis.objective,
        type: 'Hyperlink',
        url: urlInput 
      });
      alert("Resource analyzed by AI and deployed to Registry.");
      setUrlInput('');
      onUpdateContent();
    } catch (err) {
      alert("Import Failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const exportCsv = () => {
    const headers = ['UID', 'Name', 'Email', 'Level', 'Grammar', 'Fluency', 'Listening'].join(',');
    const rows = userList.map(u => [
      u.uid, u.name, u.email, u.cefrLevel, 
      u.shlData?.grammar || 0, u.shlData?.fluency || 0, u.shlData?.listening || 0
    ].join(',')).join('\n');
    
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TP_Skillence_Registry_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const handleUnlock = async (uid: string) => {
    const resourceId = prompt("Enter Resource ID to Unlock (or 'ALL'):");
    if (!resourceId) return;
    setIsProcessing(true);
    try {
      await googleSheetService.unlockResource(uid, resourceId);
      alert("Resource Unlocked for Agent.");
      fetchUsers();
    } catch (err) {
      alert("Unlock failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 max-w-6xl mx-auto border border-gray-100 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
        <h1 className="text-3xl font-black text-tp-purple flex items-center tracking-tight">
          <BrainIcon className="mr-4 text-tp-red" /> Command Center
        </h1>
        <div className="flex bg-tp-purple/5 p-1 rounded-2xl">
          {['onboarding', 'content', 'users'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)} 
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === tab ? 'bg-white text-tp-purple shadow-sm' : 'text-gray-500 hover:text-tp-purple'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-tp-purple uppercase text-sm tracking-widest">Agent Performance Registry</h3>
            <button 
              onClick={exportCsv}
              className="flex items-center gap-2 bg-tp-navy text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-tp-purple transition-all"
            >
              <DownloadIcon className="w-4 h-4" /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto border border-gray-100 rounded-3xl shadow-inner">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Agent Name</th>
                  <th className="px-6 py-4">Level</th>
                  <th className="px-6 py-4">Technical Scores</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {userList.map((user) => (
                  <tr key={user.uid} className="hover:bg-tp-purple/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-tp-purple">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </td>
                    <td className="px-6 py-4 font-black text-tp-red text-sm">{user.cefrLevel}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {['grammar', 'fluency', 'listening'].map(skill => (
                          <div key={skill} className="bg-gray-100 px-2 py-1 rounded text-[10px] font-black text-gray-600">
                            {skill.charAt(0).toUpperCase()}: {user.shlData?.[skill] || 0}%
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleUnlock(user.uid)}
                        className="text-[10px] font-black uppercase text-tp-purple border border-tp-purple/20 px-3 py-1.5 rounded-lg hover:bg-tp-purple hover:text-white transition-all"
                      >
                        Unlock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="border-4 border-dashed border-tp-purple/5 rounded-3xl p-16 text-center hover:border-tp-purple/20 transition-all group bg-gray-50/50">
            <div className="w-20 h-20 bg-tp-purple text-white rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-2xl shadow-tp-purple/20">
              <DownloadIcon className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-tp-purple mb-3">AI Evaluation Upload</h3>
            <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto font-medium">Drop the SHL PDF here. Skillence will map scores and auto-generate the growth plan.</p>
            <label className="bg-tp-purple text-white px-10 py-5 rounded-2xl font-black uppercase text-xs cursor-pointer hover:bg-tp-navy transition-all shadow-2xl shadow-tp-purple/30">
              {isProcessing ? 'Processing Metrics...' : 'Select Report PDF'}
              <input type="file" className="hidden" accept=".pdf" onChange={handlePdfUpload} disabled={isProcessing} />
            </label>
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="bg-tp-navy text-white rounded-3xl p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10"><PlusIcon className="w-40 h-40" /></div>
            <h3 className="text-2xl font-black mb-4 flex items-center">
              <LightningIcon className="mr-3 text-tp-red" /> AI Curriculum Builder
            </h3>
            <p className="text-gray-400 mb-8 max-w-md font-medium">Paste any learning URL. Gemini will categorize it by level and skill-set for your team.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="text" 
                placeholder="YouTube, Article, or Resource Link..." 
                className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-tp-red placeholder-white/30"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <button 
                onClick={handleUrlAnalysis}
                disabled={isProcessing}
                className="bg-tp-red text-white px-10 py-4 rounded-2xl font-black uppercase text-xs hover:bg-red-700 transition-all shadow-2xl shadow-tp-red/40"
              >
                {isProcessing ? 'Analyzing...' : 'Auto-Deploy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
