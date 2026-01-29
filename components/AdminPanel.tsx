
import React, { useState } from 'react';
import { shlService } from '../services/shlService';
import { geminiService } from '../services/geminiService';
import { googleSheetService } from '../services/googleSheetService';
import { ClipboardListIcon, UserIcon, DownloadIcon, BrainIcon, PlusIcon } from './Icons';
import type { UserProfile, Module } from '../types';

interface AdminPanelProps {
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  modules: { [id: string]: Module };
  onUpdateContent: () => void;
  currentUser: UserProfile;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, setUsers, modules, onUpdateContent, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'content'>('onboarding');
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const result = await shlService.processAndRegister(file);
      alert(`Success! Account created for ${result.shlData.candidateName}. CEFR: ${result.shlData.cefrLevel}`);
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
      await googleSheetService.importResource({ ...analysis, url: urlInput });
      alert("Resource imported and categorized successfully!");
      setUrlInput('');
      onUpdateContent();
    } catch (err) {
      alert("Import Failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 max-w-6xl mx-auto border border-gray-100">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-2xl font-black text-tp-purple flex items-center tracking-tight">
          <BrainIcon className="mr-4" /> Manager Operations
        </h1>
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button onClick={() => setActiveTab('onboarding')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'onboarding' ? 'bg-white text-tp-purple shadow-sm' : 'text-gray-500'}`}>Agent Onboarding</button>
          <button onClick={() => setActiveTab('content')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'content' ? 'bg-white text-tp-purple shadow-sm' : 'text-gray-500'}`}>Content Hub</button>
        </div>
      </div>

      {activeTab === 'onboarding' ? (
        <div className="space-y-8 animate-fadeIn">
          <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center hover:border-tp-purple/40 transition-all group">
            <div className="w-16 h-16 bg-tp-purple/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <DownloadIcon className="text-tp-purple" />
            </div>
            <h3 className="text-lg font-black text-tp-purple mb-2">SHL Report Sync</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">Upload the SHL Evaluation PDF. Skillence AI will extract scores and auto-create the agent profile.</p>
            <label className="bg-tp-purple text-white px-8 py-4 rounded-2xl font-black uppercase text-xs cursor-pointer hover:bg-tp-navy transition-all shadow-xl shadow-tp-purple/20">
              {isProcessing ? 'Analyzing Metrics...' : 'Select PDF Report'}
              <input type="file" className="hidden" accept=".pdf" onChange={handlePdfUpload} disabled={isProcessing} />
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          <div className="bg-tp-purple/5 rounded-3xl p-8 border border-tp-purple/10">
            <h3 className="text-lg font-black text-tp-purple mb-4 flex items-center">
              <PlusIcon className="mr-2" /> Smart Resource Import
            </h3>
            <div className="flex gap-4">
              <input 
                type="text" 
                placeholder="Paste Article or Video URL..." 
                className="flex-1 bg-white border border-gray-200 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-tp-purple"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <button 
                onClick={handleUrlAnalysis}
                disabled={isProcessing}
                className="bg-tp-red text-white px-8 py-4 rounded-2xl font-black uppercase text-xs hover:bg-red-700 transition-all shadow-xl shadow-tp-red/20"
              >
                {isProcessing ? 'AI Analyzing...' : 'Auto-Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
