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

  // ── Quote Builder ─────────────────────────────────────────────────────
  'qb.title':           { en: 'New Quote',                ar: 'عرض سعر جديد' },
  'qb.tab.campaign':    { en: '① Campaign',              ar: 'الحملة ①' },
  'qb.tab.build':       { en: '② Build',                 ar: 'البناء ②' },
  'qb.tab.summary':     { en: '③ Summary',               ar: 'الملخص ③' },
  'qb.next.build':      { en: 'Done with campaign settings? Switch to', ar: '؟ هل انتهيت من إعدادات الحملة' },
  'qb.next.summary':    { en: 'Done adding? Switch to',  ar: '؟ هل انتهيت من الإضافة' },
  'qb.section.header':  { en: 'Quote header',            ar: 'رأس العرض' },
  'qb.section.globals': { en: 'Campaign axes',           ar: 'محاور الحملة' },
  'qb.section.lines':   { en: 'Line items',              ar: 'البنود' },
  'qb.section.notes':   { en: 'Notes & totals',          ar: 'الملاحظات والإجمالي' },
  'qb.client_name':     { en: 'Client name',             ar: 'اسم العميل' },
  'qb.client_email':    { en: 'Client email',            ar: 'البريد الإلكتروني للعميل' },
  'qb.campaign':        { en: 'Campaign',                ar: 'الحملة' },
  'qb.currency':        { en: 'Currency',                ar: 'العملة' },
  'qb.vat_rate':        { en: 'VAT rate',                ar: 'نسبة الضريبة' },
  'qb.usd_rate':        { en: 'USD rate (SAR per $1)',   ar: 'سعر الدولار (ريال لكل دولار)' },
  'qb.notes':           { en: 'Notes for client',        ar: 'ملاحظات للعميل' },
  'qb.internal_notes':  { en: 'Internal notes',          ar: 'ملاحظات داخلية' },
  'qb.prepared_by':     { en: 'Prepared by',             ar: 'أُعد بواسطة' },
  'qb.addons.title':    { en: 'Rights & add-ons',        ar: 'الحقوق والإضافات' },
  'qb.addons.subtitle': { en: 'Per-month rate, multiplied by your duration', ar: 'سعر شهري مضروب في مدتك' },
  'qb.addons.total':    { en: 'total',                   ar: 'الإجمالي' },
  'qb.addons.months':   { en: 'Months',                  ar: 'الأشهر' },
  'qb.save_draft':      { en: 'Save as draft',           ar: 'حفظ كمسودة' },
  'qb.save_send':       { en: 'Save & send',             ar: 'حفظ وإرسال' },
  'qb.draft_found':     { en: 'A saved draft was loaded',ar: 'تم تحميل مسودة محفوظة' },
  'qb.discard_draft':   { en: 'Discard draft',           ar: 'تجاهل المسودة' },
  'qb.add_line':        { en: 'Add line',                ar: 'إضافة بند' },
  'qb.line_count':      { en: 'lines',                   ar: 'بند' },
  'qb.subtotal':        { en: 'Subtotal',                ar: 'المجموع الفرعي' },
  'qb.vat':             { en: 'VAT',                     ar: 'الضريبة' },
  'qb.total':           { en: 'TOTAL',                   ar: 'الإجمالي' },

  // Configurator
  'cfg.pick_talent':    { en: 'Pick talent',             ar: 'اختر الموهبة' },
  'cfg.deliverables':   { en: 'Deliverables',            ar: 'التسليمات' },
  'cfg.content_type':   { en: 'Content type',            ar: 'نوع المحتوى' },
  'cfg.integrated':     { en: 'Integrated 1.00× — Player-led',  ar: 'مدمج 1.00× — بقيادة اللاعب' },
  'cfg.dedicated':      { en: 'Dedicated 1.15× — Brand-led',    ar: 'مخصص 1.15× — بقيادة العلامة التجارية' },
  'cfg.tier':           { en: 'Tier',                    ar: 'الفئة' },
  'cfg.game':           { en: 'Game',                    ar: 'اللعبة' },
  'cfg.search_talent':  { en: 'Search talent…',          ar: '...ابحث عن موهبة' },
  'cfg.add_to_quote':   { en: 'Add to quote',            ar: 'أضف إلى العرض' },

  // Calculator
  'calc.title':         { en: 'Calculator',              ar: 'الحاسبة' },
  'calc.subtitle':      { en: 'Quick price check — try combinations without saving', ar: 'فحص سعر سريع — جرب التركيبات دون حفظ' },
  'calc.display_currency':{en:'Display currency',        ar: 'عملة العرض' },
  'calc.handoff':       { en: 'Convert to draft quote →',ar: '← تحويل إلى مسودة عرض' },
  'calc.reset':         { en: 'Reset',                   ar: 'إعادة تعيين' },

  // Quotes list
  'quotes.title':       { en: 'Quote Log',               ar: 'سجل العروض' },
  'quotes.subtitle':    { en: 'All quotes — past and present', ar: 'جميع العروض — السابقة والحالية' },
  'quotes.col.number':  { en: 'Quote #',                 ar: 'رقم العرض' },
  'quotes.col.client':  { en: 'Client',                  ar: 'العميل' },
  'quotes.col.campaign':{ en: 'Campaign',                ar: 'الحملة' },
  'quotes.col.status':  { en: 'Status',                  ar: 'الحالة' },
  'quotes.col.total':   { en: 'Total',                   ar: 'الإجمالي' },
  'quotes.col.created': { en: 'Created',                 ar: 'أُنشئ في' },
  'quotes.empty':       { en: 'No quotes yet',           ar: 'لا توجد عروض حتى الآن' },

  // Roster
  'roster.players.title':   { en: 'Players',             ar: 'اللاعبون' },
  'roster.creators.title':  { en: 'Creators',            ar: 'صناع المحتوى' },
  'roster.subtitle':        { en: 'Active roster',       ar: 'الفريق النشط' },
  'roster.col.name':        { en: 'Name',                ar: 'الاسم' },
  'roster.col.ign':         { en: 'IGN',                 ar: 'الاسم داخل اللعبة' },
  'roster.col.game':        { en: 'Game',                ar: 'اللعبة' },
  'roster.col.role':        { en: 'Role',                ar: 'الدور' },
  'roster.col.tier':        { en: 'Tier',                ar: 'الفئة' },
  'roster.col.handle':      { en: 'Handle',              ar: 'المعرف' },
  'roster.col.platform':    { en: 'Platform',            ar: 'المنصة' },
  'roster.col.followers':   { en: 'Followers',           ar: 'المتابعون' },
  'roster.col.engagement':  { en: 'Engagement',          ar: 'التفاعل' },

  // Sales Log
  'sales.title':        { en: 'Sales Log',               ar: 'سجل المبيعات' },
  'sales.subtitle':     { en: 'Realized-revenue ledger', ar: 'سجل الإيرادات المحققة' },
  'sales.kpi.entries':  { en: 'Entries',                 ar: 'الإدخالات' },
  'sales.kpi.collected':{ en: 'Collected',               ar: 'محصل' },
  'sales.kpi.pipeline': { en: 'Open pipeline',           ar: 'الصفقات المفتوحة' },
  'sales.search':       { en: 'Search talent / brand / description…', ar: '...ابحث عن موهبة / علامة / وصف' },
  'sales.filter.all':   { en: 'All statuses',            ar: 'جميع الحالات' },
  'sales.new':          { en: 'New entry',               ar: 'إدخال جديد' },
  'sales.col.date':     { en: 'Date',                    ar: 'التاريخ' },
  'sales.col.talent':   { en: 'Talent',                  ar: 'الموهبة' },
  'sales.col.brand':    { en: 'Brand',                   ar: 'العلامة التجارية' },
  'sales.col.platform': { en: 'Platform',                ar: 'المنصة' },

  // Inquiries
  'inq.title':          { en: 'Inquiries',               ar: 'الاستفسارات' },
  'inq.subtitle':       { en: 'Inbound leads — convert to quotes', ar: 'العملاء المحتملون — تحويل إلى عروض' },
  'inq.col.brand':      { en: 'Brand / Contact',         ar: 'العلامة / جهة الاتصال' },
  'inq.col.received':   { en: 'Received',                ar: 'تاريخ الاستلام' },

  // PageHeader / common buttons
  'btn.new_quote':      { en: 'New quote',               ar: 'عرض سعر جديد' },
  'btn.download_pdf':   { en: 'Download PDF',            ar: 'تنزيل PDF' },
  'btn.preview':        { en: 'Preview quotation',       ar: 'معاينة العرض' },
  'btn.copy':           { en: 'Copy',                    ar: 'نسخ' },
  'btn.copied':         { en: 'Copied',                  ar: 'تم النسخ' },
  'btn.back':           { en: 'Back',                    ar: 'رجوع' },

  // Engagement card
  'engage.title':       { en: 'Client engagement',       ar: 'تفاعل العميل' },
  'engage.viewed_n':    { en: 'Viewed',                  ar: 'تم العرض' },
  'engage.not_opened':  { en: 'Not yet opened',          ar: 'لم يُفتح بعد' },
  'engage.share_below': { en: 'Share the client link below.', ar: '.شارك الرابط مع العميل أدناه' },
  'engage.accepted':    { en: 'Accepted',                ar: 'مقبول' },
  'engage.declined':    { en: 'Declined',                ar: 'مرفوض' },
  'engage.awaiting':    { en: 'Awaiting decision',       ar: 'بانتظار القرار' },

  // Cmd+K
  'cmdk.placeholder':   { en: 'Search quotes, talent, inquiries…', ar: '...ابحث عن عروض، مواهب، استفسارات' },
  'cmdk.recent':        { en: 'Recent',                  ar: 'الأخيرة' },
  'cmdk.quick':         { en: 'Quick links',             ar: 'روابط سريعة' },
  'cmdk.no_match':      { en: 'No matches.',             ar: '.لا توجد نتائج' },
  'cmdk.type':          { en: 'Type to search…',         ar: '...اكتب للبحث' },
} as const;

export type DictKey = keyof typeof dict;

export function translate(key: DictKey, locale: Locale): string {
  const entry = dict[key];
  if (!entry) return String(key);
  return entry[locale] ?? entry.en;
}
