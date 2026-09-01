import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'
import type { ReactNode, ButtonHTMLAttributes } from 'react'
import type { Rarity } from '@/state/types'
import { useI18n } from '@/i18n'
import './ui.css'

// ============================================================
// الأزرار
// ============================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'gold'
type ButtonSize = 'lg' | 'md' | 'sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary', size = 'md', full, icon, children, className = '', ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} btn--${size}${full ? ' btn--full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

// ============================================================
// أيقونات العملات (SVG مضمّنة — لا اعتماد على إيموجي)
// ============================================================

export function CoinIcon({ size = 17 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#E8A83C" />
      <circle cx="12" cy="12" r="10" fill="url(#coinG)" />
      <circle cx="12" cy="12" r="7" fill="#F7D48A" opacity=".55" />
      <path d="M12 6.6l1.5 3.3 3.6.4-2.7 2.4.8 3.5L12 14.4l-3.2 1.8.8-3.5-2.7-2.4 3.6-.4z" fill="#8A5F16" opacity=".5" />
      <defs>
        <linearGradient id="coinG" x1="4" y1="3" x2="20" y2="21">
          <stop offset="0" stopColor="#FFE3A8" />
          <stop offset=".5" stopColor="#EFC15C" />
          <stop offset="1" stopColor="#C88A22" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function GemIcon({ size = 17 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M7 3h10l4 6-9 12L3 9z" fill="url(#gemG)" />
      <path d="M7 3h10l-5 6z" fill="#BFF3FF" opacity=".7" />
      <path d="M3 9h18l-9 12z" fill="#4FC9E8" opacity=".35" />
      <defs>
        <linearGradient id="gemG" x1="3" y1="3" x2="21" y2="21">
          <stop offset="0" stopColor="#B9F1FF" />
          <stop offset=".55" stopColor="#5FD6F0" />
          <stop offset="1" stopColor="#2C9FC4" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function EnergyIcon({ size = 17, empty = false }: { size?: number; empty?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M13.6 2L5 13.2h5.2L9.4 22 19 10.4h-5.6z"
        fill={empty ? 'rgba(255,255,255,.16)' : 'url(#enG)'}
      />
      <defs>
        <linearGradient id="enG" x1="5" y1="2" x2="19" y2="22">
          <stop offset="0" stopColor="#FFC2DC" />
          <stop offset="1" stopColor="#FF6EA8" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ============================================================
// شارات العملة
// ============================================================

export function CurrencyPill({
  kind, value, onAdd,
}: {
  kind: 'coins' | 'gems' | 'energy'
  value: string
  onAdd?: () => void
}) {
  const Icon = kind === 'coins' ? CoinIcon : kind === 'gems' ? GemIcon : EnergyIcon
  return (
    <div className={`pill${onAdd ? ' pill--action' : ''}`}>
      <Icon />
      <span className="u-num">{value}</span>
      {onAdd && (
        <button className="pill__plus" onClick={onAdd} aria-label="add">+</button>
      )}
    </div>
  )
}

// ============================================================
// شريط التقدّم
// ============================================================

export function ProgressBar({
  value, tone = 'primary',
}: {
  value: number
  tone?: 'primary' | 'secondary' | 'gold' | 'success'
}) {
  const bg =
    tone === 'gold' ? 'var(--g-legendary)'
    : tone === 'secondary' ? 'var(--g-secondary)'
    : tone === 'success' ? 'var(--c-success)'
    : 'var(--g-primary)'
  return (
    <div className="bar" role="progressbar" aria-valuenow={Math.round(value * 100)}>
      <div className="bar__fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: bg }} />
    </div>
  )
}

// ============================================================
// شارة الندرة
// ============================================================

const RARITY_KEY = {
  common: 'rarity.common', rare: 'rarity.rare',
  epic: 'rarity.epic', legendary: 'rarity.legendary',
} as const

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  const { t } = useI18n()
  return <span className={`rarity rarity--${rarity}`}>{t(RARITY_KEY[rarity])}</span>
}

// ============================================================
// الورقة السفلية
// ============================================================

export function Sheet({
  open, onClose, title, children,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="sheet__grabber" />
            {title && <div className="sheet__head"><h2 className="h2">{title}</h2></div>}
            <div className="sheet__body">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// التبويبات
// ============================================================

export function Tabs<T extends string>({
  items, value, onChange,
}: {
  items: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)

  /*
    الشريط بيفيض أفقيًا على الشاشات الضيّقة: على عرض 360px الفئات الستة
    بتاخد 421px في حاوية 328px، فكانت «الشعر» مقصوصة و«البشرة» بره
    الشاشة تمامًا وبلا أي طريقة تكتشفها بيها. تمرير الفئة المختارة
    لجوّه بيضمن إنها تبان دايمًا مهما كان عرض الشاشة.

    بنسأل الـDOM عن الفئة المختارة بدل ما نمرّر ref مشروط على الزرار
    نفسه: الـref المشروط بيتنقل بين عناصر القائمة، وقياسًا اتأكد إنه
    بيفضل `null` وقت تشغيل الأثر فالنداء كان بيتبلع بصمت بسبب `?.`.
  */
  useEffect(() => {
    rowRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [value])

  return (
    <div className="tabs" role="tablist" ref={rowRef}>
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          aria-selected={value === it.id}
          className="tab"
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

// ============================================================
// الحالة الفارغة
// ============================================================

export function EmptyState({ children }: { children?: ReactNode }) {
  const { t } = useI18n()
  return <div className="empty body-sm">{children ?? t('common.empty')}</div>
}
