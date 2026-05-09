// Generates docs/wayfare-user-manual.pdf from the HTML source.
// Requires pnpm dev to be running (loads from localhost so Google Fonts resolve).
// Run: node scripts/generate-manual-pdf.js

import puppeteer from "puppeteer-core";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT     = path.join(__dirname, "..");
const PDF_FILE = path.join(ROOT, "docs", "wayfare-user-manual.pdf");
const CHROME   = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
// Load via localhost so Google Fonts and relative screenshot paths both resolve
const URL      = "http://localhost:3000/docs/wayfare-user-manual.html";

// Check dev server is up
try {
  await fetch(URL, { signal: AbortSignal.timeout(3000) });
} catch {
  console.error("❌  Dev server not reachable at localhost:3000. Run 'pnpm dev' first.");
  process.exit(1);
}

console.log("🖨️  Generating PDF from HTML manual…");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();
await page.goto(URL, { waitUntil: "networkidle0", timeout: 30000 });

// Let web fonts fully settle after networkidle
await new Promise((r) => setTimeout(r, 2000));

await page.pdf({
  path: PDF_FILE,
  format: "A4",
  printBackground: true,
  margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
  displayHeaderFooter: false,
});

await browser.close();

const size = (fs.statSync(PDF_FILE).size / 1024).toFixed(0);
console.log(`✅  PDF written to docs/wayfare-user-manual.pdf (${size} KB)`);
