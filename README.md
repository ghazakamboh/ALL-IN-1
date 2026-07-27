# Localkit

**8 browser-based file utilities — fully local, zero uploads, free forever.**

All processing happens in your browser via WebAssembly. Your files never leave your device.

## Tools

| Tool | Description |
|------|-------------|
| **Background Remover** | Remove/replace image backgrounds using on-device ML |
| **PDF Toolkit** | Merge, split, reorder, rotate, and password-protect PDFs |
| **File Converter** | Convert images (PNG, JPG, WebP) and audio (MP3, WAV, OGG, FLAC) in batch |
| **Resize Image** | Resize by exact dimensions, percentage, or longest edge. Batch ZIP export |
| **Audio Splitter** | Mark segments live with keyboard shortcuts, export as WAV |
| **Video Trimmer** | Trim MP4 clips — fully local via ffmpeg.wasm |
| **Video to GIF** | Convert any video section to animated GIF. Adjust FPS and scale |
| **Watermark** | Add image/watermarks to images (single/batch) or PDFs. 9-position grid, opacity, scale |

## Tech Stack

- [Next.js](https://nextjs.org) 16
- [Motion](https://motion.dev) — animations
- [Lucide](https://lucide.dev) — icons
- [ffmpeg.wasm](https://ffmpegwasm.netlify.app) — video processing
- [MediaPipe](https://ai.google.dev/edge/mediapipe) — ML background removal
- [pdf-lib](https://pdf-lib.js.org) — PDF manipulation
- [lamejs](https://github.com/zhuker/lamejs) — MP3 encoding
- [JSZip](https://stuk.github.io/jszip) — batch ZIP downloads

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
