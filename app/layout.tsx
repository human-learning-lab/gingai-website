import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'GingAI · Mubadala Brazil SailGP',
    template: '%s · GingAI',
  },
  description: 'Real-time team intelligence, race debrief and voice capture platform for Mubadala Brazil SailGP.',
  metadataBase: new URL('https://gingai.vercel.app'),
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'GingAI',
    title: 'GingAI · Mubadala Brazil SailGP',
    description: 'Real-time team intelligence, race debrief and voice capture platform for Mubadala Brazil SailGP.',
    images: [
      {
        url: '/images/thumbnail.jpg',
        width: 1200,
        height: 630,
        alt: 'GingAI — Mubadala Brazil SailGP team intelligence platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GingAI · Mubadala Brazil SailGP',
    description: 'Real-time team intelligence, race debrief and voice capture platform for Mubadala Brazil SailGP.',
    images: ['/images/thumbnail.jpg'],
  },
  themeColor: '#0D0B08',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet" />
        </head>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
