export const exportArticleToPDF = (element, title = "article") => {
  if (!window.html2pdf) {
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
  window.html2pdf().from(element).set(opt).save();
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
