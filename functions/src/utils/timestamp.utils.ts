import * as admin from 'firebase-admin';

/**
 * Timestamp Utilities
 * Helper functions for working with Firestore timestamps
 */

/**
 * Convert ISO 8601 datetime string to Firestore Timestamp
 * @param datetime - ISO 8601 datetime string (e.g., "2026-01-20T14:30:00+03:00")
 * @returns Firestore Timestamp
 */
export function dateStringToTimestamp(datetime: string): admin.firestore.Timestamp {
  const date = new Date(datetime);
  return admin.firestore.Timestamp.fromDate(date);
}

/**
 * Convert Firestore Timestamp to ISO 8601 string
 * @param timestamp - Firestore Timestamp
 * @returns ISO 8601 datetime string
 */
export function timestampToDateString(timestamp: admin.firestore.Timestamp): string {
  return timestamp.toDate().toISOString();
}

/**
 * Get current Firestore Timestamp
 * @returns Current Firestore Timestamp
 */
export function getCurrentTimestamp(): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.now();
}

/**
 * Convert epoch milliseconds to Firestore Timestamp
 * @param epochMillis - Epoch milliseconds
 * @returns Firestore Timestamp
 */
export function epochMillisToTimestamp(epochMillis: number): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromMillis(epochMillis);
}

/**
 * Convert Firestore Timestamp to epoch milliseconds
 * @param timestamp - Firestore Timestamp
 * @returns Epoch milliseconds
 */
export function timestampToEpochMillis(timestamp: admin.firestore.Timestamp): number {
  return timestamp.toMillis();
}

/**
 * Format a date as YYYY-MM-DD string (UTC timezone)
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateAsYYYYMMDD(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get date N days ago from now in YYYY-MM-DD format (UTC timezone)
 * @param daysAgo - Number of days to go back (default: 7)
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateDaysAgo(daysAgo: number = 7): string {
  const now = new Date();
  const pastDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  
  return formatDateAsYYYYMMDD(pastDate);
}
