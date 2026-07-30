import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// Inter is the design system's base font (spec §6).
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SolveX Admin',
  description: 'SolveX back-office',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
