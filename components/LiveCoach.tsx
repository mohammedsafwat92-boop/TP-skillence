
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { XIcon, SpeakingIcon, BrainIcon, UserIcon, CheckCircleIcon } from './Icons';
import { googleSheetService } from '../services/googleSheetService';
import type { UserProfile } from '../types';

interface LiveCoachProps {
  onClose: () => void;
  currentUser: UserProfile;
  onImpersonate: (user: UserProfile) => void;
}

const LiveCoach: React.FC<LiveCoachProps> = ({ onClose, currentUser, onImpersonate }) => {
  // Hard Failsafe: Only Coaches or Admins can access this management view
  if (currentUser.role !== 'coach' && currentUser.role !== 'admin') return null;

  const [activeMode, setActiveMode] = useState<'ai' | 'directory'>('directory');
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const fetchStudents = async () => {
    setIsLoadingStudents(true);
    try {
      const users = await googleSheetService.fetchAllUsers();
      let filtered: UserProfile[] = [];
      
      const allUsers = Array.isArray(users) ? users : [];

      if (currentUser.role === 'admin') {
        // Admins see all agents for oversight
        filtered = allUsers.filter(u => u.role === 'agent');
      } else if (currentUser.role === 'coach') {
        // SECURITY FIX: Coaches strictly filter for assigned agents only
        filtered = allUsers.filter(u => 
          u.assignedCoach === currentUser.email && 
          u.role === 'agent' 
        );
      }
      
      console.log(`[LiveCoach] Fetched Students for ${currentUser.email}:`, filtered);
      setStudents(filtered);
    } catch (err) {
      console.error("Failed to load students:", err);
      setStudents([]);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (activeMode === 'directory') fetchStudents();
  }, [activeMode, currentUser.email]);

  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const createBlob = (data: Float32Array): Blob => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      int16[i] = data[i] * 32768;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return {
      data: btoa(binary),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startSession = async () => {
    if (activeMode !== 'ai') return;
    try {
      setError(null);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setTranscription(prev => [...prev.slice(-4), `Coach: ${text}`]);
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setTranscription(prev => [...prev.slice(-4), `You: ${text}`]);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              const ctx = outAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decodeBase64(base64Audio), ctx);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsSpeaking(false);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live API Error", e);
            setError("Connection Lost.");
          },
          onclose: () => setIsConnected(false),
        },
        config: {
          responseModalalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: `You are an expert Professional Language Coach for corporate support agents. 
          Your goal is to simulate realistic customer scenarios. 
          Provide real-time feedback on English usage, tone, and professional directness.
          Initiate the conversation by greeting the agent as a customer calling with a complex inquiry about their service subscription.`,
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setError("Mic access denied or API configuration error.");
    }
  };

  useEffect(() => {
    if (activeMode === 'ai') {
      startSession();
    }
    return () => {
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
      if (outAudioContextRef.current) outAudioContextRef.current.close();
    };
  }, [activeMode]);

  return (
    <div className="fixed inset-0 z-[100] bg-tp-navy flex flex-col items-center justify-start p-6 md:p-12 animate-fadeIn overflow-hidden">
      <div className="w-full flex justify-between items-center mb-12 relative z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
            <SpeakingIcon className="w-8 h-8 text-tp-purple" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-black text-white uppercase tracking-tighter">Skillence Coach Hub</h1>
            <p className="text-tp-red font-black text-[9px] uppercase tracking-[0.4em]">TP Professional Services</p>
          </div>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => setActiveMode('directory')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'directory' ? 'bg-tp-red text-white' : 'text-white/50'}`}
          >
            Student Directory
          </button>
          <button 
            onClick={() => setActiveMode('ai')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'ai' ? 'bg-tp-red text-white' : 'text-white/50'}`}
          >
            AI Practice Session
          </button>
        </div>

        <button 
          onClick={onClose}
          className="p-4 text-white/40 hover:text-white bg-white/5 rounded-full transition-all"
        >
          <XIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-tp-red/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-tp-purple/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-4xl w-full relative z-10 flex flex-col items-center flex-1 overflow-hidden">
        {activeMode === 'directory' ? (
          <div className="w-full bg-white/5 backdrop-blur-xl rounded-[48px] p-8 md:p-10 border border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-full">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Active Students</h2>
              <div className="px-4 py-2 bg-tp-red text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                {students.length} Agents Assigned
              </div>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar pr-4">
              {isLoadingStudents ? (
                <div className="py-20 text-center animate-pulse text-white/30 uppercase font-black text-xs tracking-[0.3em]">Querying Registry...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {students.map((student) => (
                    <div key={student.id} className="bg-white/5 border border-white/5 rounded-3xl p-6 hover:bg-white/10 transition-all flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-tp-red/10 rounded-2xl flex items-center justify-center text-tp-red group-hover:scale-110 transition-transform">
                          <UserIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-base leading-tight">{student.name}</p>
                          <span className="text-tp-red font-black text-[10px] uppercase tracking-widest">{student.languageLevel || 'N/A'} Proficiency</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => onImpersonate(student)}
                        className="bg-white text-tp-purple px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-tp-red hover:text-white transition-all shadow-xl"
                      >
                        View Profile
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {students.length === 0 && !isLoadingStudents && (
                <div className="py-20 text-center text-white/20 font-black uppercase text-xs tracking-widest">
                  No registered students found in your directory.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="relative mb-12">
              <div className={`w-40 h-40 md:w-56 md:h-56 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${isConnected ? 'border-tp-red shadow-[0_0_80px_rgba(226,0,26,0.3)]' : 'border-white/10'}`}>
                <div className={`absolute inset-0 rounded-full border-2 border-tp-red/30 animate-ping ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}></div>
                <div className={`w-28 h-28 md:w-36 md:h-36 bg-white/5 rounded-full flex items-center justify-center relative overflow-hidden`}>
                    <BrainIcon className={`w-14 h-14 transition-all duration-300 ${isConnected ? 'text-white' : 'text-white/20'}`} />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-tp-red/10 border border-tp-red/30 p-6 rounded-3xl mb-12 animate-fadeIn">
                <p className="text-tp-red font-bold text-sm uppercase tracking-widest">{error}</p>
                <button onClick={startSession} className="mt-4 text-white text-xs font-black underline uppercase tracking-widest">Retry Connection</button>
              </div>
            )}

            <div className="w-full max-w-2xl bg-white/5 backdrop-blur-md border border-white/10 rounded-[40px] p-10 shadow-2xl min-h-[180px] flex flex-col justify-end">
              <div className="space-y-4">
                {transcription.length === 0 ? (
                  <p className="text-white/20 italic font-medium text-lg">"The Coach is listening..."</p>
                ) : (
                  transcription.map((line, i) => (
                    <p key={i} className={`text-lg font-bold leading-tight animate-fadeIn ${line.startsWith('You:') ? 'text-tp-red' : 'text-white'}`}>
                      {line}
                    </p>
                  ))
                )}
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    Registry Link: {isConnected ? 'Synchronized' : 'Offline'}
                  </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveCoach;
