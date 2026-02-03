
const SHEET_ID = '1wJrE03884n8xcFvazJDpylAplWfLco1NV17oGM4J0-A';

/**
 * MANUAL ACTION: Run this function in the Apps Script editor 
 * to seed the required Admin and Coach accounts.
 */
function seedSpecialUsers() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Users');
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    sheet.appendRow(['uid', 'name', 'email', 'password', 'role', 'cefrLevel', 'rosterId', 'createdAt']);
  }

  const specialUsers = [
    ['admin-001', 'System Admin', 'admin@tp-skillence.com', 'TPAdmin2026!', 'admin', 'C2', 'MASTER', new Date()],
    ['coach-001', 'Lufthansa Coach', 'coach@tp-skillence.com', 'TPCoach2026!', 'coach', 'C1', 'Lufthansa-Main', new Date()]
  ];

  const data = sheet.getDataRange().getValues();
  const existingEmails = data.map(row => row[2]);

  specialUsers.forEach(user => {
    if (!existingEmails.includes(user[2])) {
      sheet.appendRow(user);
      Logger.log('Seeded user: ' + user[2]);
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
      res.data = newUser; // Returns atomic { uid, userProfile, resources }
    } else if (action === 'get_user_plan') {
      res.data = getUserPlan(ss, json.uid);
      res.success = true;
    } else if (action === 'admin_get_users') {
      res.data = fetchAllUsers(ss);
      res.success = true;
    }
    // Add other actions (submit_progress, admin_import_resource) as needed...

  } catch (err) {
    res.message = err.toString();
  }
  return sendResponse(res);
}

function findUser(ss, email, password) {
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === email && data[i][3] === password) {
      return {
        id: data[i][0],
        name: data[i][1],
        email: data[i][2],
        role: data[i][4],
        languageLevel: data[i][5],
        rosterId: data[i][6]
      };
    }
  }
  return null;
}

function registerUser(ss, data) {
  const sheet = ss.getSheetByName('Users');
  const uid = 'u-' + new Date().getTime();
  sheet.appendRow([
    uid,
    data.name,
    data.email,
    data.password,
    'agent',
    data.cefrLevel,
    data.rosterId || 'Default',
    new Date()
  ]);

  // Atomic response: Create default resources and return them
  const resources = initializeResources(ss, uid, data.cefrLevel);
  return {
    uid: uid,
    userProfile: {
      id: uid,
      name: data.name,
      email: data.email,
      role: 'agent',
      languageLevel: data.cefrLevel
    },
    resources: resources
  };
}

function initializeResources(ss, uid, level) {
  // Mocking resource initialization for atomic response
  // In real app, this would query a 'GlobalResources' sheet and filter by level
  return []; 
}

function sendResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
