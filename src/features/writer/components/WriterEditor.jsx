import React from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

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
}) => {
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
    placeholder: "Write your topic here...",
  };

  if (type === "article" || type === "novels") {
    return (
      <>
        <input
          type="text"
          className="sm_WriterInput"
          placeholder="Address..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="sm_WriterInput"
          placeholder="Description..."
          value={descrip}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="series-section">
          <select
            value={seriesList.includes(customSeries) ? customSeries : series}
            onChange={(e) => setSeries(e.target.value)}
          >
            <option value="">Select series</option>
            {seriesList.map((s, i) => (
              <option key={i} value={s}>
                {s}
              </option>
            ))}
            <option value="new">New series</option>
          </select>

          {series === "new" && (
            <div className="new-series-input">
              <input
                type="text"
                className="sm_WriterInput"
                placeholder="Enter new series title"
                value={customSeries}
                onChange={(e) => setCustomSeries(e.target.value)}
              />
              <button onClick={onAddSeries}>✓</button>
            </div>
          )}
        </div>

        <CKEditor
          editor={ClassicEditor}
          config={editorConfiguration}
          data={content}
          onChange={(_, editor) => setContent(editor.getData())}
        />
      </>
    );
  }

  return (
    <textarea
      className="WriterInput"
      placeholder={`Write your ${type} here...`}
      value={content}
      onChange={(e) => setContent(e.target.value)}
    />
  );
};

export default React.memo(WriterEditor);
