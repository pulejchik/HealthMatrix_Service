import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Initialize Firebase Admin SDK
 * This should be called once at the start of the application
 */
export function initializeFirebase(): void {
  if (admin.apps.length === 0) {
    // Try to load service account key (works in both local and production)
    const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      console.log('🔑 Initializing with service account key');
      const serviceAccount = require('../../serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn('⚠️  Service account key not found at:', serviceAccountPath);
      console.warn('📝 Download from: https://console.firebase.google.com/project/hmatrix-13d91/settings/serviceaccounts/adminsdk');
      console.warn('💾 Save as: functions/serviceAccountKey.json');
      console.warn('🚨 createCustomToken() will NOT work without this file!');
      
      // Fallback to default initialization (will fail for createCustomToken)
      admin.initializeApp();
    }
  }
}

/**
 * Get Firestore instance
 */
export function getFirestore(): admin.firestore.Firestore {
  initializeFirebase()
  return admin.firestore();
}

/**
 * Get Auth instance
 */
export function getAuth(): admin.auth.Auth {
  initializeFirebase()
  return admin.auth();
}

/**
 * Get Storage instance
 */
export function getStorage(): admin.storage.Storage {
  initializeFirebase()
  return admin.storage();
}

// Auto-initialize when this module is imported
initializeFirebase();
