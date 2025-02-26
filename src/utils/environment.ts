export type Environment = 'development' | 'production' | 'test';

export function getEnvironment(): Environment {
  // Check if running tests
  if (process.env.NODE_ENV === 'test') {
    return 'test';
  }
  
  // Always use development mode when on localhost
  if (window.location.hostname === 'localhost') {
    console.log('Running on localhost - forcing development environment');
    return 'development';
  }
  
  // Check if running in development mode based on NODE_ENV
  if (process.env.NODE_ENV === 'development') {
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