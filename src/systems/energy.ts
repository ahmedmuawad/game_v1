import { energyMaxForLevel, getConfig } from './config'

export interface EnergyState {
  energy: number
  energyAt: number
}

/**
 * تجديد الطاقة زمنيًا.
 * نقية ومحسوبة من الطابع الزمني — لا مؤقتات، لذا تعمل بشكل صحيح
 * حتى لو أُغلق التطبيق أيامًا (وتقاوم تلاعب ساعة الجهاز عبر الحد الأقصى).
 */
export function regenEnergy(
  state: EnergyState,
  level: number,
  now: number = Date.now(),
): EnergyState {
  const cfg = getConfig()
  const max = energyMaxForLevel(level)
  if (state.energy >= max) return { energy: state.energy, energyAt: now }

  const intervalMs = cfg.energyRegenMinutes * 60_000
  const elapsed = Math.max(0, now - state.energyAt)
  const gained = Math.floor(elapsed / intervalMs)
  if (gained <= 0) return state

  const energy = Math.min(max, state.energy + gained)
  // احتفظ بالباقي حتى لا تضيع الدقائق الجزئية
  const energyAt = energy >= max ? now : state.energyAt + gained * intervalMs
  return { energy, energyAt }
}

/** ملّي ثانية حتى الوحدة التالية، أو null لو الطاقة ممتلئة. */
export function msToNextEnergy(
  state: EnergyState,
  level: number,
  now: number = Date.now(),
): number | null {
  const cfg = getConfig()
  if (state.energy >= energyMaxForLevel(level)) return null
  const intervalMs = cfg.energyRegenMinutes * 60_000
  const elapsed = Math.max(0, now - state.energyAt)
  return intervalMs - (elapsed % intervalMs)
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
