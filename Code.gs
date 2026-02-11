
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
 * Robust High-Performance Batch Writer
 * Includes dimension validation and explicit sheet preparation.
 */
function handleBulkImport(ss, resources) {
  if (!Array.isArray(resources)) {
    throw new Error("Payload Error: Resources must be an array.");
  }

  if (resources.length === 0) {
    return { count: 0, message: 'Empty payload, nothing to write.' };
  }

  let sheet = ss.getSheetByName('Resources');
  if (!sheet) {
    sheet = ss.insertSheet('Resources');
    sheet.appendRow(['id', 'title', 'url', 'type', 'tags', 'level', 'objective']);
  }
  
  const lastRow = sheet.getLastRow();
  const timestamp = new Date().getTime();
  
  // Create 2D array for batch writing with 7-column validation
  const dataToPush = resources.map((res, index) => {
    // Force exactly 7 columns to prevent Range errors
    return [
      String(res.id || 'r-' + timestamp + '-' + index),
      String(res.title || 'Untitled Resource'),
      String(res.url || '').trim(),
      String(res.type || 'Article'),
      Array.isArray(res.tags) ? res.tags.join(',') : String(res.tags || 'General'),
      String(res.level || 'All'),
      String(res.objective || 'No objective provided')
    ];
  });
  
  try {
    // Write entire block in one operation
    const range = sheet.getRange(lastRow + 1, 1, dataToPush.length, 7);
    range.setValues(dataToPush);
    
    // Ensure data is committed before returning
    SpreadsheetApp.flush();
    return { count: dataToPush.length, status: 'Success' };
  } catch (e) {
    console.error("Batch Write Error:", e);
    throw new Error(`Registry Range Error: ${e.toString()}`);
  }
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
        assignedCoach: data[i][mapping['AssignedCoach']] || 'Unassigned'
      };
    }
  }
  return null;
}

function registerUser(ss, data) {
  const sheet = ss.getSheetByName('Users') || ss.insertSheet('Users');
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
    userProfile: { id: uid, ...data, role: 'agent' }
  };
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
    resHeaders.forEach((h, idx) => res[h.toLowerCase()] = resData[i][idx]);
    
    let match = null;
    for (let j = 1; j < progData.length; j++) {
      if (progData[j][0] === uid && progData[j][1] === res.id) {
        match = { status: progData[j][2], attempts: progData[j][3], score: progData[j][4] };
        break;
      }
    }

    if (match || i < 10) { // Fallback for new users
      userPlan.push({
        ...res,
        tags: (res.tags || "").split(',').filter(Boolean),
        progress: match || { status: 'assigned', attempts: 0, score: 0 }
      });
    }
  }
  return userPlan;
}

function updateProgress(ss, uid, resourceId, passed, score) {
  const sheet = ss.getSheetByName('Progress') || ss.insertSheet('Progress');
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
      assignedCoach: row[mapping['AssignedCoach']] || 'Unassigned'
    });
  }
  return users;
}

function safeParse(jsonStr) {
  if (!jsonStr) return {};
  try { return JSON.parse(jsonStr); } catch (e) { return {}; }
}

function sendResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
