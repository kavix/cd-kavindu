import { NextResponse } from 'next/server';
import { buildBackendUrl } from '@/lib/backend';

export async function GET() {
  try {
    const response = await fetch(buildBackendUrl('/history', { limit: 50 }), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sensors' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : [];

    // FastAPI returns newest first; reverse so charts draw oldest -> newest.
    return NextResponse.json(items.slice().reverse());
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
