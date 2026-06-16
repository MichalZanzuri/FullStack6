import styles from '../../styles/PulseLogo.module.css';

/**
 * PulseLogo — animated brand mark for the Pulse app.
 *
 * variants:
 *  - "hero"     → big splash for /login & /register (with rings + tagline)
 *  - "wordmark" → just the gradient "Pulse" text
 *  - "mark"     → just the icon, no animation
 */
export default function PulseLogo({ variant = 'hero', size = 176, tagline = 'Share your moments' }) {
  if (variant === 'mark') {
    return <PulseMark size={size} animated={false} />;
  }
  if (variant === 'wordmark') {
    return <span className={styles.wordmark}>Pulse</span>;
  }
  return (
    <div className={styles.heroRoot}>
      <div className={styles.heroFloat}>
        <div className={styles.glow} aria-hidden="true" />
        <PulseMark size={size} animated />
      </div>
      <div className={styles.copy}>
        <h1 className={styles.wordmark}>Pulse</h1>
        <p className={styles.tagline}>{tagline}</p>
      </div>
      <div className={`${styles.ring} ${styles.ringOuter}`} aria-hidden="true" />
      <div className={`${styles.ring} ${styles.ringInner}`} aria-hidden="true" />
    </div>
  );
}

function PulseMark({ size = 176, animated = false }) {
  return (
    <svg
      viewBox="0 0 220 220"
      width={size}
      height={size}
      className={animated ? styles.markAnimated : styles.mark}
      role="img"
      aria-label="Pulse logo"
    >
      <defs>
        <linearGradient id="pulse-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCAF45" />
          <stop offset="25%" stopColor="#F77737" />
          <stop offset="50%" stopColor="#E1306C" />
          <stop offset="75%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
        <linearGradient id="pulse-line-grad" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#F77737" />
          <stop offset="50%" stopColor="#E1306C" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>

      <rect
        x="10"
        y="10"
        width="200"
        height="200"
        rx="52"
        ry="52"
        fill="none"
        stroke="url(#pulse-grad)"
        strokeWidth="8"
      />
      <circle
        cx="110"
        cy="110"
        r="58"
        fill="none"
        stroke="url(#pulse-grad)"
        strokeWidth="5"
        opacity="0.35"
      />
      <path
        d="M 28,110 L 62,110 L 78,110 L 88,78 L 100,142 L 112,62 L 124,155 L 134,88 L 142,110 L 158,110 L 192,110"
        fill="none"
        stroke="url(#pulse-line-grad)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated ? styles.pulseLine : ''}
      />
      <circle cx="160" cy="58" r="7" fill="url(#pulse-grad)" opacity="0.6" />
    </svg>
  );
}
