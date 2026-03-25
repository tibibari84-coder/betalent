export default function NotFound() {
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
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>404</h2>
      <p style={{ fontSize: 15, color: '#B7BDC7', marginBottom: 24 }}>This page could not be found.</p>
      <a
        href="/"
        style={{
          padding: '10px 20px',
          borderRadius: 12,
          backgroundColor: '#B11226',
          color: 'white',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Back to home
      </a>
    </div>
  );
}
