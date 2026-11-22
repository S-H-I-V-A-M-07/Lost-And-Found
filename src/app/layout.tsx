import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lost & Found Management System',
  description: 'AI-powered Lost & Found item matching and management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}