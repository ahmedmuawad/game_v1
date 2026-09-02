import { useState } from 'react'
import { useI18n } from '@/i18n'
import { useGame } from '@/state/store'
import { haptic } from '@/app/haptics'
import { Button, Sheet } from '@/components/ui'
import { LOCALES, type Locale } from '@/i18n/types'
import './settings.css'

/** مفتاح تبديل — صف واحد باسم وحالة. */
function Toggle({
  label, on, onChange,
}: {
  label: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="set__row">
      <span className="set__label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`switch${on ? ' switch--on' : ''}`}
        onClick={() => { onChange(!on); haptic('select') }}
      >
        <span className="switch__knob" />
      </button>
    </label>
  )
}

const LOCALE_LABEL: Record<Locale, string> = { ar: 'العربية', en: 'English' }

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const settings = useGame((s) => s.settings)
  const updateSettings = useGame((s) => s.updateSettings)
  const resetAll = useGame((s) => s.resetAll)
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <Sheet
      open={open}
      onClose={() => { setConfirmReset(false); onClose() }}
      title={t('settings.title')}
    >
      <div className="set">
        {/*
          اللغة أول بند عن قصد: ده كان أخطر عطل في الشاشة دي.
          المبدّل كان مفتاح لوحة مفاتيح، يعني مستحيل على الموبايل —
          والموبايل هو المنصة الوحيدة للمنتج. نص المنتج ثنائي اللغة
          كان غير قابل للوصول عمليًا.
        */}
        <div className="set__group">
          <span className="set__groupTitle caption">{t('settings.language')}</span>
          <div className="set__seg" role="radiogroup" aria-label={t('settings.language')}>
            {LOCALES.map((lc) => (
              <button
                key={lc}
                type="button"
                role="radio"
                aria-checked={settings.locale === lc}
                className={`set__segBtn${settings.locale === lc ? ' set__segBtn--on' : ''}`}
                onClick={() => { updateSettings({ locale: lc }); haptic('select') }}
              >
                {LOCALE_LABEL[lc]}
              </button>
            ))}
          </div>
        </div>

        <div className="set__group">
          <Toggle
            label={t('settings.music')}
            on={settings.music}
            onChange={(v) => updateSettings({ music: v })}
          />
          <Toggle
            label={t('settings.sfx')}
            on={settings.sfx}
            onChange={(v) => updateSettings({ sfx: v })}
          />
          <Toggle
            label={t('settings.haptics')}
            on={settings.haptics}
            onChange={(v) => updateSettings({ haptics: v })}
          />
          {/*
            تقليل الحركة إعداد وصول لا رفاهية: الحركة الكتيرة بتسبب دوار
            حركي لبعض الناس، وبعض اللاعبات هيحتاجوه فعلًا.
          */}
          <Toggle
            label={t('settings.reduceMotion')}
            on={settings.reduceMotion}
            onChange={(v) => updateSettings({ reduceMotion: v })}
          />
        </div>

        <div className="set__group">
          {!confirmReset ? (
            <Button
              variant="ghost"
              size="md"
              full
              className="set__danger"
              onClick={() => { setConfirmReset(true); haptic('warning') }}
            >
              {t('settings.reset')}
            </Button>
          ) : (
            <div className="set__confirm">
              <p className="body-sm set__confirmText">{t('settings.resetConfirm')}</p>
              <div className="set__confirmRow">
                <Button variant="ghost" size="md" onClick={() => setConfirmReset(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="set__danger"
                  onClick={() => { resetAll(); setConfirmReset(false); onClose(); haptic('success') }}
                >
                  {t('common.confirm')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}
