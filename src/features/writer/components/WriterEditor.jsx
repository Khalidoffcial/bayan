import React, { useEffect, useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { useTranslation } from "../../../i18n/useTranslation";

export const WriterEditor = ({
  type,
  content,
  setContent,
  title,
  setTitle,
  descrip,
  setDescription,
  series,
  setSeries,
  seriesList,
  customSeries,
  setCustomSeries,
  onAddSeries,
  autoFocus = false,
}) => {
  const textInputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [autoFocus]);

  const editorConfiguration = {
    toolbar: [
      "heading",
      "|",
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "|",
      "link",
      "bulletedList",
      "numberedList",
      "blockQuote",
      "imageUpload",
      "insertTable",
      "mediaEmbed",
      "|",
      "undo",
      "redo",
      "alignment",
      "direction",
    ],
    language: "ar",
    alignment: { options: ["left", "right", "center", "justify"] },
  };

  const { t } = useTranslation();

  if (type === "article" || type === "novels") {
    return (
      <>
        <input
          ref={textInputRef}
          type="text"
          className="sm_WriterInput"
          placeholder={t("composer.titlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label={t("composer.titlePlaceholder")}
        />

        <textarea
          className="sm_WriterInput"
          placeholder={t("composer.descPlaceholder")}
          value={descrip}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="series-section">
          <select
            value={seriesList.includes(customSeries) ? customSeries : series}
            onChange={(e) => setSeries(e.target.value)}
          >
            <option value="">{t("writer.selectSeries")}</option>
            {seriesList.map((s, i) => (
              <option key={i} value={s}>
                {s}
              </option>
            ))}
            <option value="new">{t("writer.newSeries")}</option>
          </select>

          {series === "new" && (
            <div className="new-series-input">
              <input
                type="text"
                className="sm_WriterInput"
                placeholder={t("writer.newSeriesPlaceholder")}
                value={customSeries}
                onChange={(e) => setCustomSeries(e.target.value)}
              />
              <button onClick={onAddSeries}>✓</button>
            </div>
          )}
        </div>

        <CKEditor
          editor={ClassicEditor}
          config={{ ...editorConfiguration, placeholder: t("composer.contentPlaceholder") }}
          data={content}
          onChange={(_, editor) => setContent(editor.getData())}
        />
      </>
    );
  }

  return (
    <textarea
      ref={textInputRef}
      className="WriterInput"
      placeholder={t("composer.contentPlaceholder")}
      value={content}
      onChange={(e) => setContent(e.target.value)}
      aria-label={t("composer.contentPlaceholder")}
    />
  );
};

export default React.memo(WriterEditor);
