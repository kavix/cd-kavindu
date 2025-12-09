import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'voltura';
const collectionName = process.env.MONGODB_COLLECTION || 'volData';

let client: MongoClient | null = null;

async function getClient() {
  if (client) return client;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  client = new MongoClient(uri, { maxPoolSize: 5 });
  await client.connect();
  return client;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const limit = Math.min(parseInt(searchParams.get('limit') || '2000', 10), 20000);

    const query: Record<string, unknown> = {};
    if (start || end) {
      query.time = {} as Record<string, Date>;
      if (start) (query.time as Record<string, Date>).$gte = new Date(start);
      if (end) (query.time as Record<string, Date>).$lte = new Date(end);
    }

    const mongoClient = await getClient();
    const db = mongoClient.db(dbName);
    const collection = db.collection(collectionName);

    const cursor = collection
      .find(query)
      .sort({ time: 1 })
      .limit(Number.isFinite(limit) ? limit : 2000);

    const items = await cursor.toArray();

    const data = items.map((doc: any) => ({
      volt: doc.volt,
      amps: doc.amps,
      watt: doc.watt,
      temperature: doc.temperature,
      humidity: doc.humidity,
      time: doc.time instanceof Date ? doc.time.toISOString() : doc.time,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching history from Mongo:', error);
    return NextResponse.json({ error: 'Failed to fetch history from Mongo' }, { status: 500 });
  }
}
