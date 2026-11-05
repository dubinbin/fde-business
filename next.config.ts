import type { NextConfig } from 'next';
const config: NextConfig = {
  async redirects() {
    return [
      { source: '/receive', destination: '/door', permanent: false },
      { source: '/send', destination: '/', permanent: false },
      { source: '/android', destination: '/', permanent: false },
      { source: '/respond.html', destination: '/door', permanent: false },
    ];
  },
  async headers() {
    return [
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] },
      { source: '/:path*', headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'X-Frame-Options', value: 'DENY' }] },
    ];
  },
};
export default config;
