import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://13.203.221.0';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Health check failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error checking health:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

