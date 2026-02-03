
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxgBQN-meFmv79fyEa7XwEd3hdtXNVvD6i-dURda_hOOYE-inzuoFTFiGrmXBUFCowK/exec";

/**
 * Communicates with Google Apps Script Web App.
 * Strictly validates that the backend returns valid JSON.
 */
async function callApi(action: string, payload: any = {}) {
  const requestBody = JSON.stringify({ 
    action, 
    timestamp: new Date().toISOString(),
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

    // Capture as text first to debug stale deployments
    const rawText = await response.text();
    
    let json;
    try {
      json = JSON.parse(rawText);
    } catch (parseError) {
      console.error("STALE_DEPLOYMENT_DETECTED: Backend returned non-JSON text.");
      console.error("RAW_RESPONSE_BODY:", rawText);
      throw new Error("DEPLOYMENT_MISMATCH: Backend returned a string instead of JSON. Please redeploy Google Apps Script as a 'New Version'.");
    }

    if (!json.success) {
      console.error(`[Academy API Error] ${action}:`, json.message);
      throw new Error(json.message || 'GENERAL_BACKEND_FAULT');
    }
    
    return json.data;
  } catch (error) {
    console.error(`[CallStack] Action: ${action}`, error);
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
