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
        console.log(`✅ SMTP connection verified for ${this.provider}`);
      }
    } catch (error) {
      console.error(`❌ SMTP connection failed for ${this.provider}:`, error);
      throw new Error(`SMTP verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sendet eine E-Mail an die Adresse, die im Konstruktor der Klasse angegeben wurde.
   * 
   * @param {EmailRequest} emailData - Die E-Mail, die versendet werden soll.
   * 
   * @returns {Promise<EmailResponse>} - Ein Promise, das einen {EmailResponse} zurückgibt, wenn die E-Mail erfolgreich versendet wurde.
   *   Der Response enthält die ID der versendeten E-Mail und den HTTP-Statuscode 200.
   *   Wenn ein Fehler aufgetreten ist, enthält der Response eine Fehlermeldung und einen entsprechenden HTTP-Statuscode.
   */
  async sendEmail(emailData: EmailRequest): Promise<EmailResponse> {
    try {
      // Input-Validierung
      this.validateEmailData(emailData);
      this.emailBlocker.syncData();

      const mailOptions = {
        from: `"${emailData.senderName}" <${process.env.USER_EMAIL}>`,
        to: this.recipientEmail,
        subject: emailData.subject,
        text: this.filterMessage(emailData.message),   
        replyTo: `"${emailData.senderName}" <${emailData.senderEmail}>`,
        
        headers: {
            'X-Original-Sender': emailData.senderEmail,
            'X-Sender-Info': `Original sender: ${emailData.senderName} <${emailData.senderEmail}>`
        }
      };

      console.log(`📧 Sending email via ${this.provider} to ${this.recipientEmail} ...`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully: ${info.response}`);
      
      return {
        success: true,
        messageId: info.messageId,
        code: 200
      };

    } catch (error: any) {
      console.error('❌ Error sending email:', error.code);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: error.code
      };
    }
  }

  /**
   * Validiert die E-Mail-Daten und wirft eine EmailValidationError,
   * wenn die Daten unvollständig oder ungültig sind.
   * 
   * Überprüft werden:
   * - Existenz von Absendername, -E-Mail, Betreff und Nachricht
   * - Gültigkeit der E-Mail-Adressen von Absender und Empfänger
   * - Blockierung der E-Mail-Adresse des Absenders
   *
   * @param {EmailRequest} emailData - E-Mail-Daten
   * @throws {EmailValidationError} Wenn die Daten unvollständig oder ungültig sind
   */
  private validateEmailData(emailData: EmailRequest): void {
    const { senderName, senderEmail, subject, message } = emailData;

    if (!senderName?.trim()) 
      throw new EmailValidationError(EmailValidationErrorCode.MissingData, 'Sender name is required');

    if (!senderEmail?.trim()) 
      throw new EmailValidationError(EmailValidationErrorCode.MissingData, 'Sender email is required');

    if (!this.recipientEmail?.trim()) 
      throw new EmailValidationError(EmailValidationErrorCode.MissingData, 'Recipient email is required');

    if (!subject?.trim()) 
      throw new EmailValidationError(EmailValidationErrorCode.MissingData, 'Subject is required');

    if (!message?.trim()) 
      throw new EmailValidationError(EmailValidationErrorCode.MissingData, 'Message is required');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) 
      throw new EmailValidationError(EmailValidationErrorCode.MissingData, 'Invalid sender email format');

    if (!emailRegex.test(this.recipientEmail)) 
      throw new EmailValidationError(EmailValidationErrorCode.MissingData, 'Invalid recipient email format');

    if (this.emailBlocker.isBlockedAddress(senderEmail)) {
      throw new EmailValidationError(EmailValidationErrorCode.BlockedSender, `Adress '${senderEmail}' is blocked.`);
    }
  }

  /**
   * Filtert den Inhalt der Email-Nachricht um sicherzustellen, dass keine unerwünschten Zeichen (HTML-Tags) enthalten sind.
   * Eingabe: Nachricht als String
   * Ausgabe: Gefilterte Nachricht als String
   * @param message - Die zu filternde Email-Nachricht
   * @returns Die gefilterte Email-Nachricht
   */
  private filterMessage(message: string): string {
    return message.replace(/<[^>]*>/g, '*').trim();
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

  async blockEmail(email: string): Promise<boolean> {
    try {
      this.emailBlocker.blockAddress(email);
      return true;
    } catch (error) {
      console.error('❌ Error blocking email:', error);
      return false;
    }
  }

  async unblockEmail(email: string): Promise<boolean> {
    try {
      this.emailBlocker.unblockAddress(email);
      return true;
    } catch (error) {
      console.error('❌ Error unblocking email:', error);
      return false;
    }
  }
  
  /**
   * Schließt den Transporter (für Cleanup)
   */
  async close(): Promise<boolean> {
    try {
      this.transporter.close();
      console.log(`✅ ${this.provider} email service closed`);
      return true;

    } catch (error) {
      console.error(`❌ Error closing ${this.provider} email service:`, error);
      return false;
    }
  }
}

enum EmailValidationErrorCode {
  MissingData   = 400, // Bad Request
  BlockedSender = 403, // Forbidden
}

class EmailValidationError extends Error {
  constructor(public code: EmailValidationErrorCode, message: string) {
    super(message);
    this.name = "EmailValidationError";
  }
}

