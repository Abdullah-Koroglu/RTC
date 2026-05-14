import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/AuthProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Link — Video Conferencing',
  description: 'Crystal clear video conversations',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/logo-only.png', type: 'image/png' },
    ],
    apple: '/logo-only.png',
  },
  openGraph: {
    title: 'Link',
    description: 'Crystal clear video conversations',
    images: [{ url: '/logo.png' }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${inter.className} antialiased bg-[#0a0c14] text-slate-100`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
