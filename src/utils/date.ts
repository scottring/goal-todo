import { Timestamp } from '../types';

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