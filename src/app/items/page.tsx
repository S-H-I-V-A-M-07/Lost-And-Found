'use client';

import { useState, useEffect } from 'react';

// Types
type ItemType = 'LOST' | 'FOUND';
type ItemStatus = 'OPEN' | 'MATCHED' | 'CLAIMED' | 'CLOSED';

interface ExtractedAttributes {
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  color?: string;
  uniqueMarks?: string;
  size?: string;
  keywords: string[];
}

interface Item {
  id: string;
  userId: string;
  type: ItemType;
  title: string;
  description: string;
  extractedAttributes: string | null;
  imageUrl: string | null;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  incidentTime: string;
  status: ItemStatus;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedType, setSelectedType] = useState<ItemType | ''>('');
  const [activeUser, setActiveUser] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Fetch users
  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => {
        setUsers(data.data);
        if (data.data.length > 0) {
          setActiveUser(data.data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        let url = '/api/items?limit=50';
        if (selectedType) {
          url += `&type=${selectedType}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        setItems(data.data);
      } catch (error) {
        console.error('Failed to fetch items:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [selectedType]);

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      padding: '1.5rem'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>
          Lost & Found Items
        </h1>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ItemType | '')}
            style={{
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid #ccc',
            }}
          >
            <option value="">All Items</option>
            <option value="LOST">Lost Items</option>
            <option value="FOUND">Found Items</option>
          </select>

          <select
            value={activeUser}
            onChange={(e) => setActiveUser(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid #ccc',
            }}
          >
            <option value="">All Users</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <p>Loading items...</p>
      ) : items.length === 0 ? (
        <p>No items found.</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1rem'
        }}>
          {items.map(item => {
            let attrs: ExtractedAttributes = { category: 'Other', keywords: [] };
            if (item.extractedAttributes) {
              try {
                attrs = JSON.parse(item.extractedAttributes);
              } catch {}
            }

            return (
              <div key={item.id} style={{
                border: '1px solid #e5e5e5',
                borderRadius: '0.5rem',
                padding: '1rem',
                backgroundColor: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: item.type === 'LOST' ? '#fee2e2' : '#cff3e6',
                    color: item.type === 'LOST' ? '#991b1b' : '#065f46',
                  }}>
                    {item.type}
                  </span>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                  }}>
                    {item.status}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {item.title}
                </h3>

                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: '0.25rem',
                      marginBottom: '0.5rem',
                    }}
                  />
                )}

                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                  {item.description}
                </p>

                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <strong>Location:</strong> {item.locationName}
                </div>

                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <strong>Found:</strong> {new Date(item.incidentTime).toLocaleString()}
                </div>

                {attrs.category !== 'Other' && (
                  <div style={{ fontSize: '0.875rem' }}>
                    <strong>Category:</strong> {attrs.category}
                    {attrs.brand && <span> • {attrs.brand}</span>}
                    {attrs.color && <span> • {attrs.color}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}