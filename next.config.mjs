/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/bloom-tracker-social.png',
          destination: '/api/bloom-tracker-social.png',
        },
      ],
    };
  },
};
export default nextConfig;
