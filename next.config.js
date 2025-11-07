/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/iclock/cdata',
        destination: '/api/adms/cdata',
      },
      {
        source: '/iclock/getrequest',
        destination: '/api/adms/getrequest',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
  },
};

module.exports = nextConfig;

