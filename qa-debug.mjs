export default async function run(page, ui) {
  await page.addInitScript(() => {
    localStorage.setItem("me", JSON.stringify({
      id: "qa-user-1", name: "QA Tester", username: "qa_tester", imgProfile: "",
    }));
  });
  await page.goto("http://localhost:3000/posts", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".composer-collapsed", { timeout: 30000 });

  // dispatch a real click via DOM
  const clicked = await page.evaluate(() => {
    const el = document.querySelector(".composer-collapsed");
    if (!el) return "missing";
    el.click();
    return "clicked";
  });
  await page.waitForTimeout(1000);

  const state = await page.evaluate(() => ({
    expandedPresent: !!document.querySelector(".composer-expanded"),
    collapsedPresent: !!document.querySelector(".composer-collapsed"),
  }));
  return { ...state, clicked };
}
