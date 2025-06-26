import '@coinbase/onchainkit/styles.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Remix - AI Video Generation with x402 Payments',
  description: 'Transform your Farcaster profile into amazing videos with AI. Powered by x402 payments on Base network.',
  keywords: ['AI', 'video generation', 'Farcaster', 'x402', 'Base network', 'Coinbase Wallet', 'mini app'],
  authors: [{ name: 'Remix Team' }],
  
  // Open Graph metadata for social sharing and embeds
  openGraph: {
    title: 'Remix - AI Video Generation',
    description: 'Transform your Farcaster profile into amazing videos with AI. Powered by x402 payments.',
    type: 'website',
    url: 'https://remix-miniapp.vercel.app',
    siteName: 'Remix',
    images: [
      {
        url: '/remix-logo.png',
        width: 1200,
        height: 630,
        alt: 'Remix - AI Video Generation',
      },
    ],
  },
  
  // Twitter Card metadata
  twitter: {
    card: 'summary_large_image',
    title: 'Remix - AI Video Generation',
    description: 'Transform your Farcaster profile into amazing videos with AI. Powered by x402 payments.',
    images: ['/remix-logo.png'],
  },
  
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Remix',
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Additional meta tags for mini app embedding */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Remix" />
        
        {/* Prevent zooming and ensure proper scaling in mini apps */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        
        {/* Farcaster Mini App Embed - Required for Mini App discovery */}
        <meta name="fc:frame" content='{"version":"next","imageUrl":"https://remix-x402-miniapp-demo.vercel.app/remix-logo.png","button":{"title":"🎬 Remix","action":{"type":"launch_frame","name":"Remix - AI Video Generator","url":"https://remix-x402-miniapp-demo.vercel.app/","splashImageUrl":"https://remix-x402-miniapp-demo.vercel.app/remix-logo-200x200.png","splashBackgroundColor":"#3b82f6"}}}' />
        
        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Preconnect to external domains for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://auth.farcaster.xyz" />
      </head>
      <body className={`${inter.className} h-full antialiased`}>
        <Providers>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 5000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
