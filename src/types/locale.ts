/**
 * Locale Types
 * Type definitions for i18n system
 */

export type SupportedLocale = 'vi' | 'en';

export interface LocaleData {
  common: {
    error: string;
    success: string;
    cancelled: string;
    loading: string;
    confirm: string;
    cancel: string;
  };
  verification: {
    basic: {
      title: string;
      description: string;
      footer: string;
      button: string;
    };
    verified: {
      title: string;
      description: string;
      footer: string;
      button: string;
    };
    banned: {
      title: string;
      permanent: string;
      temporary: string;
      reason: string;
      contact: string;
    };
    error: string;
  };
  oauth: {
    success: {
      verified: {
        title: string;
        description: string;
        features: string;
      };
      basic: {
        title: string;
        description: string;
        features: string;
        note: string;
      };
      close: string;
    };
    error: {
      title: string;
      message: string;
      retry: string;
    };
    missing_params: {
      title: string;
      message: string;
      retry: string;
    };
  };
  commands: {
    [key: string]: any;
  };
  errors: {
    no_permission: string;
    owner_only: string;
    missing_args: string;
    invalid_args: string;
    cooldown: string;
    unknown: string;
  };
}
