import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const isVercelProduction = process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production';

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Allow first-party studio recording. Empty allowlists (camera=()) block getUserMedia entirely.
  // Vercel serves these from Next; keep vercel.json minimal so nothing overrides this.
  {
    key: 'Permissions-Policy',
    value: 'camera=*, microphone=*, geolocation=(), interest-cohort=()',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin-allow-popups',
  },
];

if (isVercelProduction) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}

const cspPageDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://*.gstatic.com https://*.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "media-src 'self' https: blob:",
  "frame-src 'self' https://accounts.google.com https://js.stripe.com https://hooks.stripe.com https://*.google.com",
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
].join('; ');

/**
 * HTML pages: Report-Only by default. Set CSP_ENFORCE=1 at build time to send enforcing
 * Content-Security-Policy (same directives). Roll back by unsetting if violations break UX.
 */
const cspEnforce = process.env.CSP_ENFORCE === '1';
securityHeaders.push({
  key: cspEnforce ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only',
  value: cspPageDirectives,
});

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  async headers() {
    /** JSON API responses: lock down framing / MIME confusion; no-store for sensitive data. */
    const apiSecurityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      {
        key: 'Content-Security-Policy',
        value: "default-src 'none'; frame-ancestors 'none'",
      },
      { key: 'Cache-Control', value: 'no-store, max-age=0' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
    ];
    return [
      { source: '/api/:path*', headers: apiSecurityHeaders },
      { source: '/:path*', headers: securityHeaders },
    ];
  },
  async rewrites() {
    return [
      /** Legacy comment POST — single handler: POST /api/comment */
      { source: '/api/comments/create', destination: '/api/comment' },
    ];
  },
  ...(basePath && { basePath }),
};

const sentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim());

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      silent: !process.env.CI,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      hideSourceMaps: true,
      automaticVercelMonitors: true,
    })
  : nextConfig;
