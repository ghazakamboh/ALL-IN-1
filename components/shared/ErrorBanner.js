'use client';

import { useState } from 'react';

/**
 * ErrorBanner — shared error display following the spec's three-part pattern:
 *   what happened / why / what to do next.
 *
 * Props:
 *   title   — "what happened" (required)
 *   why     — "why it likely happened" (optional)
 *   action  — "concrete next step" text (optional)
 *   onRetry — callback if a retry action makes sense
 *   variant — 'error' | 'warning' | 'info' | 'success'
 *   onDismiss — optional callback; if provided, shows a close button
 */
export default function ErrorBanner({
  title,
  why,
  action,
  onRetry,
  variant = 'error',
  onDismiss,
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const icons = {
    error:   '⚠️',
    warning: '⚠️',
    info:    'ℹ️',
    success: '✓',
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`banner banner-${variant} animate-in`}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <span className="banner-icon" aria-hidden="true">{icons[variant]}</span>
      <div className="banner-content">
        <div className="banner-title">{title}</div>
        {why   && <div className="banner-msg" style={{ marginTop: 2 }}>{why}</div>}
        {action && (
          <div className="banner-msg" style={{ marginTop: 4, fontWeight: 500 }}>
            → {action}
          </div>
        )}
        {onRetry && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={onRetry}
            style={{ marginTop: 'var(--space-3)' }}
          >
            Try again
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          className="banner-close"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
