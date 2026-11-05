import type { NextConfig } from 'next';

// Scoped to what this app actually loads: Supabase (API + Storage photos),
// the world map's remote GeoJSON from jsdelivr, and inline styles (used
// extensively for dynamic values throughout the map/tree/case views).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://*.supabase.co blob: data:",
  "connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  transpilePackages: ['react-simple-maps', 'react-d3-tree'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
