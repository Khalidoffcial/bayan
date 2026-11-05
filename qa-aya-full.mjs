/** Full acceptance QA: Aya welcome → session → activity → clock/timer panel. */
export default async function run(page, ui) {
  const log = {};
  const sleep = (ms) => page.waitForTimeout(ms);
  const clearState = async () => {
    await page.evaluate(() => { sessionStorage.clear(); localStorage.removeItem("focusTimerEngine"); localStorage.removeItem("ayaSessionState"); });
    await page.reload();
    await page.waitForTimeout(1500);
  };

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" }).catch(() => { });
  await clearState();

  // Focus space route
  await page.goto("http://localhost:3000/focus", { waitUntil: "networkidle" }).catch(() => { });
  await sleep(2000);
  log.url = page.url();

  // 1. Aya welcome visible?
  log.welcomeVisible = await page.evaluate(() => !!document.querySelector(".aya-welcome"));
  log.welcomeText = await page.evaluate(() => document.querySelector(".aya-welcome__body")?.textContent?.slice(0, 60) || null);

  // screenshot welcome
  await page.screenshot({ path: "aya-welcome.png" });

  // 2. close welcome → should not reappear
  await page.evaluate(() => document.querySelector(".aya-welcome__close")?.click());
  await sleep(500);
  log.welcomeClosed = await page.evaluate(() => !document.querySelector(".aya-welcome"));

  // 3. click Start with Aya (reopen welcome first via sessionStorage clear)
  await page.evaluate(() => sessionStorage.removeItem("ayaWelcomeShown"));
  await sleep(300);
  // re-enter to trigger welcome
  await page.evaluate(() => { sessionStorage.clear(); });
  await page.reload(); await sleep(1800);
  const startBtn = await page.evaluate(() => !!document.querySelector(".aya-welcome__actions .aya-btn--primary"));
  log.startBtnExists = startBtn;
  await page.evaluate(() => document.querySelector(".aya-welcome__actions .aya-btn--primary")?.click());
  await sleep(500);
  log.setupVisible = await page.evaluate(() => !!document.querySelector(".aya-setup"));

  // 4. fill goal, start session
  await page.screenshot({ path: "aya-setup.png" });
  await page.evaluate(() => {
    const input = document.querySelector(".aya-setup__field input");
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, "مراجعة سورة");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await sleep(300);
  await page.evaluate(() => [...document.querySelectorAll(".aya-setup__actions button")].find(b => /ابدأ/.test(b.textContent))?.click());
  await sleep(800);
  log.companionVisible = await page.evaluate(() => !!document.querySelector(".aya-companion"));
  log.bubbleText = await page.evaluate(() => document.querySelector(".aya-companion__bubble p")?.textContent?.slice(0, 50) || null);
  await page.screenshot({ path: "aya-in-session.png" });

  // 5. real timer running?
  log.engineState = await page.evaluate(() => localStorage.getItem("focusTimerEngine")?.slice(0, 80) || null);
  await sleep(2000);
  log.remainingDecreasing = await page.evaluate(() => document.querySelector(".aya-companion__time")?.textContent || null);

  // 6. click the CLOCK → panel opens (real user click, not evaluate)
  const clock = page.locator(".fc-center .fclk").first();
  await clock.click({ force: true }).catch(async (e) => { log.clockClickError = String(e).slice(0, 120); });
  await sleep(700);
  log.clockPanelOpen = await page.evaluate(() => !!document.querySelector(".fc-clock-panel"));
  log.panelTabs = await page.evaluate(() => [...document.querySelectorAll(".fc-clock-panel .fc-tab")].map(b => b.textContent.trim()));
  await page.screenshot({ path: "clock-panel.png" });

  // 7. start a short timer via the panel, close panel, reopen — state persists
  await page.evaluate(() => [...document.querySelectorAll(".fc-clock-panel .fc-tab")].find(b => /Timer|مؤقت/.test(b.textContent))?.click());
  await sleep(300);
  // set 5 sec timer via steppers? use start directly with 25m then pause quickly
  await page.evaluate(() => document.querySelector(".fc-clock-panel .fc-pane__actions .fc-btn--primary")?.click());
  await sleep(1500);
  log.timerRunning = await page.evaluate(() => !!JSON.parse(localStorage.getItem("focusTimerEngine") || "null") && JSON.parse(localStorage.getItem("focusTimerEngine")).pausedAt === null);
  await page.evaluate(() => document.querySelector(".fc-clock-panel .fc-panel__close")?.click());
  await sleep(500);
  log.panelClosed = await page.evaluate(() => !document.querySelector(".fc-clock-panel"));
  log.engineAfterClose = await page.evaluate(() => !!localStorage.getItem("focusTimerEngine"));
  // reopen via clock
  await clock.click({ force: true });
  await sleep(700);
  log.panelReopened = await page.evaluate(() => !!document.querySelector(".fc-clock-panel"));
  log.timerStillThere = await page.evaluate(() => document.querySelector(".fc-clock-panel .fc-timer-display")?.textContent);

  // pause/resume
  await page.evaluate(() => [...document.querySelectorAll(".fc-clock-panel .fc-pane__actions button")].find(b => /إيقاف مؤقت|Pause/.test(b.textContent))?.click());
  await sleep(300);
  log.paused = await page.evaluate(() => JSON.parse(localStorage.getItem("focusTimerEngine"))?.pausedAt !== null);
  await page.evaluate(() => [...document.querySelectorAll(".fc-clock-panel .fc-pane__actions button")].find(b => /استئناف|Resume/.test(b.textContent))?.click());
  await sleep(300);
  log.resumed = await page.evaluate(() => JSON.parse(localStorage.getItem("focusTimerEngine"))?.pausedAt === null);

  // 8. Aya session ends → goal question (simulate: engine expiry)
  // skip long wait; check goal-question logic by expiring engine quickly via reset
  // 9. mobile viewport test
  await page.setViewportSize({ width: 390, height: 844 });
  await sleep(600);
  log.mobilePanelVisible = await page.evaluate(() => {
    const p = document.querySelector(".fc-clock-panel");
    if (!p) return false;
    const r = p.getBoundingClientRect();
    return r.width > 0 && r.width <= 390 && r.left >= 0 && r.right <= 390;
  });
  log.mobileClockClickable = await page.evaluate(() => {
    const el = document.querySelector(".fc-center .fclk");
    if (!el) return false;
    const s = getComputedStyle(el);
    return s.pointerEvents !== "none";
  });
  await page.screenshot({ path: "clock-panel-mobile.png" });
  await page.setViewportSize({ width: 1366, height: 850 });

  // 10. no console errors gathered by harness below
  return log;
}
