import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const sheets = google.sheets('v4');

export interface SheetConfig {
  spreadsheetId: string;
  auth: OAuth2Client;
}

/**
 * Google Sheets 탭 자동 생성
 */
export async function ensureSheetTabs(config: SheetConfig) {
  const { spreadsheetId, auth } = config;

  const requiredTabs = [
    'Meta_Users',
    'Meta_Accounts',
    'Meta_Categories',
    'Config_Allocation',
    'Ledger',
  ];

  try {
    const spreadsheet = await sheets.spreadsheets.get({
      auth,
      spreadsheetId,
    });

    const existingTabs = spreadsheet.data.sheets?.map((sheet) => sheet.properties?.title) || [];

    const tabsToCreate = requiredTabs.filter((tab) => !existingTabs.includes(tab));

    if (tabsToCreate.length > 0) {
      const requests = tabsToCreate.map((title) => ({
        addSheet: {
          properties: {
            title,
            gridProperties: {
              rowCount: 1000,
              columnCount: 20,
            },
          },
        },
      }));

      await sheets.spreadsheets.batchUpdate({
        auth,
        spreadsheetId,
        requestBody: {
          requests,
        },
      });

      // 헤더 행 추가
      await initializeSheetHeaders(config);
    }
  } catch (error) {
    console.error('Failed to ensure sheet tabs:', error);
    throw error;
  }
}

/**
 * 시트 헤더 초기화
 */
async function initializeSheetHeaders(config: SheetConfig) {
  const { spreadsheetId, auth } = config;

  const headers: Record<string, string[]> = {
    Meta_Users: ['UserID', 'UserName', 'Role', 'Email'],
    Meta_Accounts: ['AccountID', 'UserID', 'BankName', 'AccountAlias', 'Balance'],
    Meta_Categories: ['CategoryID', 'CategoryName', 'Type'],
    Config_Allocation: ['Alloc_Type', 'Target_Percent', 'Description'],
    Ledger: ['TxID', 'Date', 'UserID', 'AccountID', 'CategoryID', 'Amount', 'Description', 'Timestamp'],
  };

  const requests = Object.entries(headers).map(([_sheetName, headerRow]) => ({
    appendCells: {
      sheetId: 0,
      rows: [
        {
          values: headerRow.map((header) => ({
            userEnteredValue: {
              stringValue: header,
            },
          })),
        },
      ],
      fields: 'userEnteredValue',
    },
  })) as any[];

  try {
    await sheets.spreadsheets.batchUpdate({
      auth,
      spreadsheetId,
      requestBody: {
        requests,
      },
    });
  } catch (error) {
    console.error('Failed to initialize sheet headers:', error);
  }
}

/**
 * 데이터 읽기
 */
export async function readSheet(
  config: SheetConfig,
  range: string
): Promise<any[][]> {
  const { spreadsheetId, auth } = config;

  try {
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  } catch (error) {
    console.error(`Failed to read sheet ${range}:`, error);
    return [];
  }
}

/**
 * 데이터 쓰기
 */
export async function appendSheet(
  config: SheetConfig,
  range: string,
  values: any[][]
): Promise<void> {
  const { spreadsheetId, auth } = config;

  try {
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
  } catch (error) {
    console.error(`Failed to append to sheet ${range}:`, error);
    throw error;
  }
}

/**
 * 데이터 업데이트
 */
export async function updateSheet(
  config: SheetConfig,
  range: string,
  values: any[][]
): Promise<void> {
  const { spreadsheetId, auth } = config;

  try {
    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
  } catch (error) {
    console.error(`Failed to update sheet ${range}:`, error);
    throw error;
  }
}

/**
 * 데이터 삭제
 */
export async function deleteSheet(
  config: SheetConfig,
  range: string
): Promise<void> {
  const { spreadsheetId, auth } = config;

  try {
    await sheets.spreadsheets.values.clear({
      auth,
      spreadsheetId,
      range,
    });
  } catch (error) {
    console.error(`Failed to delete sheet ${range}:`, error);
    throw error;
  }
}
