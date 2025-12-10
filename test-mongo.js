const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://blacky:2419624196@voltura.vl2m5kl.mongodb.net/volData?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('volData');
    
    const collections = ['data', 'sensordatas', 'sensors'];
    
    for (const name of collections) {
        console.log(`--- Collection: ${name} ---`);
        const doc = await db.collection(name).findOne({});
        console.log(JSON.stringify(doc, null, 2));
    }

  } catch (err) {
    console.log(err.stack);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
