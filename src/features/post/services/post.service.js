export const sharePost = async ({ title, text, url }) => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: title || "Post",
        text: text || "",
        url: url || window.location.href,
      });
    } catch (err) {
      console.error("Share error:", err);
    }
  }
};
