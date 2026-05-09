// Puppeteer screenshot script for Wayfare user manual
// Uses your local Chrome + session cookies from docs/cookies.json
// Run: node scripts/take-screenshots.js

import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SCREENSHOTS_DIR = path.join(ROOT, "public", "docs", "screenshots");
const COOKIES_FILE = path.join(ROOT, "docs", "cookies.json");
const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";

// --- Screenshot definitions ---
// Each entry: { id, url, selector (optional crop), waitFor, name }
const SHOTS = [
  // Auth & landing
  { id: "login",             url: "/login",                         name: "01-login-page" },

  // Trips list
  { id: "trips-list",        url: "/trips",                         name: "02-trips-list",          auth: true },
  { id: "new-trip",          url: "/trips/new",                     name: "03-new-trip-form",       auth: true },

  // (trip-specific shots are generated dynamically after we find a trip ID)
];

async function loadCookies() {
  if (!fs.existsSync(COOKIES_FILE)) {
    console.error("❌  docs/cookies.json not found. Create it from the placeholder.");
    process.exit(1);
  }
  const { cookies } = JSON.parse(fs.readFileSync(COOKIES_FILE, "utf-8"));
  return cookies.map((c) => ({
    ...c,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }));
}

async function screenshot(page, name, selector) {
  const outPath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  if (selector) {
    const el = await page.$(selector);
    if (el) {
      await el.screenshot({ path: outPath });
    } else {
      console.warn(`  ⚠  Selector "${selector}" not found for ${name} — falling back to full page`);
      await page.screenshot({ path: outPath, fullPage: false });
    }
  } else {
    await page.screenshot({ path: outPath, fullPage: false });
  }
  console.log(`  ✓  ${name}.png`);
  return outPath;
}

async function waitAndShot(page, url, name, { selector, waitFor, fullPage = false } = {}) {
  await page.goto(`${BASE_URL}${url}`, { waitUntil: "networkidle0", timeout: 15000 });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 8000 }).catch(() => {});
  // Let animations settle
  await new Promise((r) => setTimeout(r, 600));
  const outPath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  if (selector) {
    const el = await page.$(selector);
    if (el) {
      await el.screenshot({ path: outPath });
      console.log(`  ✓  ${name}.png`);
      return outPath;
    }
  }
  await page.screenshot({ path: outPath, fullPage });
  console.log(`  ✓  ${name}.png`);
  return outPath;
}

async function findFirstTripId(page) {
  await page.goto(`${BASE_URL}/trips`, { waitUntil: "networkidle0", timeout: 15000 });
  const hrefs = await page.$$eval("a[href^='/trips/']", (els) =>
    els.map((el) => el.getAttribute("href"))
  );
  const uuidHref = hrefs.find((h) => /\/trips\/[0-9a-f-]{36}(\/|$)/.test(h));
  if (!uuidHref) return null;
  const match = uuidHref.match(/\/trips\/([0-9a-f-]{36})/);
  return match ? match[1] : null;
}

async function findShareToken(page, tripId) {
  // Navigate to the trip members page and grab the share token from the invite link
  await page.goto(`${BASE_URL}/trips/${tripId}/members`, { waitUntil: "networkidle0", timeout: 15000 });
  const token = await page.evaluate(() => {
    // Look for any anchor or input containing /join/ or /summary/
    const links = Array.from(document.querySelectorAll("a, input"));
    for (const el of links) {
      const val = el.href || el.value || "";
      const m = val.match(/\/(?:join|summary)\/([0-9a-f-]{36})/);
      if (m) return m[1];
    }
    // Also check page text
    const text = document.body.innerText;
    const m2 = text.match(/\/(?:join|summary)\/([0-9a-f-]{36})/);
    return m2 ? m2[1] : null;
  });
  return token;
}

async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Force light mode on every page load before next-themes reads localStorage
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");
  });

  // --- Unauthenticated shots ---
  console.log("\n📸  Unauthenticated pages");
  await waitAndShot(page, "/login", "01-login-page");

  // --- Set cookies for authenticated shots ---
  const cookies = await loadCookies();
  await page.setCookie(...cookies);

  // --- Authenticated shots ---
  console.log("\n📸  Trips");
  await waitAndShot(page, "/trips", "02-trips-list", { waitFor: "[data-testid='trip-card'], article, .glass" });
  await waitAndShot(page, "/trips/new", "03-new-trip-form");

  // --- Trip-specific shots ---
  const tripId = await findFirstTripId(page);
  if (tripId) {
    console.log(`\n📸  Trip detail (${tripId})`);
    await waitAndShot(page, `/trips/${tripId}`, "04-trip-dashboard");
    await waitAndShot(page, `/trips/${tripId}/expenses`, "05-expenses-list");
    await waitAndShot(page, `/trips/${tripId}/expenses/new`, "06-add-expense-form");
    await waitAndShot(page, `/trips/${tripId}/members`, "07-members-page");
    await waitAndShot(page, `/trips/${tripId}/settle`, "08-settle-page");
    await waitAndShot(page, `/trips/${tripId}/insights`, "09-trip-insights");
    await waitAndShot(page, `/trips/${tripId}/edit`, "10-edit-trip-form");
  } else {
    console.warn("  ⚠  No trip found — skipping trip-specific shots. Seed data first: pnpm seed");
  }

  // --- All-trips insights ---
  console.log("\n📸  Insights");
  await waitAndShot(page, "/insights", "11-all-trips-insights");

  // --- Dark mode shot (intentionally dark — illustrates the feature in Section 9) ---
  console.log("\n📸  Dark mode");
  await page.goto(`${BASE_URL}/trips`, { waitUntil: "networkidle0" });
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "12-dark-mode-trips.png"), fullPage: false });
  console.log("  ✓  12-dark-mode-trips.png");
  // Reset to light for remaining shots
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  });
  await new Promise((r) => setTimeout(r, 200));

  // --- Public summary page ---
  console.log("\n📸  Public pages");
  if (tripId) {
    const shareToken = await findShareToken(page, tripId);
    if (shareToken) {
      // Remove auth cookies so this renders as a public visitor
      const client = await page.createCDPSession();
      await client.send("Network.clearBrowserCookies");
      await waitAndShot(page, `/summary/${shareToken}`, "13-trip-summary", {
        waitFor: "h1, .glass",
      });
      console.log(`  (token: ${shareToken})`);
      // Restore cookies for any further shots
      await page.setCookie(...(await loadCookies()));
    } else {
      console.warn("  ⚠  Could not find share token — skipping summary screenshot");
    }
  }

  // --- Admin dashboard ---
  console.log("\n📸  Admin");
  await page.setCookie(...(await loadCookies()));
  await waitAndShot(page, "/admin", "14-admin-dashboard", { waitFor: "table, h1" });

  await browser.close();
  console.log(`\n✅  Done — screenshots saved to docs/screenshots/\n`);
}

main().catch((err) => {
  console.error("❌ ", err.message);
  process.exit(1);
});
