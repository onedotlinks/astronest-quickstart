import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AstroNest quickstart',
  description: 'A Vedic chart, the running daśā and a domain reading from the AstroNest Developer API.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
