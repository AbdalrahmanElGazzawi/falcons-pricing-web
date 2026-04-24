/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
    serverComponentsExternalPackages: ['pdfkit', 'fontkit'],
  },
  async headers() {
    return [
      {
        source: '/client/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
