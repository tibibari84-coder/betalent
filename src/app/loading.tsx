export default function Loading() {
  return (
    <div
      style={{
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0D0D0E',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '2px solid rgba(255,255,255,0.1)',
          borderTopColor: '#B11226',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}
