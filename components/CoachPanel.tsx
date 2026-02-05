
import React, { useState, useEffect } from 'react';
import { googleSheetService } from '../services/googleSheetService';
import { shlService } from '../services/shlService';
import { ClipboardListIcon, BrainIcon, UserIcon, DownloadIcon } from './Icons';
import type { UserProfile } from '../types';

interface CoachPanelProps {
  onUpdateContent: () => void;
  currentUser: UserProfile;
  onImpersonate: (user: UserProfile) => void;
}

const CoachPanel: React.FC<CoachPanelProps> = ({ onUpdateContent, currentUser, onImpersonate }) => {
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchMyStudents = async () => {
    setIsProcessing(true);
    try {
      const users = await googleSheetService.fetchAllUsers();
      const allUsers = Array.isArray(users) ? users : [];
      
      // Strict Security Filter: My Students Only
      const filtered = allUsers.filter(u => 
        u.role === 'agent' && 
        u.assignedCoach === currentUser.email
      );
      
      setUserList(filtered);
    } catch (err) {
      console.error("Failed to fetch students:", err);
      setUserList([]);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchMyStudents();
  }, [currentUser.email]);

  const handleStudentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      // Auto-Assign: Pass currentUser.email as the assignedCoach
      const result = await shlService.processAndRegister(file, currentUser.email);
      alert(`Successfully onboarded ${result.shlData.candidateName}. User is now assigned to your roster.`);
      fetchMyStudents();
      onUpdateContent();
    } catch (err) {
      alert("Onboarding Failed: " + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
    if (e.target) e.target.value = "";
  };

  const exportRosterCsv = () => {
    if (userList.length === 0) return;
    const headers = ['Name', 'Email', 'Level', 'SVAR Score', 'WriteX Score'].join(',');
    const rows = userList.map(u => {
      const svar = u.shlData?.svar?.overall ?? '--';
      const writex = u.shlData?.writex?.grammar ?? '--';
      return [`"${u.name}"`, u.email || 'N/A', u.languageLevel, svar, writex].join(',');
    }).join('\n');

    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `My_Roster_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-[48px] shadow-2xl p-10 max-w-6xl mx-auto border border-gray-100 animate-fadeIn mt-6">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-black text-tp-purple flex items-center tracking-tight uppercase">
            <BrainIcon className="mr-4 text-tp-red" /> Coach Roster Hub
          </h1>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">Management View for {currentUser.name}</p>
        </div>
      </div>

      {/* Onboarding Logic */}
      <div className="mb-12 border-4 border-dashed border-tp-purple/5 rounded-[40px] p-10 text-center bg-gray-50/50 hover:border-tp-purple/20 transition-all">
        <h3 className="text-xl font-black text-tp-purple mb-4 uppercase tracking-tight">Onboard New Agent</h3>
        <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto font-medium">Upload an SHL Evaluation PDF. The agent will be auto-assigned to your coaching roster.</p>
        <label className={`bg-tp-purple text-white px-10 py-4 rounded-2xl font-black uppercase text-xs cursor-pointer hover:bg-tp-navy transition-all shadow-xl inline-block ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
          {isProcessing ? 'Syncing...' : 'Upload Performance File'}
          <input type="file" className="hidden" accept=".pdf" onChange={handleStudentUpload} disabled={isProcessing} />
        </label>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-tp-purple uppercase text-sm tracking-widest">My Assigned Agents</h3>
        <button 
          onClick={exportRosterCsv}
          disabled={userList.length === 0}
          className="bg-tp-navy text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-tp-purple transition-all shadow-lg flex items-center gap-2"
        >
          <DownloadIcon className="w-4 h-4" /> Export Roster
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-[32px] shadow-inner bg-gray-50/30">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
              <th className="px-8 py-5">Agent Name</th>
              <th className="px-4 py-5 text-center">CEFR</th>
              <th className="px-4 py-5 text-center">SVAR</th>
              <th className="px-4 py-5 text-center">WriteX</th>
              <th className="px-8 py-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {userList.map((user) => (
              <tr key={user.id} className="hover:bg-tp-purple/[0.02] transition-colors group">
                <td className="px-8 py-5">
                  <p className="font-bold text-tp-purple text-base leading-none">{user.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-1">{user.email || 'N/A'}</p>
                </td>
                <td className="px-4 py-5 text-center">
                  <span className="text-tp-red font-black text-lg">{user.languageLevel || '--'}</span>
                </td>
                <td className="px-4 py-5 text-center font-black text-tp-purple">
                  {user.shlData?.svar?.overall ?? '--'}
                </td>
                <td className="px-4 py-5 text-center font-black text-tp-purple">
                  {user.shlData?.writex?.grammar ?? '--'}
                </td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => onImpersonate(user)}
                    className="bg-tp-purple text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-tp-red transition-all shadow-md"
                  >
                    View Progress
                  </button>
                </td>
              </tr>
            ))}
            {userList.length === 0 && !isProcessing && (
              <tr>
                <td colSpan={5} className="py-20 text-center text-gray-400 font-black uppercase text-xs tracking-widest">
                  You have no agents assigned to your roster.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {isProcessing && (
          <div className="py-10 text-center text-tp-purple font-black uppercase text-xs animate-pulse">Querying Registry...</div>
        )}
      </div>
    </div>
  );
};

export default CoachPanel;
