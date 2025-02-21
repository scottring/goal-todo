import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with default credentials
initializeApp({
  projectId: "goals-a2d40"
});

const db = getFirestore();

async function clearInvites() {
  try {
    // Delete all documents in pendingHouseholdMembers collection
    const pendingSnapshot = await db.collection('pendingHouseholdMembers').get();
    const batch = db.batch();
    pendingSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log('Cleared pendingHouseholdMembers collection');

    // Find user by email and clear pendingInvites
    const userSnapshot = await db.collection('users')
      .where('email', '==', 'symphonygoals@gmail.com')
      .get();
    
    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      await userDoc.ref.update({
        pendingInvites: []
      });
      console.log('Cleared pendingInvites from user profile');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

clearInvites(); 