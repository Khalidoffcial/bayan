export default async function run(page, ui) {
  await page.addInitScript(() => {
    localStorage.setItem("me", JSON.stringify({
      id: "qa-user-1", name: "QA Tester", username: "qa_tester", imgProfile: "",
    }));
  });
  await page.goto("http://localhost:3000/posts", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".composer-collapsed", { timeout: 30000 });

  const domClick = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return "missing";
    el.click();
    return "ok";
  }, sel);

  const collapsed = await page.evaluate(() => ({
    visible: !!document.querySelector(".composer-collapsed"),
    placeholder: document.querySelector(".composer-placeholder")?.textContent.trim(),
  }));

  // Expand
  await domClick(".composer-collapsed");
  await page.waitForSelector(".composer-expanded", { timeout: 10000 });

  const expanded = await page.evaluate(() => ({
    toolbarTypes: [...document.querySelectorAll(".TypeSelector button")].map(b => b.textContent.trim()),
    editorPlaceholder: document.querySelector(".InlineComposer textarea")?.placeholder || null,
    publishDisabledInitially: document.querySelector(".submitBtn")?.disabled ?? null,
    uploadCard: !!document.querySelector(".upload-card"),
    avatarCount: document.querySelectorAll(".InlineComposer .composer-avatar").length,
    username: document.querySelector(".composer-username")?.textContent.trim(),
  }));

  // Type draft -> publish should enable
  await page.fill(".InlineComposer textarea", "QA draft content");
  const publishEnabled = await page.evaluate(
    () => !document.querySelector(".submitBtn")?.disabled
  );

  // Cancel -> inline discard confirm appears
  await domClick(".cancelBtn");
  await page.waitForSelector(".composer-discard-confirm", { timeout: 5000 });
  const confirmShown = await page.evaluate(
    () => !!document.querySelector(".composer-discard-confirm")
  );

  // "No" -> draft kept, stays expanded
  await domClick(".discard-no");
  await page.waitForTimeout(300);
  const draftKept = await page.evaluate(() => ({
    expanded: !!document.querySelector(".composer-expanded"),
    content: document.querySelector(".InlineComposer textarea")?.value || "",
  }));

  // Switch to Article -> title/description/CKEditor should appear
  await domClick(".TypeSelector button:nth-child(2)");
  await page.waitForTimeout(500);
  const articleFields = await page.evaluate(() => ({
    titleInput: !!document.querySelector(".InlineComposer input.sm_WriterInput"),
    ckeditor: !!document.querySelector(".InlineComposer .ck-editor"),
    activeType: document.querySelector(".TypeSelector button.active")?.textContent.trim(),
  }));

  // Publish as article with no title -> inline error, no submit
  await domClick(".submitBtn");
  await page.waitForTimeout(300);
  const validationError = await page.evaluate(
    () => document.querySelector(".composer-error")?.textContent.trim() || null
  );

  // Cancel -> discard -> back to collapsed
  await domClick(".cancelBtn");
  await page.waitForSelector(".composer-discard-confirm");
  await domClick(".discard-yes");
  await page.waitForTimeout(500);
  const collapsedAgain = await page.evaluate(() => ({
    collapsedTrigger: !!document.querySelector(".composer-collapsed"),
    expandedGone: !document.querySelector(".composer-expanded"),
  }));

  return { collapsed, expanded, publishEnabled, confirmShown, draftKept, articleFields, validationError, collapsedAgain };
}
