import { getConfig, xpForLevel } from './config'

export interface LevelResult {
  level: number
  xp: number
  levelsGained: number
  gemsAwarded: number
}

/** يطبّق XP ويعالج الترقّيات المتتالية. */
export function applyXp(level: number, xp: number, gain: number): LevelResult {
  const cfg = getConfig()
  let lvl = level
  let cur = xp + Math.max(0, gain)
  let gained = 0

  while (lvl < cfg.maxLevel) {
    const need = xpForLevel(lvl)
    if (cur < need) break
    cur -= need
    lvl += 1
    gained += 1
  }

  if (lvl >= cfg.maxLevel) cur = 0

  return {
    level: lvl,
    xp: cur,
    levelsGained: gained,
    gemsAwarded: gained * cfg.gemsPerLevelUp,
  }
}

/** نسبة التقدّم داخل المستوى الحالي (0..1). */
export function levelProgress(level: number, xp: number): number {
  const cfg = getConfig()
  if (level >= cfg.maxLevel) return 1
  const need = xpForLevel(level)
  return need > 0 ? Math.min(1, xp / need) : 0
}
