'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import UploadZone from '@/components/shared/UploadZone';
import ProgressBar from '@/components/shared/ProgressBar';
import ExportButton from '@/components/shared/ExportButton';
import ErrorBanner from '@/components/shared/ErrorBanner';

const HARD_MB = 500;
const FFMPEG_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';

export default function VideoToGifTool() {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [fps, setFps] = useState(10);
  const [outWidth, setOutWidth] = useState(480);
  const [state, setState] = useState('idle');
  const [error, setError] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const ffmpegRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        setState('loading-engine');
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;
        await ffmpeg.load({ coreURL: FFMPEG_BASE + '/ffmpeg-core.js', wasmURL: FFMPEG_BASE + '/ffmpeg-core.wasm' });
        setState('idle');
      } catch (err) {
        setError({ title: 'Engine failed to load', why: err.message, action: 'Try Chrome or Edge.' });
        setState('error');
      }
    };
    if (!ffmpegRef.current) load();
  }, []);

  const handleFiles = useCallback(async (files) => {
    const f = files[0];
    if (!f) return;
    setError(null); setResultBlob(null);
    if (f.size > HARD_MB * 1024 * 1024) {
      setError({ title: 'File too large', why: f.name + ' exceeds ' + HARD_MB + 'MB.', action: 'Try a smaller file.' });
      return;
    }
    if (!f.type.startsWith('video/')) {
      setError({ title: 'Unsupported format', why: f.type || f.name + ' is not supported.', action: 'Upload MP4, MOV, or WebM.' });
      return;
    }
    const url = URL.createObjectURL(f);
    setVideoUrl(url); setFile(f); fileRef.current = f;
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { setDuration(video.duration); setTrimEnd(video.duration); setTrimStart(0); };
    video.src = url;
  }, []);

  const exportGif = useCallback(async () => {
    if (!file || !ffmpegRef.current) return;
    setError(null); setResultBlob(null); setState('processing');
    try {
      const ffmpeg = ffmpegRef.current;
      const inputName = file.name;
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      const start = trimStart;
      const end = trimEnd;
      const outputName = 'output.gif';
      await ffmpeg.exec([
        '-ss', start.toFixed(3), '-t', (end - start).toFixed(3),
        '-i', inputName,
        '-vf', 'fps=' + fps + ',scale=' + outWidth + ':-1:flags=lanczos',
        '-y', outputName,
      ]);
      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: 'image/gif' });
      setResultBlob(blob); setState('done');
      ffmpeg.deleteFile(inputName); ffmpeg.deleteFile(outputName);
    } catch (err) {
      const msg = err.message || err.toString() || 'Unknown ffmpeg error';
      setError({ title: 'Export failed', why: msg, action: 'Try a shorter clip or different settings.' });
      setState('error');
    }
  }, [file, trimStart, trimEnd, fps, outWidth]);

  const handleDownload = useCallback(() => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a'); a.href = url; a.download = (file?.name?.replace(/\.[^.]+$/, '') || 'clip') + '.gif'; a.click();
    URL.revokeObjectURL(url);
  }, [resultBlob, file]);

  const handleReset = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(null); setVideoUrl(null); setDuration(0); setTrimStart(0); setTrimEnd(0);
    setResultBlob(null); setState('idle'); setError(null);
  }, [videoUrl]);

  if (state === 'loading-engine') {
    return <div style={{ padding: 'var(--space-8) 0' }}><ProgressBar value={null} label="Loading GIF engine (~25MB, first time only)…" /></div>;
  }

  if (state === 'processing') {
    return <div style={{ padding: 'var(--space-8) 0' }}><ProgressBar value={null} label="Generating GIF…" /></div>;
  }

  if (state === 'done' && resultBlob) {
    return (
      <div className="animate-in" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div className="section-label">Exported GIF</div>
          <img src={URL.createObjectURL(resultBlob)} alt="Exported GIF preview" style={{ width: '100%', maxHeight: 400, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }} />
 </div>
 <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
 <ExportButton onClick={handleDownload} format="GIF" />
 <button className="btn btn-secondary btn-lg" onClick={handleReset}>Convert another</button>
 </div>
 </div>
 );
 }

 return (
 <div>
 {error && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
 <ErrorBanner title={error.title} why={error.why} action={error.action} variant="error" onRetry={handleReset} />
 <div style={{ display: 'flex', justifyContent: 'center' }}><button className="btn btn-sm btn-secondary" onClick={handleReset}>Try another video</button></div>
 </div>
 )}

 {!videoUrl ? (
 <div style={{ maxWidth: 520, margin: '0 auto' }}>
 <UploadZone onFiles={handleFiles} accept="video/mp4,video/quicktime,video/webm" label="Drop a video here" hint="MP4, MOV, or WebM — up to 500MB" meta="Convert any section to GIF" maxSizeMB={200} hardMaxSizeMB={HARD_MB} />
 </div>
 ) : (
 <div>
 <div className="tool-workspace">
 <div>
 <video src={videoUrl} controls style={{ width: '100%', maxHeight: 400, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }} />
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
 <div>
 <label className="section-label" style={{ marginBottom: 'var(--space-2)' }}>Trim Range</label>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
 <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: 36 }}>Start:</label>
 <input className="input input-mono" type="number" step="0.1" min="0" max={duration} value={trimStart} onChange={e => setTrimStart(Math.max(0, Math.min(parseFloat(e.target.value) || 0, trimEnd)))} style={{ width: 80 }} />
 <span className="text-xs text-tertiary">s</span>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
 <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: 36 }}>End:</label>
 <input className="input input-mono" type="number" step="0.1" min="0" max={duration} value={trimEnd} onChange={e => setTrimEnd(Math.min(duration, Math.max(trimStart, parseFloat(e.target.value) || 0)))} style={{ width: 80 }} />
 <span className="text-xs text-tertiary">s</span>
 </div>
 </div>
 </div>

 <div>
 <label className="section-label" style={{ marginBottom: 'var(--space-2)' }}>GIF Settings</label>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
 <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: 36 }}>FPS:</label>
 <input className="input input-mono" type="number" step="1" min="1" max="20" value={fps} onChange={e => setFps(parseInt(e.target.value) || 10)} style={{ width: 70 }} />
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
 <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: 36 }}>Width:</label>
 <input className="input input-mono" type="number" step="10" min="100" max="1920" value={outWidth} onChange={e => setOutWidth(parseInt(e.target.value) || 480)} style={{ width: 70 }} />
 <span className="text-xs text-tertiary">px (height auto)</span>
 </div>
 </div>
 </div>

 <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
 Duration: {(trimEnd - trimStart).toFixed(1)}s
 </div>

 <ExportButton onClick={exportGif} label={'Export GIF'} disabled={trimStart >= trimEnd || state === 'processing'} />
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
