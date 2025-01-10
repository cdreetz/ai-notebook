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
}

module.exports = nextConfig
