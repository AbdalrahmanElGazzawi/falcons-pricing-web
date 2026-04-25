/**
 * i18n dictionary — start small, grow organically. Arabic strings
 * approved by a native speaker. English is the source of truth.
 */
export type Locale = 'en' | 'ar';

export const LOCALES: Locale[] = ['en', 'ar'];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
};

export const dict = {
  // Sidebar / nav
  'nav.dashboard':    { en: 'Dashboard',    ar: 'لوحة التحكم' },
  'nav.new_quote':    { en: 'New Quote',    ar: 'عرض سعر جديد' },
  'nav.calculator':   { en: 'Calculator',   ar: 'الحاسبة' },
  'nav.quote_log':    { en: 'Quote Log',    ar: 'سجل العروض' },
  'nav.inquiries':    { en: 'Inquiries',    ar: 'الاستفسارات' },
  'nav.roster':       { en: 'Roster',       ar: 'اللاعبون' },
  'nav.creators':     { en: 'Creators',     ar: 'صناع المحتوى' },
  'nav.roadmap':      { en: 'Roadmap',      ar: 'خارطة الطريق' },
  'nav.about':        { en: 'About',        ar: 'حول' },
  'nav.users':        { en: 'Users',        ar: 'المستخدمون' },
  'nav.tiers':        { en: 'Tiers',        ar: 'الفئات' },
  'nav.addons':       { en: 'Add-ons',      ar: 'الإضافات' },
  'nav.assumptions':  { en: 'Assumptions',  ar: 'الفرضيات' },
  'nav.pricing_os':   { en: 'Pricing OS',   ar: 'نظام التسعير' },
  'nav.audit_log':    { en: 'Audit Log',    ar: 'سجل التدقيق' },
  'nav.sales_log':    { en: 'Sales Log',    ar: 'سجل المبيعات' },
  'nav.search':       { en: 'Search…',      ar: '...بحث' },
  'nav.change_pwd':   { en: 'Change password', ar: 'تغيير كلمة المرور' },
  'nav.sign_out':     { en: 'Sign out',     ar: 'تسجيل الخروج' },
  'nav.brand_tagline':{ en: 'Pricing OS',   ar: 'نظام التسعير' },

  // Dashboard
  'dash.welcome':         { en: 'Welcome',                         ar: 'أهلاً' },
  'dash.subtitle':        { en: 'Team Falcons · Pricing OS',       ar: 'فريق فالكونز · نظام التسعير' },
  'dash.ops_view':        { en: 'Operations view',                 ar: 'عرض العمليات' },
  'dash.exec_view':       { en: 'Executive view',                  ar: 'عرض القيادة' },
  'dash.new_quote':       { en: 'New quote',                       ar: 'عرض سعر جديد' },
  'dash.revenue_collected':{en: 'Revenue collected',               ar: 'الإيرادات المحصلة' },
  'dash.open_pipeline':   { en: 'Open pipeline',                   ar: 'الصفقات المفتوحة' },
  'dash.avg_deal':        { en: 'Avg deal size',                   ar: 'متوسط حجم الصفقة' },
  'dash.revenue_trend':   { en: 'Revenue trend',                   ar: 'اتجاه الإيرادات' },
  'dash.revenue_trend_sub':{en: 'Collected (solid) vs pipeline (translucent), by month', ar: 'المحصلة (صلب) مقابل الصفقات المفتوحة (شفاف)، شهرياً' },
  'dash.status_mix':      { en: 'Status mix',                      ar: 'توزيع الحالات' },
  'dash.status_mix_sub':  { en: 'Deal count by stage',             ar: 'عدد الصفقات حسب المرحلة' },
  'dash.top_creators':    { en: 'Top creators',                    ar: 'أبرز صناع المحتوى' },
  'dash.top_creators_sub':{ en: 'By total revenue (SAR + VAT)',    ar: 'حسب إجمالي الإيرادات (ريال + ضريبة)' },
  'dash.brand_portfolio': { en: 'Brand portfolio',                 ar: 'محفظة العلامات التجارية' },
  'dash.brand_portfolio_sub':{en:'Revenue by client',              ar: 'الإيرادات حسب العميل' },
  'dash.funnel':          { en: 'Quote → cash funnel',             ar: 'مسار التحويل: من العرض إلى الدفع' },
  'dash.funnel_sub':      { en: 'Conversion across the lifecycle', ar: 'التحويل عبر دورة الحياة' },
  'dash.aging':           { en: 'AR aging',                        ar: 'عمر الذمم' },
  'dash.aging_sub':       { en: 'Invoices issued, awaiting payment', ar: 'فواتير صادرة بانتظار الدفع' },
  'dash.platform_mix':    { en: 'Platform mix',                    ar: 'توزيع المنصات' },
  'dash.platform_mix_sub':{ en: 'Where the revenue lives',         ar: 'أين توجد الإيرادات' },
  'dash.roster':          { en: 'Roster',                          ar: 'الفريق' },
  'dash.active_players':  { en: 'Active players',                  ar: 'لاعبون نشطون' },
  'dash.active_creators': { en: 'Active creators',                 ar: 'صناع محتوى نشطون' },
  'dash.recent_quotes':   { en: 'Recent quotes',                   ar: 'العروض الأخيرة' },
  'dash.view_all':        { en: 'View all →',                      ar: '← عرض الكل' },
  'dash.no_quotes':       { en: 'No quotes yet.',                  ar: '.لا توجد عروض حتى الآن' },

  // Funnel stages
  'funnel.drafted':   { en: 'Quotes drafted',  ar: 'مسودات' },
  'funnel.sent':      { en: 'Sent to client',  ar: 'مرسل للعميل' },
  'funnel.viewed':    { en: 'Viewed',          ar: 'تم العرض' },
  'funnel.accepted':  { en: 'Accepted',        ar: 'مقبول' },
  'funnel.invoiced':  { en: 'Invoiced',        ar: 'مفوتر' },
  'funnel.collected': { en: 'Collected',       ar: 'محصل' },

  // Status names
  'status.collected':         { en: 'Collected',        ar: 'محصل' },
  'status.awaiting_payment':  { en: 'Awaiting payment', ar: 'بانتظار الدفع' },
  'status.in_progress':       { en: 'In progress',      ar: 'قيد التنفيذ' },
  'status.cancelled':         { en: 'Cancelled',        ar: 'ملغى' },

  // Common
  'c.save':         { en: 'Save',           ar: 'حفظ' },
  'c.cancel':       { en: 'Cancel',         ar: 'إلغاء' },
  'c.delete':       { en: 'Delete',         ar: 'حذف' },
  'c.edit':         { en: 'Edit',           ar: 'تعديل' },
  'c.search':       { en: 'Search',         ar: 'بحث' },
  'c.loading':      { en: 'Loading…',       ar: '...جاري التحميل' },
  'c.language':     { en: 'Language',       ar: 'اللغة' },

  // Locale switcher
  'locale.en':      { en: 'English',  ar: 'الإنجليزية' },
  'locale.ar':      { en: 'العربية',  ar: 'العربية' },
} as const;

export type DictKey = keyof typeof dict;

export function translate(key: DictKey, locale: Locale): string {
  const entry = dict[key];
  if (!entry) return String(key);
  return entry[locale] ?? entry.en;
}
