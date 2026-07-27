'use client';

/**
 * ExportButton — shared download trigger.
 *
 * Props:
 *   onClick   — callback
 *   loading   — bool, shows spinner + disables
 *   label     — button text
 *   format    — format string appended as "Download {format}" (optional)
 *   size      — estimated / actual file size string (optional)
 *   icon      — emoji or JSX icon
 *   disabled  — bool
 *   variant   — 'primary' | 'secondary'
 */
export default function ExportButton({
  onClick,
  loading = false,
  label,
  format,
  size,
  icon = '⬇',
  disabled = false,
  variant = 'primary',
}) {
  const text = label || (format ? `Download ${format}` : 'Download');

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-1)' }}>
      <button
        className={`btn btn-${variant} btn-lg`}
        onClick={onClick}
        disabled={disabled || loading}
        aria-label={text + (size ? ` (${size})` : '')}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <span
              style={{
                display: 'inline-block',
                width: 16,
                height: 16,
                border: '2px solid rgba(0,0,0,0.2)',
                borderTopColor: '#0a0a12',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
              aria-hidden="true"
            />
            Processing…
          </>
        ) : (
          <>
            <span aria-hidden="true">{icon}</span>
            {text}
          </>
        )}
      </button>
      {size && !loading && (
        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          paddingLeft: 'var(--space-1)',
        }}>
          {size}
        </span>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
