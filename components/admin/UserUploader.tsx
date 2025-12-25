
import React, { useState, useRef } from 'react';
import type { UserProfile, UserPerformanceData, UserCredentials, Roster } from '../../types';
import { getRosters } from '../../services/adminService';
import { DownloadIcon, PlusIcon, ClipboardListIcon, UserIcon, CheckCircleIcon } from '../Icons';

interface UserUploaderProps {
  currentUser: UserProfile;
  onUserCreated: (user: UserProfile) => void;
}

const UserUploader: React.FC<UserUploaderProps> = ({ currentUser, onUserCreated }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState(currentUser.rosterId);
  const rosters = getRosters();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateCredentials = (name: string): UserCredentials => {
    const tempId = `TP-${name.split(' ')[0].toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const accessCode = Math.random().toString(36).slice(-6).toUpperCase();
    return { tempId, accessCode };
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const fileName = file.name.split('.')[0].replace(/_/g, ' ');
    const name = fileName.charAt(0).toUpperCase() + fileName.slice(1);
    
    const mockPerf: UserPerformanceData = {
      writing: Math.floor(Math.random() * 40) + 50,
      fluency: Math.floor(Math.random() * 40) + 50,
      grammar: Math.floor(Math.random() * 40) + 50,
      listening: Math.floor(Math.random() * 40) + 50,
      pronunciation: Math.floor(Math.random() * 40) + 50,
      understanding: Math.floor(Math.random() * 40) + 50,
      analytical: Math.floor(Math.random() * 40) + 50,
      testDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    };

    const newUser: UserProfile = {
      id: `agent-${Date.now()}`,
      name: name,
      role: 'agent',
      languageLevel: 'B1',
      assignedModules: ['listening', 'speaking', 'reading'],
      rosterId: currentUser.role === 'coach' ? currentUser.rosterId : selectedRoster,
      assignedCoachId: currentUser.role === 'coach' ? currentUser.id : undefined,
      performanceData: mockPerf,
      generatedCredentials: generateCredentials(name)
    };

    setIsProcessing(false);
    onUserCreated(newUser);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-6 md:p-8 transition-all hover:border-tp-purple/40">
      <h3 className="font-black text-tp-purple uppercase text-base md:text-lg tracking-widest mb-6 flex items-center">
        <ClipboardListIcon className="w-6 h-6 mr-3 text-tp-red" />
        Smart {currentUser.role === 'coach' ? 'Team' : 'Agent'} Onboarding
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          <p className="text-gray-700 text-sm md:text-base font-medium mb-6 leading-relaxed">
            Upload an agent's evaluation file. Skillence AI will automatically parse metrics, create an account, and assign them to 
            <span className="text-tp-purple font-black ml-1">{currentUser.role === 'coach' ? 'your roster' : 'the selected team'}.</span>
          </p>

          {currentUser.role === 'admin' && (
            <div className="space-y-2 mb-6">
              <label className="text-xs font-black text-gray-700 uppercase tracking-widest">Assign to Roster</label>
              <select 
                value={selectedRoster} 
                onChange={(e) => setSelectedRoster(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm md:text-base outline-none transition-all focus:ring-2 focus:ring-tp-red"
              >
                {rosters.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          <button 
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-tp-purple text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm shadow-xl hover:bg-tp-navy transition-all min-h-[50px] flex items-center justify-center"
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
            ) : <PlusIcon className="mr-3 w-5 h-5" />}
            {isProcessing ? 'Parsing File...' : 'Select Evaluation File'}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.csv" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
        </div>

        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`aspect-square md:aspect-auto md:h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${isDragging ? 'bg-tp-purple/5 border-tp-purple scale-95' : 'bg-gray-50 border-gray-100'}`}
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${isDragging ? 'bg-tp-purple text-white' : 'bg-white text-gray-500 shadow-sm'}`}>
            <DownloadIcon className="w-8 h-8" />
          </div>
          <p className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-gray-500">{isDragging ? 'Release to Start' : 'Drag & Drop File'}</p>
        </div>
      </div>
    </div>
  );
};

export default UserUploader;
