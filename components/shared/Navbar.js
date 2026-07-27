'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TOOLS = [
  { href: '/background-remover', label: 'BG Remover',  icon: '\u2702\ufe0f' },
  { href: '/pdf-toolkit',        label: 'PDF Toolkit', icon: '\u{1f4c4}' },
  { href: '/file-converter',     label: 'Converter',   icon: '\u{1f5bc}\ufe0f' },
  { href: '/resize-image',       label: 'Resize',      icon: '\u{1f50d}' },
  { href: '/audio-splitter',     label: 'Audio',       icon: '\u266b' },
  { href: '/video-trimmer',      label: 'Trim',        icon: '\u{1f3ac}' },
  { href: '/video-to-gif',       label: 'GIF Maker',   icon: '\u{1f39e}\ufe0f' },
  { href: '/watermark',          label: 'Watermark',   icon: '\u{1f4a7}' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <>
      <nav
        className="navbar"
        style={scrolled ? { borderBottomColor: 'var(--border-default)' } : {}}
        aria-label="Main navigation"
      >
        <div className="navbar-inner">
          {/* Logo */}
          <Link href="/" className="navbar-logo" aria-label="Localkit home">
            Local<span>kit</span>
          </Link>

          {/* Desktop tool links */}
          <nav className="navbar-links" aria-label="Tool navigation">
            {TOOLS.map(tool => (
              <Link
                key={tool.href}
                href={tool.href}
                className={`navbar-link ${pathname === tool.href ? 'active' : ''}`}
                aria-current={pathname === tool.href ? 'page' : undefined}
              >
                <span aria-hidden="true">{tool.icon}</span>
                {tool.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="navbar-right">
            <div className="navbar-privacy-badge" title="All processing is local — your files never leave your device">
              <span className="privacy-dot" aria-hidden="true" />
              <span>100% Local</span>
            </div>

            {/* Hamburger */}
            <button
              className="navbar-hamburger"
              onClick={() => setMenuOpen(v => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M4 4l12 12M16 4L4 16"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M3 6h14M3 10h14M3 14h14"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="mobile-menu animate-in"
          role="navigation"
          aria-label="Mobile navigation"
        >
          {TOOLS.map(tool => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`navbar-link ${pathname === tool.href ? 'active' : ''}`}
            >
              <span aria-hidden="true" style={{ fontSize: '1.2em' }}>{tool.icon}</span>
              {tool.label}
            </Link>
          ))}
          <div style={{
            marginTop: 'auto',
            paddingTop: 'var(--space-4)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            All processing is 100% local — your files never leave your device.
          </div>
        </div>
      )}
    </>
  );
}
