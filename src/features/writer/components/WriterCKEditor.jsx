/**
 * WriterCKEditor — the CKEditor-backed rich text editor, isolated in its own
 * module so the ~1.4MB editor bundle is code-split away from the main chunk.
 * Loaded lazily by WriterEditor the first time the user actually expands the
 * composer in article/novel mode (React.lazy + Suspense).
 */
import React from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

const WriterCKEditor = ({ content, setContent, placeholder, editorConfiguration }) => (
  <CKEditor
    editor={ClassicEditor}
    config={{ ...editorConfiguration, placeholder }}
    data={content}
    onChange={(_, editor) => setContent(editor.getData())}
  />
);

export default WriterCKEditor;
