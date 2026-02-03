
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxgBQN-meFmv79fyEa7XwEd3hdtXNVvD6i-dURda_hOOYE-inzuoFTFiGrmXBUFCowK/exec";

/**
 * Communicates with Google Apps Script Web App.
 * Uses 'text/plain' Content-Type to avoid CORS preflight (OPTIONS) triggers.
 */
async function callApi(action: string, payload: any = {}) {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ 
        action, 
        timestamp: new Date().toISOString(),
        ...payload 
      }),
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`NETWORK_UNAVAILABLE: HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'GENERAL_BACKEND_FAULT');
    }
    
    return result.data;
  } catch (error) {
    console.error(`[Academy API Failure] Action: ${action}`, error);
    throw error;
  }
}

export const googleSheetService = {
  login: (email: string, pass: string) => 
    callApi('login', { email, password: pass }),
    
  fetchUserPlan: (uid: string) => 
    callApi('get_user_plan', { uid }),
    
  submitQuizResult: (uid: string, resourceId: string, passed: boolean, score: number) =>
    callApi('submit_progress', { uid, resourceId, passed, score }),
    
  createUser: (userData: any) => 
    callApi('create_user', userData),
    
  importResource: (resourceData: any) => 
    callApi('admin_import_resource', resourceData),
    
  fetchAllUsers: () => 
    callApi('admin_get_users'),
    
  unlockResource: (uid: string, resourceId: string) =>
    callApi('admin_unlock_resource', { uid, resourceId })
};
