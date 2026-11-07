/**
 * testUtils — helpers shared by feature component tests.
 *
 * `renderWithSettings` wraps the UI in the real SettingsProvider so components
 * that read language/theme through useTranslation()/useSettings() render
 * without throwing. localStorage is reset before each render so the language
 * is deterministic ("en" unless overridden via the `language` option).
 */
import React from "react";
import { render } from "@testing-library/react";
import { SettingsProvider } from "../contexts/SettingsContext";

export const renderWithSettings = (ui, { language = "en", ...options } = {}) => {
  localStorage.setItem("language", language);
  const utils = render(<SettingsProvider>{ui}</SettingsProvider>, options);
  return {
    ...utils, rerenderWithSettings: (nextUi) =>
      utils.rerender(<SettingsProvider>{nextUi}</SettingsProvider>)
  };
};

export default renderWithSettings;
