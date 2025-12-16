const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://blacky:2419624196@voltura.vl2m5kl.mongodb.net/volData?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('volData');

    const collectionName = 'finalVolData';
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
