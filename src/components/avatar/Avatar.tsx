import { memo, useMemo } from 'react'
import type { AvatarConfig } from '@/state/types'
import { EYE_COLORS, HAIR_COLORS, LIP_COLORS, SKIN_TONES, findColor } from '@/content/palette'
import { getItem } from '@/content/items'
import { BODY, EYE_SHAPES, FACE, HAIR, VIEWBOX } from './shapes'
import { ACCESSORIES, BOTTOMS, DRESSES, SHOES, TOPS } from './garments'

export interface AvatarProps {
  config: AvatarConfig
  /** ارتفاع العرض بالبكسل؛ العرض يُحسب تلقائيًا. */
  height?: number
  /** يقصّ على الرأس والكتفين — للأفاتار المصغّر والقصص. */
  crop?: 'full' | 'bust' | 'head'
  className?: string
  /** تعبير الوجه — تستخدمه القصص. */
  expression?: 'neutral' | 'happy' | 'sad' | 'surprised'
}

const CROP_VIEWBOX: Record<NonNullable<AvatarProps['crop']>, string> = {
  full: VIEWBOX,
  bust: '58 6 124 150',
  head: '78 10 84 92',
}

/** يبحث عن شكل القطعة عبر معرّف العنصر، ويعيد الشكل والألوان. */
function resolveGarment(
  itemId: string | undefined,
  table: Record<string, { main: string; detail?: string; lines?: string }>,
) {
  if (!itemId) return null
  const item = getItem(itemId)
  if (!item) return null
  const shape = table[item.render.shape]
  if (!shape) return null
  return { shape, colors: item.render.colors }
}

function AvatarInner({
  config,
  height = 320,
  crop = 'full',
  className,
  expression = 'neutral',
}: AvatarProps) {
  const skin = findColor(SKIN_TONES, config.skinTone)
  const hairColor = findColor(HAIR_COLORS, config.hairColor)
  const eyeColor = findColor(EYE_COLORS, config.eyeColor)
  const lipColor = findColor(LIP_COLORS, config.lipColor)

  const hair = HAIR[config.hairStyle] ?? HAIR.long_straight
  const eyes = EYE_SHAPES[config.eyeShape] ?? EYE_SHAPES.almond

  const worn = config.worn
  const dress = useMemo(() => resolveGarment(worn.dress, DRESSES), [worn.dress])
  const top = useMemo(() => resolveGarment(worn.top, TOPS), [worn.top])
  const bottom = useMemo(() => resolveGarment(worn.bottom, BOTTOMS), [worn.bottom])
  const shoes = useMemo(() => resolveGarment(worn.shoes, SHOES), [worn.shoes])
  const acc = useMemo(() => resolveGarment(worn.accessory, ACCESSORIES), [worn.accessory])

  // الفستان يلغي القطعة العلوية والسفلية
  const showTwoPiece = !dress

  // تعبيرات الوجه — تعديلات صغيرة تكفي لنقل الشعور
  const browY = expression === 'sad' ? 2 : expression === 'surprised' ? -3 : 0
  const eyeScale = expression === 'surprised' ? 1.15 : 1
  const mouth =
    expression === 'happy'
      ? 'M111 75.5c5.4 5 21.6 5 27 0-2.6 6.4-8 9.6-13.5 9.6s-10.9-3.2-13.5-9.6Z'
      : expression === 'sad'
        ? 'M111 81c5.4-5 21.6-5 27 0-5.4-2.6-21.6-2.6-27 0Z'
        : expression === 'surprised'
          ? 'M115 76.5a5 6.5 0 1 0 10 0 5 6.5 0 1 0-10 0Z'
          : FACE.lips

  const width = height * (240 / 520)
  const uid = `av-${config.skinTone}-${config.hairColor}`

  return (
    <svg
      viewBox={CROP_VIEWBOX[crop]}
      height={height}
      width={crop === 'full' ? width : undefined}
      className={className}
      style={{ overflow: 'visible' }}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={skin.light} />
          <stop offset="55%" stopColor={skin.base} />
          <stop offset="100%" stopColor={skin.shade} />
        </linearGradient>
        <linearGradient id={`${uid}-hair`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={hairColor.light} />
          <stop offset="45%" stopColor={hairColor.base} />
          <stop offset="100%" stopColor={hairColor.shade} />
        </linearGradient>
      </defs>

      {/* ===== 1. الشعر الخلفي ===== */}
      {hair.back && <path d={hair.back} fill={`url(#${uid}-hair)`} />}

      {/* ===== 2. الجسم ===== */}
      <g fill={`url(#${uid}-skin)`}>
        <path d={BODY.legL} />
        <path d={BODY.legR} />
        <path d={BODY.torso} />
        <path d={BODY.armL} />
        <path d={BODY.armR} />
        <path d={BODY.handL} />
        <path d={BODY.handR} />
        <path d={BODY.neck} fill={skin.shade} />
        <path d={BODY.earL} />
        <path d={BODY.earR} />
      </g>

      {/* ===== 3. القدمان (تظهر بلا حذاء) ===== */}
      {!shoes && (
        <g fill={skin.base}>
          <path d={BODY.footL} />
          <path d={BODY.footR} />
        </g>
      )}

      {/* ===== 4. الملابس ===== */}
      {dress ? (
        <g>
          <path d={dress.shape.main} fill={dress.colors[0]} />
          {dress.shape.detail && <path d={dress.shape.detail} fill={dress.colors[1] ?? dress.colors[0]} />}
          {dress.shape.lines && (
            <path d={dress.shape.lines} fill="none" stroke="rgba(0,0,0,.16)" strokeWidth="1.4" strokeLinecap="round" />
          )}
        </g>
      ) : (
        showTwoPiece && (
          <>
            {bottom && (
              <g>
                <path d={bottom.shape.main} fill={bottom.colors[0]} />
                {bottom.shape.detail && <path d={bottom.shape.detail} fill={bottom.colors[1] ?? bottom.colors[0]} />}
                {bottom.shape.lines && (
                  <path d={bottom.shape.lines} fill="none" stroke="rgba(0,0,0,.16)" strokeWidth="1.4" strokeLinecap="round" />
                )}
              </g>
            )}
            {top && (
              <g>
                <path d={top.shape.main} fill={top.colors[0]} />
                {top.shape.detail && <path d={top.shape.detail} fill={top.colors[1] ?? top.colors[0]} />}
                {top.shape.lines && (
                  <path d={top.shape.lines} fill="none" stroke="rgba(0,0,0,.16)" strokeWidth="1.4" strokeLinecap="round" />
                )}
              </g>
            )}
          </>
        )
      )}

      {/* ===== 5. الحذاء ===== */}
      {shoes && (
        <g>
          <path d={shoes.shape.main} fill={shoes.colors[0]} />
          {shoes.shape.detail && <path d={shoes.shape.detail} fill={shoes.colors[1] ?? '#FFFFFF'} />}
          {shoes.shape.lines && (
            <path d={shoes.shape.lines} fill="none" stroke="rgba(0,0,0,.2)" strokeWidth="1.4" strokeLinecap="round" />
          )}
        </g>
      )}

      {/* ===== 6. الرأس والوجه ===== */}
      <path d={BODY.head} fill={`url(#${uid}-skin)`} />

      {/* خدود */}
      <g fill={lipColor.base} opacity="0.16">
        <path d={FACE.blushL} />
        <path d={FACE.blushR} />
      </g>

      {/* عيون */}
      <g transform={`translate(0 ${expression === 'surprised' ? -1 : 0}) scale(1 ${eyeScale}) translate(0 ${expression === 'surprised' ? 55.5 * (1 / eyeScale - 1) : 0})`}>
        <path d={eyes.l} fill="#FFFFFF" />
        <path d={eyes.r} fill="#FFFFFF" />
        <circle cx={FACE.irisL.cx} cy={FACE.irisL.cy} r={FACE.irisL.r} fill={eyeColor.base} />
        <circle cx={FACE.irisR.cx} cy={FACE.irisR.cy} r={FACE.irisR.r} fill={eyeColor.base} />
        <circle cx={FACE.irisL.cx} cy={FACE.irisL.cy} r={1.9} fill="#141018" />
        <circle cx={FACE.irisR.cx} cy={FACE.irisR.cy} r={1.9} fill="#141018" />
        <circle cx={FACE.irisL.cx + 1.6} cy={FACE.irisL.cy - 1.8} r={1.3} fill="#FFFFFF" opacity=".92" />
        <circle cx={FACE.irisR.cx + 1.6} cy={FACE.irisR.cy - 1.8} r={1.3} fill="#FFFFFF" opacity=".92" />
        <path d={eyes.l} fill="none" stroke={hairColor.shade} strokeWidth={eyes.lash} strokeLinecap="round" />
        <path d={eyes.r} fill="none" stroke={hairColor.shade} strokeWidth={eyes.lash} strokeLinecap="round" />
      </g>

      {/* حواجب */}
      <g
        transform={`translate(0 ${browY})`}
        fill="none"
        stroke={hairColor.shade}
        strokeWidth="2.6"
        strokeLinecap="round"
      >
        <path d={FACE.browL} />
        <path d={FACE.browR} />
      </g>

      {/* أنف */}
      <path d={FACE.nose} fill="none" stroke={skin.shade} strokeWidth="1.6" strokeLinecap="round" opacity=".7" />

      {/* شفاه */}
      <path d={mouth} fill={lipColor.base} />
      {expression === 'neutral' && (
        <path d={FACE.lipLine} fill="none" stroke={lipColor.shade} strokeWidth="1" opacity=".6" />
      )}

      {/* ===== 7. الشعر الأمامي ===== */}
      <path d={hair.front} fill={`url(#${uid}-hair)`} />
      {hair.shine && (
        <path
          d={hair.shine}
          fill="none"
          stroke={hairColor.light}
          strokeWidth="3"
          strokeLinecap="round"
          opacity=".45"
        />
      )}

      {/* ===== 8. الإكسسوار ===== */}
      {acc && (
        <g>
          <path d={acc.shape.main} fill={acc.colors[0]} />
          {acc.shape.detail && <path d={acc.shape.detail} fill={acc.colors[1] ?? acc.colors[0]} />}
          {acc.shape.lines && (
            <path d={acc.shape.lines} fill="none" stroke={acc.colors[1] ?? '#000'} strokeWidth="1.6" strokeLinecap="round" />
          )}
        </g>
      )}
    </svg>
  )
}

export const Avatar = memo(AvatarInner)
