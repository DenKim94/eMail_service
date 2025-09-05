import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { EmailService } from './services/eMailService';
import { EmailRequest, ProviderTypes } from './types/serviceTypes';

/**
 * E-Mail Service
 * =================
 *
 * Dieser Service dient als Wrapper für den Versand von E-Mails. 
 * Er bietet eine einheitliche Schnittstelle für den Versand von E-Mails über unterschiedliche E-Mail-Provider.
 *
 * Der Service verwendet die Umgebungsvariablen:
 *
 * - `PORT`: Der Port auf dem der Service hört.
 * - `URL_CLIENT`: Die URL des Frontend-Servers, der den Service anfragt.
 * - `USER_EMAIL`: Die E-Mail-Adresse, die als Absender verwendet werden soll.
 * - `SMTP_PROVIDER`: Der Name des E-Mail-Providers, der verwendet werden soll. 
 *    Hinweis: Derzeit werden die Provider `gmail`, `gmx` und `outlook` unterstützt.
 * - `PROVIDER_PASSWORD`: Das Passwort für den E-Mail-Provider.
 *
 * Der Service bietet eine API mit den folgenden Endpunkten:
 * 
 * - `POST /api/send-email`: Sendet eine E-Mail an die angegebene Adresse.
 * - `GET /api/service-status`: Liefert den Status des Services.
 * 
 */


 // Umgebungsvariablen laden
dotenv.config();
checkRequiredEnvVars();
const { PORT, USER_EMAIL, SMTP_PROVIDER } = process.env;
const app = express();

// E-Mail Service Instanz erstellen
const emailService = new EmailService(SMTP_PROVIDER as ProviderTypes, USER_EMAIL as string);
const DEFAULT_PORT = 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: getAllowedOrigins(),
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
    console.log(`result: ${JSON.stringify(result)}`);

    if (result.success) {
      res.status(200).json(result);

    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('>> Error in /send-email:', error);
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

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM: Shutting down the service ...');
  // E-Mail Service schließen
  const closed = await emailService.close();

  if (closed) {
    console.log('✅ Email service closed successfully');
  } else {
    console.error('❌ Failed to close email service');
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
    app.listen(PORT || DEFAULT_PORT, () => {
      console.log(`🚀 Email-Service is running on port ${PORT || DEFAULT_PORT}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

function checkRequiredEnvVars(): void {
  const { ALLOWED_ORIGINS, USER_EMAIL, SMTP_PROVIDER, PROVIDER_PASSWORD } = process.env;

  if (!!(USER_EMAIL && PROVIDER_PASSWORD && SMTP_PROVIDER && ALLOWED_ORIGINS)) {
    console.log('✅ All required environment variables are set.');

  }  else {
    console.error('❗️ Missing one or more required environment variables: USER_EMAIL, PROVIDER_PASSWORD, SMTP_PROVIDER, ALLOWED_ORIGINS');
    process.exit(1);
  }
}

function getAllowedOrigins(): string[] {
  const origins = process.env.ALLOWED_ORIGINS || '';
  return origins.split(',').map(origin => origin.trim());
}

startServer();
