import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { LOCALES, type Locale } from '@/i18n/types'
import { useGame } from '@/state/store'
import { haptic } from '@/app/haptics'
import { AvatarView } from '@/components/avatar/AvatarView'
import { RoomScene } from '@/components/room/RoomScene'
import {
  assetUrl, bodyKey, hairKey, viewOf, type AvatarManifest,
} from '@/content/manifest'
import { Button, ProgressBar } from '@/components/ui'
import { IconCheck, IconSpark } from '@/app/icons'
import {
  roomForVibe, sanitizeName, starterGiftFor, VIBES, type VibeId,
} from '@/systems/onboarding'
import type { AvatarConfig } from '@/state/types'
import './onboarding.css'

/**
 * أول ثلاث دقائق.
 *
 * الترتيب مقصود: **الفايب قبل الأفاتار**. لو بدأنا بالأفاتار كانت أول
 * لحظة في اللعبة قايمة مواصفات (بشرة، شعر، عيون) قبل ما اللاعبة تعرف
 * إحنا بنبني إيه. الفايب سؤال عن الإحساس لا عن التفاصيل، وإجابته
 * بتغيّر الغرفة والإطلالة على طول — فاللاعبة بتشوف نتيجة اختيارها
 * قبل ما نطلب منها أي مجهود.
 *
 * ومفيش سؤال عن السن هنا: اللعبة شغّالة أوفلاين بلا حساب، وطلب سنة
 * ميلاد من طفلة قبل ما تشوف حاجة هو جمع بيانات بلا سبب.
 * بوابة العمر مكانها لحظة إنشاء الحساب (systems/account/age.ts).
 */

type Step = 'welcome' | 'vibe' | 'avatar' | 'name' | 'ready'
const STEPS: Step[] = ['welcome', 'vibe', 'avatar', 'name', 'ready']

const HAIR_SWATCH: Record<string, string> = {
  black: '#1E1922', espresso: '#3A2419', chestnut: '#6B3F26', caramel: '#A8703C',
  honey: '#D6A257', platinum: '#E4DCD1', auburn: '#9B3B2A', rose: '#E77398',
  lilac: '#A48BE0', mint: '#6FCFB0',
}

const VIBE_KEY: Record<VibeId, { name: string; desc: string }> = {
  soft:   { name: 'vibe.soft.name',   desc: 'vibe.soft.desc' },
  bold:   { name: 'vibe.bold.name',   desc: 'vibe.bold.desc' },
  dreamy: { name: 'vibe.dreamy.name', desc: 'vibe.dreamy.desc' },
}

export function Onboarding({ manifest }: { manifest: AvatarManifest | null }) {
  const { t, tx } = useI18n()
  const [step, setStep] = useState<Step>('welcome')
  const [vibe, setVibe] = useState<VibeId>('soft')
  const [name, setName] = useState('')

  const baseState = useGame((s) => s.avatar)
  const settings = useGame((s) => s.settings)
  const reduceMotion = settings.reduceMotion
  const updateSettings = useGame((s) => s.updateSettings)
  const completeOnboarding = useGame((s) => s.completeOnboarding)
  const grant = useGame((s) => s.grant)
  const wear = useGame((s) => s.wear)
  const room = useGame((s) => s.room)
  const owned = useGame((s) => s.owned)
  const setRoomSurface = useGame((s) => s.setRoomSurface)
  const setRoomMood = useGame((s) => s.setRoomMood)

  const [avatar, setAvatar] = useState<AvatarConfig>(baseState)
  const v = manifest ? viewOf(manifest) : null

  const gift = useMemo(() => {
    if (!v) return null
    const candidates = Object.entries(v.garments).map(([id, g]) => ({
      id, category: g.category, tags: g.tags, rarity: g.rarity, price: g.price, level: g.level,
    }))
    return starterGiftFor(vibe, candidates, owned)
  }, [v, vibe, owned])

  const previewRoom = useMemo(() => roomForVibe(vibe, room), [vibe, room])

  const idx = STEPS.indexOf(step)
  const go = (s: Step) => { setStep(s); haptic('select') }

  const cleanName = sanitizeName(name)

  function finish() {
    const target = roomForVibe(vibe, room)
    completeOnboarding(cleanName ?? t('app.name'), vibe, avatar)

    /*
      حائط وأرضية الفايب لازم يتمنحوا الأول.
      `setRoomSurface` بيرفض أي سطح مش مملوك، وحوائط «بولد» و«دريمي»
      ليها سعر — فالنداء كان بيترفض بصمت واللاعبة بتخرج بحائط غير اللي
      شافته في المعاينة. الوعد اللي الشاشة بتعرضه لازم يتنفّذ.
    */
    grant({ items: [target.wall, target.floor] }, `onboarding_room:${vibe}`)
    setRoomSurface('wall', target.wall)
    setRoomSurface('floor', target.floor)
    setRoomMood(target.mood)
    if (gift) {
      grant({ items: [gift.id] }, `onboarding_gift:${vibe}`)
      wear(gift.category as 'top', gift.id)
    }
    haptic('success')
  }

  return (
    <div className="onb">
      <div className="onb__bar">
        <ProgressBar value={(idx + 1) / STEPS.length} />
      </div>

      {/*
        من غير `AnimatePresence mode="wait"` عن قصد.

        `mode="wait"` بيمنع الخطوة الجديدة من التركيب لحد ما القديمة
        تخلّص خروجها، والخروج ده محتاج إطارات رسم. اتقاس فعليًا: الحالة
        كانت بتتغيّر (شريط التقدّم بيتحرّك) والشاشة واقفة على خطوة
        الترحيب — أونبوردنج متعلّق بالكامل. أهم تدفّق في المنتج ماينفعش
        يعتمد على إن إطار الرسم هييجي في وقته.

        الحل: تركيب فوري بمفتاح الخطوة، والأنيميشن دخول بس.
      */}
      <div className="onb__steps">
        <motion.div
          key={step}
          className="onb__step"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          {step === 'welcome' && (
            <>
              <div className="onb__mark"><IconSpark size={34} /></div>
              <h1 className="h1">{t('onb.welcome.title')}</h1>
              <p className="body onb__body">{t('onb.welcome.body')}</p>

              {/*
                اللغة هنا لا في الإعدادات: لو بنت مابتقراش عربي فتحت
                اللعبة، كل شاشة بعد دي مش مفهومة — والإعدادات نفسها
                مش مفهومة. الاختيار لازم يبقى متاح قبل أي نص تاني.
              */}
              <div className="onb__langRow">
                {LOCALES.map((lc: Locale) => (
                  <button
                    key={lc}
                    type="button"
                    className={`onb__lang${settings.locale === lc ? ' onb__lang--on' : ''}`}
                    onClick={() => { updateSettings({ locale: lc }); haptic('select') }}
                  >
                    {lc === 'ar' ? 'العربية' : 'English'}
                  </button>
                ))}
              </div>

              <Button variant="primary" size="lg" full onClick={() => go('vibe')}>
                {t('onb.welcome.cta')}
              </Button>
            </>
          )}

          {step === 'vibe' && (
            <>
              <h1 className="h2">{t('onb.vibe.title')}</h1>
              <p className="body-sm onb__body">{t('onb.vibe.sub')}</p>

              <div className="onb__roomPreview">
                <RoomScene room={previewRoom} />
              </div>

              <div className="onb__vibes">
                {VIBES.map((vb) => (
                  <button
                    key={vb}
                    type="button"
                    className={`onb__vibe${vibe === vb ? ' onb__vibe--on' : ''}`}
                    onClick={() => { setVibe(vb); haptic('select') }}
                  >
                    <span className="h4">{t(VIBE_KEY[vb].name as 'vibe.soft.name')}</span>
                    <span className="body-xs onb__vibeDesc">{t(VIBE_KEY[vb].desc as 'vibe.soft.desc')}</span>
                    {vibe === vb && <span className="onb__vibeTick"><IconCheck size={13} /></span>}
                  </button>
                ))}
              </div>

              <Button variant="primary" size="lg" full onClick={() => go('avatar')}>
                {t('common.next')}
              </Button>
            </>
          )}

          {step === 'avatar' && (
            <>
              <h1 className="h2">{t('onb.avatar.title')}</h1>
              <p className="body-sm onb__body">{t('onb.avatar.sub')}</p>

              <div className="onb__avatar">
                <AvatarView config={avatar} manifest={manifest} height={210} crop="full" />
              </div>

              {manifest && (
                <div className="onb__picks">
                  <div className="onb__swatchRow">
                    {Object.entries(manifest.skinTones).map(([key, meta]) => {
                      const src = v?.body[bodyKey(key, avatar.eyes)]?.src
                      if (!src) return null
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`onb__face${avatar.skin === key ? ' onb__face--on' : ''}`}
                          onClick={() => { setAvatar((a) => ({ ...a, skin: key })); haptic('select') }}
                          aria-label={tx(meta.name)}
                        >
                          <img src={assetUrl(src)} alt="" className="onb__faceImg" />
                        </button>
                      )
                    })}
                  </div>

                  <div className="onb__swatchRow">
                    {Object.keys(manifest.hairStyles).map((style) => {
                      const layer = v?.hair[hairKey(style, avatar.hairColor)]
                      if (!layer) return null
                      return (
                        <button
                          key={style}
                          type="button"
                          className={`onb__hair${avatar.hairStyle === style ? ' onb__hair--on' : ''}`}
                          onClick={() => { setAvatar((a) => ({ ...a, hairStyle: style })); haptic('select') }}
                          aria-label={tx(manifest.hairStyles[style].name)}
                        >
                          <img src={assetUrl(layer.front)} alt="" className="onb__hairImg" />
                        </button>
                      )
                    })}
                  </div>

                  <div className="onb__swatchRow onb__swatchRow--colors">
                    {Object.keys(manifest.hairColors).map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`onb__dot${avatar.hairColor === c ? ' onb__dot--on' : ''}`}
                        style={{ background: HAIR_SWATCH[c] ?? '#3A2419' }}
                        onClick={() => { setAvatar((a) => ({ ...a, hairColor: c })); haptic('select') }}
                        aria-label={tx(manifest.hairColors[c].name)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <Button variant="primary" size="lg" full onClick={() => go('name')}>
                {t('common.next')}
              </Button>
            </>
          )}

          {step === 'name' && (
            <>
              <h1 className="h2">{t('onb.name.title')}</h1>
              <p className="body-sm onb__body">{t('onb.name.sub')}</p>

              <input
                className="onb__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('onb.name.placeholder')}
                maxLength={16}
                autoComplete="off"
                /* enterKeyHint بيغيّر زرار لوحة المفاتيح لـ«تم» بدل سطر جديد */
                enterKeyHint="done"
                onKeyDown={(e) => { if (e.key === 'Enter' && cleanName) go('ready') }}
              />

              <Button variant="primary" size="lg" full disabled={!cleanName} onClick={() => go('ready')}>
                {t('common.next')}
              </Button>
            </>
          )}

          {step === 'ready' && (
            <>
              <h1 className="h2">{t('onb.room.title')}</h1>
              <p className="body-sm onb__body">{t('onb.room.body')}</p>

              <div className="onb__roomPreview onb__roomPreview--big">
                <RoomScene room={previewRoom} />
                <div className="onb__roomAvatar">
                  <AvatarView config={avatar} manifest={manifest} height={150} crop="full" still />
                </div>
              </div>

              {gift && (
                <div className="onb__gift">
                  <IconSpark size={16} />
                  <span className="body-sm">{t('reward.newItem')}</span>
                </div>
              )}

              <Button variant="primary" size="lg" full onClick={finish}>
                {t('onb.ready')}
              </Button>
            </>
          )}
        </motion.div>
      </div>

      {step !== 'welcome' && step !== 'ready' && (
        <button type="button" className="onb__back body-sm"
                onClick={() => go(STEPS[Math.max(0, idx - 1)])}>
          {t('common.back')}
        </button>
      )}
    </div>
  )
}
