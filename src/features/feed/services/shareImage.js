/**
 * shareImage — renders a real, standalone share image of any Bayan content
 * onto an offscreen <canvas>, then hands it to the caller as a Blob/File.
 *
 * Design: quiet premium card — soft off-white paper, hairline frame,
 * Bayan Space wordmark, author avatar + name, the actual content text,
 * and the bayan-space.vercel.app attribution. RTL/Arabic and LTR both
 * supported (direction detection by first strong character).
 *
 * Sizes: square (1080×1080), portrait 4:5 (1080×1350), wide 16:9 (1600×900),
 * story 9:16 (1080×1920). All CSS-px at deviceScale 2 for crispness on phones.
 *
 * Performance: nothing runs until generateShareImage() is called; images load
 * with crossOrigin="anonymous" and fall back to an initials disc when they
 * can't be fetched (CORS/404).
 */

export const SHARE_SIZES = {
  square: { w: 1080, h: 1080, label: "1:1" },
  portrait: { w: 1080, h: 1350, label: "4:5" },
  wide: { w: 1600, h: 900, label: "16:9" },
  story: { w: 1080, h: 1920, label: "9:16" },
};

/** First strong directional character → "rtl" | "ltr" (Unicode bidi classes). */
export const detectTextDirection = (text) => {
  if (!text) return "ltr";
  const rtl = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\uFB1D-\uFDFF\uFE70-\uFEFC]/;
  const ltr = /[A-Za-z\u00C0-\u024F\u0400-\u04FF]/;
  for (const ch of text) {
    if (rtl.test(ch)) return "rtl";
    if (ltr.test(ch)) return "ltr";
  }
  return "ltr";
};

const stripHtml = (html) => {
  if (!html) return "";
  const el = typeof document !== "undefined" ? document.createElement("div") : null;
  if (!el) return String(html);
  el.innerHTML = html;
  return (el.textContent || el.innerText || "").replace(/\s+/g, " ").trim();
};

/** Loads an image with CORS; resolves null instead of throwing. */
const loadImage = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** Round-cropped avatar (or an initials disc fallback). */
const drawAvatar = (ctx, img, cx, cy, r, name, initialsColor) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) {
    const ratio = Math.max((r * 2) / img.width, (r * 2) / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = initialsColor;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#fff";
    ctx.font = `600 ${Math.round(r * 0.9)}px Inter, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const initial = (name || "B").trim().charAt(0).toUpperCase();
    ctx.fillText(initial, cx, cy + r * 0.05);
  }
  ctx.restore();
};

/** Word-wrap respecting the canvas direction; returns the drawn line count. */
const wrapText = (ctx, text, maxWidth, maxLines) => {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  // Ellipsis when content was truncated
  if (lines.length >= maxLines && words.length) {
    const joined = lines.join(" ");
    if (stripHtml(joined).length < text.length) {
      lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.…]$/, "")}…`;
    }
  }
  return lines;
};

const FONT_STACK = '"Inter", "Segoe UI", "Tahoma", "Noto Sans Arabic", Arial, sans-serif';

/**
 * generateShareImage — the single entry point.
 * @param {object} opts
 * @param {string} opts.content      raw content (HTML allowed — stripped to text)
 * @param {string} [opts.title]      optional headline (articles/novels)
 * @param {string} [opts.authorName]
 * @param {string} [opts.authorAvatar] image URL (CORS-permitting)
 * @param {string} [opts.url]        canonical link shown as attribution
 * @param {string} [opts.size]       one of SHARE_SIZES keys
 * @returns {Promise<{blob: Blob, dataUrl: string, width: number, height: number} | null>}
 */
export const generateShareImage = async ({
  content = "",
  title = "",
  authorName = "",
  authorAvatar = "",
  url = "bayan-space.vercel.app",
  size = "square",
} = {}) => {
  const dims = SHARE_SIZES[size] || SHARE_SIZES.square;
  const SCALE = 2;
  const W = dims.w;
  const H = dims.h;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  const text = title ? `${title}. ${stripHtml(content)}` : stripHtml(content);
  const dir = detectTextDirection(text);
  const isRtl = dir === "rtl";

  // ---- Background: warm paper with a whisper of brand tint -------------
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#fdfdfc");
  bg.addColorStop(1, "#f4f6f8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Hairline frame
  ctx.strokeStyle = "rgba(15, 142, 226, 0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  // Accent bar (kind-neutral brand blue)
  ctx.fillStyle = "#0f8ee2";
  ctx.fillRect(64, 96, 6, 120);

  // ---- Header: avatar + author + wordmark ------------------------------
  const avatarImg = await loadImage(authorAvatar);
  const avatarR = 44;
  const avatarCx = isRtl ? W - 64 - avatarR : 64 + avatarR;
  const avatarCy = 148;

  drawAvatar(ctx, avatarImg, avatarCx, avatarCy, avatarR, authorName, "#0f8ee2");

  ctx.textAlign = isRtl ? "right" : "left";
  ctx.textBaseline = "middle";

  // Author name
  ctx.fillStyle = "#171717";
  ctx.font = `600 34px ${FONT_STACK}`;
  const nameX = isRtl ? avatarCx - avatarR - 20 : avatarCx + avatarR + 20;
  ctx.fillText(authorName || "Bayan Space", nameX, avatarCy - 12);

  // Source attribution under the name
  ctx.fillStyle = "#9ca3af";
  ctx.font = `400 24px ${FONT_STACK}`;
  ctx.fillText(url, nameX, avatarCy + 22);

  // Wordmark, opposite corner
  ctx.fillStyle = "#171717";
  ctx.font = `700 30px ${FONT_STACK}`;
  ctx.textAlign = isRtl ? "left" : "right";
  ctx.fillText("Bayan Space", isRtl ? 64 : W - 64, 110);
  ctx.fillStyle = "#9ca3af";
  ctx.font = `400 20px ${FONT_STACK}`;
  ctx.fillText("bayan-space.vercel.app", isRtl ? 64 : W - 64, 140);

  // ---- Content block ----------------------------------------------------
  const contentTop = 320;
  const contentLeft = 88;
  const contentRight = W - 88;
  const contentWidth = contentRight - contentLeft;
  const contentBottom = H - 220;

  ctx.textAlign = isRtl ? "right" : "left";
  ctx.fillStyle = "#1f2328";

  // Adaptive font size: longer content gets a step down, floor at 30px
  let fontSize = 44;
  const approxChars = text.length;
  if (approxChars > 900) fontSize = 32;
  else if (approxChars > 500) fontSize = 38;

  ctx.font = `500 ${fontSize}px ${FONT_STACK}`;
  const lineHeight = fontSize * 1.75;
  const maxLines = Math.max(2, Math.floor((contentBottom - contentTop) / lineHeight));

  const lines = wrapText(ctx, text, contentWidth, maxLines);
  let y = contentTop + lineHeight / 2;
  for (const line of lines) {
    const x = isRtl ? contentRight : contentLeft;
    ctx.fillText(line, x, y);
    y += lineHeight;
  }

  // ---- Footer: brand mark + link ----------------------------------------
  ctx.textAlign = isRtl ? "right" : "left";
  ctx.fillStyle = "#9ca3af";
  ctx.font = `400 24px ${FONT_STACK}`;
  const footerY = H - 88;
  ctx.fillText(isRtl ? "اقرأ المحتوى الكامل على" : "Read the full story on", isRtl ? W - 88 : 88, footerY);

  ctx.textAlign = isRtl ? "left" : "right";
  ctx.fillStyle = "#0f8ee2";
  ctx.font = `600 24px ${FONT_STACK}`;
  ctx.fillText("bayan-space.vercel.app", isRtl ? 88 : W - 88, footerY);

  // ---- Export ------------------------------------------------------------
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
  if (!blob) return null;
  const dataUrl = canvas.toDataURL("image/png");
  return { blob, dataUrl, width: W, height: H };
};

export default generateShareImage;
