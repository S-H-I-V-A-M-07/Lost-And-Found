'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Stats {
  totalItems: number;
  lostItems: number;
  foundItems: number;
  matches: number;
  unreadNotifications: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats>({
    totalItems: 0,
    lostItems: 0,
    foundItems: 0,
    matches: 0,
    unreadNotifications: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load items stats
        const itemsRes = await fetch('/api/items');
        const items = await itemsRes.json();
        const allItems = items.data || [];
        const lostCount = allItems.filter((i: any) => i.type === 'LOST').length;
        const foundCount = allItems.filter((i: any) => i.type === 'FOUND').length;

        // Load matches count
        const matchesRes = await fetch('/api/matches');
        const matches = await matchesRes.json();

        // Load unread notifications (for first user for demo)
        const usersRes = await fetch('/api/users');
        const users = await usersRes.json();
        if (users.data?.length > 0) {
          const notifRes = await fetch(`/api/notifications?userId=${users.data[0].id}`);
          const notifData = await notifRes.json();
          const unread = notifData.unreadCount || 0;

          setStats({
            totalItems: allItems.length,
            lostItems: lostCount,
            foundItems: foundCount,
            matches: matches.data?.length || 0,
            unreadNotifications: unread,
          });
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };
    loadStats();
  }, []);

  const cards = [
    {
      title: 'Report Item',
      description: 'Report a lost or found item',
      icon: '📋',
      href: '/report',
      color: '#6366f1',
    },
    {
      title: 'View Items',
      description: 'Browse all reported items',
      icon: '📦',
      href: '/items',
      color: '#10b981',
    },
    {
      title: 'Matches',
      description: `View ${stats.matches} potential matches${stats.matches > 0 ? '' : ''}`,
      icon: '🔍',
      href: '/matches',
      color: stats.matches > 0 ? '#8b5cf0' : '#6b7280',
    },
    {
      title: 'Notifications',
      description: `${stats.unreadNotifications} unread`,
      icon: '🔔',
      href: '/notifications',
      color: stats.unreadNotifications > 0 ? '#f59e0b' : '#6b7280',
    },
  ];

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      padding: '1.5rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            marginBottom: '0.5rem'
          }}>
            Lost & Found Management System
          </h1>
          <p style={{
            fontSize: '1.125rem',
            color: '#666'
          }}>
            AI-powered item matching for lost and found items
          </p>
        </div>

        {/* Stats Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#fff',
          borderRadius: '0.5rem',
          border: '1px solid #e5e5e5',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              {stats.totalItems}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Items</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#dc2626'
            }}>
              {stats.lostItems}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>Lost</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#16a34a'
            }}>
              {stats.foundItems}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>Found</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#7c3aed'
            }}>
              {stats.matches}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>Matches</div>
          </div>
        </div>

        {/* Action Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem'
        }}>
          {cards.map(card => (
            <Link
              key={card.title}
              href={card.href}
              style={{
                display: 'block',
                padding: '1.5rem',
                backgroundColor: '#fff',
                borderRadius: '0.5rem',
                border: '1px solid #e5e5e5',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'transform 0.1s, box-shadow 0.1s'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.75rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
                <h2 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  margin: 0
                }}>
                  {card.title}
                </h2>
              </div>
              <p style={{
                fontSize: '0.875rem',
                color: '#666',
                margin: 0
              }}>
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}