
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxmOWRBHkNy6dgvj_HA8QnEQl4TEkDLHgPlSAsvQ_FqeuLDmT4dS_MaTys3Y81E7xdI/exec";

async function callApi(action: string, payload: any = {}) {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'API Error');
    return result.data;
  } catch (error) {
    console.error(`Backend Error [${action}]:`, error);
    throw error;
  }
}

// Fix: Export named submitToSheet for backward compatibility/direct use
export const submitToSheet = (data: any) => callApi('submit_progress_log', data);

export const googleSheetService = {
  login: (email: string, pass: string) => 
    callApi('login', { email, password: pass }),
    
  fetchUserPlan: (uid: string) => 
    callApi('get_user_plan', { uid }),
    
  submitQuizResult: (uid: string, resourceId: string, passed: boolean, score: number) =>
    callApi('submit_progress', { uid, resourceId, passed, score }),
    
  // Admin Actions
  createUser: (userData: any) => 
    callApi('create_user', userData),
    
  importResource: (resourceData: any) => 
    callApi('admin_import_resource', resourceData),
    
  fetchAllUsers: () => 
    callApi('admin_get_users'),
    
  unlockResource: (uid: string, resourceId: string) =>
    callApi('admin_unlock_resource', { uid, resourceId })
};
