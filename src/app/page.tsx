import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '40rem',
        width: '100%',
        padding: '1.5rem'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Lost & Found Management System
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#666' }}>
            AI-powered item matching for lost and found items
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#fff',
            borderRadius: '0.5rem',
            border: '1px solid #e5e5e5',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Database Status
            </h2>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              SQLite database initialized with Prisma ORM
            </p>
            <Link
              href="/api/health"
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                backgroundColor: '#6366f1',
                color: '#fff',
                borderRadius: '0.25rem',
                textDecoration: 'none',
                transition: 'background-color 0.2s'
              }}
            >
              Check Health
            </Link>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#fff',
            borderRadius: '0.5rem',
            border: '1px solid #e5e5e5',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              API Endpoints
            </h2>
            <ul style={{ color: '#666', marginBottom: '1rem' }}>
              <li><code style={{ backgroundColor: '#f5f5f5', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>GET /api/health</code></li>
              <li><code style={{ backgroundColor: '#f5f5f5', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>GET/POST /api/users</code></li>
              <li><code style={{ backgroundColor: '#f5f5f5', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>GET/POST /api/items</code></li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}