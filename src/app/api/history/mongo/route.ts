import { NextResponse } from 'next/server';
import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://blacky:2419624196@voltura.vl2m5kl.mongodb.net/volData?retryWrites=true&w=majority';
const DB_NAME = 'volData';
const COLLECTION_NAME = 'finalVolData';

// Cache the database connection
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  const db = client.db(DB_NAME);
  cachedDb = db;
  return db;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const limit = Math.min(parseInt(searchParams.get('limit') || '2000', 10), 20000);

    const query: Record<string, any> = {};
    if (start || end) {
      query.time = {};
      if (start) query.time.$gte = new Date(start);
      if (end) query.time.$lte = new Date(end);
    }

    const db = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const items = await collection
      .find(query)
      .sort({ time: 1 })
      .limit(limit)
      .toArray();

    const data = items.map((doc) => ({
      _id: doc._id?.toString() ?? '',
      volt: doc.volt ?? 0,
      current1: doc.current1 ?? 0,
      current2: doc.current2 ?? 0,
      current3: doc.current3 ?? 0,
      power1: doc.power1 ?? 0,
      power2: doc.power2 ?? 0,
      power3: doc.power3 ?? 0,
      total_power: doc.total_power ?? doc.watt ?? 0,
      watt: doc.watt ?? doc.total_power ?? 0,
      temperature: doc.temperature ?? 0,
      humidity: doc.humidity ?? 0,
      time: (doc.time instanceof Date ? doc.time : new Date(doc.time)).toISOString(),
    }));

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching history from Mongo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history from Mongo' },
      { status: 500 }
    );
  }
}
