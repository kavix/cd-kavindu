import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://blacky:2419624196@voltura.vl2m5kl.mongodb.net/volData?retryWrites=true&w=majority';
const dbName = 'volData';
const collectionName = 'finalVolData';

let client: MongoClient | null = null;

async function getClient() {
  if (client) return client;
  client = new MongoClient(uri, { maxPoolSize: 5 });
  await client.connect();
  return client;
}

export async function GET() {
  try {
    const mongoClient = await getClient();
    const db = mongoClient.db(dbName);
    const collection = db.collection(collectionName);

    // Fetch the last 50 records, sorted by time (newest first to limit)
    const data = await collection
      .find({})
      .sort({ time: -1 }) // Get newest first
      .limit(50)          // Only get last 50 points
      .toArray();

    // Reverse so the graph draws left-to-right (oldest to newest)
    const sortedData = data.reverse().map((item: any) => {
      let timeValue: string;
      if (item.time instanceof Date) {
        timeValue = item.time.toISOString();
      } else if (item.time && typeof item.time === 'object' && item.time.$date) {
        timeValue = new Date(item.time.$date).toISOString();
      } else if (typeof item.time === 'string') {
        timeValue = new Date(item.time).toISOString();
      } else {
        timeValue = new Date().toISOString();
      }

      return {
        _id: item._id?.toString?.() ?? String(item._id ?? ''),
        volt: item.volt ?? 0,
        current1: item.current1 ?? 0,
        current2: item.current2 ?? 0,
        current3: item.current3 ?? 0,
        power1: item.power1 ?? 0,
        power2: item.power2 ?? 0,
        power3: item.power3 ?? 0,
        total_power: item.total_power ?? item.watt ?? 0,
        watt: item.watt ?? item.total_power ?? 0,
        temperature: item.temperature ?? 0,
        humidity: item.humidity ?? 0,
        time: timeValue,
      } as const;
    });

    return NextResponse.json(sortedData);
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
