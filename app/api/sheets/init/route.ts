import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { spreadsheetId } = await request.json();

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'spreadsheetId is required' },
        { status: 400 }
      );
    }

    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({
      access_token: (session.user as any).accessToken,
    });

    const sheets = google.sheets('v4');

    // 기존 탭 확인
    const spreadsheet = await sheets.spreadsheets.get({
      auth: oauth2Client,
      spreadsheetId,
    });

    const existingTabs = spreadsheet.data.sheets?.map(
      (sheet) => sheet.properties?.title
    ) || [];

    const requiredTabs = [
      'Meta_Users',
      'Meta_Accounts',
      'Meta_Categories',
      'Config_Allocation',
      'Ledger',
    ];

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
        auth: oauth2Client,
        spreadsheetId,
        requestBody: {
          requests,
        },
      });
    }

    // 헤더 추가
    const headers: Record<string, string[]> = {
      Meta_Users: ['UserID', 'UserName', 'Role', 'Email'],
      Meta_Accounts: ['AccountID', 'UserID', 'BankName', 'AccountAlias', 'Balance'],
      Meta_Categories: ['CategoryID', 'CategoryName', 'Type'],
      Config_Allocation: ['Alloc_Type', 'Target_Percent', 'Description'],
      Ledger: ['TxID', 'Date', 'UserID', 'AccountID', 'CategoryID', 'Amount', 'Description', 'Timestamp'],
    };

    for (const [sheetName, headerRow] of Object.entries(headers)) {
      const range = `${sheetName}!A1`;
      const values = await sheets.spreadsheets.values.get({
        auth: oauth2Client,
        spreadsheetId,
        range,
      });

      if (!values.data.values || values.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
          auth: oauth2Client,
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [headerRow],
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sheets initialized successfully',
      createdTabs: tabsToCreate,
    });
  } catch (error) {
    console.error('Sheet initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize sheets' },
      { status: 500 }
    );
  }
}
