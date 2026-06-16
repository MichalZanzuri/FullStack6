import { Link } from 'react-router-dom';

import Button from '../components/ui/Button.jsx';
import PulseLogo from '../components/ui/PulseLogo.jsx';

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: 24,
        background: 'var(--color-brand-gradient-soft)',
      }}
    >
      <PulseLogo variant="mark" size={88} />
      <h1
        style={{
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          color: 'var(--color-text-primary)',
          margin: 0,
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          maxWidth: 380,
          textAlign: 'center',
          fontSize: 14,
          margin: 0,
        }}
      >
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to="/home" style={{ marginTop: 4, textDecoration: 'none' }}>
        <Button size="lg">Take me home</Button>
      </Link>
    </div>
  );
}
