import '@coinbase/onchainkit/styles.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

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

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL;
  
  return {
    title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
    keywords: ['AI', 'video generation', 'Farcaster', 'x402', 'Base network', 'Coinbase Wallet', 'mini app'],
    authors: [{ name: 'Remix Team' }],
    
    openGraph: {
      title: process.env.NEXT_PUBLIC_APP_OG_TITLE,
      description: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
      type: 'website',
      url: URL,
      siteName: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      images: [
        {
          url: process.env.NEXT_PUBLIC_APP_OG_IMAGE || '/remix-logo.png',
          width: 1200,
          height: 630,
          alt: process.env.NEXT_PUBLIC_APP_OG_TITLE,
        },
      ],
    },
    
    twitter: {
      card: 'summary_large_image',
      title: process.env.NEXT_PUBLIC_APP_OG_TITLE,
      description: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
      images: [process.env.NEXT_PUBLIC_APP_OG_IMAGE || '/remix-logo.png'],
    },
    
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
    },
    
    formatDetection: {
      telephone: false,
    },
    
    robots: {
      index: false,
      follow: false,
    },
    
    other: {
      'fc:frame': JSON.stringify({
        version: "1",
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
        button: {
          title: `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME}`,
          action: {
            type: "launch_frame",
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
            url: URL,
            splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE,
            splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased bg-background`}>
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
