import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

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
      range: 'Config_Allocation!A2:C',
    });

    const allocations = (response.data.values || []).map((row) => ({
      allocType: row[0],
      targetPercent: parseFloat(row[1]) || 0,
      description: row[2] || '',
    }));

    return NextResponse.json({ allocations });
  } catch (error) {
    console.error('Get allocation error:', error);
    return NextResponse.json(
      { error: 'Failed to get allocation' },
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

    const { spreadsheetId, allocations } = await request.json();

    if (!spreadsheetId || !allocations) {
      return NextResponse.json(
        { error: 'spreadsheetId and allocations are required' },
        { status: 400 }
      );
    }

    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({
      access_token: (session.user as any).accessToken,
    });

    const sheets = google.sheets('v4');

    // 기존 데이터 삭제
    await sheets.spreadsheets.values.clear({
      auth: oauth2Client,
      spreadsheetId,
      range: 'Config_Allocation!A2:C',
    });

    // 새 데이터 추가
    const values = allocations.map((alloc: any) => [
      alloc.allocType,
      alloc.targetPercent,
      alloc.description,
    ]);

    await sheets.spreadsheets.values.append({
      auth: oauth2Client,
      spreadsheetId,
      range: 'Config_Allocation!A2:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    return NextResponse.json({
      success: true,
      allocations,
    });
  } catch (error) {
    console.error('Update allocation error:', error);
    return NextResponse.json(
      { error: 'Failed to update allocation' },
      { status: 500 }
    );
  }
}
