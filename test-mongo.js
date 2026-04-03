const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI env var.');
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const dbName = process.env.MONGODB_DB || 'volData';
    const db = client.db(dbName);

    const collectionName = process.env.MONGODB_COLLECTION || 'finalVolData';
    console.log(`--- Collection: ${collectionName} ---`);
    const doc = await db.collection(collectionName).findOne({});
    console.log(JSON.stringify(doc, null, 2));

  } catch (err) {
    console.log(err.stack);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
