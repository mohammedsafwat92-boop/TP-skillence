
import React, { useState } from 'react';
import { googleSheetService } from '../../services/googleSheetService';
import { geminiService } from '../../services/geminiService';
import { BrainIcon, LightningIcon } from '../Icons';

export default function ResourceUploader({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: 'loading' | 'success' | 'error' | '' }>({
    message: '',
    type: ''
  });

  const handleSmartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return;

    setIsProcessing(true);
    setStatus({ message: "🧠 Analyzing content with Gemma 3 AI...", type: 'loading' });

    try {
      // 1. Fetch Gemma 3 Metadata
      const aiData = await geminiService.enrichResourceMetadata(title, url);
      setStatus({ message: `✅ AI Extracted Skills: ${aiData.tags}`, type: 'loading' });

      // 2. Construct Resource Object
      const isVideo = url.includes('youtube.com') || url.includes('youtu.be');
      const newResource = {
        id: `r-${Date.now()}`,
        title,
        url,
        type: isVideo ? 'video' : 'article',
        tags: aiData.tags.split(',').map(t => t.trim()),
        level: aiData.level,
        objective: aiData.objective
      };

      // 3. Save to Database
      await googleSheetService.bulkImportResources([newResource]);

      // 4. Success Handling
      setStatus({ message: "🎉 Success! Resource added.", type: 'success' });
      setTitle('');
      setUrl('');

      setTimeout(() => {
        setStatus({ message: '', type: '' });
        onUploadComplete();
      }, 3000);

    } catch (error) {
      console.error("Upload Error:", error);
      setStatus({ message: "❌ Failed to add resource. Please try again.", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-[32px] p-8 border border-gray-100 shadow-2xl animate-fadeIn">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-tp-purple text-white rounded-2xl flex items-center justify-center shadow-lg">
          <BrainIcon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-black text-tp-purple uppercase tracking-tight">Smart Resource Ingestion</h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Powered by Gemma 3 27B</p>
        </div>
      </div>

      <form onSubmit={handleSmartUpload} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-tp-purple uppercase tracking-widest ml-1">Resource Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Advanced Customer Service Techniques"
            disabled={isProcessing}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-tp-purple/20 transition-all disabled:opacity-50"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-tp-purple uppercase tracking-widest ml-1">Resource URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/..."
            disabled={isProcessing}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-tp-purple/20 transition-all disabled:opacity-50"
            required
          />
        </div>

        {status.message && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-fadeIn ${
            status.type === 'loading' ? 'bg-tp-purple/5 text-tp-purple' :
            status.type === 'success' ? 'bg-green-50 text-green-600' :
            status.type === 'error' ? 'bg-red-50 text-red-600' : ''
          }`}>
            {status.type === 'loading' && <LightningIcon className="w-4 h-4 animate-pulse" />}
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing || !title || !url}
          className="w-full bg-tp-purple text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-tp-navy transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Analyze & Upload'
          )}
        </button>
      </form>
    </div>
  );
}

