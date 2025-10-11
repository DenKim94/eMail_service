import dotenv from 'dotenv';

// Lade Test-Umgebungsvariablen
dotenv.config({ path: '.env.test' });

// Globale Test-Timeouts
jest.setTimeout(10000);

// Unterdrücke Console-Logs während Tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
