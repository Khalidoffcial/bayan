import React, { useEffect, useState } from "react";
import { Eye as EyeIcon } from "lucide-react";
import { registerView } from "../../services/view.service";
import { useTranslation } from "../../i18n/useTranslation";
import "./styles/viewCounter.css";

/**
 * تنسيق مختصر للأرقام الكبيرة — 1.2K / 15K / 3.4M
 * يتبع لغة الواجهة عبر Intl.NumberFormat (compact notation).
 */
const formatViews = (n, locale) => {
  if (n == null || isNaN(n)) return "0";
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  } catch (e) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(n);
  }
};

/**
 * ViewCounter — عداد مشاهدات حقيقي:
 *  - يسجل المشاهدة مرة واحدة عند التركيب (Refresh لا يكرر خلال 24 ساعة).
 *  - العدد يأتي من الخادم فقط — لا زيادة وهمية عند الفشل.
 *  - أيقونة Eye + رقم بتنسيق مختصر، متناسق مع الثيمين وRTL/LTR.
 */
const ViewCounter = ({ contentId, contentType, initialViews }) => {
  const { language, t } = useTranslation();
  const [views, setViews] = useState(typeof initialViews === "number" ? initialViews : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!contentId || !contentType) return;
    let cancelled = false;
    (async () => {
      const result = await registerView({ contentId, contentType });
      if (cancelled) return;
      // Registration is batched/deferred for performance (see view.service):
      // the initial value from the feed payload is already accurate —
      // a failed batch view simply isn't counted, no fake number shown.
      if (!result.ok) setFailed(true);
    })();
    return () => { cancelled = true; };
    // مرة واحدة فقط لكل تركيب — لا تكرار عند إعادة الرندر
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, contentType]);

  if (failed) {
    // فشل الاتصال — نعرض القيمة الأولية إن وجدت، وإلا نُخفي العداد (لا أرقام وهمية)
    if (typeof initialViews !== "number") return null;
    return (
      <span className="view-counter view-counter--stale" title="">
        <EyeIcon size={14} strokeWidth={2} className="view-counter__icon" aria-hidden />
        <span className="view-counter__num">{formatViews(initialViews, language)}</span>
      </span>
    );
  }

  return (
    <span className="view-counter" title={t("views.title")}>
      <EyeIcon size={14} strokeWidth={2} className="view-counter__icon" aria-hidden />
      <span className="view-counter__num">
        {views == null ? "…" : formatViews(views, language)}
      </span>
    </span>
  );
};

export default React.memo(ViewCounter);
