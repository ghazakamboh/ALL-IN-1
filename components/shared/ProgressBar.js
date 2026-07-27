'use client';

/**
 * ProgressBar — shared progress indicator.
 *
 * Props:
 *   value     — number 0-100, or null for indeterminate
 *   label     — text shown beside the bar
 *   sublabel  — smaller secondary text
 *   variant   — 'default' | 'success' | 'error'
 */
export default function ProgressBar({ value, label, sublabel, variant = 'default' }) {
  const isIndeterminate = value === null || value === undefined;

  const barStyle = {
    width: isIndeterminate ? '40%' : `${Math.min(100, Math.max(0, value))}%`,
  };

  if (variant === 'success') {
    barStyle.background = 'linear-gradient(90deg, var(--success), #4ade80)';
  } else if (variant === 'error') {
    barStyle.background = 'var(--error)';
  }

  return (
    <div style={{ width: '100%' }}>
      {(label || sublabel) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 'var(--space-2)',
          gap: 'var(--space-2)',
        }}>
          {label && (
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {label}
            </span>
          )}
          {sublabel && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {sublabel}
            </span>
          )}
        </div>
      )}

      <div
        className="progress-wrap"
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div
          className={`progress-bar ${isIndeterminate ? 'indeterminate' : ''}`}
          style={barStyle}
        />
      </div>

      {!isIndeterminate && (
        <div style={{
          marginTop: 'var(--space-1)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          textAlign: 'right',
        }}>
          {Math.round(value)}%
        </div>
      )}
    </div>
  );
}
