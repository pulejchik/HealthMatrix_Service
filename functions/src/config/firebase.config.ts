import * as admin from 'firebase-admin';

/**
 * Initialize Firebase Admin SDK
 * This should be called once at the start of the application
 */
export function initializeFirebase(): void {
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
}

/**
 * Get Firestore instance
 */
export function getFirestore(): admin.firestore.Firestore {
  return admin.firestore();
}

/**
 * Get Auth instance
 */
export function getAuth(): admin.auth.Auth {
  return admin.auth();
}

/**
 * Get Storage instance
 */
export function getStorage(): admin.storage.Storage {
  return admin.storage();
}

// Auto-initialize when this module is imported
initializeFirebase();
