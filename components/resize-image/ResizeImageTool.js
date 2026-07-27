'use client';

import { useState, useCallback } from 'react';
import UploadZone from '@/components/shared/UploadZone';
import ExportButton from '@/components/shared/ExportButton';
import ProgressBar from '@/components/shared/ProgressBar';
import ErrorBanner from '@/components/shared/ErrorBanner';
import JSZip from 'jszip';

const HARD_MB = 60;

export default function ResizeImageTool() {
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('exact');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [percent, setPercent] = useState('');
  const [longest, setLongest] = useState('');
  const [lockRatio, setLockRatio] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = useCallback(async (files) => {
    setError(null);
    const entries = [];
    for (const f of files) {
      if (f.size > HARD_MB * 1024 * 1024) {
        setError({ title: 'File too large', why: f.name + ' exceeds ' + HARD_MB + 'MB.', action: 'Try a smaller file.' });
        return;
      }
      if (!f.type.startsWith('image/')) {
        setError({ title: 'Unsupported file', why: f.name + ' is not an image.', action: 'Upload JPG, PNG, or WebP.' });
        return;
      }
      const url = URL.createObjectURL(f);
      entries.push({ file: f, url, name: f.name, result: null, origW: null, origH: null, newW: null, newH: null, status: 'pending' });
    }
    setItems(entries);
    entries.forEach((item, idx) => {
      const img = new Image();
      img.onload = () => setItems(prev => prev.map((x, i) => i === idx ? { ...x, origW: img.width, origH: img.height } : x));
      img.src = item.url;
    });
  }, []);

  const calcDims = useCallback((ow, oh) => {
    let w = ow, h = oh;
    if (mode === 'exact' && width && height) { w = parseInt(width); h = parseInt(height); }
    else if (mode === 'percent' && percent) { const p = parseFloat(percent) / 100; w = Math.round(ow * p); h = Math.round(oh * p); }
    else if (mode === 'longest' && longest) {
      const max = parseInt(longest);
      if (ow > oh) { w = max; h = Math.round(oh * (max / ow)); } else { h = max; w = Math.round(ow * (max / oh)); }
    }
    return { w, h };
  }, [mode, width, height, percent, longest]);

  const processAll = useCallback(async () => {
    setLoading(true); setError(null);
    const processed = [];
    for (let i = 0; i < items.length; i++) {
      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'processing' } : item));
      try {
        const item = items[i];
        const result = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const dims = calcDims(img.width, img.height);
            const canvas = document.createElement('canvas');
            canvas.width = dims.w; canvas.height = dims.h;
            canvas.getContext('2d').drawImage(img, 0, 0, dims.w, dims.h);
            canvas.toBlob((blob) => {
              URL.revokeObjectURL(item.url);
              resolve({ ...item, result: blob, newW: dims.w, newH: dims.h, status: 'done' });
            }, 'image/png');
          };
          img.src = item.url;
        });
        setItems(prev => prev.map((item, idx) => idx === i ? result : item));
        processed.push(result);
      } catch (err) {
        setError({ title: 'Processing failed', why: 'Error on ' + items[i].name + ': ' + err.message, action: 'Try again.' });
        setLoading(false); return;
      }
    }
    setLoading(false);
  }, [items, calcDims]);

  const downloadSingle = useCallback((blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name.replace(/\.[^.]+$/, '') + '-resized.png'; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadAll = useCallback(async () => {
    const zip = new JSZip();
    items.forEach(item => { if (item.result) zip.file(item.name.replace(/\.[^.]+$/, '') + '-resized.png', item.result); });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'resized-images.zip'; a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  const allDone = items.length > 0 && items.every(i => i.status === 'done');

  return (
    <div>
      {error && <ErrorBanner title={error.title} why={error.why} action={error.action} variant="error" onRetry={() => setError(null)} />}

      {items.length === 0 ? (
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <UploadZone onFiles={handleFiles} accept="image/jpeg,image/png,image/webp" multiple label="Drop images here" hint="Batch resize multiple images" meta="JPG, PNG, WebP — up to 60MB" maxSizeMB={20} hardMaxSizeMB={HARD_MB} />
        </div>
      ) : (
        <div>
          <div className="action-bar" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Mode:</label>
<select className="select" value={mode} onChange={e => setMode(e.target.value)}>
                <option value="exact">Exact W\u00d7H</option>
                <option value="percent">Percentage</option>
                <option value="longest">Longest edge</option>
              </select>
            </div>
            {mode === 'exact' && (
              <>
                <input className="input input-mono" type="number" placeholder="W" value={width} onChange={e => setWidth(e.target.value)} style={{ width: 70 }} />
                <span style={{ color: 'var(--text-tertiary)' }}>\u00d7</span>
                <input className="input input-mono" type="number" placeholder="H" value={height} onChange={e => setHeight(e.target.value)} style={{ width: 70 }} />
                {lockRatio && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>(ratio locked)</span>}
              </>
            )}
            {mode === 'percent' && (
              <input className="input input-mono" type="number" placeholder="% (e.g. 50)" value={percent} onChange={e => setPercent(e.target.value)} style={{ width: 80 }} />
            )}
            {mode === 'longest' && (
              <input className="input input-mono" type="number" placeholder="Max px" value={longest} onChange={e => setLongest(e.target.value)} style={{ width: 80 }} />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {items.map((item, idx) => {
              const dims = item.origW ? calcDims(item.origW, item.origH) : null;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={item.url} alt="File preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
 </div>
 <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{item.name}</span>
 {item.origW && (
 <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
 {item.origW}\u00d7{item.origH}
 {dims && (dims.w !== item.origW || dims.h !== item.origH) ? ' \u2192 ' + dims.w + '\u00d7' + dims.h : ''}
 </span>
 )}
 <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: item.status === 'done' ? 'var(--success)' : item.status === 'processing' ? 'var(--accent)' : 'var(--text-tertiary)' }}>
 {item.status === 'pending' && 'Waiting'}
 {item.status === 'processing' && 'Processing\u2026'}
 {item.status === 'done' && '\u2713 ' + (item.result.size / 1024).toFixed(1) + 'KB'}
 </span>
 {item.status === 'done' && (
 <button className="btn btn-sm btn-ghost" onClick={() => downloadSingle(item.result, item.name)}>Download</button>
 )}
 </div>
 );
 })}
 </div>

 <div className="action-bar" style={{ marginTop: 'var(--space-6)', justifyContent: 'center' }}>
 {!allDone && (
 <button className="btn btn-primary btn-lg" onClick={processAll} disabled={loading}>
 {loading ? 'Processing\u2026' : 'Resize ' + items.length + ' image' + (items.length > 1 ? 's' : '')}
 </button>
 )}
 {allDone && items.length > 1 && (
 <button className="btn btn-primary btn-lg" onClick={downloadAll}>Download All as ZIP</button>
 )}
 {allDone && (
 <button className="btn btn-secondary btn-lg" onClick={() => { items.forEach(i => URL.revokeObjectURL(i.url)); setItems([]); setError(null); }}>Resize More</button>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
