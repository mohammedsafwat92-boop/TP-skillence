
import React, { useState, useRef } from 'react';
import { googleSheetService } from '../../services/googleSheetService';
import { geminiService } from '../../services/geminiService';
import { DownloadIcon, PlusIcon, ClipboardListIcon, CheckCircleIcon, BrainIcon, LightningIcon } from '../Icons';

interface ResourceUploaderProps {
  onSuccess: () => void;
}

const ResourceUploader: React.FC<ResourceUploaderProps> = ({ onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState({ current: 0, total: 0 });
  const [previewResources, setPreviewResources] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const splitCsvLine = (line: string) => {
    const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    return line.split(regex).map(val => {
      let cleaned = val.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.substring(1, cleaned.length - 1).replace(/""/g, '"');
      }
      return cleaned;
    });
  };

  const processFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return resolve([]);

        const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase());
        const findIdx = (keywords: string[]) => 
          rawHeaders.findIndex(h => keywords.some(k => h.includes(k)));

        const titleIdx = findIdx(['title', 'name', 'resource name']);
        const urlIdx = findIdx(['link', 'url', 'resource link', 'resource/link']);
        const levelIdx = findIdx(['level', 'cefr', 'grade']);
        const objectiveIdx = findIdx(['objective', 'video objective']);
        const typeIdx = findIdx(['type', 'format']);

        const fileName = file.name.toLowerCase();
        const autoTags: string[] = [];
        if (fileName.includes('listening')) autoTags.push('Listening');
        if (fileName.includes('culture')) autoTags.push('Culture');
        if (fileName.includes('reading')) autoTags.push('Reading');
        if (fileName.includes('speaking')) autoTags.push('Speaking');

        const timestamp = new Date().getTime();
        const resources = lines.slice(1).map((line, idx) => {
          const cols = splitCsvLine(line);
          const url = (cols[urlIdx] || '').trim();
          if (!url || !url.startsWith('http')) return null;

          let type = 'Article';
          if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'Video';
          else if (typeIdx !== -1 && cols[typeIdx]) {
            const rawType = cols[typeIdx].toLowerCase();
            if (rawType.includes('video')) type = 'Video';
            else if (rawType.includes('audio')) type = 'Audio';
          }

          let levelRaw = levelIdx !== -1 ? (cols[levelIdx] || 'All').trim() : 'All';
          const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'All'];
          const levelMatched = validLevels.find(v => levelRaw.toUpperCase() === v.toUpperCase()) || 'All';

          return {
            id: `r-${timestamp}-${idx}`,
            title: titleIdx !== -1 ? (cols[titleIdx] || 'Untitled').trim() : 'Untitled',
            url: url,
            type: type,
            level: levelMatched,
            objective: objectiveIdx !== -1 ? (cols[objectiveIdx] || 'General Proficiency').trim() : 'General Proficiency',
            tags: autoTags.length > 0 ? autoTags : ['General']
          };
        }).filter(Boolean);

        resolve(resources);
      };
      reader.readAsText(file);
    });
  };

  const handleAiAudit = async () => {
    setIsAuditing(true);
    try {
      // 1. Fetch current global resources
      const currentResources = await googleSheetService.fetchGlobalResources();
      if (!currentResources || currentResources.length === 0) {
        alert("Registry is currently empty. Add resources before auditing.");
        return;
      }

      setAuditProgress({ current: 0, total: currentResources.length });
      const auditedResources = [];

      // 2. Loop and analyze with Gemini
      for (let i = 0; i < currentResources.length; i++) {
        const res = currentResources[i];
        
        // Artificial delay to avoid burst rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        try {
          const auditResult = await geminiService.analyzeResource({
            title: res.title,
            url: res.url,
            objective: res.objective
          });

          // 3. Merge AI findings back into the resource object
          auditedResources.push({
            ...res,
            tags: [auditResult.primarySkill, ...auditResult.subSkills],
            objective: auditResult.refinedObjective
          });
        } catch (e) {
          console.error(`Audit failed for ${res.title}:`, e);
          // If we hit a fatal error even with retry, keep original but continue
          auditedResources.push(res); 
        }
        setAuditProgress(prev => ({ ...prev, current: i + 1 }));
      }

      // 4. Batch push back to Google Sheets (Upsert Logic)
      await googleSheetService.bulkImportResources(auditedResources);
      alert(`AI Content Audit Complete: ${auditedResources.length} modules categorized with deep sub-skills.`);
      onSuccess();
    } catch (err) {
      alert("AI Audit Failed: " + (err as Error).message);
    } finally {
      setIsAuditing(false);
      setAuditProgress({ current: 0, total: 0 });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsProcessing(true);
    let allFound: any[] = [];
    // Fix: Explicitly cast to File[] to avoid 'unknown' type errors during FileList iteration.
    for (const file of Array.from(files) as File[]) {
      if (file.name.toLowerCase().endsWith('.csv')) {
        const results = await processFile(file);
        allFound = [...allFound, ...results];
      }
    }
    setPreviewResources(prev => [...prev, ...allFound]);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirm = async () => {
    if (previewResources.length === 0) return;
    setIsSyncing(true);
    try {
      await googleSheetService.bulkImportResources(previewResources);
      alert(`Synchronized ${previewResources.length} items to the Registry.`);
      setPreviewResources([]);
      onSuccess();
    } catch (err) {
      alert("Deployment Error: " + (err as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 mb-12 animate-fadeIn">
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setIsDragging(false);
          // Fix: Explicitly cast FileList to File[] to avoid 'unknown' type errors when accessing .name and passing to processFile.
          const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.name.endsWith('.csv'));
          setIsProcessing(true);
          let allFound: any[] = [];
          for (const f of files) {
            const results = await processFile(f);
            allFound = [...allFound, ...results];
          }
          setPreviewResources(prev => [...prev, ...allFound]);
          setIsProcessing(false);
        }}
        className={`bg-tp-navy rounded-[40px] p-12 text-center border-4 border-dashed transition-all relative overflow-hidden shadow-2xl ${
          isDragging ? 'border-tp-red bg-tp-navy/90 scale-[0.99]' : 'border-white/10 hover:border-white/20'
        }`}
      >
        <div className="relative z-10 max-w-xl mx-auto">
          <div className="w-20 h-20 bg-tp-red rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
             <ClipboardListIcon className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Master Content Registry</h3>
          <p className="text-white/60 font-medium mb-10 leading-relaxed px-4">
            Upload CSV exports from <strong>Lufthansa Training Portals</strong>. Trigger the AI Auditor to deep-categorize modules for the Gap Analysis Engine.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isSyncing || isAuditing}
              className="bg-white text-tp-purple px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-tp-red hover:text-white transition-all shadow-xl disabled:opacity-50"
            >
              {isProcessing ? 'Reading Files...' : 'Select CSV Files'}
            </button>
            
            <button 
              onClick={handleAiAudit}
              disabled={isProcessing || isSyncing || isAuditing}
              className={`flex items-center gap-3 bg-tp-purple text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-tp-navy transition-all shadow-xl disabled:opacity-50 border border-white/10 ${isAuditing ? 'animate-pulse' : ''}`}
            >
              <BrainIcon className="w-4 h-4" />
              {isAuditing ? `Auditing ${auditProgress.current}/${auditProgress.total}` : 'AI Content Audit'}
            </button>

            {previewResources.length > 0 && (
              <button 
                onClick={handleConfirm}
                disabled={isProcessing || isSyncing || isAuditing}
                className="bg-tp-red text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all shadow-xl"
              >
                {isSyncing ? 'Writing...' : `Sync ${previewResources.length} Items`}
              </button>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" multiple accept=".csv" onChange={handleFileChange} />
        </div>
      </div>

      {isAuditing && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em]">Gemini 3 Pro Audit Pulse</span>
            <span className="text-[10px] font-black text-tp-red uppercase">{Math.round((auditProgress.current / auditProgress.total) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
             <div 
               className="h-full bg-tp-red transition-all duration-500" 
               style={{ width: `${(auditProgress.current / auditProgress.total) * 100}%` }}
             ></div>
          </div>
          <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mt-4 text-center">Identifying sub-skills and refining objectives for registry members...</p>
        </div>
      )}

      {previewResources.length > 0 && (
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl animate-fadeIn">
          <div className="flex justify-between items-center mb-6 px-2">
            <h4 className="font-black text-tp-purple uppercase text-xs tracking-widest">Ingestion Pipeline</h4>
            <button onClick={() => setPreviewResources([])} className="text-[10px] font-black text-tp-red uppercase hover:underline">Cancel Batch</button>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar pr-4 space-y-3">
            {previewResources.map((res, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-tp-purple/5 text-tp-purple rounded-lg flex items-center justify-center text-[10px] font-black uppercase">{res.level}</div>
                  <div className="truncate max-w-[350px]">
                    <p className="text-sm font-bold text-tp-purple leading-tight truncate">{res.title}</p>
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">
                      {res.tags.join(', ')} • {res.type}
                    </p>
                  </div>
                </div>
                <CheckCircleIcon className="w-5 h-5 text-green-500 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceUploader;
