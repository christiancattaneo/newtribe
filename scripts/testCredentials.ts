import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

async function testCredentials() {
  try {
    // Initialize Firebase Admin
    initializeApp({
      credential: cert('./firebase-admin.json'),
    });

    // Test Firestore access
    const db = getFirestore();
    const testDoc = await db.collection('_test_credentials').add({
      timestamp: FieldValue.serverTimestamp(),
      test: 'Credentials working!'
    });

    console.log('✅ Successfully wrote to Firestore with ID:', testDoc.id);
    
    // Clean up test document
    await testDoc.delete();
    console.log('✅ Successfully deleted test document');
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing credentials:', error);
    process.exit(1);
  }
}

testCredentials(); 