
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxgBQN-meFmv79fyEa7XwEd3hdtXNVvD6i-dURda_hOOYE-inzuoFTFiGrmXBUFCowK/exec";

async function callApi(action: string, payload: any = {}) {
  try {
    // Using 'text/plain' is the gold standard for Google Apps Script 
    // to avoid CORS 'OPTIONS' pre-flight triggers that often fail.
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
      const msg = result.message || '';
      
      // Specifically target the exact error reported by the user
      if (msg.includes("destructure property 'email'") || msg.includes("destructure property 'action'")) {
        throw new Error("BACKEND_PARSING_ERROR: The Google Script is failing to read the 'email' field. You must use the 'Universal Backend Script' provided in the Diagnostic Wizard to handle incoming data safely.");
      }
      
      if (msg.includes("openById") || msg.includes("SpreadsheetApp")) {
        throw new Error("SPREADSHEET_ACCESS_DENIED: The script exists, but it cannot open the Spreadsheet ID. Ensure the ID is correct and you have clicked 'Run' once in the script editor to authorize.");
      }

      throw new Error(result.message || 'GENERAL_BACKEND_FAULT');
    }
    
    return result.data;
  } catch (error) {
    console.error(`[Lufthansa Skillence API Failure] Action: ${action}`, error);
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
