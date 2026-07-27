'use client';

import { useRef, useState, useCallback } from 'react';

/**
 * UploadZone — shared drag-drop + click-to-browse component.
 *
 * Props:
 *   onFiles(FileList) — called when user drops or selects files
 *   accept  — MIME types string for the file input (e.g. "image/*")
 *   multiple — boolean, allows multi-file selection
 *   maxSizeMB — soft ceiling for warning (optional)
 *   hardMaxSizeMB — hard ceiling to block (optional)
 *   label   — short label above icon
 *   hint    — secondary hint text
 *   meta    — small metadata line (formats / size info)
 *   disabled — boolean
 */
export default function UploadZone({
  onFiles,
  accept = '*/*',
  multiple = false,
  maxSizeMB,
  hardMaxSizeMB,
  label = 'Drop your file here',
  hint = 'or click to browse',
  meta,
  disabled = false,
  icon,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = useCallback((files) => {
    if (!files || files.length === 0) return;
    setError(null);

    // Size checks
    if (hardMaxSizeMB) {
      const oversized = Array.from(files).find(f => f.size > hardMaxSizeMB * 1024 * 1024);
      if (oversized) {
        setError(`"${oversized.name}" exceeds the ${hardMaxSizeMB}MB limit and cannot be processed — very large files risk freezing your browser tab.`);
        return;
      }
    }

    onFiles(files);
  }, [onFiles, hardMaxSizeMB]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }, [disabled, handleFiles]);

  const onDragOver = (e) => { e.preventDefault(); if (!disabled) setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onClick = () => { if (!disabled) inputRef.current?.click(); };
  const onKeyDown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } };

  return (
    <div>
      <div
        className={`upload-zone ${dragging ? 'drag-over' : ''} ${disabled ? 'btn-disabled' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={onClick}
        onKeyDown={onKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${label}. ${hint}`}
        aria-disabled={disabled}
      >
        <div className="upload-icon" aria-hidden="true">
          {icon || (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          )}
        </div>
        <div className="upload-title">{label}</div>
        <div className="upload-subtitle">{hint}</div>
        {meta && <div className="upload-meta">{meta}</div>}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={e => handleFiles(e.target.files)}
          style={{ display: 'none' }}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {error && (
        <div className="banner banner-error" style={{ marginTop: 'var(--space-3)' }} role="alert">
          <span className="banner-icon" aria-hidden="true">⛔</span>
          <div className="banner-content">
            <div className="banner-title">File too large</div>
            <div className="banner-msg">{error}</div>
          </div>
          <button className="banner-close" onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}
    </div>
  );
}
