'use client';

/**
 * FileSizeWarning — soft + hard ceiling banner shown when file size is borderline.
 *
 * Props:
 *   fileName    — name of the file
 *   fileSizeMB  — actual size in MB
 *   softMB      — soft ceiling
 *   hardMB      — hard ceiling (optional)
 *   onProceed   — callback if user chooses to proceed anyway (soft ceiling only)
 *   onDismiss   — callback to dismiss
 */
export default function FileSizeWarning({ fileName, fileSizeMB, softMB, hardMB, onProceed, onDismiss }) {
  const isHard = hardMB && fileSizeMB > hardMB;

  if (isHard) {
    return (
      <div className="banner banner-error animate-in" role="alert">
        <span className="banner-icon" aria-hidden="true">⛔</span>
        <div className="banner-content">
          <div className="banner-title">File too large to process</div>
          <div className="banner-msg">
            "{fileName}" is {fileSizeMB.toFixed(1)}MB, which exceeds the {hardMB}MB hard limit.
            Files this large would likely freeze your browser tab since everything runs locally on your device.
            Please try a smaller file.
          </div>
        </div>
        {onDismiss && (
          <button className="banner-close" onClick={onDismiss} aria-label="Dismiss">×</button>
        )}
      </div>
    );
  }

  return (
    <div className="banner banner-warning animate-in" role="status">
      <span className="banner-icon" aria-hidden="true">⚠️</span>
      <div className="banner-content">
        <div className="banner-title">Large file — may be slow</div>
        <div className="banner-msg">
          "{fileName}" is {fileSizeMB.toFixed(1)}MB (soft limit: {softMB}MB).
          Processing may take a moment on this device since everything runs locally in your browser.
          You can proceed or try a smaller version of the file.
        </div>
        {onProceed && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <button className="btn btn-sm btn-secondary" onClick={onProceed}>
              Proceed anyway
            </button>
            {onDismiss && (
              <button className="btn btn-sm btn-ghost" onClick={onDismiss}>
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
