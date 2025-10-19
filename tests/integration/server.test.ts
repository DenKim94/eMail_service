// ===============================================
// Mock für nodemailer mit erweiterten Funktionen
// ===============================================
const sentEmails: any[] = [];

const mockSendMail = jest.fn().mockImplementation((mailOptions) => {
  console.log('📧 Mock sendMail called:', mailOptions.to);
  sentEmails.push(mailOptions);
  return Promise.resolve({
    messageId: `<${Date.now()}@test.example.com>`,
    accepted: [mailOptions.to],
    rejected: [],
    response: '250 Message accepted for delivery',
  });
});

const mockVerify = jest.fn().mockImplementation(() => {
  console.log('✅ Mock verify called');
  return Promise.resolve(true);
});

const mockClose = jest.fn().mockImplementation(() => {
  console.log('🔒 Mock close called');
  return Promise.resolve(undefined);
});

const mockTransporter = {
  sendMail: mockSendMail,
  verify: mockVerify,
  close: mockClose,
};

const mockCreateTransport = jest.fn().mockImplementation(() => {
  return mockTransporter;
});

// Mock mit Factory-Funktion registrieren, um individuelle Instanzen zu ermöglichen
jest.mock('nodemailer', () => ({
  createTransport: mockCreateTransport,
  createTestAccount: jest.fn(),
  getTestMessageUrl: jest.fn(),

  // Custom Test Helpers
  getSentMail: () => {
    console.log('📬 getSentMail called, count:', sentEmails.length);
    return [...sentEmails];
  },
  
  reset: () => {
    console.log('🔄 reset called');
    sentEmails.length = 0;
    mockSendMail.mockClear();
    mockVerify.mockClear();
    mockClose.mockClear();
    mockCreateTransport.mockClear();
    mockVerify.mockResolvedValue(true);
  },
  
  setShouldFail: (shouldFail: boolean, errorMessage = 'Email sending failed') => {
    console.log('⚠️ setShouldFail called:', shouldFail);
    if (shouldFail) {
      mockSendMail.mockRejectedValueOnce(new Error(errorMessage));
    } else {
      mockSendMail.mockResolvedValue({
        messageId: `<${Date.now()}@test.example.com>`,
        accepted: ['test@example.com'],
        rejected: [],
        response: '250 Message accepted',
      });
    }
  },
}));

// ===============================================
// Mock für dataBaseManager 
// ===============================================
jest.mock('../../src/services/dataBaseManager');

// ===============================================
// Testdurchführung
// ===============================================

import request from 'supertest';
import type { Express } from 'express';
import createApp from '../../src/server';
import blockedEmails from '../../database/blackList.json';
import { EMAIL_RATE_LIMIT, emailRateLimitStore } from '../../src/configs/rateLimiterConfig';
import * as TestParams from '../testParams';

const nodemailerMock = require('nodemailer');

describe('E-Mail Service API Integration Tests', () => {
  let app: Express;
  let totalTests: number = 0;

  beforeAll(async () => {
    console.info('NODE_ENV:', process.env.NODE_ENV);
    console.info('DEBUG_TESTS:', process.env.DEBUG_TESTS);
    app = await createApp();
  });
  
  beforeEach(() => {
    if (typeof nodemailerMock.reset === 'function') {
      nodemailerMock.reset();
    }

    // Limiter-Zähler zurücksetzen, falls die Anzahl der Tests das Limit erreicht hat
    (totalTests >= EMAIL_RATE_LIMIT) ? emailRateLimitStore.resetAll() : totalTests += 1;
  });

 describe('POST /api/send-email', () => {

    it('Prüfung, ob eine E-Mail mit gültigen Daten erfolgreich gesendet wird.', async () => {
      const emailData = {
        senderName: 'Test Sender',
        senderEmail: 'sender@example.com',
        subject: 'Test Subject',
        message: 'Test message body',
      };

      const response = await request(app)
        .post('/api/send-email')
        .send(emailData);

      console.log('📨 Response status:', response.status);
      console.log('📨 Response body:', response.body);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('messageId');
      
      const sentMails = nodemailerMock.getSentMail();
      console.log('📧 Sent mails count:', sentMails.length);
      
      expect(sentMails).toHaveLength(1);
      expect(sentMails[0].subject).toBe(emailData.subject);
      expect(sentMails[0].to).toBe(process.env.USER_EMAIL);
    });

    test.each(TestParams.missingRequiredFields)(
      'Prüfung, ob Statuscode 400 und Fehlermeldung ausgegeben wird, wenn ein Pflichtfeld ($missingField) fehlt.',
      async ({ missingField, testData, expectedError }) => {
        console.log(`🧪 Testing missing field: ${missingField}`);

        const response = await request(app)
          .post('/api/send-email')
          .send(testData);

        console.log(`📨 Response for missing ${missingField}:`, response.status, response.body);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain(expectedError);
      }
    );

    it('Prüfung, ob eine ungültige E-Mail-Adresse mit entsprechender Fehlermeldung abgelehnt wird.', async () => {
      const invalidData = {
        senderName: 'Test Sender',
        senderEmail: 'invalid-email',
        subject: 'Test',
        message: 'Test message',
      };

      const response = await request(app)
        .post('/api/send-email')
        .send(invalidData);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid sender email format');
    });

    it('Prüfung, ob XSS-Angriffe im Message-Text gefiltert werden.', async () => {
      const emailData = {
        senderName: 'Test Sender',
        senderEmail: 'sender@example.com',
        subject: 'XSS Test',
        message: '<script>alert("XSS")</script>Harmless text<style>body{display:none}</style>',
      };

      const response = await request(app)
        .post('/api/send-email')
        .send(emailData)
        .expect(200);

      const sentMails = nodemailerMock.getSentMail();
      expect(sentMails[0].text).not.toContain('<script>');
      expect(sentMails[0].text).not.toContain('<style>');
      expect(sentMails[0].text).toContain('Harmless text');
      expect(response.body.success).toBe(true);
    });

    test.each(blockedEmails)(
      'Prüfung, ob blockierte E-Mail-Adresse ($email) abgelehnt wird und Statuscode 403 mit Fehlermeldung ausgegeben wird.',
      async ({ email }) => {
        console.log(`🧪 Testing blocked email: ${email}`);

        const response = await request(app)
          .post('/api/send-email')
          .send({
            senderName: 'Invalid Sender',
            senderEmail: email,
            subject: 'Test Subject',
            message: 'Test message body',
          });

        console.log(`📨 Response for blocked email ${email}:`, response.status, response.body);

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain(`Address '${email}' is blocked.`);
      }
    );
  });

  describe('[Rate-Limiter]: POST /api/send-email', () => {

    beforeAll(() => {
      // Vor der Testdurchführung den Rate-Limiter-Zähler zurücksetzen
      emailRateLimitStore.resetAll();
    });

    it(`Prüfung, ob der Rate-Limiter nach ${EMAIL_RATE_LIMIT} Anfragen ausgelöst und der Statuscode 429 mit Fehlermeldung ausgegeben wird.`, async () => {

      for (let i = 0; i < (EMAIL_RATE_LIMIT); i++) {
        const response = await request(app)
          .post('/api/send-email')
          .send({
            senderName: 'Sender',
            senderEmail: `test${i}@mail.com`,
            subject: 'Test Subject',
            message: 'Test message body',
          });

        expect(response.status).toBe(200);
      }

      // Die NÄCHSTE Anfrage muss geblockt werden!
      const response = await request(app)
        .post('/api/send-email')
        .send({
          senderName: 'Sender',
          senderEmail: 'test@mail.com',
          subject: 'Test Subject',
          message: 'Test message body',
        });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Rate limit exceeded');
    });
  });
});
