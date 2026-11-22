import type { Metadata } from 'next';
import Link from 'next/link';
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
      <body style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'
      }}>
        <nav style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e5e5e5',
        }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/" style={{
              textDecoration: 'none',
              color: '#111827',
              fontWeight: 600,
            }}>Home</Link>
            <Link href="/report" style={{
              textDecoration: 'none',
              color: '#6b7280',
            }}>Report Item</Link>
            <Link href="/items" style={{
              textDecoration: 'none',
              color: '#6b7280',
            }}>View Items</Link>
            <Link href="/matches" style={{
              textDecoration: 'none',
              color: '#6b7280',
            }}>Matches</Link>
          </div>
        </nav>
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}