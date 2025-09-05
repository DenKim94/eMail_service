export type EmailRequest = {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}

export type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export type EmailResponse = {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: number;
}

export type ProviderTypes = 'gmail' | 'gmx' | 'outlook';
