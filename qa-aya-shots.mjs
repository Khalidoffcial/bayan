/** Visual evidence run: welcome → session → clock panel (desktop + mobile). */
export default async function run(page) {
  const sleep = (ms) => page.waitForTimeout(ms);
  await page.evaluate(() => { sessionStorage.clear(); localStorage.removeItem("focusTimerEngine"); });
  await page.reload(); await sleep(2500);

  await page.screenshot({ path: "d:/bayan/bayan/aya-welcome.png" });

  await page.evaluate(() => document.querySelector(".aya-welcome__actions .aya-btn--primary")?.click());
  await sleep(600);
  await page.evaluate(() => {
    const input = document.querySelector(".aya-setup__field input");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, "مراجعة سورة");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await sleep(200);
  await page.screenshot({ path: "d:/bayan/bayan/aya-setup.png" });
  await page.evaluate(() => [...document.querySelectorAll(".aya-setup__actions button")].find(b => /ابدأ/.test(b.textContent))?.click());
  await sleep(1200);
  await page.screenshot({ path: "d:/bayan/bayan/aya-in-session.png" });

  await page.locator(".fc-center .fclk").first().click({ force: true });
  await sleep(800);
  await page.screenshot({ path: "d:/bayan/bayan/clock-panel-desktop.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await sleep(600);
  await page.screenshot({ path: "d:/bayan/bayan/clock-panel-mobile.png" });
  await page.setViewportSize({ width: 1366, height: 850 });
  return "screenshots written";
}
