// TODO: Ensure your Google Apps Script writes to the sheet below
// Script URL: https://script.google.com/... (Must match your deployment)
const GOOGLE_SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbyprGzdEkwlcIMfgsL6EMyWJG-5jhsRlqBrII_LAAmoG5KVoBirYHz2zodQjhR7La8n/exec'; 

// The Sheet URL where results are stored (for Admin reference)
export const RESULTS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1tqrPvlCpv5uyY0mFR9T0gZ5q5GWCIen2pv6qUPLor6M/edit?gid=0#gid=0';

export interface SheetData {
    type: 'QUIZ_COMPLETION' | 'MODULE_COMPLETION';
    title: string;
    score?: string | number;
    userId?: string;
}

export const submitToSheet = async (data: SheetData) => {
    if (GOOGLE_SCRIPT_URL.includes('PASTE_YOUR_WEB_APP_URL_HERE')) {
        console.warn("Google Sheet integration skipped: URL not configured in googleSheetService.ts");
        return;
    }

    // Determine the target sheet name based on the data type
    // If it is a course/module completion, go to 'course completion', otherwise 'Results'
    const sheetName = data.type === 'MODULE_COMPLETION' ? 'course completion' : 'Results';

    const payload = {
        userId: data.userId || 'Unknown',
        type: data.type,
        title: data.title,
        score: data.score || 'N/A',
        sheetName: sheetName
    };

    try {
        // We use no-cors mode because Google Scripts are on a different domain.
        // This means we won't get a readable response, but the POST will succeed.
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        console.log(`Data submitted to Google Sheet (${sheetName})`);
    } catch (error) {
        console.error("Error submitting to Google Sheet", error);
    }
};