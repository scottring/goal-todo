import React, { createContext, useContext, ReactNode } from 'react';
import { useProjects } from '../hooks/useProjects';
import type { Project, ProjectStatus } from '../types/index';

interface ProjectsContextType {
  projects: Project[];
  loading: boolean;
  error: Error | null;
  createProject: (data: {
    name: string;
    description?: string;
    status: ProjectStatus;
    color?: string;
    startDate?: import('../types/index').Timestamp;
    endDate?: import('../types/index').Timestamp;
    deadline?: import('../types/index').Timestamp;
    areaId?: string;
    goalId?: string;
    sharedWith: string[];
    permissions: {
      [userId: string]: import('../types/index').HierarchicalPermissions;
    };
    permissionInheritance: import('../types/index').PermissionInheritanceSettings;
    tags?: string[];
    progress?: number;
    budget?: {
      estimated?: number;
      actual?: number;
      currency?: string;
    };
  }) => Promise<void>;
  updateProject: (projectId: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  getProjectById: (projectId: string) => Promise<Project | null>;
  getProjectsByArea: (areaId: string) => Project[];
  getProjectsByGoal: (goalId: string) => Project[];
  getProjectsByStatus: (status: ProjectStatus) => Project[];
  clearDeletedProjects: () => void;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const useProjectsContext = () => {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjectsContext must be used within a ProjectsProvider');
  }
  return context;
};

interface ProjectsProviderProps {
  children: ReactNode;
}

export const ProjectsProvider: React.FC<ProjectsProviderProps> = ({ children }) => {
  const projectsHook = useProjects();

  return (
    <ProjectsContext.Provider value={projectsHook}>
      {children}
    </ProjectsContext.Provider>
  );
};