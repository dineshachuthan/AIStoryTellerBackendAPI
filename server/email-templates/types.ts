/**
 * Email Template Types
 * Defines the structure for all email templates in the system
 * Works with the plug-and-play email provider architecture
 */

export interface EmailTemplate {
  // Unique identifier for the template
  id: string;
  
  // Human-readable name
  name: string;
  
  // Email subject line with variable placeholders
  subject: string;
  
  // Description of when this template is used
  description: string;
  
  // List of required variables for this template
  variables: string[];
  
  // HTML template content with {{variable}} placeholders
  html: string;
  
  // Plain text template content with {{variable}} placeholders
  text: string;
  
  // Optional webhook configurations for analytics
  webhooks?: {
    opened?: string;
    clicked?: string;
    unsubscribed?: string;
    bounced?: string;
    complained?: string;
  };
  
  // Optional provider-specific configurations
  providerConfig?: {
    sendgrid?: {
      templateId?: string;
      categories?: string[];
    };
    mailgun?: {
      tags?: string[];
      tracking?: boolean;
    };
  };
}

export interface EmailTemplateData {
  [key: string]: any;
}

export interface CompiledEmail {
  subject: string;
  html: string;
  text: string;
  webhooks?: EmailTemplate['webhooks'];
}

/**
 * Template interpolation function type
 */
export type TemplateInterpolator = (template: string, data: EmailTemplateData) => string;