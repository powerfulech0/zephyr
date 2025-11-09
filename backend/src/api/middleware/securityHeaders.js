const helmet = require('helmet');

/**
 * Security headers middleware using helmet.js
 * Implements FR-011: Security best practices
 *
 * Headers configured:
 * - Content-Security-Policy (CSP): Prevents XSS attacks
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - Strict-Transport-Security (HSTS): Enforces HTTPS
 * - X-DNS-Prefetch-Control: Controls DNS prefetching
 * - X-Download-Options: Prevents IE from executing downloads
 * - X-Permitted-Cross-Domain-Policies: Controls cross-domain policies
 */

const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for real-time UI updates
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"], // WebSocket connections to same origin
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // Prevent clickjacking
  frameguard: {
    action: 'deny',
  },

  // Prevent MIME sniffing
  noSniff: true,

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // HSTS - Enforce HTTPS (31536000 seconds = 1 year)
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },

  // Control DNS prefetching
  dnsPrefetchControl: {
    allow: false,
  },

  // Prevent IE from executing downloads in site context
  ieNoOpen: true,

  // Control cross-domain policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },
});

module.exports = securityHeaders;
