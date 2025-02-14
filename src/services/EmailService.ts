import { Timestamp } from '../types';

interface EmailConfig {
  apiKey: string;
}

export class EmailService {
  private apiKey: string;

  constructor(config: EmailConfig) {
    this.apiKey = config.apiKey;
  }

  async sendShareInvite(
    to: string,
    from: string,
    goalName: string,
    goalId: string,
    permissions: {
      edit: boolean;
      view: boolean;
      invite: boolean;
    }
  ): Promise<void> {
    const permissionsList = [
      permissions.view && 'view',
      permissions.edit && 'edit',
      permissions.invite && 'invite others'
    ].filter(Boolean).join(', ');

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          dynamic_template_data: {
            goal_name: goalName,
            goal_id: goalId,
            permissions: permissionsList,
            inviter_email: from
          }
        }],
        from: { email: 'notifications@yourdomain.com', name: 'Goal Todo' },
        template_id: 'YOUR_TEMPLATE_ID' // You'll need to create this in SendGrid
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send email notification');
    }
  }

  async sendCollaboratorUpdate(
    to: string,
    from: string,
    goalName: string,
    goalId: string,
    updateType: 'task_completed' | 'goal_updated' | 'review_needed'
  ): Promise<void> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          dynamic_template_data: {
            goal_name: goalName,
            goal_id: goalId,
            update_type: updateType,
            updater_email: from
          }
        }],
        from: { email: 'notifications@yourdomain.com', name: 'Goal Todo' },
        template_id: 'YOUR_TEMPLATE_ID' // You'll need to create this in SendGrid
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send email notification');
    }
  }
}

// Create singleton instance
let emailService: EmailService | null = null;

export const initializeEmailService = (config: EmailConfig): void => {
  emailService = new EmailService(config);
};

export const getEmailService = (): EmailService => {
  if (!emailService) {
    throw new Error('Email service not initialized');
  }
  return emailService;
}; 