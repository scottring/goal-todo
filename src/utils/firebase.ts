import { Timestamp as FirebaseTimestamp } from 'firebase/firestore';
import { Timestamp } from '../types';

export function toFirebaseTimestamp(timestamp: Timestamp): FirebaseTimestamp {
  return new FirebaseTimestamp(timestamp.seconds, timestamp.nanoseconds);
}

export function fromFirebaseTimestamp(timestamp: FirebaseTimestamp): Timestamp {
  return {
    seconds: timestamp.seconds,
    nanoseconds: timestamp.nanoseconds
  };
}

export function convertToFirebaseTimestamp(value: unknown): FirebaseTimestamp | undefined {
  if (!value) return undefined;
  
  if (value instanceof FirebaseTimestamp) {
    return value;
  }
  
  if (value instanceof Date) {
    return FirebaseTimestamp.fromDate(value);
  }
  
  if (typeof value === 'object' && value !== null && 'seconds' in value && 'nanoseconds' in value) {
    return new FirebaseTimestamp(
      (value as Timestamp).seconds,
      (value as Timestamp).nanoseconds
    );
  }
  
  return undefined;
}

export function convertFromFirebaseTimestamp(timestamp: FirebaseTimestamp | undefined): Timestamp | undefined {
  if (!timestamp) return undefined;
  return {
    seconds: timestamp.seconds,
    nanoseconds: timestamp.nanoseconds
  };
} 