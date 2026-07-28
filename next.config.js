/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    viewTransition: true,
  },
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.recent.design",
      },
    ],
    unoptimized: true,
  },
};

module.exports = nextConfig;
