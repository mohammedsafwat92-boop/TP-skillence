
const SHEET_ID = '1wJrE03884n8xcFvazJDpylAplWfLco1NV17oGM4J0-A';

function seedSpecialUsers() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Users');
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    // Updated Header schema based on Architect requirement:
    // [UID, Email, Password, Name, Role, CEFRLevel, SHLData, Date, AssignedCoach]
    sheet.appendRow(['UID', 'Email', 'Password', 'Name', 'Role', 'CEFRLevel', 'SHLData', 'Date', 'AssignedCoach']);
  }

  const specialUsers = [
    ['admin-001', 'admin@tp-skillence.com', 'TPAdmin2026!', 'System Admin', 'admin', 'C2', '{}', new Date(), 'System'],
    ['coach-001', 'coach@tp-skillence.com', 'TPCoach2026!', 'Lufthansa Coach', 'coach', 'C1', '{}', new Date(), 'System']
  ];

  const data = sheet.getDataRange().getValues();
  const existingEmails = data.map(row => row[1]); // Email is at index 1 now

  specialUsers.forEach(user => {
    if (!existingEmails.includes(user[1])) {
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
    // Structure: [UID, Email, Password, Name, Role, CEFRLevel, SHLData, Date, AssignedCoach]
    if (data[i][1] === email && data[i][2] === password) {
      return {
        id: data[i][0],
        email: data[i][1],
        name: data[i][3],
        role: data[i][4],
        languageLevel: data[i][5],
        shlData: JSON.parse(data[i][6] || '{}'),
        assignedCoach: data[i][8] || 'Unassigned'
      };
    }
  }
  return null;
}

function registerUser(ss, data) {
  const sheet = ss.getSheetByName('Users') || ss.insertSheet('Users');
  const uid = 'u-' + new Date().getTime();
  
  // Structure: [UID, Email, Password, Name, Role, CEFRLevel, SHLData, Date, AssignedCoach]
  sheet.appendRow([
    uid,
    data.email,
    data.password,
    data.name,
    'agent',
    data.cefrLevel,
    JSON.stringify(data.shlData || {}),
    new Date(),
    data.assignedCoach || 'Unassigned'
  ]);

  const assignedResources = generateAndStoreCourseMap(ss, uid, data.shlData);

  return {
    uid: uid,
    userProfile: {
      id: uid,
      email: data.email,
      name: data.name,
      role: 'agent',
      languageLevel: data.cefrLevel,
      shlData: data.shlData,
      assignedCoach: data.assignedCoach || 'Unassigned'
    },
    resources: assignedResources
  };
}

function generateAndStoreCourseMap(ss, uid, shlData) {
  const resourceSheet = ss.getSheetByName('Resources') || ss.insertSheet('Resources');
  const progressSheet = ss.getSheetByName('Progress') || ss.insertSheet('Progress');
  
  if (resourceSheet.getLastRow() < 1) {
    resourceSheet.appendRow(['id', 'title', 'url', 'type', 'tags', 'level', 'objective']);
  }
  
  const resourcesData = resourceSheet.getDataRange().getValues();
  const headers = resourcesData[0];
  const assignedList = [];

  const THRESHOLD = 60;
  const targetTags = ['onboarding'];
  
  if (shlData && shlData.svar) {
    if (shlData.svar.pronunciation < THRESHOLD) targetTags.push('pronunciation');
    if (shlData.svar.fluency < THRESHOLD) targetTags.push('fluency');
    if (shlData.svar.grammar < THRESHOLD) targetTags.push('grammar');
    if (shlData.svar.vocabulary < THRESHOLD) targetTags.push('vocabulary');
  }
  
  if (shlData && shlData.writex) {
    if (shlData.writex.grammar < THRESHOLD && !targetTags.includes('grammar')) {
      targetTags.push('grammar');
    }
  }

  for (let i = 1; i < resourcesData.length; i++) {
    const res = {};
    headers.forEach((h, idx) => res[h] = resourcesData[i][idx]);
    
    const resTags = (res.tags || "").split(',').map(t => t.trim().toLowerCase());
    const isMatch = resTags.some(tag => targetTags.includes(tag));

    if (isMatch) {
      progressSheet.appendRow([uid, res.id, 'assigned', 0, 0, new Date()]);
      assignedList.push({
        ...res,
        tags: resTags,
        progress: { status: 'assigned', attempts: 0, score: 0 }
      });
    }
  }

  SpreadsheetApp.flush();
  return assignedList;
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
    
    let match = null;
    for (let j = 1; j < progData.length; j++) {
      if (progData[j][0] === uid && progData[j][1] === res.id) {
        match = {
          status: progData[j][2],
          attempts: progData[j][3],
          score: progData[j][4]
        };
        break;
      }
    }

    if (match && (match.status === 'assigned' || match.status === 'open' || match.status === 'completed')) {
      userPlan.push({
        ...res,
        tags: (res.tags || "").split(',').map(t => t.trim()),
        progress: match
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
      break;
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
    (data.tags || []).join(','),
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
    // Structure: [UID, Email, Password, Name, Role, CEFRLevel, SHLData, Date, AssignedCoach]
    // UID: 0, Email: 1, Pwd: 2, Name: 3, Role: 4, CEFR: 5, SHL: 6, Date: 7, Coach: 8
    u.id = data[i][0];
    u.email = data[i][1];
    u.name = data[i][3];
    u.role = data[i][4];
    u.languageLevel = data[i][5];
    try { u.shlData = JSON.parse(data[i][6] || '{}'); } catch(e) { u.shlData = {}; }
    u.assignedCoach = data[i][8] || 'Unassigned';
    users.push(u);
  }
  return users;
}

function sendResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
