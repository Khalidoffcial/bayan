/**
 * html2pdf (~350KB) is loaded ON DEMAND from the CDN the first time the
 * user actually exports an article — it no longer blocks every page load.
 */
const HTML2PDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
let html2pdfPromise = null;

const loadHtml2pdf = () => {
  if (window.html2pdf) return Promise.resolve(window.html2pdf);
  if (!html2pdfPromise) {
    html2pdfPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = HTML2PDF_URL;
      s.onload = () => resolve(window.html2pdf);
      s.onerror = () => {
        html2pdfPromise = null;
        reject(new Error("html2pdf load failed"));
      };
      document.head.appendChild(s);
    });
  }
  return html2pdfPromise;
};

export const exportArticleToPDF = async (element, title = "article") => {
  let html2pdf;
  try {
    html2pdf = await loadHtml2pdf();
  } catch (e) {
    alert("Please load html2pdf.js library");
    return;
  }
  const opt = {
    margin: 0.5,
    filename: `${title}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
  };
  html2pdf().from(element).set(opt).save();
};

export const shareArticle = async ({ title, url }) => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: title || "Article",
        url: url || window.location.href,
      });
    } catch (err) {
      console.error("Share error:", err);
    }
  }
};
