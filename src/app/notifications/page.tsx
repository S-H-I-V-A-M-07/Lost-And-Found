'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  channel: string;
  createdAt: string;
  match: {
    lostItem: {
      id: string;
      title: string;
    };
    foundItem: {
      id: string;
      title: string;
    };
  } | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>('demo');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // Get first user for demo purposes
      const usersRes = await fetch('/api/users');
      const users = await usersRes.json();

      if (users.data?.length > 0) {
        setCurrentUserId(users.data[0].id);
        const res = await fetch(`/api/notifications?userId=${users.data[0].id}`);
        const data = await res.json();
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => prev - 1);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  if (loading) {
    return (
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        padding: '1.5rem'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p>Loading notifications...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      padding: '1.5rem'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>
            Notifications
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #e5e5e5',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#fff',
            borderRadius: '0.5rem',
            border: '1px solid #e5e5e5'
          }}>
            <p style={{ color: '#666' }}>No notifications yet.</p>
            <Link
              href="/matches"
              style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#6366f1',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: '0.25rem'
              }}
            >
              View Matches
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            {notifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
                style={{
                  padding: '1rem',
                  backgroundColor: notification.isRead ? '#fff' : '#f0f9ff',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e5e5',
                  cursor: notification.isRead ? 'default' : 'pointer',
                  boxShadow: notification.isRead ? '0 1px 3px rgba(0,0,0,0.05)' : '0 1px 3px rgba(59, 130, 246, 0.1)',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: notification.isRead ? 'normal' : 600
                  }}>
                    {notification.title}
                  </h3>
                  {!notification.isRead && (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#6366f1',
                      color: '#fff',
                      borderRadius: '0.25rem',
      fontSize: '0.75rem'
                    }}>
                      New
                    </span>
                  )}
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: '#666',
                  marginBottom: '0.5rem'
                }}>
                  {notification.message}
                </p>
                {notification.match && (
                  <Link
                    href="/matches"
                    style={{
                      fontSize: '0.75rem',
                      color: '#6366f1',
                      textDecoration: 'none'
                    }}
                  >
                    {notification.match.lostItem.title} ↔ {notification.match.foundItem.title}
                  </Link>
                )}
                <div style={{
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  marginTop: '0.25rem'
                }}>
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}