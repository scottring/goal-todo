export type Environment = 'development' | 'production' | 'test';

export function getEnvironment(): Environment {
  // Check if running tests
  if (process.env.NODE_ENV === 'test') {
    return 'test';
  }
  
  // Check for Vite's import.meta.env.MODE
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE) {
    console.log(`Detected Vite environment mode: ${import.meta.env.MODE}`);
    if (import.meta.env.MODE === 'production') {
      return 'production';
    }
  }
  
  // Always use development mode when on localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('Running on localhost - forcing development environment');
    return 'development';
  }
  
  // Check if running in development mode based on NODE_ENV
  if (process.env.NODE_ENV === 'development') {
    return 'development';
  }
  
  // Default to production for safety
  console.log('Defaulting to production environment');
  return 'production';
}

export function getCollectionPrefix(): string {
  const env = getEnvironment();
  console.log(`Using collection prefix for environment: ${env}`);
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
  const prefix = getCollectionPrefix();
  const prefixedCollection = `${prefix}${collection}`;
  console.log(`Original collection: ${collection}, Prefixed collection: ${prefixedCollection}`);
  return prefixedCollection;
} 