// Settings page types
export type SettingsTab =
  | 'general'
  | 'notifications'
  | 'integrations'
  | 'billing'
  | 'modules'
  | 'security'
  | 'roles'
  | 'staff-custom-fields'
  | 'staff-onboarding'
  | 'danger';

export interface GeneralSettings {
  businessName: string;
  address: string;
  timezone: string;
  currency: string;
  logoUrl?: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  reminderTiming: number; // hours before
  confirmationTemplate: string;
  reminderTemplate: string;
  cancellationTemplate: string;
}

export interface IntegrationConnection {
  provider: 'google' | 'outlook';
  connected: boolean;
  email?: string;
  connectedAt?: Date;
}

export interface ModuleToggle {
  moduleId: string;
  slug: string;
  name: string;
  description: string;
  isEnabled: boolean;
  isPremium: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string; // masked except last 4
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}
