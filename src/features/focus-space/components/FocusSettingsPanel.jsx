/**
 * FocusSettingsPanel — customization for the space itself.
 * Every change is optimistic + debounced-saved through useFocusData.
 */
import React from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { useSettings } from "../../../contexts/SettingsContext";
import {
  CLOCK_COLORS, CLOCK_FONTS, CLOCK_WEIGHTS, CLOCK_STYLES,
  CLOCK_SIZE_MIN, CLOCK_SIZE_MAX, CLOCK_SIZE_DEFAULT,
  FOCUS_DEFAULTS, STUDY_MODES,
} from "../constants/focusDefaults";
import "../styles/focus-space.css";

const Toggle = ({ checked, onChange, label }) => (
  <label className="fc-setting-row">
    <span>{label}</span>
    <input type="checkbox" checked={Boolean(checked)} onChange={onChange} />
  </label>
);

export const FocusSettingsPanel = ({ data, update }) => {
  const { t } = useTranslation();
  const { language } = useSettings();

  const set = (patch) => update(patch);

  return (
    <div className="fc-settings">
      <div className="fc-settings__group">
        <h4>{t("focus.settings.clock")}</h4>
        <label className="fc-setting-row">
          <span>{t("focus.settings.clockType")}</span>
          <select className="fc-select" value={data.clockType}
            onChange={(e) => set({ clockType: e.target.value })}>
            <option value="digital">{t("focus.clock.digital")}</option>
            <option value="analog">{t("focus.clock.analog")}</option>
          </select>
        </label>
        <label className="fc-setting-row">
          <span>{t("focus.settings.clockStyle")}</span>
          <select className="fc-select" value={data.clockStyle}
            onChange={(e) => set({ clockStyle: e.target.value })}>
            {CLOCK_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="fc-setting-row">
          <span>{t("focus.settings.clockColor")}</span>
          <div className="fc-color-row">
            {CLOCK_COLORS.map((c) => (
              <button
                key={c}
                className={`fc-color-dot ${data.clockColor === c ? "active" : ""}`}
                style={{ background: c }}
                onClick={() => set({ clockColor: c })}
                aria-label={c}
              />
            ))}
          </div>
        </label>
        <label className="fc-setting-row">
          <span>{t("focus.settings.clockSize")} ({data.clockSize ?? CLOCK_SIZE_DEFAULT}%)</span>
          <input
            type="range"
            min={CLOCK_SIZE_MIN}
            max={CLOCK_SIZE_MAX}
            step="5"
            value={data.clockSize ?? CLOCK_SIZE_DEFAULT}
            onChange={(e) => set({ clockSize: Number(e.target.value) })}
          />
        </label>
        <label className="fc-setting-row">
          <span>{t("focus.settings.clockFont")}</span>
          <select className="fc-select" value={data.clockFont}
            onChange={(e) => set({ clockFont: e.target.value })}>
            {CLOCK_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="fc-setting-row">
          <span>{t("focus.settings.clockWeight")}</span>
          <select className="fc-select" value={data.clockFontWeight}
            onChange={(e) => set({ clockFontWeight: e.target.value })}>
            {CLOCK_WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
        <Toggle label={t("focus.settings.use12Hour")} checked={data.use12Hour}
          onChange={() => set({ use12Hour: !data.use12Hour })} />
        <Toggle label={t("focus.settings.showSeconds")} checked={data.showSeconds}
          onChange={() => set({ showSeconds: !data.showSeconds })} />
        <Toggle label={t("focus.settings.showDate")} checked={data.showDate}
          onChange={() => set({ showDate: !data.showDate })} />
      </div>

      <div className="fc-settings__group">
        <h4>{t("focus.settings.study")}</h4>
        <label className="fc-setting-row">
          <span>{t("focus.settings.defaultMode")}</span>
          <select className="fc-select" value={data.defaultStudyMode}
            onChange={(e) => set({ defaultStudyMode: e.target.value })}>
            {Object.entries(STUDY_MODES).map(([k, def]) => (
              <option key={k} value={k}>{t(def.label)}</option>
            ))}
          </select>
        </label>
        <label className="fc-setting-row">
          <span>{t("focus.settings.defaultDuration")} ({data.defaultSessionDuration} {t("focus.minutes")})</span>
          <input type="range" min="5" max="180" step="5" value={data.defaultSessionDuration}
            onChange={(e) => set({ defaultSessionDuration: Number(e.target.value) })} />
        </label>
      </div>

      <div className="fc-settings__group">
        <h4>{t("focus.settings.behaviour")}</h4>
        <Toggle label={t("focus.settings.ayaNotifications")} checked={data.ayaNotifications}
          onChange={() => set({ ayaNotifications: !data.ayaNotifications })} />
        <Toggle label={t("focus.settings.savedReminders")} checked={data.savedContentReminders}
          onChange={() => set({ savedContentReminders: !data.savedContentReminders })} />
        <Toggle label={t("focus.settings.hideControls")} checked={data.hideControls}
          onChange={() => set({ hideControls: !data.hideControls })} />
        <Toggle label={t("focus.settings.reduceMotion")} checked={data.reduceMotion}
          onChange={() => set({ reduceMotion: !data.reduceMotion })} />
        <Toggle label={t("focus.settings.overlay")} checked={data.overlayVisible}
          onChange={() => set({ overlayVisible: !data.overlayVisible })} />
      </div>

      <button
        className="fc-btn fc-btn--danger"
        onClick={() => set({ ...FOCUS_DEFAULTS })}
      >
        {t("focus.settings.reset")}
      </button>
      <p className="fc-settings__lang">{t("focus.settings.langNote", { lang: language })}</p>
    </div >
  );
};

export default FocusSettingsPanel;
