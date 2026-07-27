'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import UploadZone from '@/components/shared/UploadZone';
import ProgressBar from '@/components/shared/ProgressBar';
import ErrorBanner from '@/components/shared/ErrorBanner';
import JSZip from 'jszip';

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(2).padStart(5, '0');
  return `${m}:${sec}`;
}

function bufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const samples = buffer.length;
  const blockAlign = numChannels * bitDepth / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(ab);
  let pos = 0;
  const w = (s) => { for (let i = 0; i < s.length; i++) dv.setUint8(pos++, s.charCodeAt(i)); };
  const u16 = (v) => { dv.setUint16(pos, v, true); pos += 2; };
  const u32 = (v) => { dv.setUint32(pos, v, true); pos += 4; };
  w('RIFF'); u32(36 + dataSize); w('WAVE');
  w('fmt '); u32(16); u16(1); u16(numChannels);
  u32(sampleRate); u32(byteRate); u16(blockAlign); u16(bitDepth);
  w('data'); u32(dataSize);
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      dv.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      pos += 2;
    }
  }
  return ab;
}

export default function AudioSplitterTool() {
  const [file, setFile] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [duration, setDuration] = useState(0);
  const [segments, setSegments] = useState([]);
  const [selStart, setSelStart] = useState(null);
  const [selEnd, setSelEnd] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPos, setCurrentPos] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const animRef = useRef(null);
  const startTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const playheadRef = useRef(null);
  const selRegionRef = useRef(null);
  const nameRef = useRef(null);

  // Initialize AudioContext once
  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      sourceRef.current?.stop();
      audioCtxRef.current?.close();
    };
  }, []);

  const handleFiles = useCallback(async (files) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setLoading(true);
    setSegments([]);
    setSelStart(null);
    setSelEnd(null);
    pauseOffsetRef.current = 0;
    cancelAnimationFrame(animRef.current);
    sourceRef.current?.stop();

    try {
      const ctx = getCtx();
      const ab = await f.arrayBuffer();
      const decoded = await ctx.decodeAudioData(ab);
      setFile(f);
      setAudioBuffer(decoded);
      setDuration(decoded.duration);
      setLoading(false);
    } catch {
      setError({ title: 'Could not decode audio', why: 'The file may be unsupported or corrupted.', action: 'Try an MP3, WAV, or OGG file.' });
      setLoading(false);
    }
  }, [getCtx]);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const buf = audioBuffer;
    if (!canvas || !buf) return;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width * window.devicePixelRatio;
    const H = rect.height * window.devicePixelRatio;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const data = buf.getChannelData(0);
    const step = Math.ceil(data.length / W);
    const amp = H / 2;

    // Segment tints
    segments.forEach(seg => {
      const x1 = (seg.start / buf.duration) * W;
      const x2 = (seg.end / buf.duration) * W;
      ctx.fillStyle = 'rgba(91,164,245,0.12)';
      ctx.fillRect(x1, 0, x2 - x1, H);
      ctx.fillStyle = 'rgba(91,164,245,0.5)';
      ctx.font = `${10 * window.devicePixelRatio}px var(--font-mono)`;
      ctx.fillText(seg.name, x1 + 3, 12 * window.devicePixelRatio);
    });

    // Waveform
    ctx.strokeStyle = '#3a7fc4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < W; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const v = data[i * step + j] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();

    // Selection region overlay
    if (selStart !== null) {
      const x1 = (selStart / buf.duration) * rect.width;
      const x2 = selEnd !== null ? (selEnd / buf.duration) * rect.width : x1;
      selRegionRef.current.style.display = 'block';
      selRegionRef.current.style.left = Math.min(x1, x2) + 'px';
      selRegionRef.current.style.width = Math.abs(x2 - x1) + 'px';
    } else {
      selRegionRef.current.style.display = 'none';
    }

    // Playhead
    if (playheadRef.current) {
      playheadRef.current.style.left = ((currentPos / buf.duration) * rect.width) + 'px';
    }
  }, [audioBuffer, segments, selStart, selEnd, currentPos]);

  // Resize redraw
  useEffect(() => {
    const onResize = () => drawWaveform();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [drawWaveform]);

  // Redraw when state changes
  useEffect(() => {
    if (audioBuffer) drawWaveform();
  }, [audioBuffer, segments, selStart, selEnd, currentPos, drawWaveform]);

  // Playback
  const play = useCallback((from) => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    if (sourceRef.current) { sourceRef.current.stop(); cancelAnimationFrame(animRef.current); }
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.playbackRate.value = speed;
    src.connect(ctx.destination);
    const offset = from !== undefined ? from : pauseOffsetRef.current;
    startTimeRef.current = ctx.currentTime - offset;
    src.start(0, offset);
    src.onended = () => { setIsPlaying(false); pauseOffsetRef.current = 0; };
    sourceRef.current = src;
    setIsPlaying(true);
  }, [audioBuffer, speed, getCtx]);

  const pause = useCallback(() => {
    if (!sourceRef.current) return;
    pauseOffsetRef.current = audioCtxRef.current.currentTime - startTimeRef.current;
    sourceRef.current.stop();
    setIsPlaying(false);
    cancelAnimationFrame(animRef.current);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause(); else play();
  }, [isPlaying, pause, play]);

  const seek = useCallback((delta) => {
    const cur = isPlaying ? audioCtxRef.current.currentTime - startTimeRef.current : pauseOffsetRef.current;
    const next = Math.max(0, Math.min(duration, cur + delta));
    pauseOffsetRef.current = next;
    if (isPlaying) play(next);
    setCurrentPos(next);
  }, [isPlaying, duration, play]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;
    const tick = () => {
      const pos = audioCtxRef.current.currentTime - startTimeRef.current;
      setCurrentPos(pos);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying]);

  // Canvas drag selection
  const posToTime = useCallback((clientX) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  }, [duration]);

  const handleMouseDown = useCallback((e) => {
    const t = posToTime(e.clientX);
    setSelStart(t);
    setSelEnd(null);
  }, [posToTime]);

  const handleMouseMove = useCallback((e) => {
    if (selStart === null) return;
    setSelEnd(posToTime(e.clientX));
  }, [selStart, posToTime]);

  const handleMouseUp = useCallback((e) => {
    if (selStart === null) return;
    const t = posToTime(e.clientX);
    if (Math.abs(t - selStart) < 0.05) {
      pauseOffsetRef.current = t;
      if (isPlaying) play(t);
      setCurrentPos(t);
      setSelStart(null);
      setSelEnd(null);
    } else {
      setSelEnd(t);
      nameRef.current?.focus();
    }
  }, [selStart, posToTime, play, isPlaying]);

  // Touch
  const handleTouchStart = useCallback((e) => {
    const t = posToTime(e.touches[0].clientX);
    setSelStart(t);
    setSelEnd(null);
  }, [posToTime]);

  const handleTouchEnd = useCallback((e) => {
    const t = posToTime(e.changedTouches[0].clientX);
    setSelEnd(t);
    nameRef.current?.focus();
  }, [posToTime]);

  // Keyboard marking
  const markStart = useCallback(() => {
    const pos = isPlaying ? audioCtxRef.current.currentTime - startTimeRef.current : pauseOffsetRef.current;
    setSelStart(pos);
  }, [isPlaying]);

  const markEnd = useCallback(() => {
    const pos = isPlaying ? audioCtxRef.current.currentTime - startTimeRef.current : pauseOffsetRef.current;
    setSelEnd(pos);
  }, [isPlaying]);

  const addSegment = useCallback(() => {
    const input = nameRef.current;
    if (!input) return;
    let s = selStart, e = selEnd;
    const name = input.value.trim();
    if (s === null || e === null) { setError({ title: 'Set start and end times first', variant: 'warning' }); return; }
    if (!name) { setError({ title: 'Enter a name for this segment', variant: 'warning' }); return; }
    if (s > e) { [s, e] = [e, s]; }
    s = Math.max(0, s);
    e = Math.min(duration, e);

    setSegments(prev => {
      const next = [...prev, { name, start: s, end: e }];
      next.sort((a, b) => a.start - b.start);
      return next;
    });
    input.value = '';
    setSelStart(null);
    setSelEnd(null);
  }, [selStart, selEnd, duration]);

  const deleteSegment = useCallback((idx) => {
    setSegments(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const previewSegment = useCallback((idx) => {
    const seg = segments[idx];
    if (!seg) return;
    if (sourceRef.current) { sourceRef.current.stop(); cancelAnimationFrame(animRef.current); }
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);
    src.start(0, seg.start, seg.end - seg.start);
    pauseOffsetRef.current = seg.start;
    startTimeRef.current = ctx.currentTime - seg.start;
    setIsPlaying(true);
    sourceRef.current = src;
    src.onended = () => { setIsPlaying(false); pauseOffsetRef.current = seg.end; };
  }, [segments, audioBuffer, getCtx]);

  const exportAll = useCallback(async () => {
    if (segments.length === 0) return;
    setLoading(true);
    const zip = new JSZip();
    const sampleRate = audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;

    for (const seg of segments) {
      const startSample = Math.floor(seg.start * sampleRate);
      const endSample = Math.floor(seg.end * sampleRate);
      const length = endSample - startSample;
      const offlineCtx = new OfflineAudioContext(channels, length, sampleRate);
      const src = offlineCtx.createBufferSource();
      const sliceBuf = offlineCtx.createBuffer(channels, length, sampleRate);
      for (let c = 0; c < channels; c++) {
        const data = audioBuffer.getChannelData(c).slice(startSample, endSample);
        sliceBuf.getChannelData(c).set(data);
      }
      src.buffer = sliceBuf;
      src.connect(offlineCtx.destination);
      src.start(0);
      const rendered = await offlineCtx.startRendering();
      const wavBlob = new Blob([bufferToWav(rendered)], { type: 'audio/wav' });
      zip.file(`${seg.name}.wav`, wavBlob);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'audio_segments.zip'; a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  }, [segments, audioBuffer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT') {
        if (e.key === 'Enter') addSegment();
        return;
      }
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlay(); break;
        case '[': markStart(); break;
        case ']': markEnd(); break;
        case 'p': case 'P': /* previewSel */ break;
        case 'ArrowLeft': seek(e.shiftKey ? -5 : -1); break;
        case 'ArrowRight': seek(e.shiftKey ? 5 : 1); break;
        case 'Enter': addSegment(); break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [togglePlay, markStart, markEnd, addSegment, seek]);

  if (loading && !audioBuffer) {
    return <div style={{ padding: 'var(--space-8) 0' }}><ProgressBar value={null} label={file ? 'Decoding audio…' : 'Loading…'} /></div>;
  }

  if (!audioBuffer) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {error && <ErrorBanner title={error.title} why={error.why} action={error.action} variant={error.variant || 'error'} onRetry={() => setError(null)} />}
        <UploadZone onFiles={handleFiles} accept="audio/*" label="Drop an audio file here" hint="MP3, WAV, or OGG" meta="Up to 100MB — your file never leaves your device." />
      </div>
    );
  }

  return (
    <div>
      {error && <ErrorBanner title={error.title} why={error.why} action={error.action} variant={error.variant || 'error'} />}

      <div ref={wrapRef} style={{ position: 'relative', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 100, cursor: 'crosshair' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
        />
        <div ref={playheadRef} style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: 'var(--accent)', pointerEvents: 'none', left: 0 }} />
        <div ref={selRegionRef} style={{ position: 'absolute', top: 0, bottom: 0, background: 'rgba(91,164,245,0.15)', borderLeft: '2px solid var(--accent)', borderRight: '2px solid var(--accent2)', pointerEvents: 'none', display: 'none' }} />
      </div>

      <div className="action-bar" style={{ marginBottom: 'var(--space-3)' }}>
        <button className="btn btn-sm btn-primary" onClick={togglePlay}>{isPlaying ? '⏸ Pause' : '▶ Play'}</button>
        <button className="btn btn-sm btn-secondary" onClick={() => seek(-5)}>-5s</button>
        <button className="btn btn-sm btn-secondary" onClick={() => seek(-1)}>-1s</button>
        <button className="btn btn-sm btn-secondary" onClick={() => seek(1)}>+1s</button>
        <button className="btn btn-sm btn-secondary" onClick={() => seek(5)}>+5s</button>
        <span className="text-mono text-sm text-accent">{fmt(currentPos)} / {fmt(duration)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginLeft: 'auto' }}>
          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>speed:</label>
          <select className="select" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} style={{ fontSize: 12 }}>
            {[0.5, 0.75, 1, 1.25, 1.5].map(v => <option key={v} value={v}>{v}x</option>)}
          </select>
        </div>
      </div>

      <div className="action-bar" style={{ marginBottom: 'var(--space-3)' }}>
        <div className="time-input-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>START</label>
          <input className="input input-mono" style={{ width: 70 }} type="number" step="0.01" min="0" placeholder="0.00"
            value={selStart !== null ? selStart.toFixed(2) : ''}
            onChange={e => setSelStart(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="time-input-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>END</label>
          <input className="input input-mono" style={{ width: 70 }} type="number" step="0.01" min="0" placeholder="0.00"
            value={selEnd !== null ? selEnd.toFixed(2) : ''}
            onChange={e => setSelEnd(parseFloat(e.target.value) || 0)}
          />
        </div>
        <input ref={nameRef} className="input" style={{ width: 140 }} placeholder="segment name" onKeyDown={e => e.key === 'Enter' && addSegment()} />
        <button className="btn btn-sm btn-primary" onClick={addSegment}>+ Add</button>
        <button className="btn btn-sm btn-secondary" onClick={() => { if (selStart !== null && selEnd !== null) { const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume(); const src = ctx.createBufferSource(); src.buffer = audioBuffer; src.connect(ctx.destination); src.start(0, Math.min(selStart, selEnd), Math.abs(selEnd - selStart)); } }}>▶ Preview</button>
        <button className="btn btn-sm btn-ghost" onClick={markStart}>[ Mark</button>
        <button className="btn btn-sm btn-ghost" onClick={markEnd}>Mark ]</button>
      </div>

      {segments.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div className="section-label" style={{ marginBottom: 'var(--space-2)' }}>Segments ({segments.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {segments.map((seg, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)' }}>
                <span style={{ fontWeight: 600, color: 'var(--accent)', minWidth: 120 }}>{seg.name}</span>
                <span className="text-mono" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>{fmt(seg.start)} → {fmt(seg.end)}</span>
                <span className="text-mono text-xs text-tertiary" style={{ minWidth: 50 }}>{(seg.end - seg.start).toFixed(2)}s</span>
                <button className="btn btn-sm btn-ghost" onClick={() => previewSegment(i)} style={{ marginLeft: 'auto' }}>▶</button>
                <button className="btn btn-sm btn-ghost" onClick={() => deleteSegment(i)} style={{ color: 'var(--error)' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="action-bar" style={{ justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={exportAll} disabled={segments.length === 0 || loading}>
          {loading ? 'Exporting…' : `⬇ Export ${segments.length} segment${segments.length !== 1 ? 's' : ''} as ZIP`}
        </button>
      </div>

      <div className="shortcuts-section" style={{ marginTop: 'var(--space-4)' }}>
        <div className="shortcuts-title">Keyboard Shortcuts</div>
        <div className="shortcuts-grid">
          <span className="shortcut-item"><kbd>Space</kbd> play/pause</span>
          <span className="shortcut-item"><kbd>[</kbd> mark start</span>
          <span className="shortcut-item"><kbd>]</kbd> mark end</span>
          <span className="shortcut-item"><kbd>←</kbd> -1s</span>
          <span className="shortcut-item"><kbd>→</kbd> +1s</span>
          <span className="shortcut-item"><kbd>Shift+←</kbd> -5s</span>
          <span className="shortcut-item"><kbd>Shift+→</kbd> +5s</span>
          <span className="shortcut-item"><kbd>Enter</kbd> add segment</span>
          <span className="shortcut-item"><kbd>P</kbd> preview</span>
        </div>
      </div>
    </div>
  );
}
