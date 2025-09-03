export type EmailRequest = {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  isHTML?: boolean;
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
}

export type ProviderTypes = 'gmail' | 'gmx' | 'outlook';
