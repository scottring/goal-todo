import { createContext, useContext, ReactNode } from 'react';
import { useAreas } from '../hooks/useAreas';
import type { Area } from '../types';

interface AreasContextType {
  areas: Area[];
  loading: boolean;
  error: Error | null;
  createArea: (data: Omit<Area, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateArea: (areaId: string, data: Partial<Area>) => Promise<void>;
  deleteArea: (areaId: string) => Promise<void>;
  refreshAreas: () => Promise<void>;
}

const AreasContext = createContext<AreasContextType | undefined>(undefined);

export function AreasProvider({ children }: { children: ReactNode }) {
  const {
    areas,
    loading,
    error,
    createArea,
    updateArea,
    deleteArea,
    refreshAreas
  } = useAreas();

  return (
    <AreasContext.Provider
      value={{
        areas,
        loading,
        error,
        createArea,
        updateArea,
        deleteArea,
        refreshAreas
      }}
    >
      {children}
    </AreasContext.Provider>
  );
}

export function useAreasContext() {
  const context = useContext(AreasContext);
  if (context === undefined) {
    throw new Error('useAreasContext must be used within an AreasProvider');
  }
  return context;
}