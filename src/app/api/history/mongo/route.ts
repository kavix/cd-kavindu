import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://blacky:2419624196@voltura.vl2m5kl.mongodb.net/volData?retryWrites=true&w=majority';
const dbName = 'volData';
const collectionName = 'sensors';

let client: MongoClient | null = null;

async function getClient() {
  if (client) return client;
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

    const data = items.map((doc: any) => {
      // Handle both direct Date objects and MongoDB $date format
      let timeValue: string;
      if (doc.time instanceof Date) {
        timeValue = doc.time.toISOString();
      } else if (doc.time && typeof doc.time === 'object' && doc.time.$date) {
        timeValue = new Date(doc.time.$date).toISOString();
      } else if (typeof doc.time === 'string') {
        timeValue = new Date(doc.time).toISOString();
      } else {
        timeValue = new Date().toISOString();
      }

      return {
        volt: doc.volt || 0,
        amps: doc.amps || 0,
        watt: doc.watt || 0,
        temperature: doc.temperature || 0,
        humidity: doc.humidity || 0,
        time: timeValue,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching history from Mongo:', error);
    return NextResponse.json({ error: 'Failed to fetch history from Mongo' }, { status: 500 });
  }
}
