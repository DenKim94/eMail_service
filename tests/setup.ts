import dotenv from 'dotenv';
import path from 'path';

// Globale Test-Timeouts
jest.setTimeout(10000);

// Lade .env.test BEVOR Tests starten
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Optional: Console-Logs für Debugging aktivieren/deaktivieren
const isDebugMode = process.env.DEBUG_TESTS === 'true';

if (!isDebugMode) {
  // Console-Logs unterdrücken (optional)
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

const requiredEnvVars = [
  'USER_EMAIL',
  'SMTP_PROVIDER',
  'PROVIDER_PASSWORD',
  'ALLOWED_ORIGINS',
  'NODE_ENV',
  'DEBUG_TESTS',
  'PORT'
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required test env variable: ${varName}`);
    process.exit(1);
  }
});

console.log('✅ Test environment loaded from .env.test');


