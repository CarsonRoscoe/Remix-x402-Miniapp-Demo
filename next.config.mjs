/** @type {import('next').NextConfig} */
const nextConfig = {
    turbopack: {},
    serverExternalPackages: ['pino-pretty', 'lokijs', 'encoding'],
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'imagedelivery.net',
        },
        {
          protocol: 'https',
          hostname: 'gateway.pinata.cloud',
        },
        {
          protocol: 'https',
          hostname: 'v3.fal.media',
        },
        {
          protocol: 'https',
          hostname: 'res.cloudinary.com',
        },
        {
          protocol: 'https',
          hostname: 'ipfs.dweb.link',
        },
        {
          protocol: 'https',
          hostname: 'ipfs.io',
        },
      ],
    },
  };
  
  export default nextConfig;
