export default function ComingSoon({ title, description }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '80px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'var(--color-brand-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 28,
        }}
      >
        ✨
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{title}</h1>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: 380 }}>{description}</p>
    </div>
  );
}
