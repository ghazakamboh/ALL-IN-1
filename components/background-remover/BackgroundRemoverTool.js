'use client';

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import UploadZone from '@/components/shared/UploadZone';
import ExportButton from '@/components/shared/ExportButton';
import ProgressBar from '@/components/shared/ProgressBar';
import ErrorBanner from '@/components/shared/ErrorBanner';

const MAX_SIZE_MB = 15;
const HARD_MAX_MB = 40;

export default function BackgroundRemoverTool() {
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [state, setState] = useState('idle');
  const [error, setError] = useState(null);
  const imgRef = useRef(null);
  const segmenterRef = useRef(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      segmenterRef.current?.close();
    };
  }, [imageUrl, resultUrl]);

  const getSegmenter = useCallback(async () => {
    if (segmenterRef.current) return segmenterRef.current;
    setState('loading-model');
    const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    const s = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
        delegate: 'GPU',
      },
      outputCategoryMask: true,
    });
    segmenterRef.current = s;
    return s;
  }, []);

  const runSegmentation = useCallback(async (img) => {
    const s = await getSegmenter();
    let result;
    try {
      result = s.segment(img);
    } catch (segErr) {
      throw new Error('Model inference failed: ' + segErr.message);
    }
    const keys = Object.keys(result);
    const cat = result.categoryMask;
    const confs = result.confidenceMasks;

    const extractMaskData = (obj) => {
      if (!obj) return null;
      if (obj instanceof Uint8Array || obj instanceof Float32Array || obj instanceof Int32Array) {
        return { data: obj, width: obj.width, height: obj.height };
      }
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v instanceof Uint8Array || v instanceof Float32Array || v instanceof Int32Array) {
          return { data: v, width: obj.width, height: obj.height };
        }
      }
      return null;
    };

    {
      const m = extractMaskData(cat);
      if (m && m.data && m.width && m.height) {
        return applyMask(img, m.data, m.width, m.height, (v) => v === 0 ? 0 : 255);
      }
    }

    if (confs && confs.length > 0) {
      const m = extractMaskData(confs[0]);
      if (m && m.data && m.width && m.height) {
        return applyMask(img, m.data, m.width, m.height, (v) => v > 0.5 ? 255 : 0);
      }
    }

    const catDetail = cat ? Object.keys(cat).join(',') + ' len=' + (cat.data?.length ?? cat.length ?? '?') : 'null';
    const confDetail = confs && confs.length > 0 ? Object.keys(confs[0]).join(',') + ' len=' + (confs[0].data?.length ?? confs[0].length ?? '?') : 'empty';
    throw new Error('No usable mask. Keys: ' + keys.join(',') + ' | cat: ' + catDetail + ' | conf: ' + confDetail);
  }, [getSegmenter]);

  function applyMask(img, maskData, mw, mh, alphaFn) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const mx = Math.floor((x / canvas.width) * mw);
        const my = Math.floor((y / canvas.height) * mh);
        pixels[(y * canvas.width + x) * 4 + 3] = alphaFn(maskData[my * mw + mx]);
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  const handleFiles = useCallback(async (files) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setResultUrl(null);

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(f.type)) {
      if (f.name.endsWith('.heic') || f.name.endsWith('.heif')) {
        setError({ title: 'HEIC/HEIF not supported', why: 'Browsers cannot decode this format directly.', action: 'Please convert to JPG or PNG first.' });
        return;
      }
      setError({ title: 'Unsupported file type', why: `${f.type || f.name} is not supported.`, action: 'Upload a JPG, PNG, or WebP image.' });
      return;
    }
    if (f.size > HARD_MAX_MB * 1024 * 1024) {
      setError({ title: 'File too large', why: `${f.name} is ${(f.size / 1024 / 1024).toFixed(1)}MB (limit: ${HARD_MAX_MB}MB).`, action: 'Try a smaller file.' });
      return;
    }

    setFile(f);
    const url = URL.createObjectURL(f);
    setImageUrl(url);

    const img = new Image();
    imgRef.current = img;
    img.onload = async () => {
      try {
        setState('processing');
        const dataUrl = await runSegmentation(img);
        setResultUrl(dataUrl);
        setState('done');
      } catch (err) {
        setState('error');
        setError({ title: 'Processing failed', why: err.message, action: 'Try again or try a different image.' });
      }
    };
    img.onerror = () => {
      setState('error');
      setError({ title: 'Could not load image', why: 'The image file may be corrupted.', action: 'Try a different image.' });
    };
    img.src = url;
  }, [runSegmentation]);

  const handleDownload = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = (file?.name?.replace(/\.[^.]+$/, '') || 'image') + '-bg-removed.png';
    a.click();
  }, [resultUrl, file]);

  const handleReset = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setImageUrl(null);
    setResultUrl(null);
    setState('idle');
    setError(null);
  }, [imageUrl, resultUrl]);

  if (state === 'loading-model') {
    return (
      <div style={{ padding: 'var(--space-8) 0' }}>
        <ProgressBar value={null} label="Loading background removal model… (first time only)" />
      </div>
    );
  }

  if (state === 'processing') {
    return (
      <div style={{ padding: 'var(--space-8) 0' }}>
        <ProgressBar value={null} label="Removing background…" />
      </div>
    );
  }

  if (state === 'done' && resultUrl) {
    return (
      <div className="tool-workspace animate-in">
        <div>
          {imageUrl && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div className="section-label">Original</div>
              <img src={imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }} />
            </div>
          )}
          <div>
            <div className="section-label">Result</div>
            <img src={resultUrl} alt="" style={{
              maxWidth: '100%', maxHeight: 400, borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundImage: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%), linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%)',
              backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px',
            }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <ExportButton onClick={handleDownload} format="PNG" />
          <button className="btn btn-secondary" onClick={handleReset}>Process another image</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      {error && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ErrorBanner title={error.title} why={error.why} action={error.action} variant="error" onRetry={handleReset} />
        </div>
      )}
      <UploadZone onFiles={handleFiles} accept="image/jpeg,image/png,image/webp" label="Drop an image here" hint="JPG, PNG, or WebP — up to 40MB" meta="Your file never leaves your device." maxSizeMB={MAX_SIZE_MB} hardMaxSizeMB={HARD_MAX_MB} />
    </div>
  );
}
