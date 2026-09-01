import type { DailyMission, DailyState } from '@/state/types'
import { todayKey, weekKey } from '@/state/defaults'
import { getConfig, type GameConfig } from './config'

/** قوالب المهام اليومية — تُختار عشوائيًا بلا تكرار كل يوم. */
const MISSION_POOL: Omit<DailyMission, 'progress' | 'claimed'>[] = [
  { id: 'm_play2',    kind: 'play_minigame',   target: 2, reward: { coins: 60, xp: 15 } },
  { id: 'm_play4',    kind: 'play_minigame',   target: 4, reward: { coins: 110, xp: 25 } },
  { id: 'm_read1',    kind: 'read_chapter',    target: 1, reward: { coins: 80, xp: 20 } },
  { id: 'm_read2',    kind: 'read_chapter',    target: 2, reward: { coins: 150, xp: 35 } },
  { id: 'm_outfit',   kind: 'change_outfit',   target: 1, reward: { coins: 45, xp: 10 } },
  { id: 'm_outfit3',  kind: 'change_outfit',   target: 3, reward: { coins: 100, xp: 20 } },
  { id: 'm_room',     kind: 'place_room_item', target: 1, reward: { coins: 45, xp: 10 } },
  { id: 'm_earn80',   kind: 'earn_coins',      target: 80,  reward: { gems: 1, xp: 12 } },
  { id: 'm_earn150',  kind: 'earn_coins',      target: 150, reward: { gems: 2, xp: 20 } },
]

/**
 * الميزة اللي لازم تكون شغّالة عشان المهمة تبقى قابلة للإنجاز أصلًا.
 * `null` يعني إن المهمة معتمدة على شاشات أساسية موجودة دايمًا.
 *
 * من غير الفلترة دي كانت اللاعبة ممكن تصحى تلاقي مهمتين من تلاتة
 * مستحيلتين (الألعاب والغرفة شاشات فاضية)، فتفضل سلسلتها ناقصة بلا
 * أي ذنب — وده يضرب بالظبط الحلقة اللي المهام موجودة عشانها.
 * التفاصيل في DECISIONS.md#D-011.
 */
const MISSION_REQUIRES: Record<DailyMission['kind'], keyof GameConfig['features'] | null> = {
  play_minigame:   'minigames',
  place_room_item: 'room',
  read_chapter:    null,
  change_outfit:   null,
  earn_coins:      null,
}

/** قوالب المهام القابلة للإنجاز بالميزات الشغّالة حاليًا. */
export function availableMissionTemplates(
  cfg: GameConfig = getConfig(),
): Omit<DailyMission, 'progress' | 'claimed'>[] {
  return MISSION_POOL.filter((m) => {
    const req = MISSION_REQUIRES[m.kind]
    return req === null || cfg.features[req]
  })
}

/** مولّد عشوائي حتمي مربوط باليوم — نفس المهام لنفس اليوم على نفس الجهاز. */
function seededPick<T>(list: T[], count: number, seed: string): T[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const pool = [...list]
  const out: T[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    const idx = Math.abs(h) % pool.length
    out.push(pool.splice(idx, 1)[0])
  }
  return out
}

export function generateMissions(day: string): DailyMission[] {
  const cfg = getConfig()

  /*
    نوع واحد بالكتير في اليوم: مهمتين من نفس النوع بيتقروا كتكرار،
    وكمان بيتحلّوا مع بعض (تغيير 3 إطلالات بيخلّص مهمة الـ1 كمان)
    فبتضيع مهمة من التلاتة عمليًا. بنختار الأنواع الأول، وبعدين
    نسخة واحدة جوّه كل نوع — فيفضل في تنويع في الأهداف بين الأيام.
  */
  const byKind = new Map<DailyMission['kind'], Omit<DailyMission, 'progress' | 'claimed'>[]>()
  for (const m of availableMissionTemplates(cfg)) {
    const list = byKind.get(m.kind)
    if (list) list.push(m)
    else byKind.set(m.kind, [m])
  }

  return seededPick([...byKind.keys()], cfg.dailyMissionCount, day).map((kind) => {
    const [pick] = seededPick(byKind.get(kind)!, 1, `${day}:${kind}`)
    return { ...pick, progress: 0, claimed: false }
  })
}

/**
 * تدوير اليوم مع منطق «السلسلة الرحيمة» (DECISIONS.md#D-008):
 * - يوم متتالٍ → +1
 * - انقطاع يوم واحد وتجميدة الأسبوع متاحة → السلسلة تُحفظ مجانًا
 * - غير ذلك → تُقسَّم على 2 (لا تُصفَّر أبدًا)
 */
export function rollDay(daily: DailyState, now: Date = new Date()): DailyState {
  const today = todayKey(now)
  if (daily.day === today) return daily

  const cfg = getConfig()
  const prev = new Date(daily.day + 'T00:00:00')
  const cur = new Date(today + 'T00:00:00')
  const daysApart = Math.round((cur.getTime() - prev.getTime()) / 86_400_000)

  const thisWeek = weekKey(now)
  let streak = daily.streak
  let freezeUsedWeek = daily.freezeUsedWeek

  if (daysApart === 1) {
    streak += 1
  } else if (daysApart === 2 && freezeUsedWeek !== thisWeek) {
    // تجميدة مجانية واحدة أسبوعيًا تُطبَّق تلقائيًا
    streak += 1
    freezeUsedWeek = thisWeek
  } else if (daysApart > 1) {
    streak = Math.max(1, Math.floor(streak / cfg.streakBreakDivisor))
  }

  return {
    day: today,
    streak,
    freezeUsedWeek,
    giftClaimed: false,
    missions: generateMissions(today),
    momentSeen: null,
    adsWatched: 0,
  }
}

/** هل استُخدمت تجميدة هذا الأسبوع؟ (لعرضها في الواجهة) */
export function freezeAvailable(daily: DailyState, now: Date = new Date()): boolean {
  return daily.freezeUsedWeek !== weekKey(now)
}

/** مكافأة هدية اليوم حسب موضع اليوم في دورة 7 أيام. */
export function dailyGiftAmount(streak: number): number {
  const cfg = getConfig()
  const idx = Math.max(0, streak - 1) % cfg.dailyGiftCoins.length
  return cfg.dailyGiftCoins[idx]
}

export function advanceMissions(
  missions: DailyMission[],
  kind: DailyMission['kind'],
  amount = 1,
): DailyMission[] {
  let changed = false
  const next = missions.map((m) => {
    if (m.kind !== kind || m.progress >= m.target) return m
    changed = true
    return { ...m, progress: Math.min(m.target, m.progress + amount) }
  })
  return changed ? next : missions
}
