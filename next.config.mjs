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

/** Monitor violations in DevTools / reporting API; tighten to enforcing CSP only after tuning. */
securityHeaders.push({
  key: 'Content-Security-Policy-Report-Only',
  value: [
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
  ].join('; '),
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
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
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
