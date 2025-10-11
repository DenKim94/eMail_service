import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { EmailService } from './services/eMailService';
import { EmailRequest, ProviderTypes } from './types/serviceTypes';
import { globalLimiter, emailLimiter, devEmailLimiter } from './configs/rateLimiterConfig';

/**
 * ============================================
 * E-Mail Service (Version 1.0.0)
 * ============================================
 *
 * Dieser Service dient als Wrapper für den Versand von E-Mails. 
 * Er bietet eine einheitliche Schnittstelle für den Versand von E-Mails über unterschiedliche E-Mail-Provider.
 *
 * Der Service verwendet die Umgebungsvariablen:
 *
 * - `PORT`: Der Port auf dem der Service hört.
 * - `ALLOWED_ORIGINS`: Die URL des Clients, der den Service anfragt. [Auch als Liste (kommasepariert) möglich]
 * - `USER_EMAIL`: Die E-Mail-Adresse, die als Absender verwendet werden soll.
 * - `SMTP_PROVIDER`: Der Name des E-Mail-Providers, der verwendet werden soll. 
 *    Hinweis: Derzeit werden die Provider `gmail` und `gmx`unterstützt.
 * - `PROVIDER_PASSWORD`: Das (App-) Passwort für den E-Mail-Provider.
 * - `NODE_ENV`: Der aktuelle Modus des Services. (z.B. "development" oder "production")
 *
 * Der Service bietet eine API mit den folgenden Endpunkten:
 * 
 * - `POST /api/send-email`: Sendet eine E-Mail an die angegebene Adresse.
 * - `GET /api/service-status`: Liefert den Status des Services.
 * 
 * Zudem kann eine 'Blacklist' verwaltet werden, um bestimmte E-Mail-Adressen zu blockieren. 
 * Diese wird beim Start des Services aus einer JSON-Datei geladen/initialisiert und bei Änderungen gespeichert.
 * Die Blacklist-Funktionen sind in der Klasse `EmailBlocker` im Modul `eMailBlocker.ts` implementiert.
 * 
 * ============================================
 */

// TODO [11.10.2025]: Server-Architektur verbessern --> Dependency Injection Pattern

 // Umgebungsvariablen laden
dotenv.config();
checkRequiredEnvVars();
const { PORT, USER_EMAIL, SMTP_PROVIDER, NODE_ENV } = process.env;
const app = express();

// E-Mail Service Instanz erstellen
const emailService = new EmailService(SMTP_PROVIDER as ProviderTypes, USER_EMAIL as string);
const DEFAULT_PORT = 3000;

// Middleware
app.set('trust proxy', 2); // Wichtig für korrekte Bestimmung der req.ip aus X-Forwarded-For 
app.use(helmet());
app.use(cors({
  origin: getAllowedOrigins(),
  methods: ['GET', 'POST'],
}));

// Rate-Limiter früh registrieren, bevor Body geparsed wird
app.use(globalLimiter); // globales Basiskontingent

app.use(express.json({ 
    limit: '10mb',                    // Maximale Größe der Anfrage
    strict: true,                     // Nur Arrays und Objekte akzeptieren
    type: 'application/json',         // Nur für diesen Content-Type
 }));

 const limiterConfig = NODE_ENV === 'development' ? devEmailLimiter : emailLimiter;

// E-Mail senden
app.post('/api/send-email', limiterConfig, async (req, res) => {
  try {
    const emailData: EmailRequest = req.body;
    const result = await emailService.sendEmail(emailData);

    if (result.success) {
      res.status(200).json(result);

    } else {
      res.status(result.code ? result.code : 503).json(result);
      console.log(`result: ${JSON.stringify(result)}`);
    }

  } catch (error) {
    console.error('>> Error in /send-email:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Service Status
app.get('/api/service-status', async (_, res) => {
  const status = await emailService.getStatus();
  const code = status.connected ? 200 : 503;
  
  res.status(code).json({
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

// Funktion zum Starten des Servers
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

// Überprüft, ob alle erforderlichen Umgebungsvariablen gesetzt sind
function checkRequiredEnvVars(): void {
  const { ALLOWED_ORIGINS, USER_EMAIL, SMTP_PROVIDER, PROVIDER_PASSWORD, NODE_ENV } = process.env;

  if (!!(USER_EMAIL && PROVIDER_PASSWORD && SMTP_PROVIDER && ALLOWED_ORIGINS && NODE_ENV)) {
    console.log('✅ All required environment variables are set.');

  }  else {
    console.error('❗️ Missing one or more required environment variables: USER_EMAIL, PROVIDER_PASSWORD, SMTP_PROVIDER, ALLOWED_ORIGINS, NODE_ENV');
    process.exit(1);
  }
}

// Liest die erlaubten Clients aus der Umgebungsvariable ALLOWED_ORIGINS als Array ein
function getAllowedOrigins(): string[] {
  const origins = process.env.ALLOWED_ORIGINS || '';
  return origins.split(',').map(origin => origin.trim());
}

// Server-Start nur bei direkter Ausführung
if (require.main === module) {
  startServer();
}

// App exportieren für Tests
export { app };

