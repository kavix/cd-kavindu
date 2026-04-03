import { NextResponse } from 'next/server';

import { buildBackendUrl } from '@/lib/backend';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const limitRaw = searchParams.get('limit');
    const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : 1000;
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 1000) : 1000;

    const response = await fetch(
      buildBackendUrl('/history', {
        start: start || undefined,
        end: end || undefined,
        limit,
      }),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : [];

    // FastAPI returns newest first; reverse to keep chronological order for charts.
    return NextResponse.json(items.slice().reverse(), {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
