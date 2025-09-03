import nodemailer, { Transporter } from 'nodemailer';
import { EmailRequest, EmailResponse, EmailConfig, ProviderTypes } from '../types/serviceTypes';
import { getEmailConfig } from '../configs/eMailConfig';
import { EmailBlocker } from './eMailBlocker';

/**
 * Klasse für den Versand von E-Mails via SMTP.
 * Sie bietet eine Instanz, die den Versand von E-Mails via SMTP-Protokoll ermöglicht.
 * Es können E-Mails mit Text- oder HTML-Inhalt versendet werden.
 * 
 * @class EmailService
 * @param {ProviderTypes} provider - Der Name des E-Mail-Providers, der verwendet werden soll.
 * @param {string} recipientEmail - Die E-Mail-Adresse, an die die E-Mail gesendet werden soll.
 */
export class EmailService {
  private transporter: Transporter;
  private provider: ProviderTypes;
  private recipientEmail: string;
  private emailBlocker = new EmailBlocker();

  constructor(provider: ProviderTypes , recipientEmail: string) {
    this.provider = provider;
    this.recipientEmail = recipientEmail;
    const config: EmailConfig = getEmailConfig(provider);

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      // Zusätzliche Sicherheitsoptionen
      tls: {
        rejectUnauthorized: false
      },
        connectionTimeout: 10000,      // Timeout für Verbindungsaufbau (ms)
        greetingTimeout: 10000,        // Timeout für SMTP-Greeting (ms)
        pool: true,                    // Pooling aktivieren [true]: Verbindungen werden nicht nach jeder E-Mail geschlossen
        maxConnections: 5,             // Max. 5 parallele Verbindungen
        maxMessages: 100               // 100 E-Mails pro Verbindung
    });

    // Verbindung testen
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      const isVerified = await this.transporter.verify();
      if (isVerified) {
        console.log(`SMTP connection verified for ${this.provider}`);
      }
    } catch (error) {
      console.error(`SMTP connection failed for ${this.provider}:`, error);
      throw new Error(`SMTP verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendEmail(emailData: EmailRequest): Promise<EmailResponse> {
    try {
      // Input-Validierung
      this.validateEmailData(emailData);

      const mailOptions = {
        from: `"${emailData.senderName}" <${process.env.USER_EMAIL}>`,
        to: this.recipientEmail,
        subject: emailData.subject,
        // Sowohl Text als auch HTML unterstützen
        text: emailData.isHTML ? undefined : emailData.message,
        html: emailData.isHTML ? emailData.message : undefined,
        // Reply-To auf Sender setzen
        replyTo: `"${emailData.senderName}" <${emailData.senderEmail}>`,
        
        headers: {
            'X-Original-Sender': emailData.senderEmail,
            'X-Sender-Info': `Original sender: ${emailData.senderName} <${emailData.senderEmail}>`
        }
      };

      console.log(`📧 Sending email via ${this.provider} to ${this.recipientEmail} ...`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully: ${info.response}`);
      
      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      console.error('Error sending email:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private validateEmailData(emailData: EmailRequest): void {
    const { senderName, senderEmail, subject, message } = emailData;

    if (!senderName?.trim()) throw new Error('Sender name is required');
    if (!senderEmail?.trim()) throw new Error('Sender email is required');
    if (!this.recipientEmail?.trim()) throw new Error('Recipient email is required');
    if (!subject?.trim()) throw new Error('Subject is required');
    if (!message?.trim()) throw new Error('Message is required');

    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) throw new Error('Invalid sender email format');
    if (!emailRegex.test(this.recipientEmail)) throw new Error('Invalid recipient email format');

    // Prüfen, ob der Absender in der Blacklist ist
    if (this.emailBlocker.isBlockedAddress(senderEmail)) {
      throw new Error(`>> Adress '${senderEmail}' is blocked.`);
    }
  }

  /**
   * Entfernt HTML-Tags für die Text-Version
   */
  private removeHtmlTags(htmlContent: string): string {
    return htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Prüft den Status des Services
   */
  async getStatus(): Promise<{ provider: string; connected: boolean }> {
    try {
      await this.transporter.verify();
      return { provider: this.provider, connected: true };
    } catch (error) {
      return { provider: this.provider, connected: false };
    }
  }

  /**
   * Sendet eine Test-E-Mail
   */
  async sendTestEmail(testMessage: string): Promise<EmailResponse> {
    const testEmailData: EmailRequest = {
      senderName: 'Email Service Test',
      senderEmail: 'test@example.com',
      subject: `Test Message from e-Mail Service`,
      message: testMessage,
      isHTML: false
    };

    return this.sendEmail(testEmailData);
  }

  /**
   * Schließt den Transporter (für Cleanup)
   */
  async close(): Promise<boolean> {
    try {
      this.transporter.close();
      console.log(`${this.provider} email service closed`);
      return true;

    } catch (error) {
      console.error(`Error closing ${this.provider} email service:`, error);
      return false;
    }
  }
}


