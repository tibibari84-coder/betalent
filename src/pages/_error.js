/**
 * Pages Router error page – required so Next.js dev server can resolve error components.
 * App Router uses app/error.tsx for in-app errors; this file satisfies the framework fallback.
 */
function Error({ statusCode }) {
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
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
        {statusCode ? `Error ${statusCode}` : 'Something went wrong'}
      </h2>
      <p style={{ fontSize: 15, color: '#B7BDC7', marginBottom: 24 }}>
        {statusCode === 404 ? 'This page could not be found.' : 'Please try again.'}
      </p>
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
        Go home
      </a>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
