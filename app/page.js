import Navbar from '@/components/shared/Navbar';
import SpotlightCards from '@/components/shared/SpotlightCards';

export const metadata = {
  title: 'Localkit — Free Local Browser Tools',
  description: 'Background removal, PDF editing, image conversion, audio splitting, and video trimming — free, private, and 100% on your device.',
};

const TOOLS = [
  {
    href: '/background-remover',
    name: 'Background Remover',
    desc: 'Remove or replace image backgrounds using on-device ML. No uploads, no watermarks.',
    icon: 'WandSparkles',
    color: '#5ba4f5',
    tags: ['JPG', 'PNG', 'WebP'],
  },
  {
    href: '/pdf-toolkit',
    name: 'PDF Toolkit',
    desc: 'Merge, split, reorder, rotate, and password-protect PDFs using a visual drag-drop grid.',
    icon: 'FileText',
    color: '#e57373',
    tags: ['Merge', 'Split', 'Reorder'],
  },
  {
    href: '/file-converter',
    name: 'File Converter',
    desc: 'Convert image formats (PNG, JPG, WebP) and audio formats (MP3, WAV, OGG) — in batch.',
    icon: 'Repeat',
    color: '#4fd1c5',
    tags: ['PNG', 'JPG', 'WebP'],
  },
  {
    href: '/resize-image',
    name: 'Resize Image',
    desc: 'Resize images by exact dimensions, percentage, or longest edge. Batch export as ZIP.',
    icon: 'Crop',
    color: '#48bb78',
    tags: ['PNG', 'JPG', 'WebP'],
  },
  {
    href: '/audio-splitter',
    name: 'Audio Splitter',
    desc: 'Upload a long audio file, mark segments live with keyboard shortcuts, export as named WAV files.',
    icon: 'Music',
    color: '#9b8eff',
    tags: ['MP3', 'WAV', 'OGG'],
  },
  {
    href: '/video-trimmer',
    name: 'Video Trimmer',
    desc: 'Trim video clips and export as MP4 — fully local via WebAssembly.',
    icon: 'Film',
    color: '#ffb74d',
    tags: ['MP4'],
  },
  {
    href: '/video-to-gif',
    name: 'Video to GIF',
    desc: 'Convert any video section to a high-quality animated GIF. Adjust FPS and scale.',
    icon: 'FileVideo',
    color: '#f6ad55',
    tags: ['MP4', 'MOV', 'WebM'],
  },
  {
    href: '/watermark',
    name: 'Watermark',
    desc: 'Add image or text watermarks to images (single or batch) and PDFs. 9-position grid, opacity, scale.',
    icon: 'Droplets',
    color: '#63b3ed',
    tags: ['PNG', 'JPG', 'PDF'],
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <div className="page-wrapper">
        <main id="main-content">

          {/* Hero */}
          <section className="landing-hero" style={{ paddingTop: 'var(--space-16)', paddingBottom: 'var(--space-12)' }}>
            <div className="landing-eyebrow" aria-hidden="true">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              100% Local • Zero Uploads • Free Forever
            </div>
            <h1 className="landing-title">
              File tools that stay<br />on your device.
            </h1>
            <p className="landing-subtitle">
              Eight powerful utilities — background removal, PDF editing, file conversion,
              image resizing, audio splitting, video trimming, GIF creation, and watermarking —
              processed entirely in your browser. Your files never touch a server.
            </p>
          </section>

          {/* Tool cards — SpotlightCards with 3D tilt */}
          <SpotlightCards items={TOOLS} />

          {/* Privacy callout */}
          <section
            style={{
              maxWidth: 700,
              margin: '0 auto var(--space-16)',
              padding: '0 var(--space-6)',
            }}
          >
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-8)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-6)',
            }}>
              {[
                { icon: '🔒', title: 'Zero uploads', desc: 'Files are processed in your browser, never sent to any server.' },
                { icon: '💸', title: 'Free forever', desc: 'No accounts, no plans, no watermarks. Ever.' },
                { icon: '⚡', title: 'No waiting', desc: 'Processing starts instantly. No server queue, no delays.' },
              ].map(f => (
                <div key={f.title}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }} aria-hidden="true">{f.icon}</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>{f.title}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </section>

        </main>
        <footer className="site-footer">
          <p>© {new Date().getFullYear()} Localkit — All processing is local. Your files never leave your device.</p>
        </footer>
      </div>
    </>
  );
}
