/**
 * Seed data for the moderation system.
 *
 * Dictionary seeds: SMALL, curated, and severity-annotated. This is seed data
 * for demonstration/bootstrap only — NOT a complete multilingual list. Admins
 * manage the real dictionary through the dashboard (DB-backed).
 * Category/reason wording authored directly (not machine-translated).
 */
"use strict";

const CATEGORIES = [
  { id: "sexual_content", severity: 4, langs: ["any"], name: { ar: "محتوى جنسي", en: "Sexual Content", fr: "Contenu sexuel", es: "Contenido sexual", de: "Sexuelle Inhalte" }, description: { ar: "محتوى جنسي صريح أو موحٍ", en: "Explicit or suggestive sexual content" } },
  { id: "explicit_sexual_lang", severity: 4, langs: ["any"], name: { ar: "ألفاظ جنسية صريحة", en: "Explicit Sexual Language" }, description: { ar: "ألفاظ ومصطلحات جنسية فاضحة", en: "Explicit sexual vocabulary" } },
  { id: "profanity", severity: 2, langs: ["any"], name: { ar: "ألفاظ مسيئة وشتم", en: "Profanity and Insults" }, description: { ar: "شتائم وألفاظ جارحة", en: "Swear words and insults" } },
  { id: "harassment", severity: 3, langs: ["any"], name: { ar: "مضايقة وتحرش", en: "Harassment" }, description: { ar: "استهداف أو مضايقة مستخدمين", en: "Targeting or harassing users" } },
  { id: "hate_speech", severity: 5, langs: ["any"], name: { ar: "خطاب كراهية", en: "Hate Speech" }, description: { ar: "تمييز أو كراهية ضد فئة محمية", en: "Discrimination or hate against protected groups" } },
  { id: "threats_violence", severity: 5, langs: ["any"], name: { ar: "تهديدات وعنف", en: "Threats and Violence" }, description: { ar: "تهديدات أو تحريض على العنف", en: "Threats or incitement to violence" } },
  { id: "bullying", severity: 3, langs: ["any"], name: { ar: "تنمر", en: "Bullying" }, description: { ar: "تنمر مباشر أو إساءة شخصية", en: "Direct bullying or personal abuse" } },
  { id: "spam", severity: 1, langs: ["any"], name: { ar: "رسائل مزعجة", en: "Spam" }, description: { ar: "ترويج أو محتوى مكرر غير مرغوب", en: "Promotion or repeated unwanted content" } },
  { id: "scams_fraud", severity: 4, langs: ["any"], name: { ar: "احتيال ونصب", en: "Scams and Fraud" }, description: { ar: "محتوى احتيالي أو مضلل", en: "Fraudulent or deceptive content" } },
  { id: "dangerous_content", severity: 5, langs: ["any"], name: { ar: "محتوى خطير", en: "Dangerous Content" }, description: { ar: "تعليمات خطيرة أو محتوى مكروه يتسبب بأذى", en: "Dangerous instructions or self-harm content" } },
];

// Curated seed dictionary — deliberately small; real dictionaries are DB-managed.
const DICTIONARY_SEED = [
  // Profanity (generic, low-context words only — kept minimal deliberately)
  { id: "seed-ar-1", term: "كلب", lang: "ar", categoryId: "profanity", severity: 1, match: "word", enabled: true },
  { id: "seed-en-1", term: "idiot", lang: "en", categoryId: "profanity", severity: 1, match: "word", enabled: true },
  { id: "seed-en-2", term: "stupid", lang: "en", categoryId: "profanity", severity: 1, match: "word", enabled: true },
  { id: "seed-es-1", term: "idiota", lang: "es", categoryId: "profanity", severity: 1, match: "word", enabled: true },
  { id: "seed-fr-1", term: "imbécile", lang: "fr", categoryId: "profanity", severity: 1, match: "word", enabled: true },
  { id: "seed-de-1", term: "idiot", lang: "de", categoryId: "profanity", severity: 1, match: "word", enabled: true },
  { id: "seed-tr-1", term: "aptal", lang: "tr", categoryId: "profanity", severity: 1, match: "word", enabled: true },
  { id: "seed-ru-1", term: "идиот", lang: "ru", categoryId: "profanity", severity: 1, match: "word", enabled: true },
  // Harassment / bullying phrases
  { id: "seed-ar-2", term: "اذهب الى الجحيم", lang: "ar", categoryId: "harassment", severity: 2, match: "phrase", enabled: true },
  { id: "seed-en-3", term: "go to hell", lang: "en", categoryId: "harassment", severity: 2, match: "phrase", enabled: true },
  { id: "seed-es-2", term: "vete al infierno", lang: "es", categoryId: "harassment", severity: 2, match: "phrase", enabled: true },
  { id: "seed-fr-2", term: "va en enfer", lang: "fr", categoryId: "harassment", severity: 2, match: "phrase", enabled: true },
  // Threats (high severity)
  { id: "seed-ar-3", term: "سأقتلك", lang: "ar", categoryId: "threats_violence", severity: 5, match: "phrase", enabled: true },
  { id: "seed-en-4", term: "i will kill you", lang: "en", categoryId: "threats_violence", severity: 5, match: "phrase", enabled: true },
  { id: "seed-es-3", term: "te voy a matar", lang: "es", categoryId: "threats_violence", severity: 5, match: "phrase", enabled: true },
  // Hate speech (minimal illustrative seeds)
  { id: "seed-en-5", term: "death to all", lang: "en", categoryId: "hate_speech", severity: 5, match: "phrase", enabled: true },
  { id: "seed-ar-4", term: "موت لكل", lang: "ar", categoryId: "hate_speech", severity: 5, match: "phrase", enabled: true },
  // Spam
  { id: "seed-en-6", term: "free money click here", lang: "en", categoryId: "spam", severity: 2, match: "phrase", enabled: true },
  { id: "seed-ar-5", term: "فلوس مجانا", lang: "ar", categoryId: "spam", severity: 2, match: "phrase", enabled: true },
  // Scams
  { id: "seed-en-7", term: "send me your password", lang: "en", categoryId: "scams_fraud", severity: 4, match: "phrase", enabled: true },
  { id: "seed-ar-6", term: "ارسل كلمة السر", lang: "ar", categoryId: "scams_fraud", severity: 4, match: "phrase", enabled: true },
  // Sexual
  { id: "seed-en-8", term: "porn", lang: "en", categoryId: "explicit_sexual_lang", severity: 3, match: "word", enabled: true },
  { id: "seed-ar-7", term: "اباحي", lang: "ar", categoryId: "explicit_sexual_lang", severity: 3, match: "word", enabled: true },
];

/**
 * Reason Library templates. Operation-specific. Each has a stable ID,
 * localized title, localized explanation, enabled flag, and optional
 * placeholders like {contentTitle}.
 */
const REASON_TEMPLATES = [
  // ── Content actions ──
  {
    id: "cnt-del-sexual", op: "content.delete", category: "explicit_sexual_lang", enabled: true,
    title: { ar: "يحتوي المحتوى على ألفاظ جنسية أو محتوى غير مسموح به", en: "Content contains sexual language or prohibited material" },
    explanation: { ar: "تم حذف المحتوى لأنه لا يلتزم بإرشادات مجتمع Bayan Space.", en: "The content was removed for violating Bayan Space community guidelines." }
  },
  {
    id: "cnt-del-profanity", op: "content.delete", category: "profanity", enabled: true,
    title: { ar: "يحتوي المحتوى على شتائم أو ألفاظ مسيئة", en: "Content contains profanity or offensive language" },
    explanation: { ar: "تم حذف المحتوى لاحتوائه على لغة غير محترمة.", en: "The content was removed for using disrespectful language." }
  },
  {
    id: "cnt-del-bully", op: "content.delete", category: "bullying", enabled: true,
    title: { ar: "يتضمن المحتوى تنمرًا أو إساءة مباشرة", en: "Content includes bullying or direct abuse" },
    explanation: { ar: "تم حذف المحتوى لاحتوائه على تنمر أو إساءة تجاه آخرين.", en: "The content was removed for bullying or abusing others." }
  },
  {
    id: "cnt-del-hate", op: "content.delete", category: "hate_speech", enabled: true,
    title: { ar: "يتضمن المحتوى خطاب كراهية أو تمييزًا", en: "Content includes hate speech or discrimination" },
    explanation: { ar: "تم حذف المحتوى لمخالفته سياسة مكافحة خطاب الكراهية.", en: "The content was removed under the hate-speech policy." }
  },
  {
    id: "cnt-del-threat", op: "content.delete", category: "threats_violence", enabled: true,
    title: { ar: "يتضمن المحتوى تهديدات أو تحريضًا على العنف", en: "Content includes threats or incitement to violence" },
    explanation: { ar: "تم حذف المحتوى لاحتوائه على تهديدات أو تحريض على العنف.", en: "The content was removed for threats or incitement." }
  },
  {
    id: "cnt-del-spam", op: "content.delete", category: "spam", enabled: true,
    title: { ar: "يحتوي المحتوى على ترويج مزعج أو رسائل غير مرغوب فيها", en: "Content contains spam or unwanted promotion" },
    explanation: { ar: "تم حذف المحتوى لكونه ترويجًا غير مرغوب.", en: "The content was removed as unwanted promotion." }
  },
  {
    id: "cnt-del-scam", op: "content.delete", category: "scams_fraud", enabled: true,
    title: { ar: "يحتوي المحتوى على معلومات احتيالية أو مضللة", en: "Content contains fraudulent or misleading information" },
    explanation: { ar: "تم حذف المحتوى لاحتمال تسببه في الاحتيال أو التضليل.", en: "The content was removed for fraud or misinformation." }
  },
  {
    id: "cnt-del-generic", op: "content.delete", category: null, enabled: true,
    title: { ar: "يخالف المحتوى إرشادات مجتمع Bayan Space", en: "Content violates Bayan Space community guidelines" },
    explanation: { ar: "تم حذف المحتوى لمخالفته إرشادات المجتمع.", en: "The content was removed for violating community guidelines." }
  },
  {
    id: "cnt-hide-generic", op: "content.hide", category: null, enabled: true,
    title: { ar: "تم إخفاء المحتوى لحين المراجعة", en: "Content hidden pending review" },
    explanation: { ar: "تم إخفاء المحتوى مؤقتًا ريثما تتم مراجعته من فريق الإشراف.", en: "The content was temporarily hidden pending moderation review." }
  },
  {
    id: "cnt-restore-wrong", op: "content.restore", category: null, enabled: true,
    title: { ar: "تم اتخاذ الإجراء السابق بالخطأ", en: "The previous action was taken in error" },
    explanation: { ar: "نعتذر — تم استرجاع المحتوى بعد التأكد من الخطأ.", en: "We apologize — the content has been restored after review." }
  },
  {
    id: "cnt-restore-ok", op: "content.restore", category: null, enabled: true,
    title: { ar: "أظهرت المراجعة أن المحتوى لا يخالف السياسات", en: "Review found the content does not violate policies" },
    explanation: { ar: "بعد المراجعة، تبين أن المحتوى لا يخالف السياسات وتم استرجاعه.", en: "After review, the content was found compliant and restored." }
  },
  {
    id: "cnt-restore-appeal", op: "content.restore", category: null, enabled: true,
    title: { ar: "تمت الموافقة على الاعتراض", en: "Your appeal was approved" },
    explanation: { ar: "تم قبول اعتراضك واسترجاع المحتوى.", en: "Your appeal was accepted and the content restored." }
  },
  {
    id: "cnt-approve-generic", op: "content.approve", category: null, enabled: true,
    title: { ar: "تمت الموافقة على نشر المحتوى", en: "Content approved for publication" },
    explanation: { ar: "بعد المراجعة، تم اعتماد المحتوى.", en: "After review, the content was approved." }
  },

  // ── User account actions ──
  {
    id: "usr-warn-respect", op: "user.warn", category: null, enabled: true,
    title: { ar: "يرجى الالتزام بلغة محترمة عند التفاعل مع الآخرين", en: "Please use respectful language when interacting with others" },
    explanation: { ar: "هذا تحذير ودّي — يرجى مراجعة إرشادات المجتمع.", en: "This is a friendly warning — please review community guidelines." }
  },
  {
    id: "usr-warn-lang", op: "user.warn", category: "profanity", enabled: true,
    title: { ar: "تم رصد استخدام ألفاظ غير مناسبة في المحتوى المنشور", en: "Inappropriate language detected in published content" },
    explanation: { ar: "لوحظ استخدام ألفاظ غير مناسبة؛ يرجى تجنبها مستقبلًا.", en: "Inappropriate language was detected; please avoid it going forward." }
  },
  {
    id: "usr-warn-abuse", op: "user.warn", category: "bullying", enabled: true,
    title: { ar: "يرجى تجنب الإساءة الشخصية أو التنمر", en: "Please avoid personal abuse or bullying" },
    explanation: { ar: "نرجو التفاعل باحترام وتجنب الإساءة الشخصية.", en: "Please interact respectfully and avoid personal abuse." }
  },
  {
    id: "usr-warn-review", op: "user.warn", category: null, enabled: true,
    title: { ar: "نرجو مراجعة إرشادات المجتمع لتجنب تكرار المخالفة", en: "Please review community guidelines to avoid repeat violations" },
    explanation: { ar: "نرجو قراءة إرشادات المجتمع لتجنب تكرار المخالفة.", en: "Please read the community guidelines to avoid repeating violations." }
  },
  {
    id: "usr-susp-repeat", op: "user.suspend", category: null, enabled: true,
    title: { ar: "تكرار نشر محتوى مخالف بعد تلقي تحذيرات سابقة", en: "Repeated policy-violating content after prior warnings" },
    explanation: { ar: "تم تعليق الحساب مؤقتًا بسبب تكرار المخالفات بعد تحذيرات سابقة.", en: "The account was temporarily suspended for repeated violations after warnings." }
  },
  {
    id: "usr-susp-abuse", op: "user.suspend", category: "harassment", enabled: true,
    title: { ar: "تكرار الإساءة أو مضايقة المستخدمين", en: "Repeated abuse or harassment of users" },
    explanation: { ar: "تم تعليق الحساب مؤقتًا بسبب تكرار الإساءة أو المضايقة.", en: "The account was temporarily suspended for repeated abuse or harassment." }
  },
  {
    id: "usr-susp-guides", op: "user.suspend", category: null, enabled: true,
    title: { ar: "تكرار مخالفة إرشادات المجتمع", en: "Repeated violation of community guidelines" },
    explanation: { ar: "تم تعليق الحساب مؤقتًا لتكرار مخالفة الإرشادات.", en: "The account was temporarily suspended for repeated guideline violations." }
  },
  {
    id: "usr-ban-severe", op: "user.ban", category: null, enabled: true,
    title: { ar: "تكرار المخالفات الجسيمة رغم الإجراءات السابقة", en: "Repeated severe violations despite prior actions" },
    explanation: { ar: "تم حظر الحساب نهائيًا لتكرار المخالفات الجسيمة.", en: "The account was permanently banned for repeated severe violations." }
  },
  {
    id: "usr-ban-fraud", op: "user.ban", category: "scams_fraud", enabled: true,
    title: { ar: "استخدام الحساب في الاحتيال أو الإضرار المتعمد بالمستخدمين", en: "Account used for fraud or deliberate harm to users" },
    explanation: { ar: "تم حظر الحساب نهائيًا لاستخدامه في الاحتيال أو الإضرار بالمستخدمين.", en: "The account was permanently banned for fraud or deliberate harm." }
  },
  {
    id: "usr-ban-policy", op: "user.ban", category: "hate_speech", enabled: true,
    title: { ar: "انتهاكات جسيمة ومتكررة لسياسات المجتمع", en: "Severe and repeated violations of community policies" },
    explanation: { ar: "تم حظر الحساب نهائيًا بسبب انتهاكات جسيمة ومتكررة.", en: "The account was permanently banned for severe repeated violations." }
  },
  {
    id: "usr-unsusp-review", op: "user.unsuspend", category: null, enabled: true,
    title: { ar: "أظهرت المراجعة أن التعليق لم يكن مبررًا", en: "Review found the suspension was not justified" },
    explanation: { ar: "بعد المراجعة، تم إلغاء تعليق الحساب.", en: "After review, the account suspension was lifted." }
  },
  {
    id: "usr-unsusp-appeal", op: "user.unsuspend", category: null, enabled: true,
    title: { ar: "تمت الموافقة على اعتراضك", en: "Your appeal was approved" },
    explanation: { ar: "تم قبول اعتراضك وإعادة تنشيط الحساب.", en: "Your appeal was accepted and the account reactivated." }
  },
  {
    id: "usr-unban-appeal", op: "user.unban", category: null, enabled: true,
    title: { ar: "تمت الموافقة على اعتراضك واستئناف الحساب", en: "Your appeal was approved and the account reinstated" },
    explanation: { ar: "تم قبول استئنافك وإعادة تنشيط الحساب.", en: "Your appeal was accepted and the account reinstated." }
  },

  // ── Reports ──
  {
    id: "rep-accept-evidence", op: "report.accept", category: null, enabled: true,
    title: { ar: "تم قبول البلاغ واتخاذ الإجراء المناسب", en: "Report accepted and action taken" },
    explanation: { ar: "شكرًا لبلاغك — تم التحقق منه واتخاذ الإجراء المناسب.", en: "Thanks for your report — it was verified and actioned." }
  },
  {
    id: "rep-reject-noev", op: "report.reject", category: null, enabled: true,
    title: { ar: "البلاغ غير مدعوم بأدلة كافية", en: "Report not supported by sufficient evidence" },
    explanation: { ar: "لم نجد أدلة كافية لدعم البلاغ، لذلك تم رفضه.", en: "We did not find sufficient evidence to support the report." }
  },
  {
    id: "rep-reject-dup", op: "report.reject", category: null, enabled: true,
    title: { ar: "بلاغ مكرر — تم التعامل معه مسبقًا", en: "Duplicate report — already handled" },
    explanation: { ar: "تم استلام بلاغات مشابهة مسبقًا وتم التعامل معها.", en: "Similar reports were already received and handled." }
  },
  {
    id: "rep-reject-context", op: "report.reject", category: null, enabled: true,
    title: { ar: "تم تفسير المحتوى خارج سياقه", en: "Content was interpreted out of context" },
    explanation: { ar: "بعد المراجعة، تبين أن المحتوى أُخرج من سياقه.", en: "After review, the content was found to be taken out of context." }
  },
  {
    id: "rep-reject-educ", op: "report.reject", category: null, enabled: true,
    title: { ar: "المحتوى تعليمي أو توعوي ولا يمثل مخالفة", en: "Content is educational or awareness material, not a violation" },
    explanation: { ar: "المحتوى تمثل ضمن السياق التعليمي أو التوعوي ولا يخالف السياسات.", en: "The content falls within educational/awareness context and is not a violation." }
  },
  {
    id: "rep-dismiss-fp", op: "moderation.dismiss", category: null, enabled: true,
    title: { ar: "المحتوى لا يخالف إرشادات المجتمع", en: "Content does not violate community guidelines" },
    explanation: { ar: "بعد المراجعة، تبين أن المحتوى لا يخالف الإرشادات وتم رفض الحالة.", en: "After review, the content was found compliant and the case dismissed." }
  },
];

module.exports = { CATEGORIES, DICTIONARY_SEED, REASON_TEMPLATES };
