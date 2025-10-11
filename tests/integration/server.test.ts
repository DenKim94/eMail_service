import request from 'supertest';

// WICHTIG: Mock MUSS VOR dem Import der App registriert werden!
jest.mock('nodemailer');
jest.mock('../../src/services/dataBaseManager');

// Umgebungsvariablen für Tests setzen
process.env.PORT = '3001';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.USER_EMAIL = 'test@example.com';
process.env.SMTP_PROVIDER = 'gmail';
process.env.PROVIDER_PASSWORD = 'test-password';
process.env.NODE_ENV = 'development';

// NACH dem Mocken und ENV-Setup importieren!
import { app } from '../../src/server';
const { mock } = require('nodemailer');

describe('E-Mail Service API Integration Tests', () => {
  
  beforeEach(() => {
    mock.reset();
    // jest.clearAllMocks();
  });

  describe('POST /api/send-email', () => {
    
    it('sollte erfolgreich eine E-Mail senden mit gültigen Daten', async () => {
      const emailData = {
        senderName: 'Test Sender',
        senderEmail: 'sender@example.com',
        subject: 'Test Subject',
        message: 'Test message body',
      };

      const response = await request(app)
        .post('/api/send-email')
        .send(emailData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('messageId');
      expect(response.body.messageId).toMatch(/^<\d+@test\.example\.com>$/);
      
      const sentMails = mock.getSentMail();
      expect(sentMails).toHaveLength(1);
      expect(sentMails[0].subject).toBe(emailData.subject);
      expect(sentMails[0].to).toBe(process.env.USER_EMAIL);
      expect(sentMails[0].replyTo).toContain(emailData.senderEmail);
    });

    // it('sollte 400 bei fehlenden Pflichtfeldern zurückgeben', async () => {
    //   const invalidData = {
    //     senderName: 'Test Sender',
    //     // senderEmail fehlt
    //     subject: 'Test',
    //     message: 'Test message',
    //   };

    //   const response = await request(app)
    //     .post('/api/send-email')
    //     .send(invalidData)
    //     .expect('Content-Type', /json/);

    //   expect(response.body).toHaveProperty('success', false);
    //   expect(response.body).toHaveProperty('error');
    // });

    // it('sollte ungültige E-Mail-Adresse ablehnen', async () => {
    //   const invalidData = {
    //     senderName: 'Test Sender',
    //     senderEmail: 'invalid-email',
    //     subject: 'Test',
    //     message: 'Test message',
    //   };

    //   const response = await request(app)
    //     .post('/api/send-email')
    //     .send(invalidData);

    //   expect(response.body.success).toBe(false);
    //   expect(response.body.error).toContain('Invalid sender email format');
    // });

    // it('sollte XSS-Angriffe im Message-Text filtern', async () => {
    //   const emailData = {
    //     senderName: 'Test Sender',
    //     senderEmail: 'sender@example.com',
    //     subject: 'XSS Test',
    //     message: '<script>alert("XSS")</script>Harmless text<style>body{display:none}</style>',
    //   };

    //   await request(app)
    //     .post('/api/send-email')
    //     .send(emailData)
    //     .expect(200);

    //   const sentMails = mock.getSentMail();
    //   expect(sentMails[0].text).not.toContain('<script>');
    //   expect(sentMails[0].text).not.toContain('<style>');
    //   expect(sentMails[0].text).toContain('Harmless text');
    // });
  });

  // describe('GET /api/service-status', () => {
    
  //   it('sollte Service-Status zurückgeben', async () => {
  //     const response = await request(app)
  //       .get('/api/service-status')
  //       .expect('Content-Type', /json/)
  //       .expect(200);

  //     expect(response.body).toMatchObject({
  //       service: 'email-server',
  //       status: 'online',
  //       timestamp: expect.any(String),
  //     });
  //   });
  // });
});
