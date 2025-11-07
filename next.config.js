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
};

module.exports = nextConfig;

