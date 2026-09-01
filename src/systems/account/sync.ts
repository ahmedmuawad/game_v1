import type { PlayerState } from '@/state/types'

/**
 * دمج حالة اللعب بين الجهاز والسحابة — منطق نقي بلا React ولا وصول
 * للمخزن (قاعدة #3).
 *
 * **السياسة الحاكمة: على التعارض ما بناخدش حاجة من اللاعبة.**
 * «آخر كتابة تكسب» وحدها بتضيّع تقدّم حقيقي: لو لعبت أوفلاين على
 * موبايلها وفتحت التابلت، الحالة الأقدم بتدهس شغل ساعة. فبنختار حالة
 * أساس بالأحدث، وبعدين بنرجّع فوقها كل اللي بيتراكم ولا بيرجع.
 *
 * الاستثناء الوحيد أعلام «اتستلمت»: بنجمعها بـOR عشان نمنع استلام
 * نفس المكافأة مرتين من جهازين. ده الموضع الوحيد اللي بنغلّب فيه منع
 * الاستغلال على مصلحة اللاعبة، لأن البديل عملة مجانية بلا حد.
 */

export interface SyncEnvelope {
  state: PlayerState
  /** لحظة آخر تعديل محلي (ms). */
  updatedAt: number
  /** إصدار مخطط الحالة وقت الحفظ. */
  schema: number
}

export type MergeReason =
  | 'local_only'      // مفيش نسخة سحابية
  | 'cloud_only'      // مفيش نسخة محلية
  | 'identical'       // نفس اللحظة ونفس المحتوى
  | 'local_newer'
  | 'cloud_newer'
  | 'cloud_schema_ahead' // السحابة من إصدار أحدث — الجهاز قديم

export interface MergeResult {
  /** الحالة بعد الدمج، أو `null` لو مينفعش ندمج بأمان. */
  merged: PlayerState | null
  reason: MergeReason
  /** محتاجين نكتب النتيجة محليًا؟ */
  writeLocal: boolean
  /** محتاجين نرفع النتيجة للسحابة؟ */
  writeCloud: boolean
}

// ---- أدوات ----

const maxOf = (a: number, b: number) => (a > b ? a : b)

/** اتحاد بلا تكرار مع الحفاظ على ترتيب الظهور. */
function union(a: readonly string[], b: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of [a, b]) {
    for (const id of list) {
      if (!seen.has(id)) { seen.add(id); out.push(id) }
    }
  }
  return out
}

/** أكبر قيمة لكل مفتاح — للأرقام اللي بتزيد بس. */
function maxByKey(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = { ...a }
  for (const [k, v] of Object.entries(b)) {
    out[k] = k in out ? maxOf(out[k], v) : v
  }
  return out
}

/** دمج الحلقة اليومية: اليوم الأحدث يكسب؛ نفس اليوم يتجمّع. */
function mergeDaily(base: PlayerState['daily'], other: PlayerState['daily']): PlayerState['daily'] {
  if (base.day !== other.day) {
    // يوم مختلف: الأحدث تاريخًا هو الصحيح، لكن السلسلة ما تقلّش
    const newer = base.day > other.day ? base : other
    return { ...newer, streak: maxOf(base.streak, other.streak) }
  }

  const byId = new Map(other.missions.map((m) => [m.id, m]))
  return {
    ...base,
    streak: maxOf(base.streak, other.streak),
    // أعلام الاستلام بـOR — منع استلام نفس المكافأة من جهازين
    giftClaimed: base.giftClaimed || other.giftClaimed,
    adsWatched: maxOf(base.adsWatched, other.adsWatched),
    freezeUsedWeek: base.freezeUsedWeek ?? other.freezeUsedWeek,
    momentSeen: base.momentSeen ?? other.momentSeen,
    missions: base.missions.map((m) => {
      const o = byId.get(m.id)
      if (!o) return m
      return {
        ...m,
        progress: maxOf(m.progress, o.progress),
        claimed: m.claimed || o.claimed,
      }
    }),
  }
}

/**
 * دمج حالتين. `base` هي الأحدث زمنيًا وبتكسب في القيم الذوقية
 * (الإطلالة، الغرفة، السمات، مكان القصة)، و`other` بترجّع فوقها
 * كل اللي بيتراكم.
 */
function mergeInto(base: PlayerState, other: PlayerState): PlayerState {
  return {
    ...base,

    onboarded: base.onboarded || other.onboarded,

    // المستوى والخبرة بيزيدوا بس
    level: maxOf(base.level, other.level),
    xp: maxOf(base.xp, other.xp),

    /*
      العملات بتزيد وبتقل، فمينفعش نجمعها ولا ناخد الأكبر بشكل مطلق.
      بناخد الأكبر عن قصد لصالح اللاعبة: أسوأ نتيجة إنها تكسب عملات
      زيادة في حالة تعارض نادرة، وده أهون بكتير من إنها تفتح اللعبة
      تلاقي فلوسها راحت.
    */
    coins: maxOf(base.coins, other.coins),
    gems: maxOf(base.gems, other.gems),
    energy: maxOf(base.energy, other.energy),

    // العناصر المملوكة ما تُفقد أبدًا
    owned: union(base.owned, other.owned),

    story: {
      ...base.story,
      completed: union(base.story.completed, other.story.completed),
    },

    daily: mergeDaily(base.daily, other.daily),

    stats: maxByKey(
      base.stats as unknown as Record<string, number>,
      other.stats as unknown as Record<string, number>,
    ) as unknown as PlayerState['stats'],

    bestScores: maxByKey(base.bestScores, other.bestScores),

    // الأعلام السردية: الأحدث يكسب، والمفاتيح الغائبة تتكمّل
    flags: { ...other.flags, ...base.flags },
    relationships: { ...other.relationships, ...base.relationships },
  }
}

/**
 * القرار الكامل بين نسخة محلية ونسخة سحابية.
 *
 * `localSchema` هو إصدار مخطط الجهاز الحالي. لو السحابة أحدث منه
 * **مابندمجش**: الجهاز مايعرفش شكل البيانات الجديدة، وأي دمج هيبوّظ
 * حقولًا مايعرفهاش. الصح إن اللاعبة تحدّث التطبيق.
 */
export function mergeStates(
  local: SyncEnvelope | null,
  cloud: SyncEnvelope | null,
  localSchema: number,
): MergeResult {
  if (!local && !cloud) {
    return { merged: null, reason: 'local_only', writeLocal: false, writeCloud: false }
  }
  if (local && !cloud) {
    return { merged: local.state, reason: 'local_only', writeLocal: false, writeCloud: true }
  }
  if (!local && cloud) {
    if (cloud.schema > localSchema) {
      return { merged: null, reason: 'cloud_schema_ahead', writeLocal: false, writeCloud: false }
    }
    return { merged: cloud.state, reason: 'cloud_only', writeLocal: true, writeCloud: false }
  }

  const l = local as SyncEnvelope
  const c = cloud as SyncEnvelope

  if (c.schema > localSchema) {
    return { merged: null, reason: 'cloud_schema_ahead', writeLocal: false, writeCloud: false }
  }

  if (l.updatedAt === c.updatedAt) {
    return { merged: l.state, reason: 'identical', writeLocal: false, writeCloud: false }
  }

  const localWins = l.updatedAt > c.updatedAt
  const merged = localWins ? mergeInto(l.state, c.state) : mergeInto(c.state, l.state)

  return {
    merged,
    reason: localWins ? 'local_newer' : 'cloud_newer',
    // الدمج بيغيّر الطرفين غالبًا، فبنكتب في الاتنين عشان يتطابقوا
    writeLocal: true,
    writeCloud: true,
  }
}
