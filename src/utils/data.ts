// Cleaning function to remove undefined values recursively
export const cleanData = (data: unknown): unknown => {
  if (data === undefined) return undefined;
  if (Array.isArray(data)) return data.map(item => cleanData(item));
  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, cleanData(value)])
    );
  }
  return data;
}; 