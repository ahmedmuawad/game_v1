import type { LocalizedText } from '@/i18n/types'

/**
 * بنك أسئلة اختبار الستايل — بيانات لا كود (قاعدة #4).
 *
 * **قاعدة تحرير غير قابلة للتفاوض: مفيش سؤال إجابته الصح ذوق شخصي.**
 * كل سؤال هنا عن حقيقة قابلة للتحقّق: وظيفة القطعة، أو المناسبة اللي
 * اتصممت ليها، أو خامة بتدفّي. تقييم ذوق بنت 12 سنة بـ«صح» و«غلط»
 * بيعلّمها إن ليها ذوق غلط — وده عكس وعد المنتج تمامًا
 * (PRODUCT_BLUEPRINT §2).
 *
 * قبل ما تضيف سؤال اسأل: «هل ممكن بنت ليها ذوق مختلف تجاوب غلط وهي
 * محقّة؟» لو الإجابة أيوه، السؤال ما ينفعش.
 */

export interface QuizQuestion {
  id: string
  prompt: LocalizedText
  options: LocalizedText[]
  /** فهرس الإجابة الصحيحة في options. */
  answer: number
}

export const QUIZ_BANK: QuizQuestion[] = [
  {
    id: 'q_layer_cold',
    prompt: { ar: 'الجو برد. أنهي قطعة تدفّي أكتر؟', en: 'It is cold out. Which piece keeps you warmest?' },
    options: [
      { ar: 'كارديجان صوف', en: 'Wool cardigan' },
      { ar: 'تي شيرت قطن', en: 'Cotton tee' },
      { ar: 'توب حمّالات', en: 'Tank top' },
    ],
    answer: 0,
  },
  {
    id: 'q_formal',
    prompt: { ar: 'حفلة رسمية في المدرسة. أنهي دي الأنسب للمناسبة؟', en: 'A formal school event. Which suits the occasion?' },
    options: [
      { ar: 'شورت رياضي', en: 'Gym shorts' },
      { ar: 'فستان سواريه', en: 'Evening dress' },
      { ar: 'بيچامة', en: 'Pyjamas' },
    ],
    answer: 1,
  },
  {
    id: 'q_sport',
    prompt: { ar: 'حصة الرياضة. أنهي حذاء مصمَّم للجري؟', en: 'PE class. Which shoe is built for running?' },
    options: [
      { ar: 'كعب عالي', en: 'High heels' },
      { ar: 'صندل', en: 'Sandals' },
      { ar: 'سنيكرز', en: 'Sneakers' },
    ],
    answer: 2,
  },
  {
    id: 'q_rain',
    prompt: { ar: 'بتمطر. إيه اللي بيحميكي من المطر؟', en: 'It is raining. What actually keeps the rain off?' },
    options: [
      { ar: 'جاكيت مقاوم للماء', en: 'Water-resistant jacket' },
      { ar: 'كارديجان مفتوح', en: 'Open cardigan' },
      { ar: 'إيشارب حرير', en: 'Silk scarf' },
    ],
    answer: 0,
  },
  {
    id: 'q_dress_rule',
    prompt: { ar: 'لبستي فستان. أنهي قطعة مبقتش ليها لازمة؟', en: 'You put on a dress. Which piece is now redundant?' },
    options: [
      { ar: 'الحذاء', en: 'Shoes' },
      { ar: 'البنطلون', en: 'Trousers' },
      { ar: 'الإكسسوار', en: 'Accessory' },
    ],
    answer: 1,
  },
  {
    id: 'q_denim',
    prompt: { ar: 'الجينز أصله اتعمل لمين؟', en: 'Denim was originally made for whom?' },
    options: [
      { ar: 'عمّال', en: 'Workers' },
      { ar: 'ملوك', en: 'Royalty' },
      { ar: 'رياضيين', en: 'Athletes' },
    ],
    answer: 0,
  },
  {
    id: 'q_layers',
    prompt: { ar: 'إيه معنى «تنسيق الطبقات» في اللبس؟', en: 'What does "layering" mean in styling?' },
    options: [
      { ar: 'لبس ألوان كتير مع بعض', en: 'Wearing many colors together' },
      { ar: 'لبس قطع فوق بعض', en: 'Wearing pieces over one another' },
      { ar: 'تغيير اللبس كل يوم', en: 'Changing clothes daily' },
    ],
    answer: 1,
  },
  {
    id: 'q_cozy',
    prompt: { ar: 'ليلة مذاكرة في البيت. أنهي وصف يناسب اللبس المريح؟', en: 'A study night at home. Which word describes comfy wear?' },
    options: [
      { ar: 'رسمي', en: 'Formal' },
      { ar: 'دافي', en: 'Cozy' },
      { ar: 'سواريه', en: 'Black tie' },
    ],
    answer: 1,
  },
  {
    id: 'q_care',
    prompt: { ar: 'قطعة صوف. إزاي تغسليها من غير ما تبوظ؟', en: 'A wool piece. How do you wash it safely?' },
    options: [
      { ar: 'مياه سخنة ودعك قوي', en: 'Hot water, scrub hard' },
      { ar: 'مياه باردة وبرفق', en: 'Cold water, gently' },
      { ar: 'ماتغسليهاش خالص', en: 'Never wash it' },
    ],
    answer: 1,
  },
  {
    id: 'q_accessory',
    prompt: { ar: 'الإكسسوار وظيفته إيه في الإطلالة؟', en: 'What is an accessory for in a look?' },
    options: [
      { ar: 'يكمّل ويضيف لمسة', en: 'To complete and add a touch' },
      { ar: 'يغطّي الإطلالة كلها', en: 'To cover the whole outfit' },
      { ar: 'يحلّ محل الحذاء', en: 'To replace shoes' },
    ],
    answer: 0,
  },
  {
    id: 'q_neutral',
    prompt: { ar: 'أنهي دول لون محايد بيتنسّق مع أي حاجة؟', en: 'Which of these is a neutral that pairs with anything?' },
    options: [
      { ar: 'أحمر ناري', en: 'Bright red' },
      { ar: 'بيچ', en: 'Beige' },
      { ar: 'أخضر نيون', en: 'Neon green' },
    ],
    answer: 1,
  },
  {
    id: 'q_fit',
    prompt: { ar: 'المقاس الصح معناه إيه؟', en: 'What does a good fit mean?' },
    options: [
      { ar: 'أصغر مقاس ممكن', en: 'The smallest size possible' },
      { ar: 'اللي تتحركي فيه مرتاحة', en: 'One you can move comfortably in' },
      { ar: 'أكبر مقاس ممكن', en: 'The largest size possible' },
    ],
    answer: 1,
  },
]
