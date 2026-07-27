'use client';

/**
 * KeyboardShortcutHint — renders a keyboard shortcuts footer section.
 *
 * Props:
 *   shortcuts — array of { key: string, description: string }
 */
export default function KeyboardShortcutHint({ shortcuts = [] }) {
  if (!shortcuts.length) return null;

  return (
    <div className="shortcuts-section" aria-label="Keyboard shortcuts">
      <div className="shortcuts-title">Keyboard Shortcuts</div>
      <div className="shortcuts-grid" role="list">
        {shortcuts.map(({ key, description }) => (
          <div key={key} className="shortcut-item" role="listitem">
            <kbd>{key}</kbd>
            <span>{description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
