'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import UploadZone from '@/components/shared/UploadZone';
import ExportButton from '@/components/shared/ExportButton';
import ProgressBar from '@/components/shared/ProgressBar';
import ErrorBanner from '@/components/shared/ErrorBanner';
import JSZip from 'jszip';

const POSITIONS = [
  { id: 'tl', label: 'Top-Left' }, { id: 'tc', label: 'Top-Center' }, { id: 'tr', label: 'Top-Right' },
  { id: 'cl', label: 'Center-Left' }, { id: 'cc', label: 'Center' }, { id: 'cr', label: 'Center-Right' },
  { id: 'bl', label: 'Bottom-Left' }, { id: 'bc', label: 'Bottom-Center' }, { id: 'br', label: 'Bottom-Right' },
];

function calcPos(px, py, bw, bh, ww, wh, pad) {
  let x, y;
  if (px === 'l') x = pad;
  else if (px === 'c') x = (bw - ww) / 2;
  else x = bw - ww - pad;
  if (py === 't') y = pad;
  else if (py === 'c') y = (bh - wh) / 2;
  else y = bh - wh - pad;
  return { x, y };
}

export default function WatermarkTool() {
  const [tab, setTab] = useState('images');
  const [bgItems, setBgItems] = useState([]);
  const [watermarkUrl, setWatermarkUrl] = useState(null);
  const [watermarkFile, setWatermarkFile] = useState(null);
  const [position, setPosition] = useState('br');
  const [opacity, setOpacity] = useState(50);
  const [scale, setScale] = useState(20);
  const [padding, setPadding] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processed, setProcessed] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const canvasRef = useRef(null);

  const handleBgFiles = useCallback(async (files) => {
    setError(null);
    setProcessed([]);
    setPreviewUrl(null);
    const entries = [];
    for (const f of files) {
      const url = URL.createObjectURL(f);
      entries.push({ file: f, url, name: f.name, status: 'pending' });
    }
    setBgItems(entries);
  }, []);

  const handleWatermark = useCallback((files) => {
    const f = files[0];
    if (!f) return;
    if (watermarkUrl) URL.revokeObjectURL(watermarkUrl);
    setWatermarkUrl(URL.createObjectURL(f));
    setWatermarkFile(f);
  }, [watermarkUrl]);

  useEffect(() => {
    return () => { if (watermarkUrl) URL.revokeObjectURL(watermarkUrl); };
  }, [watermarkUrl]);

  useEffect(() => {
    if (!watermarkUrl || bgItems.length === 0) { setPreviewUrl(null); return; }
    const img = new Image();
    const wm = new Image();
    let loaded = 0;
    const tryRender = () => {
      if (loaded < 2) return;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const ww = Math.round(iw * (scale / 100));
      const wh = Math.round(ww * (wm.naturalHeight / wm.naturalWidth));
      const pos = position;
      const px = pos[1] || (pos === 'cc' ? 'c' : pos[0] === 't' ? 'l' : pos[0] === 'b' ? 'l' : 'l');
      const py = pos[0] === 't' ? 't' : pos[0] === 'c' || (pos.length === 2 && pos[0] !== 't' && pos[0] !== 'b') ? 'c' : 'b';
      const pad = padding;
      const coords = calcPos(px, py, iw, ih, ww, wh, pad);
      const canvas = document.createElement('canvas');
      canvas.width = iw; canvas.height = ih;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      ctx.globalAlpha = opacity / 100;
      ctx.drawImage(wm, coords.x, coords.y, ww, wh);
      ctx.globalAlpha = 1;
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewUrl(dataUrl);
    };
    img.onload = () => { loaded++; tryRender(); };
    wm.onload = () => { loaded++; tryRender(); };
    img.src = bgItems[0].url;
    wm.src = watermarkUrl;
  }, [watermarkUrl, bgItems, position, opacity, scale, padding]);

  const processAll = useCallback(async () => {
    if (!watermarkUrl) { setError({ title: 'No watermark', why: 'Upload a watermark image first.', action: 'Upload a PNG or JPG as your watermark.' }); return; }
    setLoading(true); setError(null);
    const wmImg = new Image();
    await new Promise((res, rej) => { wmImg.onload = res; wmImg.onerror = rej; wmImg.src = watermarkUrl; });

    if (tab === 'images') {
      const results = [];
      for (const item of bgItems) {
        try {
          const result = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const iw = img.width, ih = img.height;
              const ww = Math.round(iw * (scale / 100));
              const wh = Math.round(ww * (wmImg.naturalHeight / wmImg.naturalWidth));
              const px = position[1] || (position === 'cc' ? 'c' : position[0] === 't' ? 'l' : 'l');
              const py = position[0] === 't' ? 't' : position[0] === 'c' || (position.length === 2 && position[0] !== 't' && position[0] !== 'b') ? 'c' : 'b';
              const coords = calcPos(px, py, iw, ih, ww, wh, padding);
              const canvas = document.createElement('canvas');
              canvas.width = iw; canvas.height = ih;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              ctx.globalAlpha = opacity / 100;
              ctx.drawImage(wmImg, coords.x, coords.y, ww, wh);
              ctx.globalAlpha = 1;
              canvas.toBlob((blob) => {
                URL.revokeObjectURL(item.url);
                resolve({ ...item, result: blob, status: 'done' });
              }, 'image/png');
            };
            img.src = item.url;
          });
          setProcessed(prev => [...prev, result]);
        } catch (err) {
          setError({ title: 'Processing failed', why: 'Error on ' + item.name + ': ' + err.message, action: 'Try again.' });
          setLoading(false); return;
        }
      }
    } else {
      try {
        const { PDFDocument, degrees } = await import('pdf-lib');
        const merged = await PDFDocument.create();
        for (const item of bgItems) {
          const ab = await item.file.arrayBuffer();
          const srcDoc = await PDFDocument.load(ab);
          const wmPage = merged.addPage();
          const srcPages = await merged.copyPages(srcDoc, srcDoc.getPageIndices());
          for (const sp of srcPages) {
            const { width, height } = sp.getSize();
            const ww = width * (scale / 100);
            const wh = ww * (wmImg.naturalHeight / wmImg.naturalWidth);
            const px = position[1] || 'c';
            const py = position[0] === 't' ? 't' : 'b';
            const coords = calcPos(px, py, width, height, ww, wh, padding);
            const wmPng = await merged.embedPng(wmImg.src.startsWith('data:image/png') ? wmImg.src : await (await fetch(wmImg.src)).arrayBuffer());
            const wmDib = wmPng.scale(ww / wmPng.width);
            const page = merged.addPage(sp);
            page.drawImage(wmDib, { x: coords.x, y: height - coords.y - wh, opacity: opacity / 100 });
          }
        }
        const pdfBytes = await merged.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setProcessed([{ name: 'watermarked.pdf', result: blob, status: 'done' }]);
      } catch (err) {
        setError({ title: 'PDF watermarking failed', why: err.message, action: 'Try again with a different PDF.' });
        setLoading(false); return;
      }
    }
    setLoading(false);
  }, [bgItems, watermarkUrl, tab, position, opacity, scale, padding]);

  const downloadAll = useCallback(async () => {
    if (tab === 'images') {
      if (processed.length === 1) {
        const url = URL.createObjectURL(processed[0].result);
        const a = document.createElement('a'); a.href = url; a.download = processed[0].name.replace(/\.[^.]+$/, '') + '-watermarked.png'; a.click();
        URL.revokeObjectURL(url);
      } else {
        const zip = new JSZip();
        processed.forEach(item => { if (item.result) zip.file(item.name.replace(/\.[^.]+$/, '') + '-watermarked.png', item.result); });
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'watermarked-images.zip'; a.click();
        URL.revokeObjectURL(url);
      }
    } else {
      const item = processed[0];
      if (item?.result) {
        const url = URL.createObjectURL(item.result);
        const a = document.createElement('a'); a.href = url; a.download = 'watermarked.pdf'; a.click();
        URL.revokeObjectURL(url);
      }
    }
  }, [processed, tab]);

  const hasBg = bgItems.length > 0;
  const hasWm = !!watermarkUrl;
  const allDone = processed.length > 0;

  return (
    <div>
      {error && <ErrorBanner title={error.title} why={error.why} action={error.action} variant="error" onRetry={() => setError(null)} />}

      <div className="tabs" style={{ justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
        <button className={'tab ' + (tab === 'images' ? 'active' : '')} onClick={() => setTab('images')}>Images</button>
        <button className={'tab ' + (tab === 'pdf' ? 'active' : '')} onClick={() => setTab('pdf')}>PDF</button>
      </div>

      {!hasBg ? (
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          {tab === 'images' ? (
            <UploadZone onFiles={handleBgFiles} accept="image/jpeg,image/png,image/webp" multiple label="Drop background images" hint="One or more images to watermark" meta="JPG, PNG, WebP" maxSizeMB={20} hardMaxSizeMB={60} />
          ) : (
            <UploadZone onFiles={handleBgFiles} accept=".pdf,application/pdf" multiple label="Drop PDF files" hint="One or more PDFs to watermark" meta="PDF files" maxSizeMB={25} hardMaxSizeMB={150} />
          )}
        </div>
      ) : !hasWm ? (
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <UploadZone onFiles={handleWatermark} accept="image/jpeg,image/png,image/webp" label="Upload watermark image" hint="PNG with transparency works best" meta="Will be composited onto your files" maxSizeMB={5} hardMaxSizeMB={10} />
        </div>
      ) : allDone ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>\u2713</div>
          <div className="section-label" style={{ marginBottom: 'var(--space-1)' }}>Watermarked {processed.length} file{processed.length > 1 ? 's' : ''}</div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-6)' }}>
            <ExportButton onClick={downloadAll} format={tab === 'images' ? (processed.length > 1 ? 'ZIP' : 'PNG') : 'PDF'} />
            <button className="btn btn-secondary btn-lg" onClick={() => { bgItems.forEach(i => URL.revokeObjectURL(i.url)); setBgItems([]); setProcessed([]); setPreviewUrl(null); if (watermarkUrl) URL.revokeObjectURL(watermarkUrl); setWatermarkUrl(null); setWatermarkFile(null); }}>Start Over</button>
          </div>
        </div>
      ) : (
        <div>
          {previewUrl && (
            <div style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
              <div className="section-label" style={{ marginBottom: 'var(--space-2)' }}>Preview</div>
              <img src={previewUrl} alt="Watermark preview" style={{ maxWidth: '100%', maxHeight: 350, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }} />
 </div>
 )}

 <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 500, margin: '0 auto' }}>
 <div>
 <label className="section-label" style={{ marginBottom: 'var(--space-2)' }}>Position</label>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-1)' }}>
 {POSITIONS.map(p => (
 <button key={p.id} className={'btn btn-sm ' + (position === p.id ? 'btn-primary' : 'btn-secondary')} onClick={() => setPosition(p.id)}>{p.label}</button>
 ))}
 </div>
 </div>

 <div>
 <label className="section-label" style={{ marginBottom: 'var(--space-2)' }}>Opacity: {opacity}%</label>
 <input type="range" className="slider" min={5} max={100} value={opacity} onChange={e => setOpacity(parseInt(e.target.value))} style={{ width: '100%' }} />
 </div>

 <div>
 <label className="section-label" style={{ marginBottom: 'var(--space-2)' }}>Watermark Size: {scale}% of image width</label>
 <input type="range" className="slider" min={5} max={60} value={scale} onChange={e => setScale(parseInt(e.target.value))} style={{ width: '100%' }} />
 </div>

 <div>
 <label className="section-label" style={{ marginBottom: 'var(--space-2)' }}>Padding: {padding}px</label>
 <input type="range" className="slider" min={0} max={100} value={padding} onChange={e => setPadding(parseInt(e.target.value))} style={{ width: '100%' }} />
 </div>

 <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
 <button className="btn btn-primary btn-lg" onClick={processAll} disabled={loading}>
 {loading ? 'Processing\u2026' : 'Apply Watermark to ' + bgItems.length + ' file' + (bgItems.length > 1 ? 's' : '')}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
