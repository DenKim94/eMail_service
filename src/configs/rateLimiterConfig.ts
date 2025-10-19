import { rateLimit, MemoryStore }  from 'express-rate-limit';
import type { Request, Response } from 'express';

// IPv6-Subnetz für die Bündelung wählen (Werte zwischen 60 - 64)
const IPV6_SUBNET = 62;
export const EMAIL_RATE_LIMIT: number = 25;
export const EMAIL_WINDOW_MS: number = 30 * 60 * 1000; // 30 Minuten

// Separate MemoryStore-Instanzen für jeden Limiter
const globalStore = new MemoryStore();
const emailStore = new MemoryStore();
const devEmailStore = new MemoryStore();

// Globaler Rate-Limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  store: globalStore, 
  standardHeaders: 'draft-8',      
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP address. Please try again later.',
    retryAfter: '15 minutes'
  },
  ipv6Subnet: IPV6_SUBNET
});

// Spezifischer E-Mail Rate-Limiter (restriktiver)
export const emailLimiter = rateLimit({
  windowMs: EMAIL_WINDOW_MS,
  limit: EMAIL_RATE_LIMIT,
  store: emailStore,
  standardHeaders: 'draft-8',
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  ipv6Subnet: IPV6_SUBNET,

  handler: (req, res, _next, _options) => {
    rateLimitHandler(req, res);
  }
});

export const devEmailLimiter = rateLimit({
  windowMs: 10 * 1000,        // 10s
  limit: 5,                   // 5 Req je 10s
  store: devEmailStore,
  standardHeaders: 'draft-8', // bzw. 'draft-8' in neueren Versionen
  legacyHeaders: false,
  ipv6Subnet: IPV6_SUBNET,

  handler: (req, res, _next, _options) => {
    rateLimitHandler(req, res);
  }
});

/**
 * Handler-Funktion, die aufgerufen wird, wenn die Rate-Limit erreicht wurde.
 * Sie gibt eine JSON-Antwort mit dem Status 429 (Too Many Requests) zurück.
 * Die Antwort enthält eine Fehlermeldung, einen HTTP-Statuscode und die Zeit in Sekunden, nach der die Rate-Limit wieder frei ist.
 */
function rateLimitHandler(req: Request, res: Response) {
  // req.rateLimit enthaltet u. a. resetTime laut Typdefinition/Docs
  const reset = req.rateLimit?.resetTime;
  const resetMs = typeof reset === 'number' ? reset : reset?.getTime?.();
  const retryAfterSec = Math.max(Math.round(((resetMs ?? Date.now() + 10_000) - Date.now()) / 1000), 0);

  const info = req.rateLimit;

  console.warn('⚠️ [rate-limit]: ', {
    route: req.originalUrl,
    method: req.method,
    ip: req.ip,
    remaining: info?.remaining,
    limit: info?.limit,
    resetTime: info?.resetTime?.toISOString?.()
  });

  return res.status(429).json({
    success: false,
    error: 'Rate limit exceeded',
    code: 429,
    retryAfter: retryAfterSec
  });
}

// Export der Stores für Tests
export const globalRateLimitStore = globalStore;
export const emailRateLimitStore = emailStore;
export const devEmailRateLimitStore = devEmailStore;