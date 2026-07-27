/** @type {import('next').NextConfig} */
const nextConfig = {
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
