import { memo } from 'react'

/**
 * خلفيات أماكن القصة.
 *
 * حقل `bg` كان موجودًا في كل فصول الموسم الأول ومتجاهَل تمامًا في
 * القارئ — البوابة والفصل وقاعة المسرح كانوا بيتعرضوا بنفس التدرّج
 * بالظبط. في لعبة قصة المكان نص المشهد، والكاتب كان بيوصّف مكانًا
 * والشاشة بتعرض حاجة تانية.
 *
 * الأشكال إجرائية زي أثاث الغرفة: مكان جديد = دالة رسم، لا صورة
 * تتصدَّر وتتحمّل. والمزاج بيفضل مسؤول عن اللون (طبقة فوق)، فنفس
 * المكان يقدر يبان صبح ومغرب وليل بلا تكرار أصول.
 */

const W = 390
const H = 260

type Scene = () => React.ReactElement

const SCENES: Record<string, Scene> = {
  school_gate: () => (
    <g>
      {/* سور وبوابة */}
      <rect x="0" y="150" width={W} height="110" fill="rgba(0,0,0,.22)" />
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} x={10 + i * 30} y="70" width="5" height="86" rx="2.5" fill="rgba(255,255,255,.13)" />
      ))}
      <rect x="0" y="62" width={W} height="7" rx="3" fill="rgba(255,255,255,.17)" />
      <path d="M150 62h90v-16a45 45 0 0 0-90 0z" fill="rgba(255,255,255,.10)" />
      {/* شجرة */}
      <ellipse cx="336" cy="96" rx="46" ry="40" fill="rgba(110,190,140,.20)" />
      <rect x="331" y="120" width="10" height="40" fill="rgba(120,90,60,.32)" />
    </g>
  ),

  classroom: () => (
    <g>
      <rect x="0" y="168" width={W} height="92" fill="rgba(0,0,0,.20)" />
      {/* سبورة */}
      <rect x="52" y="42" width="200" height="92" rx="6" fill="rgba(40,70,58,.55)" />
      <rect x="52" y="42" width="200" height="92" rx="6" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="3" />
      <path d="M70 74h120M70 92h86M70 110h64" stroke="rgba(255,255,255,.16)" strokeWidth="3" strokeLinecap="round" />
      {/* شباك */}
      <rect x="286" y="46" width="76" height="84" rx="5" fill="rgba(150,190,235,.16)" />
      <path d="M324 46v84M286 88h76" stroke="rgba(255,255,255,.14)" strokeWidth="3" />
      {/* مكاتب */}
      {[26, 150, 274].map((x) => (
        <g key={x}>
          <rect x={x} y="176" width="90" height="9" rx="4" fill="rgba(255,255,255,.11)" />
          <rect x={x + 8} y="185" width="7" height="30" fill="rgba(255,255,255,.07)" />
          <rect x={x + 75} y="185" width="7" height="30" fill="rgba(255,255,255,.07)" />
        </g>
      ))}
    </g>
  ),

  corridor: () => (
    <g>
      <rect x="0" y="176" width={W} height="84" fill="rgba(0,0,0,.24)" />
      {/* منظور الممر */}
      <path d="M0 20 L128 96 L128 176 L0 236Z" fill="rgba(255,255,255,.05)" />
      <path d={`M${W} 20 L262 96 L262 176 L${W} 236Z`} fill="rgba(255,255,255,.05)" />
      <rect x="128" y="96" width="134" height="80" fill="rgba(255,255,255,.08)" />
      {/* دواليب */}
      {[16, 58, 100].map((x) => (
        <rect key={x} x={x} y="104" width="34" height="72" rx="4" fill="rgba(255,255,255,.09)" />
      ))}
      {[254, 296, 338].map((x) => (
        <rect key={x} x={x} y="104" width="34" height="72" rx="4" fill="rgba(255,255,255,.09)" />
      ))}
    </g>
  ),

  art_room: () => (
    <g>
      <rect x="0" y="172" width={W} height="88" fill="rgba(0,0,0,.20)" />
      {/* حامل لوحة */}
      <path d="M150 176 L172 62 L194 176" stroke="rgba(180,140,100,.42)" strokeWidth="6" fill="none" />
      <rect x="132" y="70" width="82" height="66" rx="3" fill="rgba(255,255,255,.14)" />
      <path d="M140 120c14-26 26-8 34-24s22 4 34-14" stroke="rgba(255,140,180,.5)" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* رفوف ألوان */}
      <rect x="278" y="72" width="94" height="8" rx="4" fill="rgba(255,255,255,.12)" />
      {[284, 302, 320, 338, 356].map((x, i) => (
        <rect key={x} x={x} y="56" width="12" height="16" rx="2"
              fill={['#E8788F', '#E8C46A', '#7FD3E0', '#A78BE8', '#6FCFB0'][i]} opacity=".55" />
      ))}
      <ellipse cx="60" cy="150" rx="34" ry="12" fill="rgba(255,255,255,.08)" />
    </g>
  ),

  hall: () => (
    <g>
      <rect x="0" y="186" width={W} height="74" fill="rgba(0,0,0,.30)" />
      {/* ستارة مسرح */}
      <path d="M0 0h96c-8 60-6 128 4 186H0Z" fill="rgba(190,60,90,.28)" />
      <path d={`M${W} 0h-96c8 60 6 128-4 186h100Z`} fill="rgba(190,60,90,.28)" />
      <rect x="0" y="0" width={W} height="26" fill="rgba(190,60,90,.34)" />
      {/* مسرح */}
      <rect x="96" y="150" width="198" height="36" rx="4" fill="rgba(255,255,255,.09)" />
      {/* أضواء */}
      {[140, 195, 250].map((x) => (
        <g key={x}>
          <circle cx={x} cy="40" r="9" fill="rgba(255,240,190,.5)" />
          <path d={`M${x} 46 L${x - 34} 150 L${x + 34} 150Z`} fill="rgba(255,240,190,.10)" />
        </g>
      ))}
    </g>
  ),

  yard: () => (
    <g>
      <rect x="0" y="164" width={W} height="96" fill="rgba(90,140,90,.20)" />
      <ellipse cx="70" cy="120" rx="52" ry="44" fill="rgba(110,190,140,.18)" />
      <rect x="64" y="150" width="12" height="30" fill="rgba(120,90,60,.30)" />
      <ellipse cx="320" cy="132" rx="42" ry="36" fill="rgba(110,190,140,.16)" />
      <rect x="315" y="156" width="10" height="24" fill="rgba(120,90,60,.28)" />
      {/* بنش */}
      <rect x="150" y="182" width="94" height="8" rx="4" fill="rgba(255,255,255,.13)" />
      <rect x="158" y="190" width="7" height="24" fill="rgba(255,255,255,.09)" />
      <rect x="229" y="190" width="7" height="24" fill="rgba(255,255,255,.09)" />
    </g>
  ),

  home: () => (
    <g>
      <rect x="0" y="180" width={W} height="80" fill="rgba(0,0,0,.22)" />
      {/* شباك بستارة */}
      <rect x="228" y="44" width="110" height="98" rx="6" fill="rgba(150,190,235,.14)" />
      <path d="M283 44v98M228 93h110" stroke="rgba(255,255,255,.12)" strokeWidth="3" />
      <path d="M222 40c10 44 6 82-2 106h-14V40Z" fill="rgba(255,180,200,.16)" />
      <path d="M344 40c-10 44-6 82 2 106h14V40Z" fill="rgba(255,180,200,.16)" />
      {/* كنبة */}
      <rect x="24" y="128" width="150" height="54" rx="12" fill="rgba(255,255,255,.10)" />
      <rect x="24" y="110" width="150" height="30" rx="12" fill="rgba(255,255,255,.07)" />
      <rect x="40" y="118" width="42" height="26" rx="8" fill="rgba(255,255,255,.09)" />
    </g>
  ),
}

const MOOD_TINT: Record<string, string> = {
  day:    'rgba(255, 244, 214, .05)',
  sunset: 'rgba(255, 150, 110, .12)',
  night:  'rgba(70, 88, 190, .16)',
  warm:   'rgba(255, 176, 130, .09)',
  cool:   'rgba(120, 180, 235, .09)',
  tense:  'rgba(220, 70, 90, .10)',
}

export const SceneBackdrop = memo(function SceneBackdrop({
  bg, mood = 'day',
}: {
  bg?: string
  mood?: string
}) {
  const scene = bg ? SCENES[bg] : undefined
  const tint = MOOD_TINT[mood] ?? MOOD_TINT.day

  return (
    <svg className="story__backdrop" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax meet"
         aria-hidden="true">
      {scene ? scene() : null}
      <rect x="0" y="0" width={W} height={H} fill={tint} />
      {/*
        التلاشي بقى قناعًا على الطبقة كلها في CSS لا مستطيلًا مرسومًا
        فوقها: المستطيل بيعتّم لحد حافة الـSVG وبعدين بتيجي خلفية
        الصفحة بلون مختلف — والنتيجة خط أفقي حاد وسط المشهد.
      */}
    </svg>
  )
})
