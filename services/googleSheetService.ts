
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxgBQN-meFmv79fyEa7XwEd3hdtXNVvD6i-dURda_hOOYE-inzuoFTFiGrmXBUFCowK/exec";

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
    
  fetchUserPlan: async (uid: string) => {
    return await callApi('get_user_plan', { uid });
  },

  fetchGlobalResources: async () => {
    return await callApi('get_all_resources');
  },
    
  createUser: (userData: any): Promise<{ uid: string; userProfile: any; resources: any[] }> => 
    callApi('create_user', userData),
    
  fetchAllUsers: () => 
    callApi('admin_get_users'),
    
  submitQuizResult: (uid: string, resourceId: string, passed: boolean, score: number) =>
    callApi('submit_progress', { uid, resourceId, passed, score }),

  importResource: (resourceData: any) => 
    callApi('admin_import_resource', resourceData),

  bulkImportResources: (resources: any[]) => {
    console.log(`[googleSheetService] Bulk Import Payload Size: ${resources.length} units`);
    return callApi('bulk_import_resources', { resources });
  },

  unlockResource: (uid: string, resourceId: string) =>
    callApi('admin_unlock_resource', { uid, resourceId })
};
