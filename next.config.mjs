/** @type {import('next').NextConfig} */
const nextConfig = {
    // Silence warnings
    // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
    webpack: (config) => {
      config.externals.push('pino-pretty', 'lokijs', 'encoding');
      return config;
    },
    experimental: {
      nodeMiddleware: true,
    },
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
  