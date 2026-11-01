/**
 * SEO service — robots.txt و sitemap.xml ديناميكيان من الخادم.
 * - يستبعد الصفحات الخاصة والمسارات الداخلية من الفهرسة.
 * - الروابط مطلقة HTTPS فقط.
 * - لا بيانات وهمية: كل المحتوى من قاعدة البيانات الفعلية.
 */

const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://bayan-space.vercel.app";

function robotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    "// الصفحات الخاصة — لا فهرسة",
    "Disallow: /settings",
    "Disallow: /signin",
    "Disallow: /signup",
    "Disallow: /search",
    "Disallow: /media/",
    "Disallow: /translate",
    "",
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    "",
  ].join("\n");
}

/**
 * sitemap.xml — يُبنى من المحتوى المنشور الفعلي.
 * @param {object} lists — { articles: [...], novels: [...] } من DAO.
 * كل عنصر يوفر: id، updatedAt (أو createdAt)، title/descrip اختياري.
 */
function sitemapXml(lists = {}) {
  const urls = [];
  const addUrl = (path, lastmod) => {
    urls.push(
      `  <url>\n    <loc>${SITE_ORIGIN}${path}</loc>\n` +
      (lastmod ? `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>\n` : "") +
      `  </url>`
    );
  };

  // الصفحات العامة الأساسية
  addUrl("/", null);

  // المقالات والروايات المنشورة فقط — لا صفحات وهمية
  for (const a of lists.articles || []) {
    if (a?.id) addUrl(`/r/${a.id}`, a.updatedAt || a.createdAt || null);
  }
  for (const n of lists.novels || []) {
    if (n?.id) addUrl(`/n/${n.id}`, n.updatedAt || n.createdAt || null);
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    "",
  ].join("\n");
}

module.exports = { robotsTxt, sitemapXml, SITE_ORIGIN };
