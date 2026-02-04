
const SHEET_ID = '1wJrE03884n8xcFvazJDpylAplWfLco1NV17oGM4J0-A';

function seedSpecialUsers() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Users');
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    sheet.appendRow(['uid', 'name', 'email', 'password', 'role', 'cefrLevel', 'rosterId', 'createdAt', 'shlData']);
  }

  const specialUsers = [
    ['admin-001', 'System Admin', 'admin@tp-skillence.com', 'TPAdmin2026!', 'admin', 'C2', 'MASTER', new Date(), '{}'],
    ['coach-001', 'Lufthansa Coach', 'coach@tp-skillence.com', 'TPCoach2026!', 'coach', 'C1', 'Lufthansa-Main', new Date(), '{}']
  ];

  const data = sheet.getDataRange().getValues();
  const existingEmails = data.map(row => row[2]);

  specialUsers.forEach(user => {
    if (!existingEmails.includes(user[2])) {
      sheet.appendRow(user);
    }
  });
}

function doPost(e) {
  const res = { success: false, message: 'Unknown Error', data: null };
  try {
    const json = JSON.parse(e.postData.contents);
    const action = json.action;
    const ss = SpreadsheetApp.openById(SHEET_ID);

    if (action === 'test_connection') {
      res.success = true;
      res.message = 'System Online';
      return sendResponse(res);
    }

    if (action === 'login') {
      const user = findUser(ss, json.email, json.password);
      if (user) {
        res.success = true;
        res.data = user;
      } else {
        res.message = 'Invalid credentials';
      }
    } else if (action === 'create_user') {
      const newUser = registerUser(ss, json);
      res.success = true;
      res.data = newUser;
    } else if (action === 'get_user_plan') {
      res.data = getUserPlan(ss, json.uid);
      res.success = true;
    } else if (action === 'admin_get_users') {
      res.data = fetchAllUsers(ss);
      res.success = true;
    } else if (action === 'submit_progress') {
      res.data = updateProgress(ss, json.uid, json.resourceId, json.passed, json.score);
      res.success = true;
    } else if (action === 'admin_import_resource') {
      res.data = importResource(ss, json);
      res.success = true;
    }

  } catch (err) {
    res.message = err.toString();
  }
  return sendResponse(res);
}

function findUser(ss, email, password) {
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === email && data[i][3] === password) {
      return {
        id: data[i][0],
        name: data[i][1],
        email: data[i][2],
        role: data[i][4],
        languageLevel: data[i][5],
        rosterId: data[i][6],
        shlData: JSON.parse(data[i][8] || '{}')
      };
    }
  }
  return null;
}

function registerUser(ss, data) {
  const sheet = ss.getSheetByName('Users') || ss.insertSheet('Users');
  const uid = 'u-' + new Date().getTime();
  
  // New column SHLData stores the full nested JSON object
  sheet.appendRow([
    uid,
    data.name,
    data.email,
    data.password,
    'agent',
    data.cefrLevel,
    data.rosterId || 'Default',
    new Date(),
    JSON.stringify(data.shlData || {})
  ]);

  // Persistent Course Mapping (Gap Analysis)
  const resources = generateAndStoreCourseMap(ss, uid, data.shlData);

  return {
    uid: uid,
    userProfile: {
      id: uid,
      name: data.name,
      email: data.email,
      role: 'agent',
      languageLevel: data.cefrLevel,
      shlData: data.shlData
    },
    resources: resources
  };
}

function generateAndStoreCourseMap(ss, uid, shlData) {
  const resourceSheet = ss.getSheetByName('Resources') || ss.insertSheet('Resources');
  const progressSheet = ss.getSheetByName('Progress') || ss.insertSheet('Progress');
  
  if (resourceSheet.getLastRow() < 1) {
    // Header for fallback
    resourceSheet.appendRow(['id', 'title', 'url', 'type', 'tags', 'level', 'objective']);
  }
  
  const resourcesData = resourceSheet.getDataRange().getValues();
  const headers = resourcesData[0];
  const assignedResources = [];

  // Gap Analysis Threshold
  const THRESHOLD = 60;

  for (let i = 1; i < resourcesData.length; i++) {
    const res = {};
    headers.forEach((h, idx) => res[h] = resourcesData[i][idx]);
    
    const tags = (res.tags || "").split(',').map(t => t.trim().toLowerCase());
    let shouldAssign = false;

    // Logic: ALWAYS assign Onboarding
    if (tags.includes('onboarding')) shouldAssign = true;

    // Logic: Gaps in SVAR
    if (shlData.svar) {
      if (shlData.svar.pronunciation < THRESHOLD && tags.includes('pronunciation')) shouldAssign = true;
      if (shlData.svar.vocabulary < THRESHOLD && tags.includes('vocabulary')) shouldAssign = true;
      if (shlData.svar.fluency < THRESHOLD && tags.includes('fluency')) shouldAssign = true;
      if (shlData.svar.grammar < THRESHOLD && tags.includes('grammar')) shouldAssign = true;
    }

    // Logic: Gaps in WriteX
    if (shlData.writex) {
      if (shlData.writex.grammar < THRESHOLD && tags.includes('grammar')) shouldAssign = true;
    }

    if (shouldAssign) {
      progressSheet.appendRow([uid, res.id, 'assigned', 0, 0, new Date()]);
      assignedResources.push({
        ...res,
        progress: { status: 'assigned', attempts: 0, score: 0 }
      });
    }
  }

  SpreadsheetApp.flush();
  return assignedResources;
}

function getUserPlan(ss, uid) {
  const resSheet = ss.getSheetByName('Resources');
  const progSheet = ss.getSheetByName('Progress');
  if (!resSheet || !progSheet) return [];

  const resData = resSheet.getDataRange().getValues();
  const resHeaders = resData[0];
  const progData = progSheet.getDataRange().getValues();

  const userPlan = [];
  for (let i = 1; i < resData.length; i++) {
    const res = {};
    resHeaders.forEach((h, idx) => res[h] = resData[i][idx]);
    
    // Find latest progress row for this user + resource
    let status = 'locked';
    let attempts = 0;
    let score = 0;
    
    for (let j = 1; j < progData.length; j++) {
      if (progData[j][0] === uid && progData[j][1] === res.id) {
        status = progData[j][2];
        attempts = progData[j][3];
        score = progData[j][4];
      }
    }

    // Only return resources that are assigned/open/completed
    if (status !== 'locked') {
      userPlan.push({
        ...res,
        tags: res.tags ? res.tags.split(',') : [],
        progress: { status, attempts, score }
      });
    }
  }
  return userPlan;
}

function updateProgress(ss, uid, resourceId, passed, score) {
  const sheet = ss.getSheetByName('Progress');
  const data = sheet.getDataRange().getValues();
  let foundRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === uid && data[i][1] === resourceId) {
      foundRow = i + 1;
    }
  }

  const newStatus = passed ? 'completed' : 'assigned';
  if (foundRow !== -1) {
    const currentAttempts = data[foundRow-1][3] || 0;
    sheet.getRange(foundRow, 3, 1, 3).setValues([[newStatus, currentAttempts + 1, score]]);
  } else {
    sheet.appendRow([uid, resourceId, newStatus, 1, score, new Date()]);
  }
  
  return { status: newStatus };
}

function importResource(ss, data) {
  const sheet = ss.getSheetByName('Resources') || ss.insertSheet('Resources');
  const id = 'r-' + new Date().getTime();
  sheet.appendRow([
    id,
    data.title,
    data.url,
    data.type,
    data.tags.join(','),
    data.level,
    data.objective
  ]);
  return { id };
}

function fetchAllUsers(ss) {
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const users = [];
  for (let i = 1; i < data.length; i++) {
    const u = {};
    headers.forEach((h, idx) => {
      if (h === 'shlData') u[h] = JSON.parse(data[i][idx] || '{}');
      else u[h] = data[i][idx];
    });
    users.push(u);
  }
  return users;
}

function sendResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
