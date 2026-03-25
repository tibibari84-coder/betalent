/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  async rewrites() {
    return [
      /** Legacy comment POST — single handler: POST /api/comment */
      { source: '/api/comments/create', destination: '/api/comment' },
    ];
  },
  ...(basePath && { basePath }),
};

export default nextConfig;
