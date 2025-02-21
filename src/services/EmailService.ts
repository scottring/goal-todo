import { Timestamp, HierarchicalPermissions } from '../types';

interface EmailConfig {
  apiKey: string;
}

export interface EmailService {
  sendShareInvite: (
    toEmail: string,
    fromEmail: string,
    resourceName: string,
    resourceId: string,
    permissions: HierarchicalPermissions
  ) => Promise<void>;

  sendCollaboratorUpdate: (
    toEmail: string,
    fromEmail: string,
    resourceName: string,
    resourceId: string,
    updateType: 'task_completed' | 'goal_updated' | 'review_needed' | 'permissions_updated'
  ) => Promise<void>;
}

class EmailServiceImpl implements EmailService {
  private static instance: EmailServiceImpl;

  private constructor() {}

  public static getInstance(): EmailServiceImpl {
    if (!EmailServiceImpl.instance) {
      EmailServiceImpl.instance = new EmailServiceImpl();
    }
    return EmailServiceImpl.instance;
  }

  async sendShareInvite(
    toEmail: string,
    fromEmail: string,
    resourceName: string,
    resourceId: string,
    permissions: HierarchicalPermissions
  ): Promise<void> {
    // Implementation would send actual email
    console.log(`Sending share invite to ${toEmail} for ${resourceName}`);
  }

  async sendCollaboratorUpdate(
    toEmail: string,
    fromEmail: string,
    resourceName: string,
    resourceId: string,
    updateType: 'task_completed' | 'goal_updated' | 'review_needed' | 'permissions_updated'
  ): Promise<void> {
    // Implementation would send actual email
    console.log(`Sending ${updateType} update to ${toEmail} for ${resourceName}`);
  }
}

export const getEmailService = () => EmailServiceImpl.getInstance(); 