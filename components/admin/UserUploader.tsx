import React, { useState, useRef } from 'react';
import type { UserProfile } from '../../types';
import { shlService } from '../../services/shlService';
import { 
  ClipboardListIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  BrainIcon,
  DownloadIcon
} from '../Icons';

interface FileStatus {
  name: string;
  status: 'pending' | 'uploading' | 'syncing' | 'analyzing' | 'success' | 'error';
  message?: string;
  sizeMB: string;
}

interface UserUploaderProps {
  currentUser: UserProfile;
  onUserCreated: (user: UserProfile) => void;
}

const UserUploader: React.FC<UserUploaderProps> = ({ currentUser, onUserCreated }) => {
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateStatus = (name: string, status: FileStatus['status'], message?: string) => {
    setFileStatuses(prev => prev.map(f => 
      f.name === name ? { ...f, status, message } : f
    ));
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    
    // Convert FileList to Array and filter for valid files
    const fileArray = Array.from(files).filter(f => f && f instanceof File);
    
    // Initialize UI statuses for all files in the batch
    const initialStatuses = fileArray.map(f => ({
      name: f.name || 'Unknown_Candidate.pdf',
      status: 'pending' as const,
      sizeMB: (f.size / 1024 / 1024).toFixed(1)
    }));
    setFileStatuses(initialStatuses);

    // Sequential Processing: Prevent 400 Errors and Memory Leaks
    for (const file of fileArray) {
      // Safety Guard: Re-check within the loop
      if (!file) continue;
      
      const isLarge = file.size > 15 * 1024 * 1024;
      updateStatus(file.name, 'uploading', isLarge ? 'Ingesting to Cloud Node...' : 'Preparing In-Memory Extraction...');

      try {
        if (isLarge) {
          updateStatus(file.name, 'syncing', 'Polling Cloud Activation...');
        } else {
          updateStatus(file.name, 'analyzing', 'Extracting Intelligence...');
        }

        const result = await shlService.processAndRegister(
          file, 
          currentUser.role === 'coach' ? currentUser.email : undefined
        );
        
        updateStatus(file.name, 'success', `Onboarded: ${result.shlData.candidateName}`);
        
        if (result.registration?.userProfile) {
          onUserCreated(result.registration.userProfile);
        }
      } catch (err) {
        console.error(`[UserUploader] Failure for ${file.name}:`, err);
        updateStatus(file.name, 'error', (err as Error).message);
      }
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
      <div 
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`border-4 border-dashed border-tp-purple/5 rounded-[48px] p-20 text-center transition-all group bg-gray-50/50 cursor-pointer shadow-inner ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-tp-purple/20 hover:bg-white'}`}
      >
        <div className="w-24 h-24 bg-tp-purple text-white rounded-[32px] flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform shadow-2xl">
          <BrainIcon className="w-12 h-12" />
        </div>
        <h3 className="text-3xl font-black text-tp-purple mb-4 uppercase tracking-tighter">Candidate Batch Ingestion</h3>
        <p className="text-sm text-gray-500 mb-10 max-w-sm mx-auto font-medium">
          Drag & Drop SHL Reports. Gemini 3 Pro manages Cloud Sync for documents >15MB to bypass payload limits.
        </p>
        <div className="bg-tp-red text-white px-12 py-5 rounded-2xl font-black uppercase text-xs shadow-xl inline-flex items-center gap-3 group-hover:bg-tp-navy transition-colors">
          <DownloadIcon className="w-4 h-4" />
          {isProcessing ? 'Synchronizing Cluster...' : 'Upload Reports'}
        </div>
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept=".pdf" 
          multiple
          onChange={(e) => processFiles(e.target.files)} 
          disabled={isProcessing} 
        />
      </div>

      {fileStatuses.length > 0 && (
        <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-2xl">
          <div className="flex justify-between items-center mb-8 px-2">
            <h4 className="text-[10px] font-black text-tp-purple uppercase tracking-[0.3em]">Batch Registry Status</h4>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-tp-red uppercase">{fileStatuses.filter(s => s.status === 'success').length} / {fileStatuses.length} COMPLETED</span>
            </div>
          </div>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {fileStatuses.map((file, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-100 rounded-3xl p-5 flex items-center justify-between group animate-fadeIn">
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    file.status === 'success' ? 'bg-green-100 text-green-600' :
                    file.status === 'error' ? 'bg-tp-red/10 text-tp-red' :
                    'bg-tp-purple/5 text-tp-purple animate-pulse'
                  }`}>
                    {file.status === 'success' ? <CheckCircleIcon /> : 
                     file.status === 'error' ? <ExclamationCircleIcon /> : 
                     <ClipboardListIcon className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-tp-purple text-sm truncate max-w-[200px]">{file.name}</p>
                      <span className="text-[9px] font-bold text-gray-400">{file.sizeMB} MB</span>
                    </div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${
                      file.status === 'error' ? 'text-tp-red' : 'text-tp-purple/40'
                    }`}>
                      {file.message || file.status}
                    </p>
                  </div>
                </div>
                {(file.status !== 'success' && file.status !== 'error' && file.status !== 'pending') && (
                  <div className="flex items-center gap-1.5 px-3">
                    <div className="w-2 h-2 bg-tp-red rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                    <div className="w-2 h-2 bg-tp-red rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-tp-red rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {!isProcessing && (
            <button 
              onClick={() => setFileStatuses([])}
              className="mt-6 w-full py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-tp-red transition-colors"
            >
              Clear Processing History
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UserUploader;