/** @type {import('next').NextConfig} */
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
          destination: 'http://127.0.0.1:8000/api/:path',
        },
        {
          source: '/media/:path(.*)',
          destination: 'http://127.0.0.1:8000/media/:path',
        },
      ],
    };
  },
};

export default nextConfig;
