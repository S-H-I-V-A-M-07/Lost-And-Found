'use client';

import { useState, useEffect } from 'react';

interface Match {
  id: string;
  status: string;
  totalScore: number;
  imageScore: number;
  descriptionScore: number;
  locationScore: number;
  matchReason: string;
  createdAt: string;
  lostItem: {
    id: string;
    type: string;
    title: string;
    extractedAttributes: string | null;
    imageUrl: string | null;
    locationName: string;
    incidentTime: string;
  };
  foundItem: {
    id: string;
    type: string;
    title: string;
    extractedAttributes: string | null;
    imageUrl: string | null;
    locationName: string;
    incidentTime: string;
  };
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(0.5);

  useEffect(() => {
    fetchMatches();
  }, [minScore]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches?minScore=${minScore}`);
      const data = await res.json();
      setMatches(data.data || []);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMatchStatus = async (matchId: string, status: string) => {
    try {
      await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchMatches();
    } catch (error) {
      console.error('Failed to update match:', error);
    }
  };

  const parseAttrs = (attrs: string | null) => {
    if (!attrs) return null;
    try {
      return JSON.parse(attrs);
    } catch {
      return null;
    }
  };

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
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          Potential Matches
        </h1>

        {/* Filter */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label>
            Minimum Score: {minScore}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={minScore}
              onChange={(e) => setMinScore(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </label>
        </div>

        {loading ? (
          <p>Loading matches...</p>
        ) : matches.length === 0 ? (
          <p>No matches found above threshold.</p>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {matches.map(match => {
              const lostAttrs = parseAttrs(match.lostItem.extractedAttributes);
              const foundAttrs = parseAttrs(match.foundItem.extractedAttributes);

              return (
                <div key={match.id} style={{
                  border: '1px solid #e5e5e5',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  backgroundColor: '#fff',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <h2 style={{ margin: 0 }}>
                      {match.lostItem.type} ↔ {match.foundItem.type}
                    </h2>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      backgroundColor: match.totalScore > 0.8 ? '#dcfce7' :
                                       match.totalScore > 0.65 ? '#fef3c7' : '#fee2e2',
                      color: match.totalScore > 0.8 ? '#166534' :
                             match.totalScore > 0.65 ? '#92400e' : '#991b1b',
                    }}>
                      {Math.round(match.totalScore * 100)}% match
                    </span>
                  </div>

                  {/* Score breakdown */}
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
                    }}>
                      <span>Image: </span>
                      <span style={{ fontWeight: 600 }}>{Math.round(match.imageScore * 100)}%</span>
                    </div>
                    <div style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
                    }}>
                      <span>Desc: </span>
                      <span style={{ fontWeight: 600 }}>{Math.round(match.descriptionScore * 100)}%</span>
                    </div>
                    <div style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
                    }}>
                      <span>Loc: </span>
                      <span style={{ fontWeight: 600 }}>{Math.round(match.locationScore * 100)}%</span>
                    </div>
                  </div>

                  {/* Items comparison */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '0.25rem'
                    }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Lost Item
                      </h3>
                      {match.lostItem.imageUrl && (
                        <img src={match.lostItem.imageUrl} alt={match.lostItem.title}
                          style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '0.25rem' }}
                        />
                      )}
                      <p style={{ fontSize: '0.875rem' }}><strong>{match.lostItem.title}</strong></p>
                      <p style={{ fontSize: '0.75rem', color: '#666' }}>{match.lostItem.locationName}</p>
                      {lostAttrs && (
                        <p style={{ fontSize: '0.75rem', color: '#666' }}>
                          {lostAttrs.color} • {lostAttrs.brand}
                        </p>
                      )}
                    </div>

                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '0.25rem'
                    }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Found Item
                      </h3>
                      {match.foundItem.imageUrl && (
                        <img src={match.foundItem.imageUrl} alt={match.foundItem.title}
                          style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '0.25rem' }}
                        />
                      )}
                      <p style={{ fontSize: '0.875rem' }}><strong>{match.foundItem.title}</strong></p>
                      <p style={{ fontSize: '0.75rem', color: '#666' }}>{match.foundItem.locationName}</p>
                      {foundAttrs && (
                        <p style={{ fontSize: '0.75rem', color: '#666' }}>
                          {foundAttrs.color} • {foundAttrs.brand}
                        </p>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: '#666' }}>
                    <strong>Reason:</strong> {match.matchReason}
                  </p>

                  {/* Action buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '1rem'
                  }}>
                    {match.status === 'PENDING_REVIEW' && (
                      <>
                        <button
                          onClick={() => updateMatchStatus(match.id, 'CONFIRMED_BY_OWNER')}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                          }}
                        >
                          Confirm Match
                        </button>
                        <button
                          onClick={() => updateMatchStatus(match.id, 'REJECTED')}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#6b7280',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                          }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {match.status === 'CONFIRMED_BY_OWNER' && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                      }}>
                        Confirmed
                      </span>
                    )}
                    {match.status === 'REJECTED' && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                      }}>
                        Rejected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}