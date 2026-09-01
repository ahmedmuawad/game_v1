import { getConfig } from '@/systems/config'
import type { PlayerState } from './types'

/** 3: أُضيفت `settings.locale` — اللغة بقت محفوظة بدل ما ترجع للعربي كل تشغيل. */
export const SCHEMA_VERSION = 3

/**
 * العناصر الممنوحة عند بدء اللعب.
 * ثابتة هنا (لا تُقرأ من الـmanifest) لأن الحالة الابتدائية تُبنى
 * بشكل متزامن قبل تحميل الأصول. تطابق `starter=True` في `tools/avatar/wardrobe.py`.
 */
export const STARTER_ITEM_IDS = ['top_tee_cream', 'bot_jeans_classic', 'sh_sneak_white']

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** مفتاح أسبوع ISO — يستخدم لتجميدة السلسلة الأسبوعية. */
export function weekKey(d: Date = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function createInitialState(): PlayerState {
  const cfg = getConfig()
  const now = Date.now()
  return {
    version: SCHEMA_VERSION,
    onboarded: false,
    name: '',
    vibe: 'soft',

    level: 1,
    xp: 0,

    coins: 250,
    gems: 5,
    energy: cfg.energyMax,
    energyAt: now,

    traits: { confidence: 10, creativity: 10, empathy: 10, wits: 10 },
    relationships: {},
    flags: {},

    owned: [...STARTER_ITEM_IDS],
    avatar: {
      skin: 'honey',
      eyes: 'brown',
      hairStyle: 'long_wavy',
      hairColor: 'espresso',
      worn: {
        top: 'top_tee_cream',
        bottom: 'bot_jeans_classic',
        shoes: 'sh_sneak_white',
      },
    },
    room: {
      wall: 'wall_blush',
      floor: 'floor_oak',
      mood: 'day',
      slots: { bed: 'bed_cozy_cream', desk: 'desk_study' },
    },

    story: {
      seasonId: 's1',
      chapterId: 's1_c1',
      nodeId: null,
      completed: [],
      nextUnlockAt: null,
    },

    daily: {
      day: todayKey(),
      /*
        أول يوم لعب هو سلسلة من يوم واحد، مش صفر. مع `day: todayKey()`
        بيرجّع `rollDay` الحالة زي ما هي في نفس اليوم، فلو بدأنا من صفر
        كانت اللاعبة تفضل شايفة «0 يوم» طول أول يوم كامل.
      */
      streak: 1,
      freezeUsedWeek: null,
      giftClaimed: false,
      missions: [],
      momentSeen: null,
      adsWatched: 0,
    },

    settings: { music: true, sfx: true, haptics: true, reduceMotion: false, locale: 'ar' },

    stats: {
      sessions: 0,
      chaptersCompleted: 0,
      minigamesPlayed: 0,
      itemsOwned: STARTER_ITEM_IDS.length,
      outfitChanges: 0,
      roomEdits: 0,
      coinsEarnedTotal: 0,
      adsWatchedTotal: 0,
      firstLaunchAt: now,
    },

    bestScores: {},
  }
}
