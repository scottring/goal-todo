import { 
  PermissionLevel,
  Area,
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
   * Get effective permissions for a user on a resource
   */
  public async getEffectivePermissions(
    userId: string,
    areaId: string
  ): Promise<PermissionLevel | null> {
    // Get area permissions
    const area = await this.getArea(areaId);
    if (!area) return null;

    // Owner has full access
    if (area.ownerId === userId) return 'owner';

    // Check shared permissions
    if (area.permissions?.[userId]) {
      return area.permissions[userId].level;
    }

    // No permissions
    return null;
  }

  /**
   * Check if a user has access to a resource
   */
  public async hasAccess(
    userId: string,
    areaId: string,
    requiredLevel: 'view' | 'edit' = 'view'
  ): Promise<boolean> {
    const permissionLevel = await this.getEffectivePermissions(userId, areaId);
    if (!permissionLevel) return false;

    switch (permissionLevel) {
      case 'owner':
      case 'admin':
        return true;
      case 'editor':
        return true;
      case 'viewer':
        return requiredLevel === 'view';
      default:
        return false;
    }
  }

  /**
   * Update area permissions
   */
  public async updateAreaPermissions(
    areaId: string,
    permissions: { [userId: string]: { level: PermissionLevel } }
  ): Promise<void> {
    // Update area permissions in database
    await this.updateAreaInDb(areaId, { permissions });
  }

  private async getArea(areaId: string): Promise<Area | null> {
    // Implementation would fetch from your database
    // This is a placeholder - implement actual database access
    return null;
  }

  private async updateAreaInDb(areaId: string, update: Partial<Area>): Promise<void> {
    // Implementation would update your database
    // This is a placeholder - implement actual database access
  }
}

export const getPermissionService = () => PermissionService.getInstance(); 