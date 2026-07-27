'use client';

import Navbar from './Navbar';

export default function ToolLayout({ children, title, description, toolId }) {
  return (
    <>
      <Navbar />
      <div className="page-wrapper">
        <main className="tool-page" id="main-content">
          {(title || description) && (
            <header className="tool-header animate-in">
              {title && <h1 className="tool-title">{title}</h1>}
              {description && <p className="tool-description">{description}</p>}
            </header>
          )}
          {children}
        </main>
        <footer className="site-footer">
          <p>© {new Date().getFullYear()} Localkit — All processing is local. Your files never leave your device.</p>
        </footer>
      </div>
    </>
  );
}
