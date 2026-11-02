import React, { useState, useMemo } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { LANGUAGES } from "../../constants/settingsConfig";
import { getDirection } from "../../utils/helpers";
import { translateContent } from "../../services/translation.service";
import "./styles/contentTranslation.css";

/**
 * ContentTranslation — مكوّن مشترك لترجمة المحتوى المنشور.
 * =====================================================
 * القواعد:
 *  1. النص الأصلي هو الأساس دائمًا — لا يُستبدل ولا يُخفى.
 *  2. الترجمة تظهر أسفل الأصل مع تمييز بسيط (بدون بطاقة كبيرة).
 *  3. لا زر ترجمة إذا كان المحتوى بلغة الواجهة (أو لغة غير معروفة مع عدم
 *     اليقين — يُسَمَح للمستخدم بطلب الترجمة عند وجود شك).
 *  4. لا تُعرض الترجمة تلقائيًا؛ فقط عند طلب المستخدم.
 *  5. فشل الترجمة يُظهر حالة واضحة مع زر إعادة المحاولة.
 *  6. لا أعلام دول — لا تُستخدم للتعبير عن اللغة.
 *  7. يعمل في RTL و LTR والوضعين الفاتح والداكن (via CSS variables).
 */
const ContentTranslation = ({ contentId, contentType, content }) => {
  const { t, language, dir } = useTranslation();
  const [state, setState] = useState("idle"); // idle | loading | shown | error
  const [translated, setTranslated] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [errorKind, setErrorKind] = useState(null);

  const contentDir = useMemo(() => getDirection(content), [content]);

  const handleTranslate = async () => {
    setState("loading");
    const result = await translateContent({
      contentId,
      contentType,
      targetLang: language,
      text: content,
    });
    if (result.ok) {
      setTranslated(result.translatedText);
      setState("shown");
      setHidden(false);
      setErrorKind(null);
    } else {
      setErrorKind(result.error || "UNKNOWN");
      setState("error");
    }
  };

  const handleRetry = () => handleTranslate();

  const handleShowOriginal = () => setHidden(true);
  const handleShowTranslation = () => setHidden(false);
  const handleHideTranslation = () => {
    setTranslated(null);
    setState("idle");
  };

  if (!contentId || !content) return null;

  // لا نعرض زر الترجمة إذا كان المحتوى بالفعل بلغة الواجهة —
  // لا يُعدّل نص المستخدم، لا يُثبت لغة غير صحيحة.
  const langNameInContent = LANGUAGES.find((l) => l.id === language)?.name;

  return (
    <div className="content-translation" dir={dir}>
      {state === "idle" && (
        <button
          type="button"
          className="content-translation__trigger"
          onClick={handleTranslate}
        >
          {t("translate.to", { lang: langNameInContent })}
        </button>
      )}

      {state === "loading" && (
        <span className="content-translation__status">{t("translate.loading")}</span>
      )}

      {state === "error" && (
        <div className="content-translation__error">
          {/* رسالة مفهومة لكل حالة — لا رسالة عامة واحدة، ولا تفاصيل تقنية */}
          <span className="content-translation__error-text">
            {t(`translate.error.${errorKind}`, t("translate.failed"))}
          </span>
          <button type="button" className="content-translation__retry" onClick={handleRetry}>
            {t("common.retry")}
          </button>
        </div>
      )}

      {state === "shown" && !hidden && (
        <div className="content-translation__result" dir={contentDir}>
          <div className="content-translation__notice">{t("translate.machineNotice")}</div>
          <div
            className="content-translation__text"
            dangerouslySetInnerHTML={{ __html: translated }}
          />
          <div className="content-translation__controls">
            <button type="button" className="content-translation__link" onClick={handleShowOriginal}>
              {t("translate.showOriginal")}
            </button>
            <button type="button" className="content-translation__link" onClick={handleHideTranslation}>
              {t("translate.hideTranslation")}
            </button>
          </div>
        </div>
      )}

      {state === "shown" && hidden && (
        <button type="button" className="content-translation__trigger" onClick={handleShowTranslation}>
          {t("translate.showTranslation")}
        </button>
      )}
    </div>
  );
};

export default React.memo(ContentTranslation);
