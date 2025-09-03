import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { EmailService } from './services/eMailService';
import { EmailRequest, ProviderTypes } from './types/serviceTypes';

// Umgebungsvariablen laden
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const provider: ProviderTypes = process.env.SMTP_PROVIDER as ProviderTypes;
const recipientEmail: string = process.env.USER_EMAIL || '';

// E-Mail Service Instanz erstellen
const emailService = new EmailService(provider, recipientEmail);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.URL_CLIENT,
  methods: ['GET', 'POST'],
}));

app.use(express.json({ 
    limit: '10mb',                    // Maximale Größe der Anfrage
    strict: true,                     // Nur Arrays und Objekte akzeptieren
    type: 'application/json',         // Nur für diesen Content-Type
 }));

// E-Mail senden
app.post('/api/send-email', async (req, res) => {
  try {
    const emailData: EmailRequest = req.body;
    const result = await emailService.sendEmail(emailData);
    
    if (result.success) {
      res.status(200).json(result);

    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error in /send-email:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Service Status
app.get('/api/service-status', async (_, res) => {
  const status = await emailService.getStatus();

  res.status(200).json({
    service: 'email-server',
    status: status.connected ? 'online' : 'offline',
    timestamp: new Date().toISOString(),
    providers: status
  });
});

// 404 Handler
app.use('/*splat', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM: Shutting down the service ...');
  // E-Mail Service schließen
  const closed = await emailService.close();

  if (closed) {
    console.log('Email service closed successfully');
  } else {
    console.error('Failed to close email service');
  }
  process.exit(0);
});

// Auch SIGINT (Ctrl+C) behandeln
process.on('SIGINT', () => {
  process.emit('SIGTERM');  // Gleiche Behandlung wie SIGTERM
});

// Server starten
async function startServer() {
  try {
    if (!checkRequiredEnvVars()) {
      console.error('Missing required environment variables');
      process.exit(1);
    }

    app.listen(port, () => {
      console.log(`🚀 Email microservice running on port ${port}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

function checkRequiredEnvVars(): boolean {
    return !!(process.env.USER_EMAIL && process.env.PROVIDER_PASSWORD);
}

startServer();
