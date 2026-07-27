'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import UploadZone from '@/components/shared/UploadZone';
import ProgressBar from '@/components/shared/ProgressBar';
import ErrorBanner from '@/components/shared/ErrorBanner';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs';

const SOFT_MB = 25;
const HARD_MB = 150;
let idCounter = 0;

export default function PdfToolkit() {
  const [pages, setPages] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [thumbnails, setThumbnails] = useState({});
  const [previewId, setPreviewId] = useState(null);
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileBytesRef = useRef({});
  const addInputRef = useRef(null);

  const loadFile = useCallback(async (file, thumbs, bytes) => {
    const ab = await file.arrayBuffer();
    bytes[file.name] = ab;

    const pdfjsDoc = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
    const pages = [];
    const pageCount = pdfjsDoc.numPages;
    for (let i = 0; i < pageCount; i++) {
      const id = ++idCounter;
      pages.push({ id, docName: file.name, pageIndex: i, rotation: 0 });
      try {
        const page = await pdfjsDoc.getPage(i + 1);
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        thumbs[id] = canvas.toDataURL();
      } catch {
        thumbs[id] = null;
      }
    }
    return pages;
  }, []);

  const handleNewFiles = useCallback(async (files) => {
    setError(null);
    setLoading(true);
    setPreviewId(null);
    setPreviews({});

    for (const f of files) {
      if (f.size > HARD_MB * 1024 * 1024) {
        setError({ title: 'File too large', why: `${f.name} exceeds ${HARD_MB}MB limit.`, action: 'Try a smaller file.' });
        setLoading(false); return;
      }
    }

    try {
      const thumbs = {};
      const bytes = {};
      const allPages = [];
      for (const file of files) {
      const pgs = await loadFile(file, thumbs, bytes);
      allPages.push(...pgs);
    }
    fileBytesRef.current = bytes;
      setPages(allPages);
      setThumbnails(thumbs);
      setSelectedIds(new Set());
    } catch (e) {
      setError({ title: 'Could not open PDF', why: e.message, action: 'Try a different PDF file.' });
    }
    setLoading(false);
  }, [loadFile]);

  const addMoreFiles = useCallback(async (files) => {
    setError(null);
    setLoading(true);

    for (const f of files) {
      if (f.size > HARD_MB * 1024 * 1024) {
        setError({ title: 'File too large', why: `${f.name} exceeds ${HARD_MB}MB limit.`, action: 'Try a smaller file.' });
        setLoading(false); return;
      }
    }

    try {
      const thumbs = { ...thumbnails };
      const bytes = { ...fileBytesRef.current };
      const newPages = [];
      for (const file of files) {
        const pgs = await loadFile(file, thumbs, bytes);
        newPages.push(...pgs);
      }
      fileBytesRef.current = bytes;
      setPages(prev => [...prev, ...newPages]);
      setThumbnails(thumbs);
    } catch (e) {
      setError({ title: 'Could not open PDF', why: e.message, action: 'Try a different PDF file.' });
    }
    setLoading(false);
  }, [thumbnails, loadFile]);

  const openPreview = useCallback(async (id) => {
    setPreviewId(id);
    if (previews[id]) return;

    const p = pages.find(x => x.id === id);
    if (!p) return;

    try {
      const ab = fileBytesRef.current[p.docName];
      if (!ab) return;
      const pdfjsDoc = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
      const page = await pdfjsDoc.getPage(p.pageIndex + 1);
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      setPreviews(prev => ({ ...prev, [id]: canvas.toDataURL() }));
    } catch {
      // fall back to thumbnail
    }
  }, [pages, previews]);

  const toggleSelect = useCallback((id, e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    } else {
      setSelectedIds(new Set([id]));
    }
  }, []);

  const deleteSelected = useCallback(() => {
    setPages(prev => prev.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const rotateSelected = useCallback(() => {
    setPages(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  }, [selectedIds]);

  const movePage = useCallback((from, to) => {
    setPages(prev => { const n = [...prev]; n.splice(to, 0, n.splice(from, 1)[0]); return n; });
  }, []);

  const dragIdx = useRef(null);

  const exportPdf = useCallback(async () => {
    if (pages.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const { PDFDocument, degrees } = await import('pdf-lib');
      const merged = await PDFDocument.create();

      for (const p of pages) {
        const srcBytes = fileBytesRef.current[p.docName];
        if (!srcBytes) continue;
        const srcDoc = await PDFDocument.load(srcBytes);
        const [copied] = await merged.copyPages(srcDoc, [p.pageIndex]);
        if (p.rotation) copied.setRotation(degrees(p.rotation));
        merged.addPage(copied);
      }

      const pdfBytes = await merged.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged-output.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError({ title: 'Export failed', why: err.message, action: 'Try again.' });
    }
    setLoading(false);
  }, [pages]);

  const splitPdf = useCallback(async () => {
    if (pages.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const { PDFDocument, degrees } = await import('pdf-lib');
      const zip = new JSZip();

      for (const p of pages) {
        const srcBytes = fileBytesRef.current[p.docName];
        if (!srcBytes) continue;
        const srcDoc = await PDFDocument.load(srcBytes);
        const single = await PDFDocument.create();
        const [copied] = await single.copyPages(srcDoc, [p.pageIndex]);
        if (p.rotation) copied.setRotation(degrees(p.rotation));
        single.addPage(copied);
        const pdfBytes = await single.save();
        const baseName = p.docName.replace(/\.pdf$/i, '');
        zip.file(`page ${p.pageIndex + 1} of ${baseName}.pdf`, pdfBytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'split-pages.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError({ title: 'Export failed', why: err.message, action: 'Try again.' });
    }
    setLoading(false);
  }, [pages]);

  return (
    <div>
      {error && <ErrorBanner title={error.title} why={error.why} action={error.action} variant="error" onRetry={() => { setError(null); setPages([]); setThumbnails({}); setSelectedIds(new Set()); }} />}

      {pages.length === 0 ? (
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <UploadZone onFiles={handleNewFiles} accept=".pdf,application/pdf" multiple label="Drop PDF files here" hint="or click to browse — upload multiple to merge" meta="PDF up to 150MB total" maxSizeMB={SOFT_MB} hardMaxSizeMB={HARD_MB} />
          {loading && <ProgressBar value={null} label="Parsing PDF files…" />}
        </div>
      ) : (
        <div>
          {loading && <ProgressBar value={null} label="Building PDF…" />}

              <div className="action-bar" style={{ marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{pages.length} page{pages.length !== 1 ? 's' : ''} | {selectedIds.size} selected</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-sm btn-secondary" onClick={() => addInputRef.current?.click()}>Add more</button>
              <input ref={addInputRef} type="file" accept=".pdf,application/pdf" multiple hidden onChange={e => { if (e.target.files?.length) addMoreFiles(e.target.files); }} />
              <button className="btn btn-sm btn-secondary" onClick={() => { setPages([]); setThumbnails({}); setPreviews({}); setSelectedIds(new Set()); setPreviewId(null); setError(null); }}>New PDF</button>
              <button className="btn btn-sm btn-danger" onClick={deleteSelected} disabled={selectedIds.size === 0}>Delete</button>
              <button className="btn btn-sm btn-secondary" onClick={rotateSelected} disabled={selectedIds.size === 0}>Rotate 90°</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-3)' }}>
            {pages.map((p, idx) => (
              <div key={p.id} draggable
                onDragStart={() => { dragIdx.current = idx; }}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => { if (dragIdx.current !== null && dragIdx.current !== idx) movePage(dragIdx.current, idx); dragIdx.current = null; }}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    toggleSelect(p.id, e);
                  } else {
                    openPreview(p.id);
                  }
                }}
                style={{
                  padding: 'var(--space-2)',
                  border: `2px solid ${selectedIds.has(p.id) ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: selectedIds.has(p.id) ? 'var(--accent-dim)' : 'var(--bg-surface)',
                }}>
                {thumbnails[p.id] ? (
                  <img src={thumbnails[p.id]} alt="" style={{ width: '100%', display: 'block', borderRadius: 'var(--radius-sm)', transform: p.rotation ? `rotate(${p.rotation}deg)` : 'none' }} />
                ) : (
                  <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Pg {p.pageIndex + 1}</span>
                  </div>
                )}
                <div style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  {p.pageIndex + 1}
                </div>
              </div>
            ))}
          </div>

          <div className="action-bar" style={{ marginTop: 'var(--space-6)', justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={exportPdf} disabled={loading || pages.length === 0}>Download Merged PDF</button>
            <button className="btn btn-secondary btn-lg" onClick={splitPdf} disabled={loading || pages.length === 0}>Split to Individual PDFs</button>
          </div>

          {previewId !== null && (() => {
            const p = pages.find(x => x.id === previewId);
            if (!p) return null;
            return (
              <div onClick={() => setPreviewId(null)} style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
                <div onClick={e => e.stopPropagation()} style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  maxWidth: '90vw', maxHeight: '90vh',
                  overflow: 'auto',
                  cursor: 'default',
                  display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="section-label" style={{ margin: 0 }}>
                      {p.docName.replace(/\.pdf$/i, '')} — page {p.pageIndex + 1}
                    </span>
                    <button className="btn btn-sm btn-secondary" onClick={() => setPreviewId(null)}>Close</button>
                  </div>
                  {previews[p.id] || thumbnails[p.id] ? (
                    <img src={previews[p.id] || thumbnails[p.id]} alt="" style={{
                      maxWidth: '100%', maxHeight: '75vh', width: '100%',
                      display: 'block', borderRadius: 'var(--radius-sm)',
                      transform: p.rotation ? `rotate(${p.rotation}deg)` : 'none',
                      objectFit: 'contain',
                    }} />
                  ) : (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>Could not render preview</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
