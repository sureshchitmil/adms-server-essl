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
      {
        source: '/iclock/fdata',
        destination: '/api/adms/fdata',
      },
      {
        source: '/iclock/deviceinfo',
        destination: '/api/adms/deviceinfo',
      },
      {
        source: '/iclock/devicecmd',
        destination: '/api/adms/devicecmd',
      },
      {
        source: '/iclock/upload',
        destination: '/api/adms/upload',
      },
      {
        source: '/iclock/log',
        destination: '/api/adms/log',
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

