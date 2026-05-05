// Arabic translations for every multiplier option label across AXIS_OPTIONS,
// CREATOR_AXIS_OPTIONS, ESPORTS_INFLUENCER_AXIS_OPTIONS, CHANNEL_PRESETS,
// RIGHTS_BUNDLES, EXTRA_ADDONS, BUNDLE_DISCOUNTS.
//
// Lookup is keyed by the EXACT English label string from pricing.ts so we
// never have to thread axis names through render code — every consumer just
// calls labelByLocale(englishLabel, locale).
//
// Naming style: MSA (Modern Standard Arabic) for formal labels, with
// Saudi-Arabic-friendly phrasing where the term has a regional default.
// Native review encouraged — these are first-pass translations.

import type { Locale } from './dict';

export const AXIS_LABELS_AR: Record<string, string> = {
  // ── Content type ─────────────────────────────────────────────────────
  'Organic / Creator-led':           'عضوي / بإدارة المنشئ',
  'Integrated (Talent-led)':         'مدمج (بقيادة الموهبة)',
  'Sponsored (Client script)':       'مدفوع (بنص العميل)',
  'Co-created brand collab':         'تعاون مشترك مع العلامة',
  'Gameplay / Playtest review':      'استعراض أسلوب اللعب',
  'Educational / Tutorial':          'تعليمي / شرح',

  // ── Engagement (player) ──────────────────────────────────────────────
  '<2% — Below baseline':            'أقل من 2% — تحت المعدل',
  '2–3% — Baseline (low)':           '2–3% — معدل (منخفض)',
  '3–5% — Solid':                    '3–5% — جيد',
  '5–7% — Above avg':                '5–7% — فوق المتوسط',
  '7–10% — Strong':                  '7–10% — قوي',
  '10–15% — Elite':                  '10–15% — متميز',
  '>15% — Outlier (rare)':           'أكثر من 15% — استثنائي (نادر)',
  // Engagement (creator)
  '<2% — Low':                       'أقل من 2% — منخفض',
  '2–4% — Below avg':                '2–4% — تحت المتوسط',
  '4–6% — Base':                     '4–6% — قاعدة',
  '6–8% — Good':                     '6–8% — جيد',
  '8–10% — Strong':                  '8–10% — قوي',
  '>10% — Premium':                  'أكثر من 10% — مميز',

  // ── Audience (player) ────────────────────────────────────────────────
  'Gaming-adjacent':                 'مهتم بالألعاب',
  'Gaming-core':                     'جمهور ألعاب أساسي',
  'Elite brand-fit':                 'ملاءمة عالية للعلامات التجارية',
  'KSA / Saudi mass':                'السعودية — جمهور عام',
  'MENA Arabic gaming':              'الشرق الأوسط — ألعاب عربية',
  'GCC premium / affluent':          'الخليج — جمهور مميز',
  'Tech-savvy / device buyers':      'تقني / مشترو الأجهزة',
  'Family-friendly mass':            'مناسب للعائلة',
  // Audience (creator)
  'Broad Generic':                   'جمهور عام واسع',
  'Gaming-aware':                    'مهتم بالألعاب',
  'Core Gaming':                     'جمهور ألعاب أساسي',
  'Esports-native / Premium fit':    'رياضات إلكترونية أصلية / ملاءمة مميزة',
  'Youth Entertainment / Variety':   'ترفيه الشباب / تنوع',
  'Comedy / Meme Culture':           'كوميديا / ثقافة الميمز',
  'Sports / Football / Active':      'رياضة / كرة قدم / نشاط',
  'Anime / Geek / Fandom':           'أنمي / مشجعون',
  'Family / Household / Mainstream': 'عائلة / منزلي / عام',
  'KSA / Saudi Mass':                'السعودية — جمهور عام',
  'MENA Arabic':                     'الشرق الأوسط — عربي',
  'GCC Premium / Affluent':          'الخليج — مميز',
  'Tech / Telco / Devices':          'تقني / اتصالات / أجهزة',
  'Retail / QSR / FMCG':             'تجزئة / مطاعم سريعة / استهلاكي',
  'Travel / Tourism / Destination':  'سفر / سياحة / وجهات',
  'Finance / Education / CSR':       'مالية / تعليم / مسؤولية اجتماعية',

  // ── Seasonality ──────────────────────────────────────────────────────
  'Off-season / dead window':              'خارج الموسم',
  'Regular season':                        'موسم اعتيادي',
  'Pre-event hype window':                 'فترة التشويق قبل الحدث',
  'Brand peak (Black Friday etc)':         'ذروة العلامات (الجمعة البيضاء)',
  'Ramadan window':                        'فترة رمضان',
  'Major / Worlds / Regional finals':      'البطولة الكبرى / المونديال / النهائيات',
  'Game launch week':                      'أسبوع إطلاق اللعبة',
  'Finals / Championship night':           'النهائيات / ليلة البطولة',
  'Esports World Cup (KSA-hosted)':        'كأس العالم للرياضات الإلكترونية (السعودية)',

  // ── Language ─────────────────────────────────────────────────────────
  'English':                         'الإنجليزية',
  'Arabic — MSA':                    'العربية — الفصحى',
  'Arabic — Khaleeji (Saudi/Gulf)':  'العربية — الخليجية',
  'Arabic — Egyptian':               'العربية — المصرية',
  'Arabic — Levantine':              'العربية — الشامية',
  'Bilingual (EN + AR)':             'ثنائي اللغة (إنجليزي + عربي)',
  'Trilingual (EN + AR + EN-CC)':    'ثلاثي اللغة',
  'Spanish':                         'الإسبانية',
  'Portuguese':                      'البرتغالية',
  'French':                          'الفرنسية',
  'Russian':                         'الروسية',
  'Korean':                          'الكورية',
  'Arabic':                          'العربية',
  'Bilingual (EN+AR)':               'ثنائي اللغة',

  // ── Authority (player) ───────────────────────────────────────────────
  'Normal':                          'عادي',
  'Proven / Established':            'مثبت / راسخ',
  'Elite Contender':                 'منافس متميز',
  'Global Star / Major Winner':      'نجم عالمي / فائز ببطولة كبرى',
  'Iconic / Hall-of-Fame':           'أيقونة / قاعة المشاهير',
  // Authority (creator)
  'Standard':                        'عادي',
  'Trusted niche leader':            'رائد متخصص موثوق',
  'Premium conversion driver':       'محرك تحويل مميز',
  'Category-defining / Hero':        'محدد للفئة / مرجع',

  // ── Stream activity ──────────────────────────────────────────────────
  'Inactive (0 hr / 30d)':           'غير نشط (0 ساعة / 30 يوم)',
  'Light (1–10 hr / 30d)':           'خفيف (1–10 ساعة / 30 يوم)',
  'Regular (10–30 hr / 30d)':        'معتاد (10–30 ساعة / 30 يوم)',
  'Active (30–60 hr / 30d)':         'نشط (30–60 ساعة / 30 يوم)',
  'Heavy streamer (60+ hr / 30d)':   'بث مكثف (+60 ساعة / 30 يوم)',
  'Pro full-time (100+ hr / 30d)':   'محترف بدوام كامل (+100 ساعة / 30 يوم)',

  // ── Audience country mix ─────────────────────────────────────────────
  'Mismatched <20% in target':       'غير متوافق (أقل من 20% في المستهدف)',
  'Crossover 20–40%':                'تقاطع 20–40%',
  'Aligned 40–70%':                  'متوافق 40–70%',
  'Strongly aligned >70%':           'متوافق بقوة (أكثر من 70%)',

  // ── Audience age ─────────────────────────────────────────────────────
  'Youth-skewed 13–24':              'شبابي 13–24',
  'Mainstream 18–34':                'عام 18–34',
  'Premium 25–44 (high-spend)':      'مميز 25–44 (إنفاق مرتفع)',

  // ── Integration depth ────────────────────────────────────────────────
  'Passive (logo visible)':          'سلبي (الشعار ظاهر)',
  'Active (talent uses product)':    'نشط (الموهبة تستخدم المنتج)',
  'Endorsement (talent vouches)':    'توصية (الموهبة تشهد للمنتج)',
  'Long-term ambassador':            'سفير طويل الأمد',

  // ── First look ───────────────────────────────────────────────────────
  'Standard (no exclusivity)':       'عادي (بلا حصرية)',
  '48h regional first':              'حصرية إقليمية 48 ساعة',
  '24h global first':                'حصرية عالمية 24 ساعة',
  'Launch-day exclusive (full day)': 'حصرية يوم الإطلاق',

  // ── Real-time / live ─────────────────────────────────────────────────
  'Standard (recorded / scheduled)': 'عادي (مسجل / مجدول)',
  "Live during talent's match":      'مباشر خلال مباراة الموهبة',
  'Trophy moment / win celebration': 'لحظة الفوز / احتفال البطولة',

  // ── Lifestyle context ────────────────────────────────────────────────
  'At-home casual':                  'في المنزل',
  'Training facility (Falcons HQ)':  'مرفق تدريب (مقر فالكونز)',
  'Lifestyle (gym/travel/event)':    'نمط حياة (نادي/سفر/حدث)',

  // ── Brand safety ─────────────────────────────────────────────────────
  'Low (<0.6) — risky for premium':  'منخفض (أقل من 0.6) — مخاطر للعلامات المميزة',
  'Standard (0.6–0.85)':             'عادي (0.6–0.85)',
  'Premium (>0.85) — family-safe':   'مميز (أعلى من 0.85) — مناسب للعائلة',

  // ── Collab size ──────────────────────────────────────────────────────
  'Solo':                            'فردي',
  'Duo (2 talents)':                 'ثنائي (موهبتان)',
  'Trio (3 talents)':                'ثلاثي (3 مواهب)',
  'Squad (4+ talents)':              'فريق (4 مواهب فأكثر)',

  // ── Signature asset lock (rights stretch) ────────────────────────────
  'None':                            'لا شيء',
  'Asset lock — 30d':                'قفل المحتوى — 30 يوم',
  'Asset lock — 90d':                'قفل المحتوى — 90 يوم',
  'Asset lock — 6mo':                'قفل المحتوى — 6 أشهر',
  'Asset lock — 12mo':               'قفل المحتوى — 12 شهر',
  'Category exclusive — 30d':        'حصرية الفئة — 30 يوم',
  'Category exclusive — 90d':        'حصرية الفئة — 90 يوم',
  'Category exclusive — 180d':       'حصرية الفئة — 180 يوم',
  'Category exclusive — 12mo':       'حصرية الفئة — 12 شهر',

  // ── Production ───────────────────────────────────────────────────────
  'Standard creation':               'إنتاج عادي',
  'Scripted / extra revisions':      'مع نص / مراجعات إضافية',
  'Location / on-ground shoot':      'تصوير في موقع',
  'Multi-day / production-heavy':    'إنتاج متعدد الأيام',
  'On-ground / special shoot':       'تصوير خاص في موقع',

  // ── Objective ────────────────────────────────────────────────────────
  'Awareness (Wt 0.2)':              'الوعي (وزن 0.2)',
  'Consideration (Wt 0.5)':          'الاعتبار (وزن 0.5)',
  'Conversion (Wt 0.7)':             'التحويل (وزن 0.7)',
  'Authority (Wt 1.0)':              'الموثوقية (وزن 1.0)',
  'Awareness':                       'الوعي',
  'Consideration / Traffic':         'الاعتبار / الزيارات',
  'Conversion':                      'التحويل',
  'Trust / Authority':               'الثقة / الموثوقية',

  // ── Data completeness ────────────────────────────────────────────────
  'Full — socials + tournament data':       'مكتمل — وسائل التواصل + بيانات البطولات',
  'Socials only — no tournament record':    'وسائل التواصل فقط',
  'Tournament only — weak/no socials':      'بيانات البطولات فقط',
  'Minimal — staff / brand-new / no data':  'محدود — موظف / جديد / بلا بيانات',

  // ── Confidence (legacy) ──────────────────────────────────────────────
  'Pending (legacy)':                'قيد الانتظار (قديم)',
  'Estimated (legacy)':              'تقديري (قديم)',
  'Rounded (legacy)':                'مقرب (قديم)',
  'Exact (legacy)':                  'دقيق (قديم)',

  // ── Channel presets ──────────────────────────────────────────────────
  'Direct brand':                    'علامة تجارية مباشرة',
  'Agency-brokered (Light)':         'بوسيط وكالة (خفيف)',
  'Agency-brokered (Standard)':      'بوسيط وكالة (قياسي)',
  'Agency-brokered (Heavy)':         'بوسيط وكالة (مكثف)',
  'Strategic account':               'حساب استراتيجي',
};

/**
 * Look up the locale-appropriate label. Falls back to the original English
 * label when no translation exists or locale is 'en'.
 *
 * Used by labelForFactor in pricing.ts plus dropdowns and breakdown rows
 * across QuoteBuilder, QuoteConfigurator, and the WhyPrice popover.
 */
export function labelByLocale(label: string | null | undefined, locale: Locale): string {
  if (!label) return '';
  if (locale === 'ar') {
    return AXIS_LABELS_AR[label] ?? label;
  }
  return label;
}
