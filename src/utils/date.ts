import { Timestamp } from '../types';
import { Timestamp as FirebaseTimestamp } from 'firebase/firestore';

export function dateToTimestamp(date: Date): Timestamp {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1_000_000
  };
}

export function timestampToDate(timestamp: Timestamp): Date {
  return new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1_000_000));
}

export function now(): Timestamp {
  return dateToTimestamp(new Date());
}

// Helper function to format Firebase Timestamp or our custom Timestamp
export const formatDate = (timestamp: Timestamp | FirebaseTimestamp | undefined) => {
  if (!timestamp) return '';
  
  // If it's a Firebase Timestamp (has toDate method)
  if ('toDate' in timestamp) {
    return timestamp.toDate().toLocaleDateString();
  }
  
  // If it's our custom Timestamp
  return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000).toLocaleDateString();
}; 