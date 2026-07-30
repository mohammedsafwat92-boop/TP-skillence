import React, { useState, useEffect } from 'react';
import { googleSheetService } from '../../services/googleSheetService';
import { assignLesson } from '../../services/adminService';
import type { UserProfile, StoredInteractiveLesson } from '../../types';
import { UserCheck, BookOpen, Send, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Sparkles } from 'lucide-react';

interface LessonAssignerProps {
  currentAdminId?: string;
  onAssignmentComplete?: () => void;
}

export const LessonAssigner: React.FC<LessonAssignerProps> = ({
  currentAdminId = 'admin_master',
  onAssignmentComplete
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch Users
      const fetchedUsers = await googleSheetService.fetchAllUsers();
      setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
      if (Array.isArray(fetchedUsers) && fetchedUsers.length > 0) {
        setSelectedUserId(fetchedUsers[0].id || fetchedUsers[0].email || '');
      }

      // 2. Fetch Interactive Lessons
      const fetchedLessons = await googleSheetService.getInteractiveLessons();
      setLessons(Array.isArray(fetchedLessons) ? fetchedLessons : []);
      if (Array.isArray(fetchedLessons) && fetchedLessons.length > 0) {
        setSelectedLessonId(fetchedLessons[0].id || '');
      }
    } catch (err: any) {
      console.error("Failed to load users or interactive lessons for Assigner:", err);
      setErrorMessage("Could not load users or interactive lessons from backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId || !selectedLessonId) {
      setErrorMessage("Please select both a user and an interactive lesson.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const selectedUserObj = users.find(u => (u.id || u.email) === selectedUserId);
      const selectedLessonObj = lessons.find(l => l.id === selectedLessonId);

      const targetUserId = selectedUserId;
      const targetLessonId = selectedLessonId;

      await assignLesson(targetUserId, targetLessonId, currentAdminId);

      const userName = selectedUserObj?.name || targetUserId;
      const lessonTitle = selectedLessonObj?.title || selectedLessonObj?.lessonData?.title || targetLessonId;

      setSuccessMessage(`Successfully assigned "${lessonTitle}" to ${userName}!`);
      if (onAssignmentComplete) onAssignmentComplete();
    } catch (err: any) {
      console.error("Error assigning lesson:", err);
      setErrorMessage(err?.message || "Failed to assign lesson to user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 max-w-4xl mx-auto my-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="w-12 h-12 bg-tp-purple/10 text-tp-purple rounded-2xl flex items-center justify-center font-black">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Manual Lesson Shield Assigner</h2>
          <p className="text-xs font-semibold text-gray-500">
            Authorize specific learners to view interactive lessons in their shielded hub
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500 font-bold flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-tp-purple animate-spin" />
          <p className="text-xs uppercase tracking-widest">Loading Roster & Interactive Lessons...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {errorMessage && (
            <div className="p-4 bg-red-50 border-2 border-red-200 text-red-800 rounded-2xl flex items-start gap-3 text-xs font-bold">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>{successMessage}</div>
            </div>
          )}

          {/* User Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-700 mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-tp-purple" /> Select Learner / User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={isSubmitting || users.length === 0}
              className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 font-bold text-sm text-gray-900 focus:outline-none focus:border-tp-purple focus:bg-white transition-all cursor-pointer"
            >
              {users.length === 0 ? (
                <option value="">No users found in roster</option>
              ) : (
                users.map((u, idx) => {
                  const uid = u.id || u.email || `user_${idx}`;
                  return (
                    <option key={uid} value={uid}>
                      {u.name} ({u.email || u.id}) — {u.role?.toUpperCase() || 'AGENT'} [{u.rosterId || 'Default'}]
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Lesson Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-700 mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-tp-red" /> Select Interactive Lesson
            </label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              disabled={isSubmitting || lessons.length === 0}
              className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 font-bold text-sm text-gray-900 focus:outline-none focus:border-tp-purple focus:bg-white transition-all cursor-pointer"
            >
              {lessons.length === 0 ? (
                <option value="">No interactive lessons found</option>
              ) : (
                lessons.map((l, idx) => {
                  const lid = l.id || `les_${idx}`;
                  const title = l.title || l.lessonData?.title || 'Untitled Lesson';
                  return (
                    <option key={lid} value={lid}>
                      {title} (ID: {lid})
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleAssign}
            disabled={isSubmitting || !selectedUserId || !selectedLessonId}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 ${
              isSubmitting || !selectedUserId || !selectedLessonId
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-tp-purple to-tp-red text-white hover:opacity-95 shadow-tp-purple/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating Brain_ManualAssignments...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Assign Lesson & Authorize Access
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default LessonAssigner;
