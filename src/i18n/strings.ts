import type { LocalizedText } from './types'

/**
 * كل نص يواجه اللاعب. صفر نصوص مكتوبة مباشرة في المكوّنات.
 * القاعدة: أي سلسلة نصية معروضة في الواجهة يجب أن يكون لها مفتاح هنا.
 */
export const strings = {
  // ===== عام =====
  'app.name':            { ar: 'ليڤي', en: 'LIVI' },
  'app.tagline':         { ar: 'حياتك. ستايلك. اختياراتك.', en: 'Your Life. Your Style. Your Choices.' },
  'common.continue':     { ar: 'يلا نكمّل', en: 'Continue' },
  'common.next':         { ar: 'التالي', en: 'Next' },
  'common.back':         { ar: 'رجوع', en: 'Back' },
  'common.done':         { ar: 'تمام', en: 'Done' },
  'common.save':         { ar: 'حفظ', en: 'Save' },
  'common.cancel':       { ar: 'إلغاء', en: 'Cancel' },
  'common.close':        { ar: 'إغلاق', en: 'Close' },
  'common.confirm':      { ar: 'تأكيد', en: 'Confirm' },
  'common.retry':        { ar: 'مرة تانية', en: 'Try Again' },
  'common.claim':        { ar: 'استلمي', en: 'Claim' },
  'common.equip':        { ar: 'ارتدي', en: 'Wear' },
  'common.equipped':     { ar: 'مرتدية', en: 'Worn' },
  'common.place':        { ar: 'ضعي', en: 'Place' },
  'common.owned':        { ar: 'مملوكة', en: 'Owned' },
  'common.locked':       { ar: 'مقفولة', en: 'Locked' },
  'common.free':         { ar: 'مجانًا', en: 'Free' },
  'common.skip':         { ar: 'تخطّي', en: 'Skip' },
  'common.level':        { ar: 'المستوى', en: 'Level' },
  'common.soon':         { ar: 'قريبًا', en: 'Soon' },
  'common.empty':        { ar: 'مفيش حاجة هنا لسه', en: 'Nothing here yet' },
  'common.loading':      { ar: 'لحظة…', en: 'One moment…' },

  // ===== التنقل =====
  'nav.story':   { ar: 'القصة', en: 'Story' },
  'nav.room':    { ar: 'غرفتي', en: 'Room' },
  'nav.style':   { ar: 'الستايل', en: 'Style' },
  'nav.play':    { ar: 'ألعاب', en: 'Play' },
  'nav.shop':    { ar: 'المتجر', en: 'Shop' },

  // ===== الأونبوردنج =====
  'onb.welcome.title':    { ar: 'أهلاً بيكِ في ليڤي', en: 'Welcome to LIVI' },
  'onb.welcome.body':     { ar: 'مساحة ليكِ إنتِ. اختاري ستايلك، عيشي قصتك، واعملي عالمك زي ما إنتِ عايزة.', en: 'A space that is entirely yours. Pick your style, live your story, and build your world your way.' },
  'onb.welcome.cta':      { ar: 'يلا نبدأ', en: "Let's Begin" },
  'onb.lang.title':       { ar: 'اختاري لغتك', en: 'Choose your language' },
  'onb.avatar.title':     { ar: 'مين إنتِ؟', en: 'Who are you?' },
  'onb.avatar.sub':       { ar: 'اعملي شخصيتك — تقدري تغيّريها في أي وقت', en: 'Create your look — you can change it anytime' },
  'onb.name.title':       { ar: 'إيه اسمك؟', en: "What's your name?" },
  'onb.name.sub':         { ar: 'ده الاسم اللي هتناديكي بيه الشخصيات في القصة', en: 'This is what characters will call you in the story' },
  'onb.name.placeholder': { ar: 'اكتبي اسمك', en: 'Type your name' },
  'onb.vibe.title':       { ar: 'إيه الفايب بتاعك؟', en: "What's your vibe?" },
  'onb.vibe.sub':         { ar: 'هيحدّد شكل غرفتك وأول إطلالة ليكِ', en: 'This shapes your room and your first outfit' },
  'onb.room.title':       { ar: 'دي غرفتك', en: 'This is your room' },
  'onb.room.body':        { ar: 'كل حاجة هنا إنتِ اللي بتختاريها. الغرفة دي هتكبر معاكِ.', en: 'Everything here is your choice. This room grows with you.' },
  'onb.ready':            { ar: 'خلاص جاهزة', en: "I'm ready" },

  // ===== الفايبات =====
  'vibe.soft.name':    { ar: 'سوفت', en: 'Soft' },
  'vibe.soft.desc':    { ar: 'دافي، هادي، ألوان فاتحة', en: 'Warm, calm, gentle tones' },
  'vibe.bold.name':    { ar: 'بولد', en: 'Bold' },
  'vibe.bold.desc':    { ar: 'جريء، ألوان قوية، بيلفت النظر', en: 'Daring, strong color, turns heads' },
  'vibe.dreamy.name':  { ar: 'دريمي', en: 'Dreamy' },
  'vibe.dreamy.desc':  { ar: 'بنفسجي، نجوم، خيالي', en: 'Violet, stars, a little magic' },

  // ===== القصة =====
  'story.title':          { ar: 'القصة', en: 'Story' },
  'story.chapter':        { ar: 'الفصل', en: 'Chapter' },
  'story.season':         { ar: 'الموسم', en: 'Season' },
  'story.continue':       { ar: 'أكملي الفصل', en: 'Continue Chapter' },
  'story.start':          { ar: 'ابدئي الفصل', en: 'Start Chapter' },
  'story.replay':         { ar: 'اقرئي تاني', en: 'Replay' },
  'story.locked':         { ar: 'مقفول لسه', en: 'Not yet' },
  'story.chapterDone':    { ar: 'خلّصتي الفصل', en: 'Chapter Complete' },
  'story.nextIn':         { ar: 'الفصل الجاي بعد', en: 'Next chapter in' },
  'story.noEnergy.title': { ar: 'الطاقة خلصت', en: 'Out of energy' },
  'story.noEnergy.body':  { ar: 'الطاقة بتترجع لوحدها. لحد ما ترجع، تعالي نجهّز الغرفة أو نلعب شوية.', en: 'Energy refills on its own. Until then, style your room or play a game.' },
  'story.noEnergy.cta':   { ar: 'شوفي حاجة تانية', en: 'Do something else' },
  'story.watchAdEnergy':  { ar: 'اتفرجي على إعلان → +1 طاقة', en: 'Watch an ad → +1 energy' },
  'story.tapToContinue':  { ar: 'المسي للمتابعة', en: 'Tap to continue' },
  'story.yourChoice':     { ar: 'إنتِ هتعملي إيه؟', en: 'What do you do?' },
  'story.autoplay':       { ar: 'تشغيل تلقائي', en: 'Autoplay' },

  // ===== الأثر / السمات =====
  'trait.confidence': { ar: 'الثقة', en: 'Confidence' },
  'trait.creativity': { ar: 'الإبداع', en: 'Creativity' },
  'trait.empathy':    { ar: 'التعاطف', en: 'Empathy' },
  'trait.wits':       { ar: 'الذكاء', en: 'Wits' },
  'trait.up':         { ar: 'زادت', en: 'increased' },
  'relationship.up':  { ar: 'قربتوا من بعض', en: 'You grew closer' },
  'relationship.down':{ ar: 'حصل توتر', en: 'Things got tense' },

  // ===== الغرفة =====
  'room.title':        { ar: 'غرفتي', en: 'My Room' },
  'room.edit':         { ar: 'عدّلي', en: 'Edit' },
  'room.mood':         { ar: 'الإضاءة', en: 'Lighting' },
  'room.mood.day':     { ar: 'نهار', en: 'Day' },
  'room.mood.sunset':  { ar: 'غروب', en: 'Sunset' },
  'room.mood.night':   { ar: 'ليل', en: 'Night' },
  'room.snapshot':     { ar: 'التقطي لقطة', en: 'Snapshot' },
  'room.cat.wall':     { ar: 'الحائط', en: 'Wall' },
  'room.cat.floor':    { ar: 'الأرضية', en: 'Floor' },
  'room.cat.bed':      { ar: 'السرير', en: 'Bed' },
  'room.cat.desk':     { ar: 'المكتب', en: 'Desk' },
  'room.cat.decor':    { ar: 'ديكور', en: 'Decor' },
  'room.cat.plant':    { ar: 'نباتات', en: 'Plants' },
  'room.cat.rug':      { ar: 'سجاد', en: 'Rug' },
  'room.cat.poster':   { ar: 'ملصقات', en: 'Posters' },

  // ===== الستايل / الخزانة =====
  'style.title':       { ar: 'الستايل', en: 'Style' },
  'style.wardrobe':    { ar: 'الخزانة', en: 'Wardrobe' },
  'style.looks':       { ar: 'إطلالاتي', en: 'My Looks' },
  'style.saveLook':    { ar: 'احفظي الإطلالة', en: 'Save Look' },
  'style.cat.hair':    { ar: 'الشعر', en: 'Hair' },
  'style.cat.face':    { ar: 'الوجه', en: 'Face' },
  'style.cat.top':     { ar: 'فوق', en: 'Top' },
  'style.cat.bottom':  { ar: 'تحت', en: 'Bottom' },
  'style.cat.dress':   { ar: 'فساتين', en: 'Dresses' },
  'style.cat.shoes':   { ar: 'أحذية', en: 'Shoes' },
  'style.cat.acc':     { ar: 'إكسسوارات', en: 'Accessories' },
  'style.skin':        { ar: 'البشرة', en: 'Skin' },
  'style.hairColor':   { ar: 'لون الشعر', en: 'Hair Color' },
  'style.eyes':        { ar: 'العيون', en: 'Eyes' },

  // ===== الألعاب =====
  'play.title':        { ar: 'ألعاب', en: 'Play' },
  'play.subtitle':     { ar: 'العبي، اكسبي، ارجعي بكرة', en: 'Play, earn, come back tomorrow' },
  'play.howTo':        { ar: 'إزاي ألعب', en: 'How to play' },
  'play.start':        { ar: 'يلا نلعب', en: 'Play' },
  'play.score':        { ar: 'النتيجة', en: 'Score' },
  'play.best':         { ar: 'أفضل نتيجة', en: 'Best' },
  'play.newBest':      { ar: 'رقم قياسي جديد!', en: 'New best!' },
  'play.results':      { ar: 'النتيجة', en: 'Results' },
  'play.combo':        { ar: 'متتالية', en: 'Combo' },
  'play.timeLeft':     { ar: 'الوقت', en: 'Time' },
  'play.perfect':      { ar: 'ممتاز!', en: 'Perfect!' },
  'play.good':         { ar: 'حلو!', en: 'Nice!' },
  'play.miss':         { ar: 'فاتت', en: 'Miss' },

  // ===== الاقتصاد =====
  'econ.coins':        { ar: 'كوينز', en: 'Coins' },
  'econ.gems':         { ar: 'جيمز', en: 'Gems' },
  'econ.energy':       { ar: 'طاقة', en: 'Energy' },
  'econ.notEnough':    { ar: 'مش كفاية', en: 'Not enough' },
  'econ.purchased':    { ar: 'تمام، بقت بتاعتك', en: "It's yours now" },
  'econ.energyFull':   { ar: 'الطاقة كاملة', en: 'Energy full' },
  'econ.energyIn':     { ar: 'طاقة جديدة بعد', en: 'Next energy in' },

  // ===== الحلقة اليومية =====
  'daily.title':       { ar: 'اليوم', en: 'Today' },
  'daily.reward':      { ar: 'هدية اليوم', en: "Today's gift" },
  'daily.streak':      { ar: 'يوم ورا التاني', en: 'Day streak' },
  'daily.streakSafe':  { ar: 'سلسلتك في أمان النهاردة 💗', en: 'Your streak is protected today 💗' },
  'daily.missions':    { ar: 'مهام اليوم', en: "Today's missions" },
  'daily.allDone':     { ar: 'خلّصتي كل حاجة النهاردة!', en: 'All done for today!' },
  'daily.comeBack':    { ar: 'تعالي بكرة', en: 'Come back tomorrow' },
  'daily.moment':      { ar: 'لحظة اليوم', en: 'Moment of the day' },

  // ===== المتجر =====
  'shop.title':        { ar: 'المتجر', en: 'Shop' },
  'shop.featured':     { ar: 'مميّز', en: 'Featured' },
  'shop.new':          { ar: 'جديد', en: 'New' },
  'shop.buy':          { ar: 'اشتري', en: 'Buy' },
  'shop.limited':      { ar: 'لفترة محدودة', en: 'Limited time' },

  // ===== الندرة =====
  'rarity.common':    { ar: 'عادي', en: 'Common' },
  'rarity.rare':      { ar: 'نادر', en: 'Rare' },
  'rarity.epic':      { ar: 'ملحمي', en: 'Epic' },
  'rarity.legendary': { ar: 'أسطوري', en: 'Legendary' },

  // ===== الإعلانات =====
  'ad.doubleReward':  { ar: 'ضاعفي الجايزة', en: 'Double your reward' },
  'ad.watch':         { ar: 'اتفرجي على إعلان', en: 'Watch an ad' },
  'ad.optional':      { ar: 'اختياري تمامًا', en: 'Totally optional' },
  'ad.limitReached':  { ar: 'كفاية إعلانات النهاردة 💗', en: 'Enough ads for today 💗' },
  'ad.unavailable':   { ar: 'مفيش إعلان متاح دلوقتي', en: 'No ad available right now' },

  // ===== المكافآت =====
  'reward.title':     { ar: 'كسبتي!', en: 'You earned!' },
  'reward.levelUp':   { ar: 'مستوى جديد!', en: 'Level up!' },
  'reward.unlocked':  { ar: 'اتفتح', en: 'Unlocked' },
  'reward.newItem':   { ar: 'عنصر جديد', en: 'New item' },

  // ===== الإعدادات =====
  'settings.title':     { ar: 'الإعدادات', en: 'Settings' },
  'settings.language':  { ar: 'اللغة', en: 'Language' },
  'settings.music':     { ar: 'الموسيقى', en: 'Music' },
  'settings.sfx':       { ar: 'المؤثرات', en: 'Sound effects' },
  'settings.haptics':   { ar: 'الاهتزاز', en: 'Haptics' },
  'settings.reduceMotion': { ar: 'تقليل الحركة', en: 'Reduce motion' },
  'settings.privacy':   { ar: 'الخصوصية', en: 'Privacy' },
  'settings.reset':     { ar: 'إعادة تعيين التقدّم', en: 'Reset progress' },
  'settings.resetConfirm': { ar: 'متأكدة؟ كل حاجة هتتمسح ومش هينفع ترجع.', en: 'Are you sure? Everything will be erased permanently.' },
} as const satisfies Record<string, LocalizedText>

export type StringKey = keyof typeof strings
