
const SHEET_ID = '1wJrE03884n8xcFvazJDpylAplWfLco1NV17oGM4J0-A';

function doPost(e) {
  const res = { success: false, message: 'Unknown Error', data: null };
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No payload received by backend.");
    }

    const json = JSON.parse(e.postData.contents);
    const action = json.action;
    const ss = SpreadsheetApp.openById(SHEET_ID);

    if (action === 'test_connection') {
      res.success = true;
      res.message = 'System Online';
    } else if (action === 'login') {
      const user = findUser(ss, json.email, json.password);
      if (user) {
        res.success = true;
        res.data = user;
      } else {
        res.message = 'Invalid credentials';
      }
    } else if (action === 'create_user') {
      res.data = registerUser(ss, json);
      res.success = true;
    } else if (action === 'get_user_plan') {
      res.data = getUserPlan(ss, json.uid);
      res.success = true;
    } else if (action === 'get_all_resources') {
      res.data = getAllResources(ss);
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
    } else if (action === 'bulk_import_resources') {
      const result = handleBulkImport(ss, json.resources);
      res.data = result;
      res.success = true;
    }

  } catch (err) {
    res.message = err.toString();
    console.error("Critical Backend Failure:", err);
  }
  return sendResponse(res);
}

/**
 * Helper to safely parse JSON strings from the spreadsheet
 */
function safeParse(str) {
  if (!str) return {};
  try {
    return typeof str === 'string' ? JSON.parse(str) : str;
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return {};
  }
}

/**
 * Flexible Level Match Logic
 * Handles exact matches, 'All', and ranges like 'B1-B2'
 */
function isLevelMatch(resourceLevel, userLevel) {
  const r = String(resourceLevel || 'All').toUpperCase();
  const u = String(userLevel || '').toUpperCase();
  
  if (r === 'ALL') return true;
  if (r === u) return true;
  // Check if user level is contained within a range (e.g. "B2" is in "B1-B2")
  if (u && r.indexOf(u) !== -1) return true;
  
  return false;
}

/**
 * Returns a filtered and merged user plan with flexible level mapping.
 */
function getUserPlan(ss, uid) {
  const userSheet = ss.getSheetByName('Users');
  const resSheet = ss.getSheetByName('Resources');
  const progSheet = ss.getSheetByName('Progress');
  
  if (!userSheet || !resSheet) return [];

  // 1. Resolve User's Current Level
  const userData = userSheet.getDataRange().getValues();
  const userHeaders = userData[0];
  const uidIdx = userHeaders.indexOf('UID');
  const cefrIdx = userHeaders.indexOf('CEFRLevel');
  
  let userLevel = '';
  for (let i = 1; i < userData.length; i++) {
    if (String(userData[i][uidIdx]) === String(uid)) {
      userLevel = String(userData[i][cefrIdx]);
      break;
    }
  }

  // 2. Get All Resources and User Progress Data
  const resData = resSheet.getDataRange().getValues();
  const resHeaders = resData[0].map(h => h.toLowerCase());
  const progData = progSheet ? progSheet.getDataRange().getValues() : [];

  const userPlan = [];

  const idIdx = resHeaders.indexOf('id');
  const titleIdx = resHeaders.indexOf('title');
  const urlIdx = resHeaders.indexOf('url');
  const typeIdx = resHeaders.indexOf('type');
  const tagsIdx = resHeaders.indexOf('tags');
  const levelIdx = resHeaders.indexOf('level');
  const objectiveIdx = resHeaders.indexOf('objective');

  for (let i = 1; i < resData.length; i++) {
    const resRow = resData[i];
    const resourceLevel = resRow[levelIdx];
    
    // FLEXIBLE FILTER: Support ranges and "All"
    if (!isLevelMatch(resourceLevel, userLevel)) {
      continue;
    }

    // 3. Left-Join Progress Data
    let progress = { status: 'assigned', attempts: 0, score: 0 };
    if (progData.length > 1) {
      for (let j = 1; j < progData.length; j++) {
        const pUid = String(progData[j][0]);
        const pResId = String(progData[j][1]);
        if (pUid === String(uid) && pResId === String(resRow[idIdx])) {
          progress = { 
            status: progData[j][2], 
            attempts: progData[j][3], 
            score: progData[j][4] 
          };
          break;
        }
      }
    }

    userPlan.push({
      id: String(resRow[idIdx]),
      title: String(resRow[titleIdx]),
      url: String(resRow[urlIdx]),
      type: String(resRow[typeIdx]),
      tags: String(resRow[tagsIdx] || "").split(',').filter(Boolean),
      level: String(resRow[levelIdx] || 'All'),
      objective: String(resRow[objectiveIdx] || ''),
      progress: progress
    });
  }
  return userPlan;
}

function findUser(ss, email, password) {
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const mapping = {};
  headers.forEach((h, i) => mapping[h] = i);
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][mapping['Email']] === email && data[i][mapping['Password']] === password) {
      return {
        id: data[i][mapping['UID']],
        email: data[i][mapping['Email']],
        name: data[i][mapping['Name']],
        role: data[i][mapping['Role']],
        languageLevel: data[i][mapping['CEFRLevel']],
        shlData: safeParse(data[i][mapping['SHLData']]), 
        assignedCoach: data[i][mapping['AssignedCoach']] || 'Unassigned',
        performanceData: safeParse(data[i][mapping['PerformanceData']])
      };
    }
  }
  return null;
}

function registerUser(ss, data) {
  const sheet = ss.getSheetByName('Users') || ss.insertSheet('Users');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['UID', 'Email', 'Password', 'Name', 'Role', 'CEFRLevel', 'SHLData', 'CreatedDate', 'AssignedCoach', 'PerformanceData']);
  }
  const uid = 'u-' + new Date().getTime();
  
  const shl = data.shlData || {};
  const perfData = {
    grammar: shl.writex?.grammar || shl.svar?.grammar || 0,
    vocabulary: shl.writex?.vocabulary || shl.svar?.vocabulary || 0,
    fluency: shl.svar?.fluency || 0,
    pronunciation: shl.svar?.pronunciation || 0,
    activeListening: shl.svar?.activeListening || 0,
    overallSpoken: shl.svar?.overall || 0,
    testDate: new Date().toISOString()
  };

  sheet.appendRow([
    uid,
    data.email,
    data.password || 'TpSkill2026!',
    data.name,
    'agent',
    data.cefrLevel || 'B1',
    JSON.stringify(shl),
    new Date(),
    data.assignedCoach || 'Unassigned',
    JSON.stringify(perfData)
  ]);

  return {
    uid: uid,
    userProfile: { 
      id: uid, 
      ...data, 
      role: 'agent', 
      performanceData: perfData 
    }
  };
}

function updateProgress(ss, uid, resourceId, passed, score) {
  const sheet = ss.getSheetByName('Progress') || ss.insertSheet('Progress');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['UID', 'ResourceID', 'Status', 'Attempts', 'Score', 'LastAttempt']);
  }
  const data = sheet.getDataRange().getValues();
  let foundRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(uid) && String(data[i][1]) === String(resourceId)) {
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

function getAllResources(ss) {
  const sheet = ss.getSheetByName('Resources');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toLowerCase());
  
  const resources = [];
  for (let i = 1; i < data.length; i++) {
    const res = {};
    headers.forEach((h, idx) => res[h] = data[i][idx]);
    resources.push({
      id: String(res.id),
      title: String(res.title),
      url: String(res.url),
      type: String(res.type),
      tags: String(res.tags || "").split(',').filter(Boolean),
      level: String(res.level || 'All'),
      objective: String(res.objective || ''),
      progress: { status: 'assigned', attempts: 0, score: 0 }
    });
  }
  return resources;
}

function sendResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handleBulkImport(ss, resources) {
  if (!Array.isArray(resources)) throw new Error("Resources must be an array.");
  let sheet = ss.getSheetByName('Resources') || ss.insertSheet('Resources');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'title', 'url', 'type', 'tags', 'level', 'objective']);
  }
  
  const timestamp = new Date().getTime();
  const dataToPush = resources.map((res, index) => [
    String(res.id || 'r-' + timestamp + '-' + index),
    String(res.title || 'Untitled'),
    String(res.url || '').trim(),
    String(res.type || 'Article'),
    Array.isArray(res.tags) ? res.tags.join(',') : String(res.tags || 'General'),
    String(res.level || 'All'),
    String(res.objective || 'N/A')
  ]);
  
  sheet.getRange(sheet.getLastRow() + 1, 1, dataToPush.length, 7).setValues(dataToPush);
  SpreadsheetApp.flush();
  return { count: dataToPush.length, status: 'Success' };
}

function fetchAllUsers(ss) {
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const users = [];
  const mapping = {};
  headers.forEach((h, i) => mapping[h] = i);
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    users.push({
      id: row[mapping['UID']],
      email: row[mapping['Email']],
      name: row[mapping['Name']],
      role: row[mapping['Role']],
      languageLevel: row[mapping['CEFRLevel']],
      shlData: safeParse(row[mapping['SHLData']]),
      assignedCoach: row[mapping['AssignedCoach']] || 'Unassigned',
      performanceData: safeParse(row[mapping['PerformanceData']])
    });
  }
  return users;
}
