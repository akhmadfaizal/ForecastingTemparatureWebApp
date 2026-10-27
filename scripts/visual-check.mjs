import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = 9333;
const targetUrl = process.argv[2] || "http://127.0.0.1:3000/?demo=1";
const viewportWidth = Number(process.argv[3] || 390);
const viewportHeight = Number(process.argv[4] || 844);
const screenshotPath = process.argv[5];
const openSlots = process.argv[6] === "open-slots";
const profile = await mkdtemp(join(tmpdir(), "skripsi-edge-"));
const edge = spawn(
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  [
    "--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, "about:blank"
  ],
  { windowsHide: true, stdio: "ignore" }
);

let ready = false;
for (let attempt = 0; attempt < 20; attempt += 1) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (response.ok) { ready = true; break; }
  } catch {
    await new Promise(resolve => setTimeout(resolve, 250));
  }
}
if (!ready) throw new Error("Browser pemeriksaan tidak dapat dijalankan.");
const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}` });

const page = await browser.newPage();
await page.setViewport({ width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1 });
const pageErrors = [];
page.on("pageerror", error => pageErrors.push(error.message));
await page.goto(targetUrl, { waitUntil: "networkidle0" });
if (openSlots) {
  const button = await page.$(".sync-slot-button:not([disabled])");
  if (!button) throw new Error("Tombol detail slot aktif tidak ditemukan.");
  await button.click();
  await page.waitForSelector(".slot-dialog");
  await new Promise(resolve => setTimeout(resolve, 300));
}

const metrics = await page.evaluate(() => {
  const selectors = [
    ".app-shell", ".main-content", ".topbar", ".page-message",
    ".source-status",
    ".overview-grid", ".temperature-panel", ".system-summary",
    ".data-layout", ".chart-panel", ".prediction-panel",
    ".panel-heading", ".status-label", ".header-actions", ".chart-wrap",
    ".sync-log-panel", ".slot-dialog", ".slot-table-scroll"
  ];
  const boxes = Object.fromEntries(selectors.map(selector => {
    const element = document.querySelector(selector);
    if (!element) return [selector, null];
    const box = element.getBoundingClientRect();
    return [selector, {
      left: box.left, right: box.right, width: box.width,
      clientWidth: element.clientWidth, scrollWidth: element.scrollWidth
    }];
  }));
  return {
    targetUrl: window.location.href,
    predictionText: document.querySelector(".prediction-panel")?.innerText || null,
    sourceText: document.querySelector(".source-status")?.innerText || null,
    syncLogText: document.querySelector(".sync-log-panel")?.innerText || null,
    slotDialogText: document.querySelector(".slot-dialog")?.innerText || null,
    innerWidth: window.innerWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    boxes
  };
});

if (screenshotPath) {
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

console.log(JSON.stringify({ metrics, pageErrors }, null, 2));
await browser.close();
if (!edge.killed) edge.kill();
await new Promise(resolve => {
  if (edge.exitCode !== null) return resolve();
  edge.once("exit", resolve);
  setTimeout(resolve, 2000);
});
for (let attempt = 0; attempt < 8; attempt += 1) {
  try {
    await rm(profile, { recursive: true, force: true });
    break;
  } catch (error) {
    if (error.code !== "EBUSY" || attempt === 7) throw error;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
}
