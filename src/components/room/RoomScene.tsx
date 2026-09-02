import { memo } from 'react'
import type { RoomConfig, RoomMood } from '@/state/types'
import { ROOM_ITEMS_BY_ID, SURFACES_BY_ID } from '@/content/room'
import { FURNITURE, OVERLAY_SHAPES, SLOT_LAYOUT } from './furniture'
import './room.css'

/**
 * مشهد الغرفة.
 *
 * إطار ثابت 390×320: الحائط لحد y=208 والأرضية بعدها. كل قطعة بترسم
 * في مساحتها المحلية وبتتحط بإزاحة من SLOT_LAYOUT — يعني إضافة قطعة
 * جديدة متحتاجش تعرف حاجة عن باقي المشهد.
 */

const W = 390
const H = 320
const HORIZON = 208

/**
 * الإضاءة أعلى نسبة أثر لتكلفة في المشروع كله (ROADMAP المرحلة 4):
 * تلات أوضاع بتغيّر إحساس الغرفة بالكامل بتكلفة إنتاج شبه صفرية،
 * لأنها طبقة تدرّج فوق نفس الأصول لا مجموعة أصول تانية.
 */
const MOOD: Record<RoomMood, { sky: string; wash: string; glow: string; alpha: number }> = {
  day: {
    sky: 'rgba(255, 240, 214, .30)',
    wash: 'rgba(255, 236, 205, .10)',
    glow: 'rgba(255, 246, 224, .55)',
    alpha: 0.10,
  },
  sunset: {
    sky: 'rgba(255, 158, 120, .42)',
    wash: 'rgba(255, 122, 100, .17)',
    glow: 'rgba(255, 178, 128, .60)',
    alpha: 0.22,
  },
  night: {
    sky: 'rgba(88, 104, 196, .40)',
    wash: 'rgba(30, 34, 82, .40)',
    glow: 'rgba(150, 168, 255, .40)',
    alpha: 0.42,
  },
}

export interface RoomSceneProps {
  room: RoomConfig
  /** الفتحة المميّزة أثناء التعديل. */
  highlight?: string | null
  className?: string
}

function RoomSceneInner({ room, highlight = null, className = '' }: RoomSceneProps) {
  const wall = SURFACES_BY_ID[room.wall]
  const floor = SURFACES_BY_ID[room.floor]
  const mood = MOOD[room.mood] ?? MOOD.day

  const placed = Object.entries(room.slots)
    .map(([slot, id]) => {
      if (!id) return null
      const item = ROOM_ITEMS_BY_ID[id]
      const at = SLOT_LAYOUT[slot]
      if (!item || !at) return null
      const shape = FURNITURE[item.shape]
      if (!shape) return null
      return { slot, item, at, shape }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  // الطبقات المعلّقة (لمبات) بترسم فوق كل حاجة لا في فتحة أرضية
  const inScene = placed.filter((p) => !OVERLAY_SHAPES.has(p.item.shape))
  const overlay = placed.filter((p) => OVERLAY_SHAPES.has(p.item.shape))

  return (
    <div className={`room ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="room__svg" role="img">
        <defs>
          <linearGradient id="roomSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={mood.sky} />
            <stop offset="1" stopColor="transparent" />
          </linearGradient>
          <radialGradient id="roomGlow" cx="50%" cy="18%" r="62%">
            <stop offset="0" stopColor={mood.glow} />
            <stop offset="1" stopColor="transparent" />
          </radialGradient>
          <clipPath id="roomClip">
            <rect x="0" y="0" width={W} height={H} rx="18" />
          </clipPath>
        </defs>

        <g clipPath="url(#roomClip)">
          {/* الحائط */}
          <rect x="0" y="0" width={W} height={HORIZON} fill="#2A1E27" />
          <foreignObject x="0" y="0" width={W} height={HORIZON}>
            <div
              /*
                التدرّج بيتحط عبر CSS لا SVG: قيم `paint` في الكتالوج
                تدرّجات CSS، وتحويلها لـSVG gradients كان هيحتاج تحليل
                نصّي هش لكل قيمة.
              */
              style={{ width: '100%', height: '100%', background: wall?.paint ?? '#2A1E27' }}
            />
          </foreignObject>

          {/* الأرضية */}
          <rect x="0" y={HORIZON} width={W} height={H - HORIZON} fill={floor?.paint ?? '#5A4433'} />
          <rect x="0" y={HORIZON} width={W} height="4" fill="rgba(0,0,0,.28)" />

          {/* ضوء النافذة */}
          <rect x="0" y="0" width={W} height={HORIZON} fill="url(#roomSky)" />
          <ellipse cx={W * 0.5} cy={HORIZON * 0.25} rx={W * 0.46} ry={HORIZON * 0.5}
                   fill="url(#roomGlow)" opacity=".5" />

          {/* الأثاث */}
          {inScene.map(({ slot, item, at, shape }) => (
            <g
              key={slot}
              transform={`translate(${at.x} ${at.y})${at.scale ? ` scale(${at.scale})` : ''}`}
              className={highlight === slot ? 'room__slot room__slot--on' : 'room__slot'}
            >
              {shape({ colors: item.colors })}
            </g>
          ))}

          {/* غلاف المزاج فوق الأثاث — هو اللي بيوحّد إحساس الوقت */}
          <rect x="0" y="0" width={W} height={H} fill={mood.wash} style={{ mixBlendMode: 'multiply' }} />
          <rect x="0" y="0" width={W} height={H} fill="#0A070E" opacity={mood.alpha}
                style={{ mixBlendMode: 'multiply' }} />

          {/*
            المعلّقات ليها مكانها الخاص لا مكان الفتحة: شكل اللمبات
            بيرسم شريطًا عرضه 240 من نقطة الأصل، فلو اتحط في إحداثيات
            فتحة «الإضاءة» (300,116) كان هيخرج بره الإطار تمامًا.
          */}
          {overlay.map(({ slot, item, shape }) => (
            <g key={slot} transform="translate(74 10)">
              {shape({ colors: item.colors })}
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

export const RoomScene = memo(RoomSceneInner)
