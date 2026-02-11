
import React, { useState, useRef } from 'react';
import { googleSheetService } from '../../services/googleSheetService';
import { DownloadIcon, PlusIcon, ClipboardListIcon, CheckCircleIcon, ExclamationCircleIcon } from '../Icons';

interface ResourceUploaderProps {
  onSuccess: () => void;
}

const ResourceUploader: React.FC<ResourceUploaderProps> = ({ onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [previewResources, setPreviewResources] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Tokenizes a CSV line, respecting double quotes and escaped commas.
   */
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

  /**
   * Processes individual CSV files with smart normalization logic.
   */
  const processFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return resolve([]);

        const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Smart Header Normalization Map
        const findIdx = (keywords: string[]) => 
          rawHeaders.findIndex(h => keywords.some(k => h.includes(k)));

        const titleIdx = findIdx(['title', 'name', 'resource name']);
        const urlIdx = findIdx(['link', 'url', 'resource link', 'resource/link']);
        const levelIdx = findIdx(['level', 'cefr']);
        const objectiveIdx = findIdx(['objective', 'video objective']);
        const typeIdx = findIdx(['type', 'format']);

        // Context-Aware Auto-Tagging based on Filename
        const fileName = file.name.toLowerCase();
        const autoTags: string[] = [];
        if (fileName.includes('listening')) autoTags.push('Listening');
        if (fileName.includes('culture')) autoTags.push('Culture');
        if (fileName.includes('reading')) autoTags.push('Reading');
        if (fileName.includes('speaking')) autoTags.push('Speaking');
        if (fileName.includes('travel')) autoTags.push('Travel');

        const timestamp = new Date().getTime();
        const resources = lines.slice(1).map((line, idx) => {
          const cols = splitCsvLine(line);
          const rawUrl = urlIdx !== -1 ? cols[urlIdx] : '';
          const url = (rawUrl || '').trim();
          
          if (!url || !url.startsWith('http')) return null;

          // Auto-Type Detection
          let type = 'Article';
          if (url.includes('youtube.com') || url.includes('youtu.be')) {
            type = 'Video';
          } else if (typeIdx !== -1 && cols[typeIdx]) {
            const rawType = cols[typeIdx].toLowerCase();
            if (rawType.includes('video')) type = 'Video';
            else if (rawType.includes('audio') || rawType.includes('listen')) type = 'Audio';
          }

          // Strict Normalization for Backend Compatibility
          return {
            id: `r-${timestamp}-${idx}`,
            title: titleIdx !== -1 ? (cols[titleIdx] || 'Untitled Resource').trim() : 'Untitled Resource',
            url: url,
            type: type,
            level: levelIdx !== -1 ? (cols[levelIdx] || 'All').trim() : 'All',
            objective: objectiveIdx !== -1 ? (cols[objectiveIdx] || 'Skill training module').trim() : 'Skill training module',
            tags: autoTags.length > 0 ? autoTags : ['General']
          };
        }).filter(Boolean);

        resolve(resources);
      };
      reader.readAsText(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await ingestFiles(Array.from(files));
  };

  const ingestFiles = async (files: File[]) => {
    setIsProcessing(true);
    let allFound: any[] = [];
    for (const file of files) {
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
      console.log(`[Uploader] Deploying ${previewResources.length} resources...`);
      await googleSheetService.bulkImportResources(previewResources);
      alert(`Successfully synchronized ${previewResources.length} resources to the cloud registry.`);
      setPreviewResources([]);
      onSuccess();
    } catch (err) {
      alert("Deployment Failed: " + (err as Error).message);
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
          await ingestFiles(Array.from(e.dataTransfer.files));
        }}
        className={`bg-tp-navy rounded-[40px] p-12 text-center border-4 border-dashed transition-all relative overflow-hidden shadow-2xl ${
          isDragging ? 'border-tp-red bg-tp-navy/90 scale-[0.99]' : 'border-white/10 hover:border-white/20'
        }`}
      >
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <PlusIcon className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10 max-w-xl mx-auto">
          <div className="w-20 h-20 bg-tp-red rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
             <ClipboardListIcon className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Content Deployment Terminal</h3>
          <p className="text-white/60 font-medium mb-10 leading-relaxed">
            Drag & Drop your <strong>Lufthansa exported CSVs</strong> here. The engine auto-tags content by filename (Listening, Culture, etc.) and normalizes mixed headers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isSyncing}
              className="bg-white text-tp-purple px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-tp-red hover:text-white transition-all shadow-xl disabled:opacity-50"
            >
              {isProcessing ? 'Parsing Local Cache...' : 'Load CSV Files'}
            </button>
            
            {previewResources.length > 0 && (
              <button 
                onClick={handleConfirm}
                disabled={isProcessing || isSyncing}
                className="bg-tp-red text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all shadow-xl animate-bounce"
              >
                {isSyncing ? 'Writing to Database...' : `Deploy ${previewResources.length} Items`}
              </button>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            accept=".csv" 
            onChange={handleFileChange} 
          />
        </div>
      </div>

      {previewResources.length > 0 && (
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl animate-fadeIn">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-black text-tp-purple uppercase text-xs tracking-widest">Pre-Deployment Validation</h4>
            <button onClick={() => setPreviewResources([])} className="text-[10px] font-black text-tp-red uppercase hover:underline">Clear Queue</button>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar pr-4">
            <div className="space-y-3">
              {previewResources.slice(0, 15).map((res, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-tp-purple/5 text-tp-purple rounded-lg flex items-center justify-center text-[10px] font-black uppercase">{res.level}</div>
                    <div className="truncate max-w-[300px]">
                      <p className="text-sm font-bold text-tp-purple leading-tight truncate">{res.title}</p>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">
                        {res.tags.join(', ')} • {res.type}
                      </p>
                    </div>
                  </div>
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                </div>
              ))}
              {previewResources.length > 15 && (
                <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-4">... and {previewResources.length - 15} more items detected</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceUploader;
