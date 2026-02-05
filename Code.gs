
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
      // Logic for both single creation and SHL onboarding
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
  
  // Columns: UID, Email, Password, Name, Role, CEFRLevel, SHLData, Date, AssignedCoach
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

// ... (existing helper functions: getUserPlan, fetchAllUsers, etc.)

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
