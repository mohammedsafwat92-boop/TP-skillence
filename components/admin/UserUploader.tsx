
import React, { useState, useRef } from 'react';
import type { UserProfile, Roster } from '../../types';
import { getRosters } from '../../services/adminService';
import { shlService } from '../../services/shlService';
import { DownloadIcon, PlusIcon, ClipboardListIcon, CheckCircleIcon, ExclamationCircleIcon } from '../Icons';

interface FileStatus {
  name: string;
  status: 'pending' | 'uploading' | 'analyzing' | 'success' | 'error';
  message?: string;
}

interface UserUploaderProps {
  currentUser: UserProfile;
  onUserCreated: (user: UserProfile) => void;
}

const UserUploader: React.FC<UserUploaderProps> = ({ currentUser, onUserCreated }) => {
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState(currentUser.rosterId);
  const rosters = getRosters();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    const fileArray = Array.from(files);
    
    const newStatuses = fileArray.map(f => ({
      name: f.name,
      status: 'pending' as const
    }));
    setFileStatuses(newStatuses);

    // Process files sequentially to avoid memory pressure and race conditions
    for (const file of fileArray) {
      if (!file) continue;
      
      updateStatus(file.name, 'uploading');

      try {
        updateStatus(file.name, 'analyzing');
        const result = await shlService.processAndRegister(
          file, 
          currentUser.role === 'coach' ? currentUser.email : undefined
        );
        
        updateStatus(file.name, 'success');
        onUserCreated(result.registration.userProfile);
      } catch (err) {
        updateStatus(file.name, 'error', (err as Error).message);
      }
    }
    setIsProcessing(false);
  };

  const updateStatus = (name: string, status: FileStatus['status'], message?: string) => {
    setFileStatuses(prev => prev.map(s => 
      s.name === name ? { ...s, status, message } : s
    ));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-xl animate-fadeIn">
      <h3 className="font-black text-tp-purple uppercase text-lg tracking-widest mb-6 flex items-center">
        <ClipboardListIcon className="w-6 h-6 mr-3 text-tp-red" />
        Deep Capacity Onboarding
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <p className="text-gray-700 text-sm font-medium mb-8 leading-relaxed">
            Upload candidate SHL reports (PDFs up to 100MB+). 
            Gemini 3 Pro will perform behavioral and technical capability mapping automatically.
          </p>

          {currentUser.role === 'admin' && (
            <div className="mb-8">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Target Roster Node</label>
              <select 
                value={selectedRoster} 
                onChange={(e) => setSelectedRoster(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-tp-red font-bold text-tp-purple"
              >
                {rosters.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`aspect-video flex flex-col items-center justify-center rounded-3xl border-4 border-dashed border-gray-100 bg-gray-50/50 hover:border-tp-purple/20 hover:bg-white transition-all cursor-pointer group mb-6 ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
          >
            <DownloadIcon className="w-12 h-12 text-gray-300 group-hover:text-tp-red group-hover:scale-110 transition-all mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Drag or Click to Batch</p>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            accept=".pdf" 
            onChange={(e) => processFiles(e.target.files)} 
          />
        </div>

        <div className="lg:col-span-7 bg-tp-navy/5 rounded-[32px] p-8 border border-white min-h-[300px]">
          <h4 className="text-xs font-black text-tp-purple uppercase tracking-widest mb-6 flex justify-between">
            Syncing Status
            {fileStatuses.length > 0 && <span className="text-tp-red">{fileStatuses.filter(s => s.status === 'success').length} / {fileStatuses.length}</span>}
          </h4>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {fileStatuses.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-400 italic text-sm">
                "No active processing nodes."
              </div>
            ) : (
              fileStatuses.map((file, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group animate-fadeIn">
                  <div className="flex items-center gap-4 flex-1 truncate mr-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      file.status === 'success' ? 'bg-green-100 text-green-600' :
                      file.status === 'error' ? 'bg-tp-red/10 text-tp-red' : 'bg-tp-purple/10 text-tp-purple animate-pulse'
                    }`}>
                      {file.status === 'success' ? <CheckCircleIcon className="w-4 h-4" /> : 
                       file.status === 'error' ? <ExclamationCircleIcon className="w-4 h-4" /> : <ClipboardListIcon className="w-4 h-4" />}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-tp-purple truncate">{file.name}</p>
                      <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${
                        file.status === 'error' ? 'text-tp-red' : 'text-gray-400'
                      }`}>
                        {file.status} {file.message && ` - ${file.message}`}
                      </p>
                    </div>
                  </div>
                  {file.status === 'analyzing' && (
                    <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-tp-purple animate-[shimmer_2s_infinite] w-full"></div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserUploader;
