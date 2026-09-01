import type { LocalizedText } from '@/i18n/types'
import type { Rarity, StyleTag, TraitId } from '@/state/types'

/**
 * نماذج بيانات محرك القصص.
 *
 * كل المحتوى بيانات صرفة (JSON) — صفر نص أو منطق سردي داخل مكونات الواجهة.
 * السبب مش نظافة معمارية: ده اللي بيخلي إضافة فصول جديدة ممكنة **بلا
 * تحديث في المتجر**، وهو شرط أساسي في خطة المحتوى (PRODUCT_BLUEPRINT §18).
 */

// ============================================================
// الشروط — تُقيَّم بمُفسِّر مُقيَّد، لا بـ eval
// ============================================================

export type CompareOp = '=' | '!=' | '>' | '>=' | '<' | '<='

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  /** سمة الشخصية */
  | { trait: TraitId; op: CompareOp; value: number }
  /** علاقة مع شخصية */
  | { rel: string; op: CompareOp; value: number }
  /** علم سردي — بدون op تعني «موجود وصادق» */
  | { flag: string; op?: CompareOp; value?: boolean | number | string }
  /** امتلاك عنصر */
  | { has: string }
  /**
   * الإطلالة الحالية تحمل وسم أسلوب معيّن.
   * ده الجسر بين التخصيص والسرد (DECISIONS.md#D-003) — الشخصيات
   * بتعلّق على اللي إنتِ لابساه، فالشراء بيبقى له معنى سردي.
   */
  | { wearing: StyleTag }
  /** أعلى ندرة مرتداة */
  | { wearingRarity: CompareOp; value: Rarity }
  | { level: CompareOp; value: number }
  | { chapterDone: string }

// ============================================================
// الآثار
// ============================================================

export type Effect =
  | { trait: TraitId; delta: number }
  | { rel: string; delta: number }
  | { flag: string; value: boolean | number | string }
  | { grant: { coins?: number; gems?: number; xp?: number; items?: string[] } }

// ============================================================
// العقد
// ============================================================

/** تعبير الوجه المعروض للشخصية المتحدثة. */
export type Emote = 'neutral' | 'smile' | 'happy' | 'sad' | 'surprised' | 'thinking'

export interface Choice {
  id: string
  text: LocalizedText
  /** لمحة قصيرة عن أثر الاختيار — تُعرض بلا كشف كامل. */
  hint?: LocalizedText
  /** يظهر فقط عند تحقق الشرط. */
  when?: Condition
  /** يظهر معطّلًا مع سبب عند عدم التحقق (بدل الاختفاء). */
  lockedHint?: LocalizedText
  effects?: Effect[]
  to: string
}

interface NodeBase {
  id: string
  /** لا تُنفَّذ العقدة إلا عند تحقق الشرط؛ وإلا يُقفز إلى `else`. */
  when?: Condition
  else?: string
}

export interface SayNode extends NodeBase {
  type: 'say'
  /** معرّف الشخصية، أو 'player' للاعبة. */
  who: string
  text: LocalizedText
  emote?: Emote
  next?: string
}

export interface NarrateNode extends NodeBase {
  type: 'narrate'
  text: LocalizedText
  next?: string
}

export interface ChoiceNode extends NodeBase {
  type: 'choice'
  prompt?: LocalizedText
  options: Choice[]
}

export interface EffectNode extends NodeBase {
  type: 'effect'
  effects: Effect[]
  next?: string
}

export interface BranchNode extends NodeBase {
  type: 'branch'
  branches: { when: Condition; to: string }[]
  fallback: string
}

/** توجيه مسرحي: يغيّر الخلفية والمزاج ومن على «المسرح». */
export interface StageNode extends NodeBase {
  type: 'stage'
  bg?: string
  mood?: 'day' | 'sunset' | 'night' | 'warm' | 'cool' | 'tense'
  /** الشخصيات الظاهرة — 'player' مسموحة. */
  cast?: string[]
  next?: string
}

export interface EndNode extends NodeBase {
  type: 'end'
  /** مكافأة إتمام الفصل. */
  reward?: { coins?: number; gems?: number; xp?: number; items?: string[] }
  /** الفصل التالي، أو null لنهاية الموسم. */
  nextChapter?: string | null
  /** نص الخطاف: «وبعدين؟» */
  teaser?: LocalizedText
}

export type StoryNode =
  | SayNode | NarrateNode | ChoiceNode | EffectNode
  | BranchNode | StageNode | EndNode

// ============================================================
// الفصل والموسم
// ============================================================

export interface Chapter {
  id: string
  seasonId: string
  index: number
  title: LocalizedText
  /** ملخّص يظهر على بطاقة الفصل. */
  teaser: LocalizedText
  /** شرط الفتح — بخلاف إكمال الفصل السابق. */
  unlock?: Condition
  /** تكلفة الطاقة (الافتراضي من الإعداد عن بُعد). */
  energy?: number
  start: string
  nodes: Record<string, StoryNode>
}

export interface CharacterDef {
  id: string
  name: LocalizedText
  /** لون التمييز في فقاعة الحوار. */
  color: string
  /** مفتاح صور البورتريه في manifest الأفاتار. */
  portrait?: string
  /** العلاقة الابتدائية. */
  startRel?: number
}

export interface SeasonMeta {
  id: string
  title: LocalizedText
  teaser: LocalizedText
  characters: Record<string, CharacterDef>
  chapters: { id: string; title: LocalizedText; teaser: LocalizedText }[]
}
