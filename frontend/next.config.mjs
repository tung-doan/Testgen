/** @type {import('next').NextConfig} */
const internalApiUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8000';

const nextConfig = {
  reactStrictMode: false,
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path(.*)',
          destination: `${internalApiUrl}/api/:path`,
        },
        {
          source: '/media/:path(.*)',
          destination: `${internalApiUrl}/media/:path`,
        },
      ],
    };
  },
};

export default nextConfig;
