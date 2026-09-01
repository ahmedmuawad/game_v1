import type { ReactNode } from 'react'

/**
 * أشكال أثاث الغرفة.
 * كل شكل يُرسم في مساحته المحلية ثم يُوضع بواسطة RoomScene.
 * إطار المشهد: 0 0 390 320 — الحائط حتى y=208، الأرضية بعدها.
 */

export interface FurnitureProps {
  colors: string[]
}

type Renderer = (p: FurnitureProps) => ReactNode

const shade = (c: string, amt = 0.82) => {
  // تعتيم بسيط بدون مكتبات — يعمل مع #RRGGBB
  const m = /^#([0-9a-f]{6})$/i.exec(c)
  if (!m) return c
  const n = parseInt(m[1], 16)
  const r = Math.round(((n >> 16) & 255) * amt)
  const g = Math.round(((n >> 8) & 255) * amt)
  const b = Math.round((n & 255) * amt)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export const FURNITURE: Record<string, Renderer> = {
  // ---------- أسرّة ----------
  bed_soft: ({ colors: [frame, dark, accent] }) => (
    <g>
      <rect x="6" y="46" width="150" height="44" rx="9" fill={frame} />
      <rect x="6" y="40" width="150" height="16" rx="8" fill={shade(frame, 1.06)} />
      <rect x="0" y="14" width="20" height="80" rx="7" fill={dark} />
      <rect x="142" y="30" width="18" height="64" rx="6" fill={dark} />
      <rect x="18" y="26" width="54" height="26" rx="9" fill="#F6F0E6" />
      <rect x="24" y="20" width="48" height="22" rx="8" fill="#FFFFFF" />
      <path d="M78 40h74a8 8 0 0 1 8 8v10H78Z" fill={accent} />
      <path d="M78 58h82v8H78Z" fill={shade(accent, 0.88)} />
    </g>
  ),
  bed_canopy: ({ colors: [frame, dark, drape] }) => (
    <g>
      <rect x="4" y="0" width="8" height="96" rx="4" fill={dark} />
      <rect x="148" y="0" width="8" height="96" rx="4" fill={dark} />
      <rect x="4" y="0" width="152" height="9" rx="4" fill={dark} />
      <path d="M12 6c10 24 8 52 4 84h-12V6Z" fill={drape} opacity=".8" />
      <path d="M148 6c-10 24-8 52-4 84h12V6Z" fill={drape} opacity=".8" />
      <rect x="10" y="50" width="140" height="42" rx="9" fill={frame} />
      <rect x="18" y="32" width="52" height="26" rx="9" fill="#FFF8F0" />
      <path d="M76 46h68a8 8 0 0 1 8 8v10H76Z" fill={drape} />
    </g>
  ),
  bed_loft: ({ colors: [frame, dark, sheet] }) => (
    <g>
      <rect x="2" y="8" width="10" height="88" rx="4" fill={dark} />
      <rect x="146" y="8" width="10" height="88" rx="4" fill={dark} />
      <rect x="2" y="8" width="154" height="12" rx="5" fill={frame} />
      <rect x="8" y="20" width="142" height="24" rx="7" fill={sheet} />
      <rect x="14" y="14" width="40" height="14" rx="6" fill="#FFFFFF" />
      <path d="M12 44h136M12 60h136M12 76h136" stroke={dark} strokeWidth="3" strokeLinecap="round" />
      <rect x="26" y="60" width="106" height="32" rx="6" fill={frame} opacity=".5" />
    </g>
  ),

  // ---------- مكاتب ----------
  desk_plain: ({ colors: [top, leg] }) => (
    <g>
      <rect x="0" y="30" width="130" height="11" rx="5" fill={top} />
      <rect x="8" y="41" width="10" height="52" rx="4" fill={leg} />
      <rect x="112" y="41" width="10" height="52" rx="4" fill={leg} />
      <rect x="70" y="41" width="52" height="34" rx="4" fill={shade(top, 0.9)} />
      <rect x="78" y="50" width="36" height="3" rx="1.5" fill={leg} />
      <rect x="78" y="60" width="36" height="3" rx="1.5" fill={leg} />
      <rect x="18" y="6" width="34" height="24" rx="3" fill="#2E2A3C" />
      <rect x="21" y="9" width="28" height="18" rx="2" fill="#7FC4E8" opacity=".7" />
      <rect x="30" y="30" width="10" height="4" fill="#2E2A3C" />
    </g>
  ),
  desk_vanity: ({ colors: [top, leg, gold] }) => (
    <g>
      <ellipse cx="60" cy="20" rx="34" ry="38" fill={gold} opacity=".35" />
      <ellipse cx="60" cy="20" rx="29" ry="33" fill="#DCEAF2" />
      <ellipse cx="60" cy="20" rx="29" ry="33" fill="url(#mirrorSheen)" />
      <rect x="0" y="58" width="120" height="10" rx="5" fill={top} />
      <rect x="8" y="68" width="9" height="26" rx="4" fill={leg} />
      <rect x="103" y="68" width="9" height="26" rx="4" fill={leg} />
      <rect x="34" y="68" width="52" height="22" rx="4" fill={shade(top, 0.92)} />
      <circle cx="60" cy="79" r="2.6" fill={gold} />
      <rect x="14" y="48" width="7" height="10" rx="3" fill={gold} />
      <rect x="24" y="50" width="6" height="8" rx="3" fill="#E4738F" />
      <defs>
        <linearGradient id="mirrorSheen" x1="30" y1="-10" x2="90" y2="55">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </g>
  ),
  desk_creator: ({ colors: [body, glow, gold] }) => (
    <g>
      <rect x="0" y="34" width="134" height="11" rx="5" fill={body} />
      <rect x="6" y="45" width="10" height="48" rx="4" fill={shade(body, 0.8)} />
      <rect x="118" y="45" width="10" height="48" rx="4" fill={shade(body, 0.8)} />
      <rect x="14" y="2" width="60" height="34" rx="4" fill="#221E30" />
      <rect x="17" y="5" width="54" height="26" rx="2" fill={glow} opacity=".85" />
      <rect x="84" y="12" width="34" height="24" rx="3" fill="#221E30" />
      <rect x="86" y="14" width="30" height="18" rx="2" fill={gold} opacity=".7" />
      <rect x="20" y="45" width="60" height="6" rx="3" fill={glow} opacity=".6" />
    </g>
  ),

  // ---------- سجاد ----------
  rug_round: ({ colors: [a, b] }) => (
    <g>
      <ellipse cx="75" cy="26" rx="75" ry="26" fill={a} />
      <ellipse cx="75" cy="26" rx="55" ry="18" fill={b} opacity=".55" />
      <ellipse cx="75" cy="26" rx="32" ry="10" fill={a} />
    </g>
  ),
  rug_rect: ({ colors: [a, b] }) => (
    <g>
      <path d="M6 4h138l14 44H-8Z" fill={a} />
      <path d="M22 14h106l7 24H15Z" fill={b} opacity=".5" />
      <path d="M34 20h82M30 30h90" stroke={a} strokeWidth="3" strokeLinecap="round" opacity=".8" />
    </g>
  ),

  // ---------- نباتات ----------
  plant_big: ({ colors: [leaf, pot] }) => (
    <g>
      <path d="M28 46c-14-4-24-16-24-30 14 0 26 10 28 24Z" fill={leaf} />
      <path d="M32 46c14-4 24-16 24-30-14 0-26 10-28 24Z" fill={shade(leaf, 1.14)} />
      <path d="M30 46c-6-10-6-26 0-40 6 14 6 30 0 40Z" fill={shade(leaf, 0.86)} />
      <path d="M30 20v34" stroke={shade(leaf, 0.7)} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14 50h32l-4 26a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4Z" fill={pot} />
      <rect x="12" y="46" width="36" height="8" rx="3" fill={shade(pot, 1.1)} />
    </g>
  ),
  plant_hang: ({ colors: [leaf, pot] }) => (
    <g>
      <path d="M22 0v14M6 14h32" stroke={shade(pot, 0.7)} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 14h28l-4 16H12Z" fill={pot} />
      <path d="M14 30c-2 16-8 26-12 34M22 30c0 18 2 30 4 40M30 30c2 14 8 24 12 30" stroke={leaf} strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="2" cy="48" r="3.4" fill={leaf} />
      <circle cx="26" cy="72" r="3.4" fill={leaf} />
      <circle cx="42" cy="62" r="3.4" fill={leaf} />
    </g>
  ),

  // ---------- ملصقات ----------
  poster_a: ({ colors: [bg, accent] }) => (
    <g>
      <rect x="0" y="0" width="58" height="76" rx="3" fill={bg} />
      <circle cx="29" cy="28" r="15" fill={accent} />
      <path d="M14 56h30M14 64h20" stroke={accent} strokeWidth="3" strokeLinecap="round" opacity=".7" />
    </g>
  ),
  poster_b: ({ colors: [bg, accent] }) => (
    <g>
      <rect x="0" y="0" width="58" height="76" rx="3" fill={bg} />
      <circle cx="29" cy="30" r="16" fill={accent} />
      <circle cx="35" cy="25" r="14" fill={bg} />
      <circle cx="13" cy="56" r="1.8" fill={accent} />
      <circle cx="45" cy="60" r="1.4" fill={accent} />
      <circle cx="26" cy="64" r="1.2" fill={accent} />
    </g>
  ),

  // ---------- أرفف ----------
  shelf_a: ({ colors: [wood, b1, b2] }) => (
    <g>
      <rect x="0" y="26" width="92" height="7" rx="3" fill={wood} />
      <rect x="0" y="62" width="92" height="7" rx="3" fill={wood} />
      <rect x="8" y="8" width="8" height="18" rx="2" fill={b1} />
      <rect x="18" y="4" width="7" height="22" rx="2" fill={b2} />
      <rect x="27" y="10" width="9" height="16" rx="2" fill={wood} />
      <rect x="60" y="6" width="20" height="20" rx="4" fill={b2} opacity=".8" />
      <rect x="12" y="44" width="7" height="18" rx="2" fill={b2} />
      <rect x="21" y="40" width="8" height="22" rx="2" fill={b1} />
      <circle cx="62" cy="54" r="8" fill={b1} opacity=".7" />
    </g>
  ),
  shelf_b: ({ colors: [wood, gold] }) => (
    <g>
      <rect x="0" y="22" width="86" height="6" rx="3" fill={wood} />
      <rect x="0" y="54" width="86" height="6" rx="3" fill={wood} />
      <circle cx="18" cy="14" r="8" fill={gold} opacity=".85" />
      <rect x="34" y="6" width="12" height="16" rx="3" fill={gold} opacity=".5" />
      <path d="M58 22l6-14 6 14Z" fill={gold} opacity=".7" />
      <circle cx="26" cy="46" r="7" fill={gold} opacity=".6" />
      <rect x="46" y="38" width="14" height="16" rx="3" fill={gold} opacity=".4" />
    </g>
  ),

  // ---------- إضاءة ----------
  lamp_arc: ({ colors: [shadeC, pole] }) => (
    <g>
      <path d="M8 96V40C8 18 26 6 46 12" stroke={pole} strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="2" cy="96" rx="14" ry="4" fill={pole} />
      <path d="M32 12h30l-7 20H39Z" fill={shadeC} />
      <ellipse cx="47" cy="32" rx="8" ry="3" fill="#FFF3D0" />
    </g>
  ),
  lamp_neon: ({ colors: [a, b] }) => (
    <g>
      <path d="M4 32c0-16 12-28 28-28s28 12 28 28-12 28-28 28" stroke={a} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M40 44c8 4 14 12 14 22" stroke={b} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M4 32c0-16 12-28 28-28s28 12 28 28-12 28-28 28" stroke={a} strokeWidth="12" fill="none" strokeLinecap="round" opacity=".2" />
    </g>
  ),
  lamp_string: ({ colors: [bulb] }) => (
    <g>
      <path d="M0 6q40 26 80 0 40-26 80 0 40 26 80 0" stroke="rgba(255,255,255,.24)" strokeWidth="1.6" fill="none" />
      {[10, 34, 58, 82, 106, 130, 154, 178, 202, 226].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={12 + (i % 2 === 0 ? 8 : 2)} r="4.2" fill={bulb} />
          <circle cx={x} cy={12 + (i % 2 === 0 ? 8 : 2)} r="9" fill={bulb} opacity=".2" />
        </g>
      ))}
    </g>
  ),
}

/** أماكن ومقاسات الفتحات داخل مشهد الغرفة. */
export const SLOT_LAYOUT: Record<string, { x: number; y: number; scale?: number }> = {
  bed:    { x: 8,   y: 120 },
  desk:   { x: 236, y: 128 },
  rug:    { x: 118, y: 244 },
  poster: { x: 168, y: 40 },
  plant:  { x: 330, y: 148 },
  shelf:  { x: 30,  y: 46 },
  lamp:   { x: 300, y: 116 },
  pet:    { x: 180, y: 250 },
}

/** إضاءة تُرسم أعلى المشهد وليس في فتحة. */
export const OVERLAY_SHAPES = new Set(['lamp_string'])
