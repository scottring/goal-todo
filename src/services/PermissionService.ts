import { 
  PermissionLevel, 
  HierarchicalPermissions, 
  PermissionInheritanceSettings,
  Area,
  SharedGoal,
  Task,
  Routine
} from '../types';

export class PermissionService {
  private static instance: PermissionService;

  private constructor() {}

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  /**
   * Get effective permissions for a user on a resource, considering inheritance
   */
  public async getEffectivePermissions(
    userId: string,
    resourceType: 'area' | 'goal' | 'milestone' | 'task' | 'routine',
    resourceId: string,
    areaId?: string,
    goalId?: string,
    milestoneId?: string
  ): Promise<HierarchicalPermissions | null> {
    // First check direct permissions
    const directPermissions = await this.getDirectPermissions(userId, resourceType, resourceId);
    
    if (directPermissions && !directPermissions.inheritedFrom) {
      return directPermissions;
    }

    // Check parent permissions in order: milestone -> goal -> area
    if (milestoneId) {
      const milestonePermissions = await this.getDirectPermissions(userId, 'milestone', milestoneId);
      if (milestonePermissions && this.shouldInheritFromParent(milestonePermissions, resourceType)) {
        return this.createInheritedPermissions(milestonePermissions, 'milestone', milestoneId);
      }
    }

    if (goalId) {
      const goalPermissions = await this.getDirectPermissions(userId, 'goal', goalId);
      if (goalPermissions && this.shouldInheritFromParent(goalPermissions, resourceType)) {
        return this.createInheritedPermissions(goalPermissions, 'goal', goalId);
      }
    }

    if (areaId) {
      const areaPermissions = await this.getDirectPermissions(userId, 'area', areaId);
      if (areaPermissions && this.shouldInheritFromParent(areaPermissions, resourceType)) {
        return this.createInheritedPermissions(areaPermissions, 'area', areaId);
      }
    }

    return null;
  }

  /**
   * Update permissions and propagate changes to child resources if needed
   */
  public async updatePermissions(
    userId: string,
    resourceType: 'area' | 'goal' | 'milestone' | 'task' | 'routine',
    resourceId: string,
    permissions: HierarchicalPermissions,
    inheritance: PermissionInheritanceSettings
  ): Promise<void> {
    // Update the resource's permissions
    await this.setDirectPermissions(userId, resourceType, resourceId, permissions);

    // Propagate changes based on inheritance settings
    if (resourceType === 'area' && inheritance.propagateToGoals) {
      await this.propagateToChildren('area', resourceId, userId, permissions);
    }
    
    if ((resourceType === 'area' || resourceType === 'goal') && inheritance.propagateToMilestones) {
      await this.propagateToChildren(resourceType, resourceId, userId, permissions);
    }

    if (inheritance.propagateToTasks || inheritance.propagateToRoutines) {
      await this.propagateToChildren(resourceType, resourceId, userId, permissions);
    }
  }

  /**
   * Check if a user has specific permission for an action
   */
  public async hasPermission(
    userId: string,
    resourceType: 'area' | 'goal' | 'milestone' | 'task' | 'routine',
    resourceId: string,
    requiredPermission: keyof HierarchicalPermissions['specificOverrides'] | 'edit' | 'view'
  ): Promise<boolean> {
    const permissions = await this.getEffectivePermissions(userId, resourceType, resourceId);
    
    if (!permissions) return false;

    // Owner and admin have all permissions
    if (permissions.level === 'owner' || permissions.level === 'admin') return true;

    // Check specific overrides if they exist
    if (permissions.specificOverrides && requiredPermission in permissions.specificOverrides) {
      return permissions.specificOverrides[requiredPermission as keyof HierarchicalPermissions['specificOverrides']] || false;
    }

    // Default permissions based on level
    switch (permissions.level) {
      case 'editor':
        return requiredPermission === 'edit' || requiredPermission === 'view';
      case 'viewer':
        return requiredPermission === 'view';
      default:
        return false;
    }
  }

  private async getDirectPermissions(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<HierarchicalPermissions | null> {
    // Implementation would fetch from your database
    // This is a placeholder - implement actual database access
    return null;
  }

  private async setDirectPermissions(
    userId: string,
    resourceType: string,
    resourceId: string,
    permissions: HierarchicalPermissions
  ): Promise<void> {
    // Implementation would update your database
    // This is a placeholder - implement actual database access
  }

  private shouldInheritFromParent(
    parentPermissions: HierarchicalPermissions | null,
    childResourceType: string
  ): boolean {
    if (!parentPermissions) return false;
    
    // Owner and admin permissions always propagate
    if (parentPermissions.level === 'owner' || parentPermissions.level === 'admin') {
      return true;
    }

    // Check specific inheritance rules based on your requirements
    return true; // Implement your specific inheritance rules
  }

  private createInheritedPermissions(
    parentPermissions: HierarchicalPermissions,
    parentType: 'area' | 'goal' | 'milestone',
    parentId: string
  ): HierarchicalPermissions {
    return {
      ...parentPermissions,
      inheritedFrom: {
        type: parentType,
        id: parentId
      }
    };
  }

  private async propagateToChildren(
    parentType: string,
    parentId: string,
    userId: string,
    permissions: HierarchicalPermissions
  ): Promise<void> {
    // Implementation would update all child resources
    // This is a placeholder - implement actual child resource updates
  }
}

export const getPermissionService = () => PermissionService.getInstance(); 