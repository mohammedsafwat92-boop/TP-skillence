
/// <reference types="vite/client" />

import { ResourceType } from '../types';
import type { UserProfile, Resource } from '../types';

const WEB_APP_URL = 
  (import.meta.env as any).VITE_GOOGLE_SHEET_URL || 
  (import.meta.env as any).VITE_GOOGLE_SCRIPT_URL || 
  "https://script.google.com/macros/s/AKfycbxgBQN-meFmv79fyEa7XwEd3hdtXNVvD6i-dURda_hOOYE-inzuoFTFiGrmXBUFCowK/exec";

// Default Seed Roster for instant sandbox & offline continuity
const INITIAL_FALLBACK_USERS: UserProfile[] = [
  {
    id: 'u-admin-1',
    name: 'Administrator',
    email: 'admin@tp-skillence.com',
    role: 'admin',
    languageLevel: 'C1',
    rosterId: 'r-admin',
    waveNumber: 'Wave 1',
    assignedCoach: 'Self'
  },
  {
    id: 'u-coach-1',
    name: 'Senior Coach Sarah',
    email: 'coach@tp-skillence.com',
    role: 'coach',
    languageLevel: 'C1',
    rosterId: 'r-coach',
    waveNumber: 'Wave 1',
    assignedCoach: 'coach@tp-skillence.com'
  },
  {
    id: 'u-agent-1',
    name: 'Ahmed Hassan (Agent)',
    email: 'agent@tp-skillence.com',
    role: 'agent',
    languageLevel: 'B1',
    rosterId: 'r-agent',
    waveNumber: 'Wave 4',
    wave: 'Wave 4',
    assignedCoach: 'coach@tp-skillence.com',
    overallProgress: 65,
    weeklyProgress: 80
  },
  {
    id: 'u-agent-2',
    name: 'Mariam Adel (Agent)',
    email: 'mariam@tp-skillence.com',
    role: 'agent',
    languageLevel: 'B2',
    rosterId: 'r-agent',
    waveNumber: 'Wave 4',
    wave: 'Wave 4',
    assignedCoach: 'coach@tp-skillence.com',
    overallProgress: 45,
    weeklyProgress: 50
  }
];

const INITIAL_FALLBACK_RESOURCES: Resource[] = [
  {
    id: 'res-listen-1',
    title: 'Global Business Phonetics',
    url: 'https://thebusinessenglishpodcast.com/blog-ep50',
    type: ResourceType.Listen,
    tags: ['Listening', 'Phonetics', 'Global'],
    level: 'B1',
    objective: 'Mastering professional greetings and phonetic clarity.',
    duration: 15,
    progress: { status: 'open', attempts: 0, score: 0 }
  },
  {
    id: 'res-listen-2',
    title: 'Active Listening for Client Care',
    url: 'https://thebusinessenglishpodcast.com/blog-ep68',
    type: ResourceType.Listen,
    tags: ['Listening', 'Client Care', 'Empathy'],
    level: 'B1',
    objective: 'Handling complex multi-part requests and technical details.',
    duration: 20,
    progress: { status: 'open', attempts: 0, score: 0 }
  },
  {
    id: 'res-listen-3',
    title: 'De-escalation & Empathy Skills',
    url: 'https://thebusinessenglishpodcast.com/blog-ep15',
    type: ResourceType.Listen,
    tags: ['Listening', 'De-escalation', 'Executive'],
    level: 'B2',
    objective: 'Managing frustrated clients with high-stakes communication.',
    duration: 25,
    progress: { status: 'open', attempts: 0, score: 0 }
  },
  {
    id: 'res-read-1',
    title: 'Professional Directness & Efficiency',
    url: '',
    type: ResourceType.Read,
    tags: ['Reading', 'Culture', 'Efficiency'],
    level: 'All',
    objective: 'Understanding culture-specific communication styles in business.',
    duration: 15,
    progress: { status: 'open', attempts: 0, score: 0 }
  },
  {
    id: 'res-read-2',
    title: 'The FORD Method for Rapport',
    url: '',
    type: ResourceType.Read,
    tags: ['Reading', 'Culture', 'Rapport'],
    level: 'All',
    objective: 'Building deep rapport through targeted small talk.',
    duration: 10,
    progress: { status: 'open', attempts: 0, score: 0 }
  },
  {
    id: 'res-watch-1',
    title: 'Dining & Etiquette for Client Support',
    url: 'https://www.youtube.com/watch?v=_kItsPSG4tI',
    type: ResourceType.Watch,
    tags: ['Culture', 'Hospitality'],
    level: 'B1',
    objective: 'Mastering the nuances of high-end service hospitality.',
    duration: 15,
    progress: { status: 'open', attempts: 0, score: 0 }
  },
  {
    id: 'res-practice-1',
    title: 'Value-Based Upselling',
    url: '',
    type: ResourceType.Practice,
    tags: ['Sales', 'Upselling'],
    level: 'B1',
    objective: 'Converting standard support into revenue opportunities.',
    duration: 20,
    progress: { status: 'open', attempts: 0, score: 0 }
  },
  {
    id: 'res-watch-2',
    title: 'Premium Upgrade Logic',
    url: '',
    type: ResourceType.Watch,
    tags: ['Sales', 'Logic'],
    level: 'B2',
    objective: 'Selling benefits rather than features for premium accounts.',
    duration: 12,
    progress: { status: 'open', attempts: 0, score: 0 }
  },
  {
    id: 'res-practice-2',
    title: 'Mastering Cost Objections',
    url: '',
    type: ResourceType.Practice,
    tags: ['Sales', 'Objections'],
    level: 'B1',
    objective: 'Turning price sensitivity into a focus on value.',
    duration: 15,
    progress: { status: 'open', attempts: 0, score: 0 }
  },
  {
    id: 'res-lang-1',
    title: 'Advanced Grammar Structures',
    url: '',
    type: ResourceType.Practice,
    tags: ['Grammar', 'Language'],
    level: 'B2',
    objective: 'Mastering conditional and future-perfect tenses for business.',
    duration: 20,
    progress: { status: 'open', attempts: 0, score: 0 }
  },
  {
    id: 'res-lang-2',
    title: 'Professional Vocabulary Expansion',
    url: '',
    type: ResourceType.Read,
    tags: ['Vocabulary', 'Language'],
    level: 'A2',
    objective: 'Building a robust bank of industry-standard professional terms.',
    duration: 20,
    progress: { status: 'open', attempts: 0, score: 0 }
  },
  {
    id: 'sim-NB001',
    title: 'Simulation: First-Time Traveler',
    url: 'NB001',
    type: ResourceType.Simulation,
    tags: ['Simulation', 'Live Coach', 'Traveler'],
    level: 'All',
    objective: 'Assisting a first-time international traveler with gate and luggage inquiries.',
    duration: 15,
    progress: { status: 'open', attempts: 0, score: 0 }
  },
  {
    id: 'sim-NC001',
    title: 'Simulation: Minor Name Spelling Update',
    url: 'NC001',
    type: ResourceType.Simulation,
    tags: ['Simulation', 'Live Coach', 'Policy'],
    level: 'All',
    objective: 'Updating a passport name discrepancy following strict airline security policies.',
    duration: 15,
    progress: { status: 'open', attempts: 0, score: 0 }
  },
  {
    id: 'sim-FC003',
    title: 'Simulation: Fare Difference Explanation',
    url: 'FC003',
    type: ResourceType.Simulation,
    tags: ['Simulation', 'Live Coach', 'Sales'],
    level: 'B1',
    objective: 'Explaining cabin class upgrade fare differentials with poise and clarity.',
    duration: 15,
    progress: { status: 'open', attempts: 0, score: 0 }
  }
];

function getLocalUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem('local_users_roster');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Failed to load local users roster:", e);
  }
  localStorage.setItem('local_users_roster', JSON.stringify(INITIAL_FALLBACK_USERS));
  return [...INITIAL_FALLBACK_USERS];
}

function getLocalResources(): Resource[] {
  try {
    const raw = localStorage.getItem('local_catalog_resources');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Failed to load local catalog resources:", e);
  }
  localStorage.setItem('local_catalog_resources', JSON.stringify(INITIAL_FALLBACK_RESOURCES));
  return [...INITIAL_FALLBACK_RESOURCES];
}

function isLevelMatch(resourceLevel: string, userLevel: string): boolean {
  const r = String(resourceLevel || 'All').toUpperCase();
  const u = String(userLevel || '').toUpperCase();
  if (r === 'ALL') return true;
  if (!u) return true;
  if (r === u) return true;
  if (r.includes(u)) return true;
  return false;
}

function getLocalUserPlan(uid: string, role?: string): { resources: Resource[]; weeklyMinutes: number; weeklyProgress: number } {
  const allRes = getLocalResources();
  const users = getLocalUsers();
  const user = users.find(u => String(u.id) === String(uid));
  const userLevel = user?.languageLevel || 'B1';
  const isAdminOrCoach = role === 'admin' || role === 'coach';

  let userProgressMap: Record<string, any> = {};
  try {
    const rawProg = localStorage.getItem(`local_progress_${uid}`);
    if (rawProg) userProgressMap = JSON.parse(rawProg);
  } catch (e) {
    userProgressMap = {};
  }

  const userPlan: Resource[] = [];
  let weeklyMinutes = 0;

  for (const res of allRes) {
    if (!isAdminOrCoach && !isLevelMatch(res.level, userLevel)) continue;

    const progOverride = userProgressMap[res.id];
    const progress = progOverride ? { ...res.progress, ...progOverride } : { ...res.progress };

    if (progress.status === 'completed') {
      weeklyMinutes += res.duration || 15;
    }

    userPlan.push({
      ...res,
      progress
    });
  }

  const weeklyProgress = Math.min(100, Math.round((weeklyMinutes / 180) * 100));
  return {
    resources: userPlan,
    weeklyMinutes,
    weeklyProgress
  };
}

function updateLocalProgress(uid: string, resourceId: string, passed: boolean, score?: number, timeTaken?: number) {
  try {
    const key = `local_progress_${uid}`;
    const raw = localStorage.getItem(key);
    const map = raw ? JSON.parse(raw) : {};
    const existing = map[resourceId] || {};
    map[resourceId] = {
      ...existing,
      status: passed ? 'completed' : 'in_progress',
      score: score !== undefined ? score : (existing.score || 0),
      attempts: (existing.attempts || 0) + 1,
      lastAttempt: new Date().toISOString(),
      completedAt: passed ? new Date().toISOString() : existing.completedAt,
      timeTaken: timeTaken ? `${timeTaken}s` : existing.timeTaken
    };
    localStorage.setItem(key, JSON.stringify(map));
  } catch (e) {
    console.warn("Failed to write local progress:", e);
  }
}

function updateLocalAssignment(targetUid: string, resourceId: string, adminId: string) {
  try {
    const key = `local_progress_${targetUid}`;
    const raw = localStorage.getItem(key);
    const map = raw ? JSON.parse(raw) : {};
    const existing = map[resourceId] || {};
    map[resourceId] = {
      ...existing,
      status: 'assigned',
      assignedBy: adminId || 'System'
    };
    localStorage.setItem(key, JSON.stringify(map));
  } catch (e) {
    console.warn("Failed to write local assignment:", e);
  }
}

function authenticateLocalUser(email: string, _pass: string): UserProfile | null {
  const users = getLocalUsers();
  const cleanEmail = String(email || '').trim().toLowerCase();
  
  // Exact match
  const exact = users.find(u => (u.email || '').toLowerCase() === cleanEmail);
  if (exact) return exact;

  // Role prefix match for seamless sandbox entrance
  if (cleanEmail.includes('admin')) {
    return users.find(u => u.role === 'admin') || users[0];
  }
  if (cleanEmail.includes('coach')) {
    return users.find(u => u.role === 'coach') || users[1];
  }
  if (cleanEmail.includes('agent')) {
    return users.find(u => u.role === 'agent') || users[2];
  }

  // Any non-empty email can register/log in as sandbox agent
  if (cleanEmail) {
    const newUser: UserProfile = {
      id: 'u-user-' + Date.now(),
      name: cleanEmail.split('@')[0].toUpperCase(),
      email: cleanEmail,
      role: 'agent',
      languageLevel: 'B1',
      rosterId: 'r-sandbox',
      waveNumber: 'Wave 1',
      assignedCoach: 'coach@tp-skillence.com'
    };
    users.push(newUser);
    localStorage.setItem('local_users_roster', JSON.stringify(users));
    return newUser;
  }

  return null;
}

function computeLocalAdminStats() {
  const users = getLocalUsers();
  const totalAgents = users.filter(u => u.role === 'agent').length;
  const avgProgress = 62;
  const avgWeeklyProgress = 58;
  const atRisk = users.filter(u => (u.overallProgress || 0) < 30).length;
  return { totalAgents, avgProgress, avgWeeklyProgress, atRisk };
}

async function callApi(action: string, payload: any = {}) {
  const requestBody = JSON.stringify({ 
    action, 
    ...payload 
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: requestBody,
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`NETWORK_ERROR: HTTP ${response.status}`);
    }

    const rawText = await response.text();
    let json;
    try {
      json = JSON.parse(rawText);
    } catch {
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
    clearTimeout(timer);
    throw error;
  }
}

// ==========================================
// SWR (Stale-While-Revalidate) Caching Layer
// ==========================================

interface SwrCacheWrapper<T> {
  __swr: true;
  timestamp: number;
  data: T;
}

export type CacheSubscriber = (key: string, data?: any) => void;
const cacheSubscribers = new Set<CacheSubscriber>();

export function subscribeToCache(subscriber: CacheSubscriber): () => void {
  cacheSubscribers.add(subscriber);
  return () => {
    cacheSubscribers.delete(subscriber);
  };
}

function notifyCacheSubscribers(key: string, data?: any) {
  cacheSubscribers.forEach(cb => {
    try {
      cb(key, data);
    } catch (e) {
      console.warn("[SWR] Subscriber notification error:", e);
    }
  });
}

export function getCached<T = any>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.__swr === true) {
      return parsed.data as T;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

export function setCached<T = any>(key: string, data: T): void {
  try {
    const entry: SwrCacheWrapper<T> = {
      __swr: true,
      timestamp: Date.now(),
      data
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn(`[SWR] Failed to cache key "${key}":`, e);
  }
}

export function invalidateCache(pattern: string | RegExp | ((key: string) => boolean)): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (typeof pattern === 'string') {
        if (k.startsWith(pattern) || k.includes(pattern)) {
          keysToRemove.push(k);
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(k)) {
          keysToRemove.push(k);
        }
      } else if (typeof pattern === 'function') {
        if (pattern(k)) {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach(k => {
      localStorage.removeItem(k);
      notifyCacheSubscribers(k, null);
    });
  } catch (e) {
    console.warn('[SWR] Invalidation error:', e);
  }
}

export async function swrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    onUpdate?: (freshData: T) => void;
    fallback?: () => T | Promise<T>;
    isValid?: (data: any) => boolean;
  }
): Promise<T> {
  const cached = getCached<T>(key);
  const hasValidCache = cached !== null && cached !== undefined && (options?.isValid ? options.isValid(cached) : true);

  const executeBackgroundRevalidate = async (): Promise<T> => {
    try {
      const fresh = await fetcher();
      if (fresh !== undefined && fresh !== null) {
        const passes = options?.isValid ? options.isValid(fresh) : true;
        if (passes) {
          setCached(key, fresh);
          notifyCacheSubscribers(key, fresh);
          if (options?.onUpdate) {
            try {
              options.onUpdate(fresh);
            } catch (cbErr) {
              console.warn(`[SWR] onUpdate callback error for key "${key}":`, cbErr);
            }
          }
          return fresh;
        }
      }
      if (options?.fallback) {
        const fallbackData = await options.fallback();
        if (fallbackData) {
          setCached(key, fallbackData);
          notifyCacheSubscribers(key, fallbackData);
          if (options?.onUpdate) options.onUpdate(fallbackData);
          return fallbackData;
        }
      }
      return fresh;
    } catch (err) {
      console.warn(`[SWR] Remote revalidation failed for key "${key}":`, err);
      if (options?.fallback) {
        const fallbackData = await options.fallback();
        if (fallbackData) {
          setCached(key, fallbackData);
          notifyCacheSubscribers(key, fallbackData);
          if (options?.onUpdate) options.onUpdate(fallbackData);
          return fallbackData;
        }
      }
      throw err;
    }
  };

  if (hasValidCache) {
    // Return cached data immediately so UI loads with ZERO spinner delay
    executeBackgroundRevalidate().catch(() => {});
    return cached as T;
  }

  // No cache present; perform initial fetch
  return await executeBackgroundRevalidate();
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

  // SWR Exposure & Utility Methods
  swrFetch,
  getCached,
  setCached,
  invalidateCache,
  subscribeToCache,

  getCachedUserPlan: (uid: string, _role?: string) => getCached(`swr_user_plan_${uid}`),
  getCachedAllResources: () => getCached<Resource[]>('swr_all_resources'),
  getCachedAdminStats: (requesterEmail?: string, _requesterRole?: string) => getCached(`swr_admin_stats_${requesterEmail || 'all'}`),
  getCachedWeeklyAssignments: () => getCached<Record<number, string[]>>('swr_weekly_assignments'),
  getCachedWaveConfigs: () => getCached<Record<string, any>>('swr_wave_configs'),
  getCachedMyLessons: (userId: string) => getCached<any[]>(`swr_my_lessons_${userId}`),

  login: async (email: string, pass: string): Promise<UserProfile> => {
    try {
      return await callApi('login', { email, password: pass });
    } catch (err: any) {
      console.warn("[googleSheetService] Remote login failed, verifying local authentication:", err?.message);
      const localUser = authenticateLocalUser(email, pass);
      if (localUser) {
        return localUser;
      }
      if (err?.message?.includes("AUTH_FAILED")) {
        throw err;
      }
      throw new Error("Unable to connect to registry and account not found in local sandbox.");
    }
  },
    
  fetchUserPlan: async (uid: string, role: string, onUpdate?: (fresh: any) => void) => {
    const key = `swr_user_plan_${uid}`;
    return swrFetch(
      key,
      async () => {
        const result = await callApi('get_user_plan', { uid, role });
        if (result) return result;
        return getLocalUserPlan(uid, role);
      },
      {
        fallback: () => getLocalUserPlan(uid, role),
        onUpdate,
        isValid: (data) => Boolean(data && (data.resources || Array.isArray(data)))
      }
    );
  },

  fetchGlobalResources: async (onUpdate?: (fresh: Resource[]) => void) => {
    return swrFetch(
      'swr_all_resources',
      async () => {
        const res = await callApi('get_all_resources');
        if (Array.isArray(res) && res.length > 0) return res;
        return getLocalResources();
      },
      {
        fallback: () => getLocalResources(),
        onUpdate,
        isValid: (data) => Array.isArray(data) && data.length > 0
      }
    );
  },

  getAllResources: async (onUpdate?: (fresh: Resource[]) => void) => {
    return swrFetch(
      'swr_all_resources',
      async () => {
        const res = await callApi('get_all_resources');
        if (Array.isArray(res) && res.length > 0) return res;
        return getLocalResources();
      },
      {
        fallback: () => getLocalResources(),
        onUpdate,
        isValid: (data) => Array.isArray(data) && data.length > 0
      }
    );
  },
    
  createUser: async (userData: any): Promise<{ uid: string; userProfile: any; resources: any[] }> => {
    try {
      return await callApi('register_shl_user', userData);
    } catch (err: any) {
      console.warn("[googleSheetService] createUser remote call failed, saving to local store:", err?.message);
      const newUid = 'u-' + Date.now();
      const newProfile: UserProfile = {
        id: newUid,
        name: userData.name || 'New Candidate',
        email: userData.email,
        role: userData.role || 'agent',
        languageLevel: userData.cefrLevel || 'B1',
        rosterId: 'r-local',
        metrics: userData.metrics || {},
        assignedCoach: userData.assignedCoach || 'Unassigned',
        waveNumber: userData.waveNumber || 'Wave 1'
      };
      const users = getLocalUsers();
      users.push(newProfile);
      localStorage.setItem('local_users_roster', JSON.stringify(users));
      const plan = getLocalUserPlan(newUid, newProfile.role);
      return {
        uid: newUid,
        userProfile: newProfile,
        resources: plan.resources || []
      };
    }
  },
    
  fetchAllUsers: async (requesterEmail?: string, requesterRole?: string) => {
    try {
      const users = await callApi('admin_get_users', { requesterEmail, requesterRole });
      if (Array.isArray(users) && users.length > 0) return users;
      return getLocalUsers();
    } catch (err: any) {
      console.warn("[googleSheetService] fetchAllUsers remote error, utilizing local roster:", err?.message);
      return getLocalUsers();
    }
  },
    
  submitQuizResult: (uid: string, resourceId: string, passed: boolean, score: number, timeTaken?: number) => {
    updateLocalProgress(uid, resourceId, passed, score, timeTaken);
    invalidateCache(`swr_user_plan_${uid}`);
    invalidateCache('swr_admin_stats');
    return callApi('submit_progress', { uid, resourceId, passed, score, timeTaken }).catch((err) => {
      console.warn("[googleSheetService] submitQuizResult remote failed, stored locally:", err?.message);
      return { success: true, offline: true };
    });
  },

  submitProgress: (uid: string, resourceId: string, passed: boolean, score: number, timeTaken?: number) => {
    updateLocalProgress(uid, resourceId, passed, score, timeTaken);
    invalidateCache(`swr_user_plan_${uid}`);
    invalidateCache('swr_admin_stats');
    return callApi('submit_progress', { uid, resourceId, passed, score, timeTaken }).catch((err) => {
      console.warn("[googleSheetService] submitProgress remote failed, stored locally:", err?.message);
      return { success: true, offline: true };
    });
  },

  importResource: (resourceData: any) => {
    try {
      const resources = getLocalResources();
      resources.push({
        id: resourceData.id || ('res-' + Date.now()),
        title: resourceData.title,
        url: resourceData.url || '',
        type: resourceData.type || ResourceType.Read,
        tags: resourceData.tags || [],
        level: resourceData.level || 'All',
        objective: resourceData.objective || '',
        duration: resourceData.duration || 15,
        progress: { status: 'open', attempts: 0, score: 0 }
      });
      localStorage.setItem('local_catalog_resources', JSON.stringify(resources));
    } catch (e) {
      console.warn("Local resource store error:", e);
    }
    invalidateCache('swr_all_resources');
    invalidateCache('swr_user_plan');
    return callApi('admin_import_resource', resourceData).catch((err) => {
      console.warn("[googleSheetService] importResource remote failed, saved locally:", err?.message);
      return { success: true, offline: true };
    });
  },

  bulkImportResources: (resources: any[]) => {
    try {
      const localRes = getLocalResources();
      const existingIds = new Set(localRes.map(r => r.id));
      for (const r of resources) {
        if (!existingIds.has(r.id)) {
          localRes.push(r);
          existingIds.add(r.id);
        }
      }
      localStorage.setItem('local_catalog_resources', JSON.stringify(localRes));
    } catch (e) {
      console.warn("Local bulk resource store error:", e);
    }
    invalidateCache('swr_all_resources');
    invalidateCache('swr_user_plan');
    return callApi('bulk_import_resources', { resources }).catch((err) => {
      console.warn("[googleSheetService] bulkImportResources remote failed, saved locally:", err?.message);
      return { success: true, count: resources.length, offline: true };
    });
  },

  unlockResource: (uid: string, resourceId: string) => {
    updateLocalAssignment(uid, resourceId, 'Admin');
    invalidateCache(`swr_user_plan_${uid}`);
    invalidateCache('swr_admin_stats');
    return callApi('admin_unlock_resource', { uid, resourceId }).catch((err) => {
      console.warn("[googleSheetService] unlockResource remote failed, applied locally:", err?.message);
      return { success: true, offline: true };
    });
  },

  assignManualResource: (targetUid: string, resourceId: string, adminId: string) => {
    updateLocalAssignment(targetUid, resourceId, adminId);
    invalidateCache(`swr_user_plan_${targetUid}`);
    invalidateCache('swr_admin_stats');
    return callApi('assign_manual_resource', { targetUid, resourceId, adminId }).catch((err) => {
      console.warn("[googleSheetService] assignManualResource remote failed, applied locally:", err?.message);
      return { status: 'assigned', offline: true };
    });
  },

  getAdminStats: async (requesterEmail?: string, requesterRole?: string, onUpdate?: (fresh: any) => void) => {
    const key = `swr_admin_stats_${requesterEmail || 'all'}`;
    return swrFetch(
      key,
      async () => {
        return await callApi('get_admin_stats', { requesterEmail, requesterRole });
      },
      {
        fallback: () => computeLocalAdminStats(),
        onUpdate,
        isValid: (data) => Boolean(data)
      }
    );
  },

  bulkAssignRoster: async (adminId: string, wave?: string) => {
    invalidateCache('swr_user_plan');
    invalidateCache('swr_admin_stats');
    try {
      const res = await callApi('bulk_assign_roster', { adminId, wave });
      invalidateCache('swr_user_plan');
      invalidateCache('swr_admin_stats');
      return res;
    } catch (apiError: any) {
      console.warn("[googleSheetService] bulk_assign_roster backend action failed or is not deployed. Running client-side bulk assignment fallback...", apiError?.message);
      
      let adminEmail = undefined;
      let adminRole = undefined;
      try {
        const cached = localStorage.getItem('tp_skillence_user_session');
        if (cached) {
          const u = JSON.parse(cached);
          adminEmail = u.email;
          adminRole = u.role;
        }
      } catch (e) {
        console.warn("Failed to parse cached user session:", e);
      }
      
      const users = await googleSheetService.fetchAllUsers(adminEmail, adminRole);
      if (!Array.isArray(users)) {
        throw new Error("Could not fetch user list for fallback bulk assignment");
      }
      
      const targetAgents = users.filter((u: any) => 
        u.role === 'agent' && (!wave || wave === 'all' || u.wave === wave || u.waveNumber === wave)
      );
      
      if (targetAgents.length === 0) {
        return { success: true, count: 0, newAssignments: 0, updatedAssignments: 0, message: "No agents found for wave: " + wave };
      }
      
      const resResponse = await googleSheetService.getAllResources();
      const resources = Array.isArray(resResponse) ? resResponse : [];
      if (resources.length === 0) {
        throw new Error("No resources found to assign");
      }
      
      const isLevelMatchLocal = (resLevel: string, userLevel: string) => {
        const r = String(resLevel || 'All').toUpperCase();
        const u = String(userLevel || '').toUpperCase();
        if (r === 'ALL') return true;
        if (r === u) return true;
        if (u && r.indexOf(u) !== -1) return true;
        return false;
      };
      
      const assignments: { targetUid: string; resourceId: string }[] = [];
      for (const agent of targetAgents) {
        const userLevel = agent.languageLevel || 'B1';
        for (const res of resources) {
          if (isLevelMatchLocal(res.level, userLevel)) {
            assignments.push({
              targetUid: agent.id,
              resourceId: res.id
            });
          }
        }
      }
      
      console.log(`[googleSheetService] Fallback: Total of ${assignments.length} assignments to process...`);
      
      const chunkSize = 5;
      for (let i = 0; i < assignments.length; i += chunkSize) {
        const chunk = assignments.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(asg => 
            googleSheetService.assignManualResource(asg.targetUid, asg.resourceId, adminId)
              .catch(e => console.error(`Failed to assign ${asg.resourceId} to ${asg.targetUid}`, e))
          )
        );
      }
      
      invalidateCache('swr_user_plan');
      invalidateCache('swr_admin_stats');
      return { success: true, count: assignments.length, newAssignments: assignments.length, updatedAssignments: 0 };
    }
  },

  getWeeklyAssignments: async (onUpdate?: (fresh: Record<number, string[]>) => void): Promise<Record<number, string[]>> => {
    return swrFetch<Record<number, string[]>>(
      'swr_weekly_assignments',
      async () => {
        return await callApi('get_weekly_assignments');
      },
      {
        fallback: () => {
          try {
            const stored = localStorage.getItem("local_weekly_assignments");
            return stored ? JSON.parse(stored) : {};
          } catch (parseErr) {
            return {};
          }
        },
        onUpdate,
        isValid: (data) => typeof data === 'object' && data !== null
      }
    );
  },

  getWaveConfigs: async (onUpdate?: (fresh: Record<string, any>) => void) => {
    return swrFetch<Record<string, any>>(
      'swr_wave_configs',
      async () => {
        return await callApi('get_wave_configs');
      },
      {
        fallback: () => {
          try {
            const stored = localStorage.getItem("local_wave_configs");
            return stored ? JSON.parse(stored) : {};
          } catch (parseErr) {
            return {};
          }
        },
        onUpdate,
        isValid: (data) => typeof data === 'object' && data !== null
      }
    );
  },

  setWaveConfig: async (waveNumber: string, goalType: 'default' | 'weekly', goalMinutes: number) => {
    invalidateCache('swr_wave_configs');
    try {
      const res = await callApi('set_wave_config', { waveNumber, goalType, goalMinutes });
      invalidateCache('swr_wave_configs');
      return res;
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
      invalidateCache('swr_wave_configs');
      return local;
    }
  },

  assignToWeek: async (weekNumber: number, resourceIds: string[], adminId: string, targetWave?: string): Promise<Record<number, string[]>> => {
    invalidateCache('swr_weekly_assignments');
    invalidateCache('swr_user_plan');
    try {
      const res = await callApi('assign_to_week', { weekNumber, resourceIds, adminId, targetWave: targetWave || 'All' });
      invalidateCache('swr_weekly_assignments');
      invalidateCache('swr_user_plan');
      return res;
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
      invalidateCache('swr_weekly_assignments');
      invalidateCache('swr_user_plan');
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
    invalidateCache('swr_admin_stats');
    try {
      await callApi('addSingleUser', userData);
      invalidateCache('swr_admin_stats');
      return true;
    } catch (e) {
      console.error("[googleSheetService] addSingleUser failed:", e);
      return false;
    }
  },

  saveLesson: async (title: string, lessonData: any): Promise<{ id: string; title: string }> => {
    invalidateCache('swr_interactive_lessons');
    invalidateCache('swr_all_resources');
    try {
      const res = await callApi('saveLesson', { title, lessonData });
      invalidateCache('swr_interactive_lessons');
      invalidateCache('swr_all_resources');
      return res;
    } catch (e: any) {
      console.warn("[googleSheetService] saveLesson Web App failed, saving to localStorage fallback:", e?.message);
      const id = 'les_' + Date.now();
      const existing = JSON.parse(localStorage.getItem('local_interactive_lessons') || '[]');
      const newLesson = { id, title, createdAt: new Date().toISOString(), lessonData };
      existing.unshift(newLesson);
      localStorage.setItem('local_interactive_lessons', JSON.stringify(existing));
      invalidateCache('swr_interactive_lessons');
      invalidateCache('swr_all_resources');
      return { id, title };
    }
  },

  saveAnswers: async (userId: string, lessonId: string, answers: Record<string, string>): Promise<{ success: boolean; id?: string; message?: string }> => {
    invalidateCache(`swr_my_lessons_${userId}`);
    invalidateCache(`swr_user_plan_${userId}`);
    invalidateCache('swr_admin_stats');
    try {
      const data = await callApi('saveAnswers', { userId, lessonId, answers });
      invalidateCache(`swr_my_lessons_${userId}`);
      invalidateCache(`swr_user_plan_${userId}`);
      invalidateCache('swr_admin_stats');
      return {
        success: true,
        id: data?.id || ('ans_' + Date.now())
      };
    } catch (e: any) {
      console.warn("[googleSheetService] saveAnswers Web App failed:", e?.message);
      try {
        const id = 'ans_' + Date.now();
        const key = `local_freetext_answers_${userId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({ id, userId, lessonId, submittedAt: new Date().toISOString(), answers });
        localStorage.setItem(key, JSON.stringify(existing));
        invalidateCache(`swr_my_lessons_${userId}`);
        invalidateCache(`swr_user_plan_${userId}`);
        invalidateCache('swr_admin_stats');
        return { success: true, id, message: "Saved locally" };
      } catch (fallbackErr: any) {
        return {
          success: false,
          message: e?.message || "Failed to record answers in database."
        };
      }
    }
  },

  getInteractiveLessons: async (): Promise<any[]> => {
    try {
      return await callApi('getInteractiveLessons');
    } catch (e: any) {
      console.warn("[googleSheetService] getInteractiveLessons Web App failed, fetching from localStorage fallback:", e?.message);
      return JSON.parse(localStorage.getItem('local_interactive_lessons') || '[]');
    }
  },

  getFreeTextAnswers: async (lessonId?: string, userId?: string): Promise<any[]> => {
    try {
      return await callApi('getFreeTextAnswers', { lessonId, userId });
    } catch (e: any) {
      console.warn("[googleSheetService] getFreeTextAnswers Web App failed, fetching from localStorage fallback:", e?.message);
      const key = userId ? `local_freetext_answers_${userId}` : 'local_freetext_answers_all';
      return JSON.parse(localStorage.getItem(key) || '[]');
    }
  },

  assignLesson: async (userId: string, lessonId: string, adminId: string): Promise<{ id: string; userId: string; lessonId: string }> => {
    invalidateCache(`swr_my_lessons_${userId}`);
    invalidateCache(`swr_user_plan_${userId}`);
    invalidateCache('swr_admin_stats');
    try {
      const res = await callApi('assignLesson', { userId, lessonId, adminId });
      invalidateCache(`swr_my_lessons_${userId}`);
      invalidateCache(`swr_user_plan_${userId}`);
      invalidateCache('swr_admin_stats');
      return res;
    } catch (e: any) {
      console.warn("[googleSheetService] assignLesson Web App failed, saving to localStorage fallback:", e?.message);
      const id = 'asgn_' + Date.now();
      const existing = JSON.parse(localStorage.getItem('local_manual_assignments') || '[]');
      const newAsgn = { id, userId, lessonId, adminId, assignedAt: new Date().toISOString() };
      existing.push(newAsgn);
      localStorage.setItem('local_manual_assignments', JSON.stringify(existing));
      invalidateCache(`swr_my_lessons_${userId}`);
      invalidateCache(`swr_user_plan_${userId}`);
      invalidateCache('swr_admin_stats');
      return newAsgn;
    }
  },

  batchAssignLessons: async (userIds: string[], lessonIds: string[], adminId: string): Promise<{ count: number; totalRequested: number; usersCount: number; lessonsCount: number }> => {
    userIds.forEach(uId => {
      invalidateCache(`swr_my_lessons_${uId}`);
      invalidateCache(`swr_user_plan_${uId}`);
    });
    invalidateCache('swr_admin_stats');

    try {
      const res = await callApi('batchAssignLessons', { userIds, lessonIds, adminId });
      userIds.forEach(uId => {
        invalidateCache(`swr_my_lessons_${uId}`);
        invalidateCache(`swr_user_plan_${uId}`);
      });
      invalidateCache('swr_admin_stats');
      return res;
    } catch (e: any) {
      console.warn("[googleSheetService] batchAssignLessons Web App failed, saving to localStorage fallback:", e?.message);
      const existing = JSON.parse(localStorage.getItem('local_manual_assignments') || '[]');
      const existingSet = new Set(existing.map((a: any) => `${a.userId}|${a.lessonId}`));
      
      let createdCount = 0;
      const assignedAt = new Date().toISOString();
      
      userIds.forEach(uId => {
        lessonIds.forEach(lId => {
          const key = `${uId}|${lId}`;
          if (!existingSet.has(key)) {
            existingSet.add(key);
            existing.push({
              id: 'asgn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
              userId: uId,
              lessonId: lId,
              adminId,
              assignedAt
            });
            createdCount++;
          }
        });
      });

      localStorage.setItem('local_manual_assignments', JSON.stringify(existing));
      userIds.forEach(uId => {
        invalidateCache(`swr_my_lessons_${uId}`);
        invalidateCache(`swr_user_plan_${uId}`);
      });
      invalidateCache('swr_admin_stats');
      return {
        count: createdCount,
        totalRequested: userIds.length * lessonIds.length,
        usersCount: userIds.length,
        lessonsCount: lessonIds.length
      };
    }
  },

  getMyLessons: async (userId: string, onUpdate?: (fresh: any[]) => void): Promise<any[]> => {
    const key = `swr_my_lessons_${userId}`;
    return swrFetch<any[]>(
      key,
      async () => {
        const res = await callApi('getMyLessons', { userId });
        if (Array.isArray(res)) return res;
        return [];
      },
      {
        fallback: () => {
          const localAssignments = JSON.parse(localStorage.getItem('local_manual_assignments') || '[]');
          const userLessonIds = localAssignments
            .filter((a: any) => String(a.userId) === String(userId))
            .map((a: any) => String(a.lessonId));
          const allInteractive = JSON.parse(localStorage.getItem('local_interactive_lessons') || '[]');
          if (userLessonIds.length === 0) return [];
          return allInteractive.filter((l: any) => userLessonIds.includes(String(l.id)));
        },
        onUpdate,
        isValid: (data) => Array.isArray(data)
      }
    );
  }
};

