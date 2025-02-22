// Cleaning function to remove undefined values recursively
export function cleanData<T extends Record<string, any>>(data: T): T {
  if (!data) return data;

  const cleaned: Record<string, any> = {};

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;

    if (value === null) {
      cleaned[key] = null;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item => 
        typeof item === 'object' ? cleanData(item) : item
      ).filter(item => item !== undefined);
    } else if (typeof value === 'object') {
      cleaned[key] = cleanData(value);
    } else {
      cleaned[key] = value;
    }
  });

  return cleaned as T;
} 