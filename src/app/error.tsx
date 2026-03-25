'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#0D0D0E',
        color: '#F5F7FA',
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h2>
      <p style={{ fontSize: 15, color: '#B7BDC7', marginBottom: 24 }}>Please try again.</p>
      <button
        onClick={reset}
        style={{
          padding: '10px 20px',
          borderRadius: 12,
          backgroundColor: '#B11226',
          color: 'white',
          border: 'none',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
      <a
        href="/"
        style={{
          marginTop: 16,
          padding: '10px 20px',
          borderRadius: 12,
          color: '#F5F7FA',
          border: '1px solid rgba(255,255,255,0.2)',
          textDecoration: 'none',
        }}
      >
        Go home
      </a>
    </div>
  );
}
