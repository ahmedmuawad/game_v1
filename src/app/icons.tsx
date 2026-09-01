/** أيقونات التنقل — خطية، رفيعة، معاصرة. لا إيموجي في الواجهة الأساسية. */

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export function IconStory({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="navbtn__icon" aria-hidden="true">
      <path {...P} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.16 : 0}
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2 2 2 0 0 1 2-2h4.5A1.5 1.5 0 0 1 20 5.5v12a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 0 0-2 2 2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 17.5Z" />
      <path {...P} d="M12 6v14" />
    </svg>
  )
}

export function IconRoom({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="navbtn__icon" aria-hidden="true">
      <path {...P} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.16 : 0}
        d="M3.5 10.2 12 3.6l8.5 6.6V19a1.4 1.4 0 0 1-1.4 1.4H4.9A1.4 1.4 0 0 1 3.5 19Z" />
      <path {...P} d="M9.4 20.4v-5.6h5.2v5.6" />
    </svg>
  )
}

export function IconStyle({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="navbtn__icon" aria-hidden="true">
      <path {...P} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.16 : 0}
        d="M9 3.5 12 6l3-2.5 4.2 2.1a1.4 1.4 0 0 1 .7 1.7l-1.2 3.4-2.2-.7v9.1a.9.9 0 0 1-.9.9H8.4a.9.9 0 0 1-.9-.9V10l-2.2.7L4.1 7.3a1.4 1.4 0 0 1 .7-1.7Z" />
    </svg>
  )
}

export function IconPlay({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="navbtn__icon" aria-hidden="true">
      <rect {...P} x="2.8" y="6.6" width="18.4" height="10.8" rx="4.4"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.16 : 0} />
      <path {...P} d="M7.4 10.4v3.2M5.8 12h3.2" />
      <circle cx="15.8" cy="11" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="17.8" cy="13.4" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconShop({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="navbtn__icon" aria-hidden="true">
      <path {...P} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.16 : 0}
        d="M4.6 8h14.8l-1.1 10.6a1.5 1.5 0 0 1-1.5 1.4H7.2a1.5 1.5 0 0 1-1.5-1.4Z" />
      <path {...P} d="M8.8 10.4V7.2a3.2 3.2 0 0 1 6.4 0v3.2" />
    </svg>
  )
}

export function IconBack() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path {...P} strokeWidth="2" d="M15 5 8 12l7 7" />
    </svg>
  )
}

export function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
      <circle {...P} cx="12" cy="12" r="3.1" />
      <path {...P} d="M12 2.8v2.2M12 19v2.2M4.5 4.5l1.6 1.6M17.9 17.9l1.6 1.6M2.8 12H5M19 12h2.2M4.5 19.5l1.6-1.6M17.9 6.1l1.6-1.6" />
    </svg>
  )
}

export function IconSpark({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 2.6l2.1 5.8 5.8 2.1-5.8 2.1L12 18.4l-2.1-5.8L4.1 10.5l5.8-2.1z" fill="currentColor" />
    </svg>
  )
}

export function IconLock({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect {...P} x="5" y="10.4" width="14" height="9.6" rx="2.4" />
      <path {...P} d="M8.4 10.4V7.6a3.6 3.6 0 0 1 7.2 0v2.8" />
    </svg>
  )
}

export function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path {...P} strokeWidth="2.4" d="m5 12.5 4.6 4.5L19 7" />
    </svg>
  )
}

/** لهب السلسلة اليومية. */
export function IconFlame({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="currentColor"
        d="M13 2.2c.4 3-1 4.6-2.5 6C8.8 9.8 7 11.5 7 14.4a5.5 5.5 0 0 0 11 0c0-2-.8-3.6-1.9-5-.3 .9-1 1.6-1.9 1.8.6-2.6-.2-5.6-2.2-9z"
      />
      <path fill="var(--c-bg)" opacity=".45" d="M12.5 13c1 1.1 1.6 2 1.6 3a2.1 2.1 0 0 1-4.2 0c0-1.3.9-2.1 2.6-3z" />
    </svg>
  )
}

/** هدية اليوم. */
export function IconGift({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect {...P} x="3.4" y="10.6" width="17.2" height="9.4" rx="1.8" />
      <path {...P} d="M2.6 7.4h18.8v3.2H2.6zM12 7.4V20" />
      <path {...P} d="M12 7.4S11 3.4 8.6 3.4a2 2 0 0 0 0 4zM12 7.4s1-4 3.4-4a2 2 0 0 1 0 4z" />
    </svg>
  )
}
