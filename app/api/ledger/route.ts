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
    const month = searchParams.get('month');

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
      range: 'Ledger!A2:H',
    });

    let transactions = (response.data.values || []).map((row) => ({
      txId: row[0],
      date: row[1],
      userId: row[2],
      accountId: row[3],
      categoryId: row[4],
      amount: parseFloat(row[5]) || 0,
      description: row[6],
      timestamp: row[7],
    }));

    if (userId) {
      transactions = transactions.filter((tx) => tx.userId === userId);
    }

    if (month) {
      transactions = transactions.filter((tx) => tx.date.startsWith(month));
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Get ledger error:', error);
    return NextResponse.json(
      { error: 'Failed to get ledger' },
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

    const {
      spreadsheetId,
      date,
      userId,
      accountId,
      categoryId,
      amount,
      description,
    } = await request.json();

    if (!spreadsheetId || !date || !userId || !accountId || !categoryId || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({
      access_token: (session.user as any).accessToken,
    });

    const sheets = google.sheets('v4');

    const txId = uuidv4();
    const timestamp = new Date().toISOString();

    await sheets.spreadsheets.values.append({
      auth: oauth2Client,
      spreadsheetId,
      range: 'Ledger!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[txId, date, userId, accountId, categoryId, amount, description || '', timestamp]],
      },
    });

    return NextResponse.json({
      success: true,
      transaction: {
        txId,
        date,
        userId,
        accountId,
        categoryId,
        amount,
        description: description || '',
        timestamp,
      },
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
