import { Timestamp as FBTimestamp } from 'firebase/firestore';
import { Timestamp, FirebaseTimestamp } from '../types';

export function toFirebaseTimestamp(timestamp: Timestamp): FirebaseTimestamp {
  return new FBTimestamp(timestamp.seconds, timestamp.nanoseconds) as FirebaseTimestamp;
}

export function fromFirebaseTimestamp(timestamp: FirebaseTimestamp): Timestamp {
  return {
    seconds: timestamp.seconds,
    nanoseconds: timestamp.nanoseconds
  };
}

export function convertToFirebaseTimestamp(value: unknown): FirebaseTimestamp | undefined {
  if (!value) return undefined;
  
  if (value instanceof FBTimestamp) {
    return value as FirebaseTimestamp;
  }
  
  if (value instanceof Date) {
    return FBTimestamp.fromDate(value) as FirebaseTimestamp;
  }
  
  if (typeof value === 'object' && value !== null && 'seconds' in value && 'nanoseconds' in value) {
    return new FBTimestamp(
      (value as Timestamp).seconds,
      (value as Timestamp).nanoseconds
    ) as FirebaseTimestamp;
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