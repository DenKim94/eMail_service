import rateLimit from 'express-rate-limit';

// Globaler Rate-Limiter für alle Endpunkte
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100,                 // Max 100 Requests pro IP in 15 Minuten
  message: {
    success: false,
    error: 'Too many requests from this IP address. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Rate-Limit-Header aktivieren
  legacyHeaders: false,
  keyGenerator: (req) => { 
    // TODO: IP-Ermittlung anpassen, falls hinter Proxy [12.09.2025]
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
});

// Spezifischer E-Mail Rate-Limiter - restriktiver
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 10, // Max 10 E-Mails pro IP pro Stunde
  standardHeaders: true,
  skipFailedRequests: false, // Auch fehlgeschlagene Requests zählen
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    console.warn(`⚠️ Email rate limit exceeded for IP: ${req.ip}`);

    const resetTime = req.rateLimit?.resetTime;
    const resetTimeNum = Number(resetTime) || 0;
    const retryAfter = resetTimeNum > 0 ? Math.round((resetTimeNum - Date.now()) / 1000) : 3600;

    res.status(429).json({
      success: false,
      error: 'Email rate limit exceeded',
      code: 429,
      retryAfter: Math.max(retryAfter, 0) 
    });
  }
});