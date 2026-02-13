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
      range: 'Meta_Categories!A2:C',
    });

    const categories = (response.data.values || []).map((row) => ({
      categoryId: row[0],
      categoryName: row[1],
      type: row[2],
    }));

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Failed to get categories' },
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

    const { spreadsheetId, categoryName, type } = await request.json();

    if (!spreadsheetId || !categoryName || !type) {
      return NextResponse.json(
        { error: 'spreadsheetId, categoryName, and type are required' },
        { status: 400 }
      );
    }

    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({
      access_token: (session.user as any).accessToken,
    });

    const sheets = google.sheets('v4');

    const categoryId = uuidv4();

    await sheets.spreadsheets.values.append({
      auth: oauth2Client,
      spreadsheetId,
      range: 'Meta_Categories!A:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[categoryId, categoryName, type]],
      },
    });

    return NextResponse.json({
      success: true,
      category: {
        categoryId,
        categoryName,
        type,
      },
    });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
