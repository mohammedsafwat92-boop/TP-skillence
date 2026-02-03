
import React, { useState, useEffect } from 'react';
import { shlService } from '../services/shlService';
import { geminiService } from '../services/geminiService';
import { googleSheetService } from '../services/googleSheetService';
// Added CheckCircleIcon to the imported icons list
import { ClipboardListIcon, UserIcon, DownloadIcon, BrainIcon, PlusIcon, LightningIcon, CheckCircleIcon } from './Icons';
import type { UserProfile } from '../types';

interface AdminPanelProps {
  onUpdateContent: () => void;
  currentUser: UserProfile;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onUpdateContent, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'content' | 'users'>('users');
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [userList, setUserList] = useState<any[]>([]);

  const fetchUsers = async () => {
    setIsProcessing(true);
    try {
      const users = await googleSheetService.fetchAllUsers();
      setUserList(Array.isArray(users) ? users : []);
    } catch (err) {
      console.error("Failed to fetch registry:", err);
      setUserList([]);
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
      const result = await shlService.processAndRegister(file);
      alert(`Success! Registry updated for ${result.shlData.candidateName}.`);
      onUpdateContent();
      if (activeTab === 'users') fetchUsers();
    } catch (err) {
      alert("Multimodal Registration Failed: " + (err as Error).message);
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = "";
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
      alert("Resource analyzed and deployed globally.");
      setUrlInput('');
      onUpdateContent();
    } catch (err) {
      alert("Resource Analysis Failed");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Generates and downloads a CSV of the user database.
   */
  const exportToCsv = () => {
    if (userList.length === 0) return;
    const headers = ['UID', 'Name', 'Email', 'Level', 'Completion %', 'Grammar', 'Fluency', 'Vocab', 'Pronunciation'].join(',');
    const rows = userList.map(u => {
      const completion = u.plan ? Math.round((u.plan.filter((r:any) => r.status === 'completed').length / u.plan.length) * 100) : 0;
      return [
        u.uid || u.id,
        `"${u.name}"`,
        u.email,
        u.cefrLevel,
        `${completion}%`,
        u.shlData?.grammar || 0,
        u.shlData?.fluency || 0,
        u.shlData?.vocabulary || 0,
        u.shlData?.pronunciation || 0
      ].join(',');
    }).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Academy_Registry_Export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-[48px] shadow-2xl p-10 max-w-6xl mx-auto border border-gray-100 animate-fadeIn mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-black text-tp-purple flex items-center tracking-tight uppercase">
            <BrainIcon className="mr-4 text-tp-red" /> Admin Registry Hub
          </h1>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">Management Console</p>
        </div>
        <div className="flex bg-tp-purple/5 p-1 rounded-2xl">
          {['users', 'onboarding', 'content'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)} 
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === tab ? 'bg-white text-tp-purple shadow-sm' : 'text-gray-500 hover:text-tp-purple'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex justify-between items-center">
             <h3 className="font-black text-tp-purple uppercase text-sm tracking-widest">Active Academy Members</h3>
             <button 
                onClick={exportToCsv}
                className="flex items-center gap-3 bg-tp-navy text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-tp-purple transition-all shadow-xl"
             >
                <DownloadIcon className="w-4 h-4" /> Download Registry (CSV)
             </button>
          </div>
          <div className="overflow-x-auto border border-gray-100 rounded-[32px] shadow-inner bg-gray-50/30">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                  <th className="px-8 py-5">Profile</th>
                  <th className="px-8 py-5 text-center">Proficiency</th>
                  <th className="px-8 py-5">Language metrics</th>
                  <th className="px-8 py-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {userList.map((user, idx) => {
                  const comp = user.plan ? Math.round((user.plan.filter((r:any) => r.status === 'completed').length / user.plan.length) * 100) : 0;
                  return (
                    <tr key={user.uid || idx} className="hover:bg-tp-purple/[0.02] transition-colors">
                      <td className="px-8 py-5">
                        <p className="font-bold text-tp-purple text-base">{user.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{user.email}</p>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="text-tp-red font-black text-lg">{user.cefrLevel}</span>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Global Standard</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-wrap gap-2">
                           {['grammar', 'fluency', 'pronunciation'].map(s => (
                             <div key={s} className="bg-gray-100 px-2.5 py-1 rounded-lg text-[9px] font-black text-gray-600 uppercase tracking-widest">
                               {s}: {user.shlData?.[s] || 0}%
                             </div>
                           ))}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="inline-flex items-center gap-3">
                           <div className="text-right">
                              <p className="text-sm font-black text-tp-purple">{comp}%</p>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Path completion</p>
                           </div>
                           <div className="w-10 h-10 bg-tp-purple/5 rounded-full flex items-center justify-center text-tp-purple border border-tp-purple/10">
                              <CheckCircleIcon className="w-5 h-5" filled={comp === 100} />
                           </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {userList.length === 0 && !isProcessing && (
              <div className="py-20 text-center text-gray-400 font-black uppercase text-xs tracking-widest">No members found in registry.</div>
            )}
            {isProcessing && (
              <div className="py-20 text-center text-tp-purple font-black uppercase text-xs tracking-widest animate-pulse">Synchronizing database...</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div className="space-y-8 animate-fadeIn max-w-2xl mx-auto">
          <div className="border-4 border-dashed border-tp-purple/5 rounded-[40px] p-16 text-center hover:border-tp-purple/20 transition-all group bg-gray-50/50">
            <div className="w-24 h-24 bg-tp-purple text-white rounded-[32px] flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform shadow-2xl">
              <ClipboardListIcon className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-tp-purple mb-4 uppercase tracking-tight">Smart Agent Onboarding</h3>
            <p className="text-sm text-gray-500 mb-10 max-w-sm mx-auto font-medium">Upload Language Evaluation PDFs. Gemini extracts CEFR levels and sub-scores to build a remedial curriculum automatically.</p>
            <label className={`bg-tp-red text-white px-12 py-5 rounded-2xl font-black uppercase text-xs cursor-pointer hover:bg-tp-navy transition-all shadow-xl block ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isProcessing ? 'Multimodal Syncing...' : 'Upload Performance File'}
              <input type="file" className="hidden" accept=".pdf" onChange={handlePdfUpload} disabled={isProcessing} />
            </label>
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
          <div className="bg-tp-navy text-white rounded-[40px] p-12 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-10"><PlusIcon className="w-48 h-48" /></div>
            <h3 className="text-2xl font-black mb-4 flex items-center uppercase tracking-tight">
              <LightningIcon className="mr-4 text-tp-red" /> Global Content Engine
            </h3>
            <p className="text-gray-400 mb-10 max-w-md font-medium">Add learning URLs. Gemini will auto-tag them for the registry based on CEFR level and primary skill gap.</p>
            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
              <input 
                type="text" 
                placeholder="Paste Educational URL..." 
                className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-tp-red placeholder-white/30 text-sm font-medium"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <button 
                onClick={handleUrlAnalysis}
                disabled={isProcessing}
                className="bg-tp-red text-white px-12 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-red-700 transition-all shadow-xl disabled:opacity-50"
              >
                {isProcessing ? 'Analyzing...' : 'Auto-Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
