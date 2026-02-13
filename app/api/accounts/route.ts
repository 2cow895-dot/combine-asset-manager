import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get('spreadsheetId');
    const userId = searchParams.get('userId');

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

    const response = await sheets.spreadsheets.values.get({
      auth: oauth2Client,
      spreadsheetId,
      range: 'Meta_Accounts!A2:E',
    });

    let accounts = (response.data.values || []).map((row) => ({
      accountId: row[0],
      userId: row[1],
      bankName: row[2],
      accountAlias: row[3],
      balance: parseFloat(row[4]) || 0,
    }));

    if (userId) {
      accounts = accounts.filter((acc) => acc.userId === userId);
    }

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Get accounts error:', error);
    return NextResponse.json(
      { error: 'Failed to get accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { spreadsheetId, userId, bankName, accountAlias, balance = 0 } = await request.json();

    if (!spreadsheetId || !userId || !bankName || !accountAlias) {
      return NextResponse.json(
        { error: 'spreadsheetId, userId, bankName, and accountAlias are required' },
        { status: 400 }
      );
    }

    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({
      access_token: (session.user as any).accessToken,
    });

    const sheets = google.sheets('v4');

    const accountId = uuidv4();

    await sheets.spreadsheets.values.append({
      auth: oauth2Client,
      spreadsheetId,
      range: 'Meta_Accounts!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[accountId, userId, bankName, accountAlias, balance]],
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        accountId,
        userId,
        bankName,
        accountAlias,
        balance,
      },
    });
  } catch (error) {
    console.error('Create account error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
