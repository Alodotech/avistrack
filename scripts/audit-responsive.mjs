import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const BASE_URL = process.env.AVIS_BASE_URL ?? "http://localhost:3000";
const WIDTHS = (process.env.AVIS_WIDTHS ?? "320,375,390,768,1024,1280,1440,1920")
  .split(",")
  .map((w) => Number(w.trim()))
  .filter((w) => Number.isFinite(w) && w > 0);
const STORAGE = process.env.AVIS_STORAGE_STATE ?? "/tmp/opencode/avis-storage.json";
const COMPANY_STORAGE = process.env.AVIS_COMPANY_STORAGE_STATE ?? "/tmp/opencode/avis-company-storage.json";
const OUT_DIR = resolve(process.cwd(), process.env.AVIS_OUT_DIR ?? "artifacts/audit");
const PUBLIC_PAGES = [
  { name: "landing", path: "/" },
  { name: "landing-login", path: "/?auth=login" },
  { name: "landing-signup", path: "/?auth=signup" },
  { name: "tarifs", path: "/tarifs" },
  { name: "mentions-legales", path: "/mentions-legales" },
  { name: "conditions-generales", path: "/conditions-generales" },
  { name: "confidentialite", path: "/confidentialite" },
  { name: "admin-login", path: "/admin/login" },
];
const AUTH_PAGES = [
  { name: "dashboard", path: "/dashboard" },
  { name: "dashboard-qr", path: "/dashboard/qr" },
  { name: "dashboard-formulaire", path: "/dashboard/formulaire" },
  { name: "dashboard-remarques", path: "/dashboard/remarques" },
  { name: "dashboard-abonnement", path: "/dashboard/abonnement" },
  { name: "dashboard-profil", path: "/dashboard/profil" },
  { name: "admin", path: "/admin" },
  { name: "admin-entreprises", path: "/admin/entreprises" },
  { name: "admin-utilisateurs", path: "/admin/utilisateurs" },
  { name: "admin-finances", path: "/admin/finances" },
  { name: "admin-journal", path: "/admin/journal" },
  { name: "admin-rapports", path: "/admin/rapports" },
];

const AUDIT = `() => {
  const result = { scroll: null, overflow: [], clipped: [], touch: [], charts: [] };
  const vw = window.innerWidth;
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) {
    result.scroll = { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth };
  }
  const skip = (el) => {
    if (!(el instanceof HTMLElement || el instanceof SVGElement)) return true;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
    if (el.closest('[aria-hidden="true"], [data-audit-ignore], .scene-canvas, canvas')) return true;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return true;
    if (rect.right < -20 || rect.left > vw + 20) return true;
    if (style.position === "fixed" && (rect.right <= 0 || rect.left >= vw)) return true;
    return false;
  };
  const inScroller = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowX)) return true;
    }
    return false;
  };
  const describe = (el) => {
    const r = el.getBoundingClientRect();
    const cls = typeof el.className === 'string' ? el.className.slice(0, 90) : el.getAttribute('class') || '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls.trim().split(/\\s+/).slice(0, 3).join('.') : '') + ' [' + Math.round(r.left) + '→' + Math.round(r.right) + ' / ' + Math.round(r.width) + 'x' + Math.round(r.height) + ']';
  };
  for (const el of document.querySelectorAll('body *')) {
    if (skip(el)) continue;
    const r = el.getBoundingClientRect();
    if (!inScroller(el) && (r.right > vw + 1 || r.left < -1)) {
      result.overflow.push(describe(el));
    }
    const style = getComputedStyle(el);
    const mightClip = el.children.length === 0 && el.textContent && el.textContent.trim();
    if (mightClip && (style.overflow === 'hidden' || style.overflowX === 'hidden') && style.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 3 && r.width > 20) {
      result.clipped.push(describe(el) + ' texte=' + el.textContent.trim().slice(0, 45));
    }
    if (el.matches('button, a[href], input, select, textarea, [role="button"]') && style.display !== 'inline') {
      const interactive = r.width >= 8 && r.height >= 8;
      const labelled = el.tagName === 'INPUT' ? el.closest('label') : null;
      const lr = labelled ? labelled.getBoundingClientRect() : null;
      const hasLargeLabel = lr && lr.width >= 44 && lr.height >= 44;
      if (interactive && !hasLargeLabel && (r.width < 44 || r.height < 44)) {
        result.touch.push(describe(el) + ' (' + Math.round(r.width) + 'x' + Math.round(r.height) + ')');
      }
    }
    if (el instanceof SVGElement && el.tagName.toLowerCase() === 'svg' && r.width > 180 && r.height > 100) {
      const parent = el.parentElement;
      const pr = parent ? parent.getBoundingClientRect() : null;
      if (pr && (r.right > pr.right + 2 || r.left < pr.left - 2 || r.height < 140)) {
        result.charts.push(describe(el) + ' parent=' + Math.round(pr.width) + 'x' + Math.round(pr.height));
      }
    }
  }
  const uniq = (a) => Array.from(new Set(a)).slice(0, 12);
  result.overflow = uniq(result.overflow);
  result.clipped = uniq(result.clipped);
  result.touch = uniq(result.touch);
  result.charts = uniq(result.charts);
  return result;
}`;

async function auditPage(browser, page, width, storageState) {
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 720 : 900 },
    deviceScaleFactor: 1,
    storageState,
    reducedMotion: "reduce",
  });
  const target = await context.newPage();
  const defects = [];
  const log = page.name;
  target.on("console", (msg) => {
    if (msg.type() === "error") defects.push({ page: log, width, type: "console", detail: msg.text().slice(0, 220) });
  });
  target.on("pageerror", (err) => {
    defects.push({ page: log, width, type: "console", detail: "pageerror: " + err.message.slice(0, 220) });
  });
  try {
    const response = await target.goto(BASE_URL + page.path, { waitUntil: "domcontentloaded", timeout: 45000 });
    if (!response || response.status() >= 400) {
      defects.push({ page: log, width, type: "console", detail: "HTTP " + (response?.status() ?? "no response") + " sur " + page.path });
    }
    await target.waitForTimeout(1200);
    await target.evaluate(() => document.fonts.ready.then(() => true));
    const result = await target.evaluate(`(${AUDIT})()`);
    if (result.scroll) {
      defects.push({ page: log, width, type: "scroll-horizontal", detail: `${result.scroll.scrollWidth}px au lieu de ${result.scroll.clientWidth}px` });
    }
    for (const d of result.overflow) defects.push({ page: log, width, type: "overflow", detail: d });
    for (const d of result.clipped) defects.push({ page: log, width, type: "texte-coupe", detail: d });
    for (const d of result.touch) defects.push({ page: log, width, type: "cible-tactile", detail: d });
    for (const d of result.charts) defects.push({ page: log, width, type: "graphique", detail: d });
    await target.screenshot({ path: resolve(OUT_DIR, `${page.name}-${width}.png`), fullPage: true, animations: "disabled" });
  } catch (err) {
    defects.push({ page: log, width, type: "console", detail: "échec visite: " + (err instanceof Error ? err.message.slice(0, 220) : String(err)) });
  } finally {
    try {
      await context.close();
    } catch (error) {
      void error;
    }
  }
  return defects;
}

async function writeReport(pages, widths, defects) {
  const summary = Object.entries(
    defects.reduce((acc, d) => {
      acc[d.type] = (acc[d.type] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  await writeFile(resolve(OUT_DIR, "report.json"), JSON.stringify({ pages: pages.map((p) => p.name), widths, summary, defects }, null, 2));
  return summary;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--disable-gpu", "--no-sandbox"] });
  const only = process.argv.slice(2);
  const pages = [
    ...PUBLIC_PAGES.map((p) => ({ ...p, storageState: undefined })),
    ...AUTH_PAGES.map((p) => ({
      ...p,
      storageState: p.path.startsWith("/dashboard") ? COMPANY_STORAGE : STORAGE,
    })),
  ].filter((p) => only.length === 0 || only.some((term) => p.name.includes(term)));
  const defects = [];
  for (const width of WIDTHS) {
    for (const page of pages) {
      const found = await auditPage(browser, page, width, page.storageState);
      defects.push(...found);
    }
    console.log(`largeur ${width}px terminée (${defects.length} défauts cumulés)`);
    await writeReport(pages, WIDTHS, defects);
  }
  await browser.close();
  console.log("résumé:", await writeReport(pages, WIDTHS, defects));
}

void main();
