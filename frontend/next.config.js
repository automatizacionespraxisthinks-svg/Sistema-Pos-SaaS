/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // In local dev (npm run dev), proxy /api/* to the API gateway so relative
  // URLs work without Nginx. In production, Nginx handles this proxy.
  async rewrites() {
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${gatewayUrl}/api/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
