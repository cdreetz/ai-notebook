/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      child_process: false,
      fs: false,
      'fs/promises': false,
      path: false,
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/ws',
        destination: 'http://localhost:3001',
      },
    ];
  },
};

module.exports = nextConfig;
