
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
      res.data = handleBulkImport(ss, json.resources);
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
    grammar: shl.svar?.grammar || 0,
    vocabulary: shl.svar?.vocabulary || 0,
    fluency: shl.svar?.fluency || 0,
    pronunciation: shl.svar?.pronunciation || 0,
    overallSpoken: shl.svar?.overall || 0,
    writing: shl.writex?.grammar || 0,
    content: shl.writex?.content || 0,
    coherence: shl.writex?.coherence || 0,
    testDate: shl.testDate || new Date().toISOString(),
    competencies: shl.competencies?.behavioralIndicators || []
  };

  // Columns: UID, Email, Password, Name, Role, CEFRLevel, SHLData, Date, AssignedCoach, PerformanceMetadata
  sheet.appendRow([
    uid,
    data.email,
    data.password,
    data.name,
    'agent',
    data.cefrLevel,
    JSON.stringify(shl),
    new Date(),
    data.assignedCoach || 'Unassigned',
    JSON.stringify(perfData)
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
      shlData: shl,
      performanceData: perfData,
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

function handleBulkImport(ss, resources) {
  const sheet = ss.getSheetByName('Resources') || ss.insertSheet('Resources');
  const lastRow = sheet.getLastRow();
  
  if (lastRow === 0) {
    sheet.appendRow(['id', 'title', 'url', 'type', 'tags', 'level', 'objective']);
  }
  
  const startTime = new Date().getTime();
  const rows = resources.map((res, index) => [
    'r-' + startTime + '-' + index,
    res.title || 'Untitled Resource',
    res.url || '',
    res.type || 'Hyperlink',
    (res.tags || []).join(','),
    res.level || 'B1',
    res.objective || ''
  ]);
  
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
  }
  
  return { count: rows.length };
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
      performanceData: safeParse(row[mapping['PerformanceMetadata']] || row[mapping['SHLData']]),
      assignedCoach: row[mapping['AssignedCoach']] || 'Unassigned'
    });
  }
  return users;
}

function safeParse(jsonStr) {
  if (!jsonStr) return {};
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return {};
  }
}

function sendResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
