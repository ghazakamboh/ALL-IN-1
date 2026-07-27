'use client';

import { useState, useRef, useCallback } from 'react';
import UploadZone from '@/components/shared/UploadZone';
import ExportButton from '@/components/shared/ExportButton';
import ProgressBar from '@/components/shared/ProgressBar';
import ErrorBanner from '@/components/shared/ErrorBanner';
import JSZip from 'jszip';

const SOFT_MB = 20;
const HARD_MB = 60;

async function decodeAudio(file) {
  const ab = await file.arrayBuffer();
  const ctx = new AudioContext();
  const audioBuffer = await ctx.decodeAudioData(ab);
  await ctx.close();
  return audioBuffer;
}

function audioBufferToWav(buf) {
  const numChannels = buf.numberOfChannels;
  const sampleRate = buf.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const numSamples = buf.length * numChannels;
  const data = new Float32Array(numSamples);
  for (let ch = 0; ch < numChannels; ch++) {
    const chData = buf.getChannelData(ch);
    for (let i = 0; i < buf.length; i++) {
      data[i * numChannels + ch] = chData[i];
    }
  }
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

async function wavToMp3(blob) {
  const lamejs = await import('lamejs');
  const ab = await blob.arrayBuffer();
  const ctx = new AudioContext();
  const audioBuffer = await ctx.decodeAudioData(ab);
  await ctx.close();
  const ch = audioBuffer.numberOfChannels;
  const sr = audioBuffer.sampleRate;
  const chData = audioBuffer.getChannelData(0);
  const left = new Int16Array(chData.length);
  for (let i = 0; i < chData.length; i++) left[i] = Math.max(-32768, Math.min(32767, chData[i] * 32768));
  let right = null;
  if (ch > 1) {
    const rData = audioBuffer.getChannelData(1);
    right = new Int16Array(rData.length);
    for (let i = 0; i < rData.length; i++) right[i] = Math.max(-32768, Math.min(32767, rData[i] * 32768));
  }
  const encoder = new lamejs.Mp3Encoder(ch, sr, 128);
  const mp3Data = [];
  const sampleBlockSize = 1152;
  for (let i = 0; i < left.length; i += sampleBlockSize) {
    const leftChunk = left.subarray(i, i + sampleBlockSize);
    const rightChunk = right ? right.subarray(i, i + sampleBlockSize) : null;
    const mp3Buf = encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3Buf.length > 0) mp3Data.push(mp3Buf);
  }
  const end = encoder.flush();
  if (end.length > 0) mp3Data.push(end);
  return new Blob(mp3Data, { type: 'audio/mpeg' });
}

export default function FileConverterTool() {
  const [tab, setTab] = useState('images');
  const [items, setItems] = useState([]);
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(90);
  const [audioFormat, setAudioFormat] = useState('wav');
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
      if (tab === 'images' && !f.type.startsWith('image/')) {
        setError({ title: 'Unsupported file', why: f.name + ' is not an image.', action: 'Upload JPG, PNG, or WebP.' });
        return;
      }
      if (tab === 'audio' && !f.type.startsWith('audio/') && !f.name.match(/\.(mp3|wav|ogg|flac)$/i)) {
        setError({ title: 'Unsupported file', why: f.name + ' is not a supported audio file.', action: 'Upload MP3, WAV, OGG, or FLAC.' });
        return;
      }
      const url = URL.createObjectURL(f);
      entries.push({ file: f, url, name: f.name, result: null, status: 'pending' });
    }
    setItems(entries);
  }, [tab]);

  const processImage = useCallback((item, idx) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width, h = img.height;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (format === 'jpg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(img, 0, 0);
        const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        const q = mimeType === 'image/png' ? undefined : quality / 100;
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(item.url);
          resolve({ ...item, result: blob, status: 'done' });
        }, mimeType, q);
      };
      img.src = item.url;
    });
  }, [format, quality]);

  const processAudio = useCallback(async (item) => {
    const f = item.file;
    const ext = f.name.match(/\.(\w+)$/i)?.[1]?.toLowerCase();
    const wantExt = audioFormat;
    if (ext === wantExt || (ext === 'mp3' && wantExt === 'mp3') || (ext === 'wav' && wantExt === 'wav')) {
      return { ...item, result: f, status: 'done' };
    }
    if (wantExt === 'wav') {
      const buf = await decodeAudio(f);
      const blob = audioBufferToWav(buf);
      return { ...item, result: blob, status: 'done' };
    }
    if (wantExt === 'mp3') {
      let blob = f;
      if (ext !== 'wav') {
        const buf = await decodeAudio(f);
        blob = audioBufferToWav(buf);
      }
      const mp3 = await wavToMp3(blob);
      return { ...item, result: mp3, status: 'done' };
    }
    throw new Error('Unsupported conversion: .' + ext + ' to .' + wantExt);
  }, [audioFormat]);

  const processAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    for (let i = 0; i < items.length; i++) {
      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'processing' } : item));
      try {
        const result = tab === 'images' ? await processImage(items[i], i) : await processAudio(items[i]);
        setItems(prev => prev.map((item, idx) => idx === i ? result : item));
      } catch (err) {
        setError({ title: 'Processing failed', why: 'Error on ' + items[i].name + ': ' + err.message, action: 'Try again.' });
        setLoading(false); return;
      }
    }
    setLoading(false);
  }, [items, tab, processImage, processAudio]);

  const downloadSingle = useCallback((blob, name) => {
    const ext = tab === 'images' ? (format === 'jpg' ? 'jpg' : format) : audioFormat;
    const newName = name.replace(/\.[^.]+$/, '') + '.' + ext;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = newName; a.click();
    URL.revokeObjectURL(url);
  }, [tab, format, audioFormat]);

  const downloadAll = useCallback(async () => {
    const ext = tab === 'images' ? (format === 'jpg' ? 'jpg' : format) : audioFormat;
    const zip = new JSZip();
    items.forEach(item => {
      if (item.result) zip.file(item.name.replace(/\.[^.]+$/, '') + '.' + ext, item.result);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'converted-files.zip'; a.click();
    URL.revokeObjectURL(url);
  }, [items, tab, format, audioFormat]);

  const anyDone = items.some(i => i.status === 'done');
  const allDone = items.length > 0 && items.every(i => i.status === 'done');

  return (
    <div>
      {error && <ErrorBanner title={error.title} why={error.why} action={error.action} variant="error" onRetry={() => setError(null)} />}

      {items.length === 0 ? (
        <div>
          <div className="tabs" style={{ justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
            <button className={'tab ' + (tab === 'images' ? 'active' : '')} onClick={() => setTab('images')}>Images</button>
            <button className={'tab ' + (tab === 'audio' ? 'active' : '')} onClick={() => setTab('audio')}>Audio</button>
          </div>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            {tab === 'images' ? (
              <UploadZone onFiles={handleFiles} accept="image/jpeg,image/png,image/webp" multiple label="Drop images here" hint="PNG, JPG, WebP — batch convert" meta="Up to 60MB each" maxSizeMB={SOFT_MB} hardMaxSizeMB={HARD_MB} />
            ) : (
              <UploadZone onFiles={handleFiles} accept="audio/mpeg,audio/wav,audio/ogg,audio/flac" multiple label="Drop audio files here" hint="MP3, WAV, OGG, FLAC" meta="Up to 60MB each" maxSizeMB={SOFT_MB} hardMaxSizeMB={HARD_MB} />
            )}
          </div>
        </div>
      ) : (
        <div>
<div className="action-bar" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
            {tab === 'images' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Format:</label>
          <select className="select" value={format} onChange={e => setFormat(e.target.value)}>
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                    <option value="webp">WebP</option>
                  </select>
                </div>
                {format !== 'png' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Quality:</label>
                    <input type="range" className="slider" min={10} max={100} value={quality} onChange={e => setQuality(parseInt(e.target.value))} style={{ width: 100 }} />
                    <span className="text-mono text-xs text-tertiary">{quality}%</span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Convert to:</label>
          <select className="select" value={audioFormat} onChange={e => setAudioFormat(e.target.value)}>
                    <option value="wav">WAV</option>
                    <option value="mp3">MP3</option>
                  </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                {tab === 'images' ? (
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={item.url} alt="File preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
 </div>
 ) : (
 <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem' }}>🎵</div>
 )}
 <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{item.name}</span>
 <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: item.status === 'done' ? 'var(--success)' : item.status === 'processing' ? 'var(--accent)' : 'var(--text-tertiary)' }}>
 {item.status === 'pending' && 'Waiting'}
 {item.status === 'processing' && 'Processing\u2026'}
 {item.status === 'done' && '\u2713 ' + (item.result.size / 1024).toFixed(1) + 'KB'}
 </span>
 {item.status === 'done' && (
 <button className="btn btn-sm btn-ghost" onClick={() => downloadSingle(item.result, item.name)}>Download</button>
 )}
 </div>
 ))}
 </div>

 <div className="action-bar" style={{ marginTop: 'var(--space-6)', justifyContent: 'center' }}>
 {!allDone && (
 <button className="btn btn-primary btn-lg" onClick={processAll} disabled={loading}>
 {loading ? 'Processing\u2026' : 'Process ' + items.length + ' file' + (items.length > 1 ? 's' : '')}
 </button>
 )}
 {allDone && items.length > 1 && (
 <button className="btn btn-primary btn-lg" onClick={downloadAll}>Download All as ZIP</button>
 )}
 {allDone && (
 <button className="btn btn-secondary btn-lg" onClick={() => { items.forEach(i => URL.revokeObjectURL(i.url)); setItems([]); setError(null); }}>Convert More</button>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
