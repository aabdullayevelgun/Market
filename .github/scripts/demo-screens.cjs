// Walks through the offline demo build on a phone-sized screen and saves a
// screenshot of each main view, so the demo can be checked without a device.
// Usage: node demo-screens.cjs <baseUrl> <outDir>
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const [baseUrl, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "az-AZ",
  });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("dialog", (d) => d.accept());

  let n = 0;
  const shot = async (name) => {
    await page.waitForTimeout(600);
    const file = path.join(outDir, `${String(++n).padStart(2, "0")}-${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
  };
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      problems.push(`step "${name}" failed: ${e.message.split("\n")[0]}`);
      await shot(`FAILED-${name}`).catch(() => {});
    }
  };

  await page.goto(baseUrl);
  await step("rol-secimi", async () => {
    await page.getByText("DEMO VERSİYA").waitFor({ timeout: 10000 });
    await shot("rol-secimi");
  });
  await step("kassa-giris", async () => {
    await page.getByText("Kassa + Admin paneli").click();
    await page.getByText("Növbəyə başla").first().waitFor();
    await shot("kassa-novbe-girisi");
    await page.locator("select").first().selectOption({ index: 1 });
    await page.locator('input[type="password"]').fill("123123");
    await page.getByRole("button", { name: "Növbəyə başla" }).click();
    await page.waitForTimeout(800);
    await shot("kassa");
  });
  await step("kassa-satis", async () => {
    await page.getByPlaceholder("Məhsul axtar...").fill("Kola");
    await page.waitForTimeout(400);
    await shot("kassa-axtaris");
    await page.getByRole("button", { name: /Kola 1L/ }).first().click();
    await page.getByPlaceholder("Məhsul axtar...").fill("Çörək");
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /Kənd çörəyi/ }).first().click();
    await shot("kassa-sebet");
    await page.getByRole("button", { name: /SATIŞ ET/ }).click();
    await page.waitForTimeout(500);
    await shot("kassa-odenis");
    await page.keyboard.press("Escape");
    const cancel = page.getByRole("button", { name: /Ləğv et|Bağla/ }).first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();
  });
  await step("admin-giris", async () => {
    await page.getByRole("button", { name: "Admin", exact: true }).click();
    await page.locator('input[type="password"]').fill("123123");
    await page.getByRole("button", { name: "Daxil ol" }).click();
    await page.waitForTimeout(800);
    await shot("admin-icmal");
    await page.mouse.wheel(0, 700);
    await shot("admin-icmal-asagi");
    await page.mouse.wheel(0, -2000);
  });
  for (const [label, name] of [["Məhsullar", "mehsullar"], ["Stok", "stok"], ["Satışlar", "satislar"], ["Hesabatlar", "hesabatlar"], ["Növbələr", "novbeler"], ["Təchizatçılar", "techizatcilar"]]) {
    await step(name, async () => {
      await page.getByRole("button", { name: /Menyu ·/ }).click();
      if (name === "mehsullar") await shot("admin-menyu");
      await page.getByRole("button", { name: label, exact: true }).click();
      await page.waitForTimeout(500);
      await shot(name);
    });
  }
  await step("skaner", async () => {
    await page.getByRole("button", { name: "DEMO · Menyu" }).click();
    await page.getByText("Telefon (Skaner)").click();
    await page.waitForTimeout(1000);
    await shot("skaner");
  });

  fs.writeFileSync(path.join(outDir, "problems.txt"), problems.join("\n") || "none");
  for (const p of problems) console.log(`::warning::${p.replace(/\n/g, " ")}`);
  await browser.close();
})();
