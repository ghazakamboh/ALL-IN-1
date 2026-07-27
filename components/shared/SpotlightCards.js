'use client';

import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useRef, useState } from 'react';
import {
  WandSparkles, FileText, Repeat, Crop, Music, Film, FileVideo, Droplets,
} from 'lucide-react';

const ICON_MAP = {
  WandSparkles, FileText, Repeat, Crop, Music, Film, FileVideo, Droplets,
};

const TILT_MAX = 9;
const TILT_SPRING = { stiffness: 300, damping: 28 };
const GLOW_SPRING = { stiffness: 180, damping: 22 };

function Card({ item, dimmed, onHoverStart, onHoverEnd }) {
  const cardRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  const normX = useMotionValue(0.5);
  const normY = useMotionValue(0.5);

  const rawRotateX = useTransform(normY, [0, 1], [TILT_MAX, -TILT_MAX]);
  const rawRotateY = useTransform(normX, [0, 1], [-TILT_MAX, TILT_MAX]);

  const rotateX = useSpring(rawRotateX, TILT_SPRING);
  const rotateY = useSpring(rawRotateY, TILT_SPRING);
  const glowOpacity = useSpring(0, GLOW_SPRING);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    normX.set((e.clientX - rect.left) / rect.width);
    normY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseEnter = () => {
    setHovered(true);
    glowOpacity.set(1);
    onHoverStart();
  };

  const handleMouseLeave = () => {
    setHovered(false);
    normX.set(0.5);
    normY.set(0.5);
    glowOpacity.set(0);
    onHoverEnd();
  };

  const Icon = typeof item.icon === 'string' ? ICON_MAP[item.icon] : item.icon;

  return (
    <motion.div
      animate={{
        scale: dimmed ? 0.96 : 1,
        opacity: dimmed ? 0.5 : 1,
        borderColor: hovered ? 'var(--border-default)' : 'var(--border-subtle)',
        background: hovered ? 'var(--bg-elevated)' : 'var(--bg-surface)',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={cardRef}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        position: 'relative',
      }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <Link href={item.href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', color: 'inherit', zIndex: 10 }}>
        {/* Static accent tint */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-xl)',
            pointerEvents: 'none',
            background: `radial-gradient(ellipse at 20% 20%, ${item.color}14, transparent 65%)`,
          }}
        />

        {/* Hover glow layer */}
        <motion.div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-xl)',
            pointerEvents: 'none',
            opacity: glowOpacity,
            background: `radial-gradient(ellipse at 20% 20%, ${item.color}2e, transparent 65%)`,
          }}
        />

        {/* Shimmer sweep */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '55%',
            transform: 'skewX(-12deg)',
            pointerEvents: 'none',
          }}
        >
          <motion.div
            animate={{ x: hovered ? '400%' : '-100%' }}
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.045), transparent)',
            }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </div>

        {/* Icon badge */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${item.color}18`,
            boxShadow: `inset 0 0 0 1px ${item.color}30`,
          }}
        >
          <Icon size={20} strokeWidth={1.9} style={{ color: item.color }} />
        </div>

        {/* Text */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {item.name}
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', lineHeight: 1.6, margin: 0 }}>
            {item.desc}
          </p>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
            {item.tags.map(t => (
              <span key={t} className="badge" style={{ fontSize: '10px', padding: '2px 7px' }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Accent bottom line */}
        <motion.div
          aria-hidden="true"
          animate={{ width: hovered ? '100%' : 0 }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 2,
            borderRadius: '50%',
            background: `linear-gradient(to right, ${item.color}80, transparent)`,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </Link>
    </motion.div>
  );
}

Card.displayName = 'SpotlightCard';

export default function SpotlightCards({ items, className }) {
  const [hoveredTitle, setHoveredTitle] = useState(null);

  if (!items || items.length === 0) return null;

  return (
    <section className={className} aria-label="Available tools">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {items.map((item) => (
          <Card
            key={item.href || item.name}
            item={item}
            dimmed={hoveredTitle !== null && hoveredTitle !== item.name}
            onHoverStart={() => setHoveredTitle(item.name)}
            onHoverEnd={() => setHoveredTitle(null)}
          />
        ))}
      </div>
    </section>
  );
}
