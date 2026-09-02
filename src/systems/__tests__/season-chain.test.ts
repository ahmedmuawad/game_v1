import { describe, expect, it, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { useGame } from '@/state/store'
import { createInitialState } from '@/state/defaults'

/**
 * تسلسل المواسم.
 *
 * الاختبار ده بيقرا ملفات المحتوى الحقيقية لا نسخة وهمية: الغلطة اللي
 * بتحصل هنا مش في المنطق، هي في البيانات — موسم بيشاور على موسم مش
 * موجود، أو فصل أول ناقص. ودي غلطة بتوقف اللاعبة عند نهاية الموسم بلا
 * أي طريق قدّام.
 */

const ROOT = 'public/story'
const seasons = Object.fromEntries(
  readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => [d.name, JSON.parse(readFileSync(join(ROOT, d.name, 'season.json'), 'utf8'))]),
)

describe('بيانات تسلسل المواسم', () => {
  it('كل nextSeason بيشاور على موسم موجود', () => {
    for (const [id, s] of Object.entries(seasons)) {
      if (s.nextSeason) {
        expect(seasons[s.nextSeason], `${id}.nextSeason = "${s.nextSeason}"`).toBeDefined()
      }
    }
  })

  it('كل موسم فيه فصل أول', () => {
    for (const [id, s] of Object.entries(seasons)) {
      expect(s.chapters?.[0]?.id, `${id} بلا فصل أول`).toBeTruthy()
    }
  })

  it('السلسلة مالهاش حلقة لا نهائية', () => {
    const seen = new Set<string>()
    let cur: string | null | undefined = 's1'
    while (cur) {
      expect(seen.has(cur), `حلقة في التسلسل عند "${cur}"`).toBe(false)
      seen.add(cur)
      cur = seasons[cur]?.nextSeason
    }
    expect(seen.size).toBeGreaterThanOrEqual(2)
  })

  it('آخر موسم في السلسلة nextSeason بتاعه null', () => {
    let cur = 's1'
    while (seasons[cur]?.nextSeason) cur = seasons[cur].nextSeason
    expect(seasons[cur].nextSeason ?? null).toBeNull()
  })
})

describe('فعل بدء موسم جديد', () => {
  beforeEach(() => {
    useGame.setState({ ...createInitialState() })
  })

  it('بينقل الموسم والفصل ويصفّر العقدة', () => {
    const s = useGame.getState()
    s.startSeason('s2', 's2_c1')
    const after = useGame.getState().story
    expect(after.seasonId).toBe('s2')
    expect(after.chapterId).toBe('s2_c1')
    expect(after.nodeId).toBeNull()
    expect(after.nextUnlockAt).toBeNull()
  })

  it('بيحافظ على الفصول المكتملة — هي سجل اللي اتلعب', () => {
    useGame.setState({
      story: { ...createInitialState().story, completed: ['s1_c1', 's1_c2'] },
    })
    useGame.getState().startSeason('s2', 's2_c1')
    expect(useGame.getState().story.completed).toEqual(['s1_c1', 's1_c2'])
  })

  it('مابيعملش حاجة لو الموسم هو نفسه — يمنع تصفير التقدّم بالغلط', () => {
    useGame.setState({
      story: { ...createInitialState().story, seasonId: 's2', chapterId: 's2_c4', nodeId: 'n9' },
    })
    useGame.getState().startSeason('s2', 's2_c1')
    const after = useGame.getState().story
    expect(after.chapterId).toBe('s2_c4')
    expect(after.nodeId).toBe('n9')
  })
})
