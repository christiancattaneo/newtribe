const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupChannels() {
  try {
    const channelsRef = db.collection('channels');
    const snapshot = await channelsRef.where('id', '>=', 'ai-chat-').where('id', '<', 'ai-chat-\uf8ff').get();
    
    console.log(`Found ${snapshot.size} channels to delete`);
    
    const batch = db.batch();
    snapshot.forEach((doc) => {
      console.log(`Deleting channel: ${doc.id}`);
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log('Cleanup complete');
  } catch (error) {
    console.error('Error cleaning up channels:', error);
  } finally {
    process.exit();
  }
}

cleanupChannels(); 