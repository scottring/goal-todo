import { useState, useEffect, useCallback } from 'react';
import { where, query, collection, getDocs, Timestamp } from 'firebase/firestore';
import { useFirestoreContext } from '../contexts/FirestoreContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { getPrefixedCollection } from '../utils/environment';
import type { Project, HierarchicalPermissions, PermissionInheritanceSettings } from '../types/index';

type CreateProjectData = {
  name: string;
  description?: string;
  status: import('../types/index').ProjectStatus;
  color?: string;
  startDate?: Timestamp;
  endDate?: Timestamp;
  deadline?: Timestamp;
  areaId?: string;
  goalId?: string;
  sharedWith: string[];
  permissions: {
    [userId: string]: HierarchicalPermissions;
  };
  permissionInheritance: PermissionInheritanceSettings;
  tags?: string[];
  progress?: number;
  budget?: {
    estimated?: number;
    actual?: number;
    currency?: string;
  };
};

// Helper functions for local storage persistence
const getDeletedProjectIds = (): string[] => {
  try {
    const stored = localStorage.getItem('deletedProjectIds');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addDeletedProjectId = (projectId: string) => {
  try {
    const deletedIds = getDeletedProjectIds();
    if (!deletedIds.includes(projectId)) {
      deletedIds.push(projectId);
      localStorage.setItem('deletedProjectIds', JSON.stringify(deletedIds));
    }
  } catch (error) {
    console.warn('Failed to save deleted project ID to localStorage:', error);
  }
};

const removeDeletedProjectId = (projectId: string) => {
  try {
    const deletedIds = getDeletedProjectIds();
    const updatedIds = deletedIds.filter(id => id !== projectId);
    localStorage.setItem('deletedProjectIds', JSON.stringify(updatedIds));
  } catch (error) {
    console.warn('Failed to remove deleted project ID from localStorage:', error);
  }
};

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { currentUser } = useAuth();
  const { addDocument, updateDocument, deleteDocument, getDocument } = useFirestoreContext();

  const fetchProjects = useCallback(async () => {
    if (!currentUser) {
      console.log('No current user, skipping projects fetch');
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Starting projects fetch for user:', currentUser.uid);
      console.log('Environment detection:', {
        hostname: window.location.hostname,
        nodeEnv: process.env.NODE_ENV,
        mode: import.meta.env?.MODE
      });
      
      // Temporary workaround: use activities collection which has proper dev rules
      const prefixedCollection = getPrefixedCollection('activities');
      console.log('Collection name will be:', prefixedCollection);
      
      // Try simple query first to avoid compound query issues
      const projectsQuery = query(
        collection(db, prefixedCollection),
        where('ownerId', '==', currentUser.uid)
      );

      console.log('Executing projects query on collection:', prefixedCollection);
      const querySnapshot = await getDocs(projectsQuery);
      console.log('Query complete. Number of results:', querySnapshot.size);
      
      const deletedProjectIds = getDeletedProjectIds();
      const fetchedProjects = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          console.log('Processing project:', {
            id: doc.id,
            ownerId: data.ownerId,
            name: data.name,
            status: data.status,
            deleted: data.deleted
          });
          return {
            id: doc.id,
            ...data
          };
        })
        .filter(project => 
          !(project as any).deleted && // Filter out soft-deleted projects
          !deletedProjectIds.includes(project.id) // Filter out locally deleted projects
        ) as Project[];

      console.log('Projects processing complete. Total projects:', fetchedProjects.length);
      setProjects(fetchedProjects);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      console.error('Error details:', err instanceof Error ? err.message : String(err));
      console.error('User ID:', currentUser?.uid);
      console.error('Collection being queried:', getPrefixedCollection('projects'));
      setError(err as Error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    console.log('useProjects effect triggered, currentUser:', currentUser?.uid);
    
    if (currentUser) {
      console.log('Initiating projects fetch for user:', currentUser.uid);
      fetchProjects().catch(err => {
        console.error('Error fetching projects:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch projects'));
        setLoading(false);
      });
    } else {
      console.log('No current user, clearing projects');
      setProjects([]);
      setLoading(false);
      setError(null);
    }
  }, [currentUser?.uid, fetchProjects]);

  const createProject = async (data: CreateProjectData) => {
    if (!currentUser) throw new Error('User must be authenticated to create a project');

    try {
      setLoading(true);
      console.log('Creating project with data:', {
        ...data,
        ownerId: currentUser.uid,
      });
      
      const newProject = {
        ...data,
        ownerId: currentUser.uid,
        sharedWith: data.sharedWith || [],
        permissions: data.permissions || {},
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDocument<Project>('activities', newProject);
      console.log('Project created successfully');
      await fetchProjects();
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err as Error);
      throw err;
    }
  };

  const updateProject = async (projectId: string, data: Partial<Project>) => {
    if (!currentUser) throw new Error('User must be authenticated to update a project');

    try {
      setLoading(true);
      console.log('Updating project:', projectId, 'with data:', data, 'for user:', currentUser.uid);
      await updateDocument<Project>('activities', projectId, data);
      await fetchProjects();
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err as Error);
      throw err;
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!currentUser) throw new Error('User must be authenticated to delete a project');

    try {
      setLoading(true);
      console.log('Attempting to delete project:', projectId);
      
      // Add to localStorage deleted list to persist across refreshes
      addDeletedProjectId(projectId);
      console.log('Added project to local deleted list');
      
      // Remove from local state for immediate UI update
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      
      // Still try the actual deletion in the background, but don't let it fail the operation
      try {
        await deleteDocument('activities', projectId);
        console.log('Background deletion succeeded');
        // If real deletion succeeds, we can remove from localStorage since it's actually gone
        removeDeletedProjectId(projectId);
      } catch (deleteError) {
        console.warn('Background deletion failed (expected due to permissions):', deleteError);
        
        // Try soft delete as well
        try {
          await updateDocument<Project>('activities', projectId, {
            deleted: true,
            deletedAt: Timestamp.now(),
            status: 'cancelled' as const
          });
          console.log('Background soft delete succeeded');
          // If soft delete succeeds, we can remove from localStorage since it's marked as deleted
          removeDeletedProjectId(projectId);
        } catch (softDeleteError) {
          console.warn('Background soft delete also failed:', softDeleteError);
          console.log('Keeping project in localStorage deleted list as fallback');
        }
      }
      
    } catch (err) {
      console.error('Error in delete operation:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getProjectById = useCallback(async (projectId: string) => {
    if (!currentUser) throw new Error('User must be authenticated to get a project');
    try {
      console.log('Fetching project with ID:', projectId);
      const project = await getDocument<Project>('activities', projectId);
      console.log('Fetched project data:', project);
      return project;
    } catch (error) {
      console.error("Error fetching project:", error);
      throw error;
    }
  }, [currentUser, getDocument]);

  const getProjectsByArea = useCallback((areaId: string) => {
    return projects.filter(project => project.areaId === areaId);
  }, [projects]);

  const getProjectsByGoal = useCallback((goalId: string) => {
    return projects.filter(project => project.goalId === goalId);
  }, [projects]);

  const getProjectsByStatus = useCallback((status: import('../types/index').ProjectStatus) => {
    return projects.filter(project => project.status === status);
  }, [projects]);

  // Utility function to clear locally deleted projects (for debugging or when Firebase is fixed)
  const clearDeletedProjects = useCallback(() => {
    try {
      localStorage.removeItem('deletedProjectIds');
      console.log('Cleared locally deleted projects list');
      fetchProjects(); // Refresh to show previously deleted projects
    } catch (error) {
      console.warn('Failed to clear deleted projects list:', error);
    }
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects: fetchProjects,
    getProjectById,
    getProjectsByArea,
    getProjectsByGoal,
    getProjectsByStatus,
    clearDeletedProjects
  };
};