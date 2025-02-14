export type Environment = 'development' | 'production' | 'test';

export function getEnvironment(): Environment {
  // Check if running tests
  if (process.env.NODE_ENV === 'test') {
    return 'test';
  }
  
  // Check if running in development
  if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
    return 'development';
  }
  
  return 'production';
}

export function getCollectionPrefix(): string {
  const env = getEnvironment();
  switch (env) {
    case 'development':
      return 'dev_';
    case 'test':
      return 'test_';
    default:
      return '';
  }
}

// Helper to get the prefixed collection name
export function getPrefixedCollection(collection: string): string {
  return `${getCollectionPrefix()}${collection}`;
} 