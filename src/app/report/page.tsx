'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ItemType = 'LOST' | 'FOUND';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export default function ReportPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [type, setType] = useState<ItemType>('LOST');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [incidentTime, setIncidentTime] = useState(new Date().toISOString().slice(0, 19));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => {
        setUsers(data.data);
        if (data.data.length > 0) {
          setSelectedUser(data.data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('File too large. Maximum size is 5MB.');
        return;
      }

      setError('');
      setImageFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let imageUrl = null;

      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.fileName;
      }

      const itemResponse = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          type,
          title,
          description,
          imageUrl,
          locationName,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          incidentTime,
        }),
      });

      if (!itemResponse.ok) {
        const errData = await itemResponse.json();
        throw new Error(errData.error || 'Failed to create item');
      }

      const itemData = await itemResponse.json();
      setSuccess('Item reported successfully!');

      setTimeout(() => {
        router.push('/items');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const typeName = type === 'LOST' ? 'Lost' : 'Found';

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      padding: '1.5rem'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        margin: '0 auto'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          Report {typeName} Item
        </h1>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Report By
          </label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid #ccc',
            }}
          >
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
            <option value="">+ Add new user...</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Item Type
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="radio"
                name="type"
                checked={type === 'LOST'}
                onChange={() => setType('LOST')}
              />
              Lost
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="radio"
                name="type"
                checked={type === 'FOUND'}
                onChange={() => setType('FOUND')}
              />
              Found
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., MacBook Pro 16 inch - Space Gray"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.25rem',
                border: '1px solid #ccc',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item in detail..."
              required
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.25rem',
                border: '1px solid #ccc',
                resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Location</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g., University Library - Main Entrance"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.25rem',
                border: '1px solid #ccc',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Incident Time
            </label>
            <input
              type="datetime-local"
              value={incidentTime.slice(0, 19)}
              onChange={(e) => setIncidentTime(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.25rem',
                border: '1px solid #ccc',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Image (optional, max 5MB)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              style={{
                width: '100%',
                padding: '0.5rem',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '0.25rem'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#dcfce7',
              color: '#166534',
              borderRadius: '0.25rem'
            }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedUser}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: loading || !selectedUser ? '#9ca3af' : '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: loading || !selectedUser ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {loading ? 'Submitting...' : 'Report ' + typeName + ' Item'}
          </button>
        </form>
      </div>
    </main>
  );
}