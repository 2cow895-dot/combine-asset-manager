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
      range: 'Meta_Users!A2:D',
    });

    const users = (response.data.values || []).map((row) => ({
      userId: row[0],
      userName: row[1],
      role: row[2],
      email: row[3],
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to get users' },
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

    const { spreadsheetId, userName, role = 'User', email } = await request.json();

    if (!spreadsheetId || !userName) {
      return NextResponse.json(
        { error: 'spreadsheetId and userName are required' },
        { status: 400 }
      );
    }

    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({
      access_token: (session.user as any).accessToken,
    });

    const sheets = google.sheets('v4');

    const userId = uuidv4();

    await sheets.spreadsheets.values.append({
      auth: oauth2Client,
      spreadsheetId,
      range: 'Meta_Users!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[userId, userName, role, email || '']],
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        userId,
        userName,
        role,
        email: email || '',
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
