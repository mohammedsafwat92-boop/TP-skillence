
/// <reference types="vite/client" />

const WEB_APP_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || "https://script.google.com/macros/s/AKfycbxgBQN-meFmv79fyEa7XwEd3hdtXNVvD6i-dURda_hOOYE-inzuoFTFiGrmXBUFCowK/exec";
if (!import.meta.env.VITE_GOOGLE_SHEET_URL) console.warn("[googleSheetService] VITE_GOOGLE_SHEET_URL is missing from the environment. Using hardcoded fallback.");

async function callApi(action: string, payload: any = {}) {
  const requestBody = JSON.stringify({ 
    action, 
    ...payload 
  });

  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: requestBody,
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`NETWORK_ERROR: HTTP ${response.status}`);
    }

    const rawText = await response.text();
    let json;
    try {
      json = JSON.parse(rawText);
    } catch (parseError) {
      console.error("[googleSheetService] Critical parsing failure. Raw text received from backend:", rawText);
      throw new Error(`DEPLOYMENT_MISMATCH: Backend returned a string instead of JSON.`);
    }

    if (!json.success) {
      if (json.message === "Invalid credentials") {
        throw new Error("AUTH_FAILED: Incorrect credentials.");
      }
      throw new Error(json.message || 'GENERAL_BACKEND_FAULT');
    }
    
    return json.data;
  } catch (error) {
    console.debug(`[CallStack] Action: ${action}`, (error as Error).message);
    throw error;
  }
}

export const googleSheetService = {
  testConnection: async () => {
    try {
      await callApi('test_connection');
      return true;
    } catch (e) {
      return false;
    }
  },

  login: (email: string, pass: string) => 
    callApi('login', { email, password: pass }),
    
  fetchUserPlan: async (uid: string, role: string) => {
    // Explicitly send uid and role as requested
    return await callApi('get_user_plan', { uid, role });
  },

  fetchGlobalResources: async () => {
    return await callApi('get_all_resources');
  },

  getAllResources: async () => {
    return await callApi('get_all_resources');
  },
    
  createUser: (userData: any): Promise<{ uid: string; userProfile: any; resources: any[] }> => 
    callApi('register_shl_user', userData),
    
  fetchAllUsers: (requesterEmail?: string, requesterRole?: string) => 
    callApi('admin_get_users', { requesterEmail, requesterRole }),
    
  submitQuizResult: (uid: string, resourceId: string, passed: boolean, score: number, timeTaken?: number) =>
    callApi('submit_progress', { uid, resourceId, passed, score, timeTaken }),

  submitProgress: (uid: string, resourceId: string, passed: boolean, score: number, timeTaken?: number) =>
    callApi('submit_progress', { uid, resourceId, passed, score, timeTaken }),

  importResource: (resourceData: any) => 
    callApi('admin_import_resource', resourceData),

  bulkImportResources: (resources: any[]) => {
    return callApi('bulk_import_resources', { resources });
  },

  unlockResource: (uid: string, resourceId: string) =>
    callApi('admin_unlock_resource', { uid, resourceId }),

  assignManualResource: (targetUid: string, resourceId: string, adminId: string) =>
    // Explicitly send targetUid, resourceId, and adminId as requested
    callApi('assign_manual_resource', { targetUid, resourceId, adminId }),

  getAdminStats: (requesterEmail?: string, requesterRole?: string) =>
    callApi('get_admin_stats', { requesterEmail, requesterRole }),

  bulkAssignRoster: (adminId: string, wave?: string) =>
    callApi('bulk_assign_roster', { adminId, wave }),

  getWeeklyAssignments: async (): Promise<Record<number, string[]>> => {
    try {
      return await callApi('get_weekly_assignments');
    } catch (e: any) {
      console.warn("[googleSheetService] getWeeklyAssignments Web App failed, retrieving from localStorage. Error:", e?.message);
      try {
        const stored = localStorage.getItem("local_weekly_assignments");
        return stored ? JSON.parse(stored) : {};
      } catch (parseErr) {
        return {};
      }
    }
  },

  getWaveConfigs: async () => {
    try {
      return await callApi('get_wave_configs');
    } catch (e: any) {
      console.warn("[googleSheetService] getWaveConfigs Web App failed, utilizing localStorage fallback. Error:", e?.message);
      try {
        const stored = localStorage.getItem("local_wave_configs");
        return stored ? JSON.parse(stored) : {};
      } catch (parseErr) {
        return {};
      }
    }
  },

  setWaveConfig: async (waveNumber: string, goalType: 'default' | 'weekly', goalMinutes: number) => {
    try {
      return await callApi('set_wave_config', { waveNumber, goalType, goalMinutes });
    } catch (e: any) {
      console.warn("[googleSheetService] setWaveConfig Web App failed, utilizing localStorage fallback. Error:", e?.message);
      let local: Record<string, any> = {};
      try {
        const stored = localStorage.getItem("local_wave_configs");
        local = stored ? JSON.parse(stored) : {};
      } catch (parseErr) {
        local = {};
      }
      
      if (!local[waveNumber]) {
        local[waveNumber] = {
          defaultGoal: 180,
          currentWeekGoal: null,
          activeGoal: 180
        };
      }
      
      if (goalType === 'default') {
        local[waveNumber].defaultGoal = goalMinutes;
      } else {
        local[waveNumber].currentWeekGoal = goalMinutes || null;
      }
      
      local[waveNumber].activeGoal = local[waveNumber].currentWeekGoal || local[waveNumber].defaultGoal || 180;
      
      localStorage.setItem("local_wave_configs", JSON.stringify(local));
      return local;
    }
  },

  assignToWeek: async (weekNumber: number, resourceIds: string[], adminId: string): Promise<Record<number, string[]>> => {
    try {
      return await callApi('assign_to_week', { weekNumber, resourceIds, adminId });
    } catch (e: any) {
      console.warn("[googleSheetService] assignToWeek Web App failed, utilizing localStorage fallback. Error:", e?.message);
      let local: Record<number, string[]> = {};
      try {
        const stored = localStorage.getItem("local_weekly_assignments");
        local = stored ? JSON.parse(stored) : {};
      } catch (parseErr) {
        local = {};
      }
      local[weekNumber] = resourceIds;
      localStorage.setItem("local_weekly_assignments", JSON.stringify(local));
      return local;
    }
  },

  saveTranscript: async (userId: string, transcript: any): Promise<any> => {
    try {
      return await callApi('save_transcript', { userId, transcript });
    } catch (e: any) {
      console.warn("[googleSheetService] saveTranscript Web App failed, utilizing localStorage fallback. Error:", e?.message);
      const key = `local_transcripts_${userId}`;
      let local: any[] = [];
      try {
        local = JSON.parse(localStorage.getItem(key) || "[]");
      } catch (parseErr) {
        local = [];
      }
      const id = 't-' + Date.now();
      const dateString = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const newEntry = {
        id,
        userId,
        date: dateString,
        topic: transcript.topic || 'General Coaching Session',
        duration: transcript.duration || '5:00',
        overallScore: transcript.overallScore || 'Completed',
        messages: transcript.messages || []
      };
      local.push(newEntry);
      localStorage.setItem(key, JSON.stringify(local));
      return { id };
    }
  },

  getTranscripts: async (userId: string): Promise<any[]> => {
    try {
      return await callApi('get_transcripts', { userId });
    } catch (e: any) {
      console.warn("[googleSheetService] getTranscripts Web App failed, retrieving from localStorage. Error:", e?.message);
      const key = `local_transcripts_${userId}`;
      try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
      } catch (parseErr) {
        return [];
      }
    }
  },

  proxyGemini: (model: string, payload: any): Promise<any> =>
    callApi('proxy_gemini', { model, payload }),

  proxyGeminiRequest: (payload: any): Promise<any> =>
    callApi('proxy_gemini_request', { payload }),

  addSingleUser: async (userData: { name: string; email: string; waveNumber: string; role: 'agent' }): Promise<boolean> => {
    try {
      await callApi('addSingleUser', userData);
      return true;
    } catch (e) {
      console.error("[googleSheetService] addSingleUser failed:", e);
      return false;
    }
  }
};
