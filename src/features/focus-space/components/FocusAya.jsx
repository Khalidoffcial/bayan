/**
 * FocusAya — reminder widget for Quran moments during a session.
 *
 * It does NOT interrupt what the user is doing: when the session is running
 * it shows a gentle, dismissable reminder ("time for an aya"); it can also
 * open the standalone Quran section directly. Notification preferences
 * (ayaNotifications) come from the focus document settings.
 */
import React, { useState } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import "../styles/focus-space.css";

export const FocusAya = ({ visible, onOpenQuran, onDismiss, engineRunning }) => {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(false);

  if (!visible || hidden) return null;

  return (
    <div className="fc-aya" role="status">
      <div className="fc-aya__content">
        <div className="fc-aya__title">{t("focus.aya.title")}</div>
        <p className="fc-aya__body">
          {engineRunning ? t("focus.aya.whileSession") : t("focus.aya.idle")}
        </p>
      </div>
      <div className="fc-aya__actions">
        <button className="fc-btn fc-btn--primary" onClick={onOpenQuran}>
          {t("focus.aya.open")}
        </button>
        <button
          className="fc-btn"
          onClick={() => {
            setHidden(true);
            onDismiss?.();
          }}
        >
          {t("focus.aya.later")}
        </button>
      </div>
    </div>
  );
};

export default React.memo(FocusAya);
