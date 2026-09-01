import { memo, useMemo } from 'react'
import type { AvatarConfig } from '@/state/types'
import {
  assetUrl, bodyKey, hairKey, viewOf, type AvatarManifest,
} from '@/content/manifest'
import './avatar.css'

export interface AvatarViewProps {
  config: AvatarConfig
  manifest: AvatarManifest | null
  /** ارتفاع العرض بالبكسل؛ العرض يُحسب من نسبة الأصل. */
  height?: number
  view?: string
  /** يقصّ على الرأس والكتفين. */
  crop?: 'full' | 'bust' | 'head'
  className?: string
  /** يعطّل الانتقالات — للقطات الشاشة والقوائم الطويلة. */
  still?: boolean
}

/** نسب القصّ من ارتفاع الصورة الكاملة (الأصل مصمَّم للجسم الكامل). */
const CROP: Record<NonNullable<AvatarViewProps['crop']>, { scale: number; top: number }> = {
  full: { scale: 1, top: 0 },
  bust: { scale: 2.9, top: 0.008 },
  head: { scale: 5.6, top: 0.012 },
}

interface Layer {
  key: string
  src: string
  z: number
}

/**
 * الأفاتار كطبقات صور مُصدَّرة من خط الإنتاج ثلاثي الأبعاد.
 *
 * ليه صور بدل 3D لحظي: التشغيل بيبقى مجرد تركيب صور، فبيشتغل بسلاسة
 * على أرخص أندرويد وبلا استهلاك بطارية — وده كان أهم تحفظ تقني على
 * تشغيل 3D داخل WebView على iOS.
 */
function AvatarViewInner({
  config, manifest, height = 320, view = 'full', crop = 'full',
  className = '', still = false,
}: AvatarViewProps) {
  const v = manifest ? viewOf(manifest, view) : null

  const layers = useMemo<Layer[]>(() => {
    if (!v) return []
    const order = manifest?.layerOrder ?? {}
    const out: Layer[] = []

    const hair = v.hair[hairKey(config.hairStyle, config.hairColor)]
    if (hair) out.push({ key: 'hair_back', src: hair.back, z: order.hair_back ?? 0 })

    const body = v.body[bodyKey(config.skin, config.eyes)]
    if (body) out.push({ key: 'body', src: body.src, z: order.body ?? 10 })

    const worn = config.worn
    // الفستان يلغي القطعة العلوية والسفلية
    const slots: (keyof typeof worn)[] = worn.dress
      ? ['dress', 'shoes', 'accessory']
      : ['bottom', 'top', 'shoes', 'accessory']
    for (const slot of slots) {
      const id = worn[slot]
      if (!id) continue
      const g = v.garments[id]
      if (g) out.push({ key: slot, src: g.src, z: order[slot] ?? 30 })
    }

    if (hair) out.push({ key: 'hair_front', src: hair.front, z: order.hair_front ?? 60 })
    return out.sort((a, b) => a.z - b.z)
  }, [v, manifest, config])

  if (!v) {
    return <div className={`avatar avatar--loading ${className}`} style={{ height }} aria-hidden="true" />
  }

  const [w, h] = v.size
  const c = CROP[crop]
  const boxW = (height * w) / h
  const innerH = height * c.scale
  const innerW = (innerH * w) / h

  return (
    <div
      className={`avatar${still ? ' avatar--still' : ''} ${className}`}
      style={{ width: boxW, height }}
      role="img"
      aria-hidden="true"
    >
      <div
        className="avatar__stage"
        style={{
          width: innerW,
          height: innerH,
          insetInlineStart: (boxW - innerW) / 2,
          top: -innerH * c.top * c.scale,
        }}
      >
        {layers.map((l) => (
          <img key={l.key} className="avatar__layer" src={assetUrl(l.src)} alt="" draggable={false} />
        ))}
      </div>
    </div>
  )
}

export const AvatarView = memo(AvatarViewInner)
