// Playwright demo run (?demo=1) against `vite preview --port 3001`: one screenshot per
// screen with a renders/BROKEN verdict, plus console errors. Usage: node scripts/demo-screenshots.mjs [outDir]
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'http://localhost:3001/opendesk-simulator/';
const OUT = process.argv[2] ?? 'screenshots';
const PREFIX = process.argv[3] ?? '';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
let screen = 'init';
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${screen}] [console.${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[${screen}] [pageerror] ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400) logs.push(`[${screen}] [http ${r.status()}] ${r.request().method()} ${r.url()}`); });

const results = [];
const shot = async (name) => {
  await page.waitForTimeout(400);
  const path = `${OUT}/${PREFIX}${name}.png`;
  await page.screenshot({ path });
  return path;
};
async function check(name, fn) {
  screen = name;
  let verdict = 'renders';
  let detail;
  try {
    detail = (await fn()) ?? '';
  } catch (e) {
    verdict = 'BROKEN';
    detail = String(e.message).split('\n')[0];
  }
  const errorsHere = logs.filter((l) => l.startsWith(`[${name}]`) && /pageerror|console.error/.test(l)).length;
  const path = await shot(name).catch(() => '(no screenshot)');
  // An error message, crash text or error boundary on screen is a failure even if the element exists.
  const crash = await page.locator('text=/Something went wrong|Couldn.t load|Failed to (load|fetch)|is not defined/i').first().isVisible().catch(() => false);
  if (verdict === 'renders' && crash) {
    verdict = 'BROKEN';
    detail += ' | error text on screen: ' + (await page.locator('text=/Something went wrong|Couldn.t load|Failed to (load|fetch)|is not defined/i').first().innerText()).trim().slice(0, 120);
  }
  results.push({ name, verdict, detail, errorsHere, path });
  // close any open app windows so each screenshot shows one screen
  for (const close of await page.getByRole('button', { name: /^close/i }).all()) await close.click().catch(() => {});
}

const frame = (title) =>
  page.locator('[data-window-id]').filter({ has: page.getByTestId('window-title').getByText(new RegExp('^' + title + ' — ')) });

await page.goto(BASE + '?demo=1', { waitUntil: 'networkidle' });
await page.getByTestId('app-root').waitFor();

const apps = [
  ['EventViewer', 'Event Viewer', /Spooler service terminated/],
  ['RegistryEditor', 'Registry Editor', null],
  ['NetworkPanel', 'Network Connections', null],
  ['ADUsersComputers', 'AD Users and Computers', null],
  ['FileExplorer', 'File Explorer', null],
];
for (const [key, title, expectText] of apps) {
  await check(`app-${key}`, async () => {
    await page.getByTestId(`launch-${key}`).click();
    const w = frame(title);
    await w.waitFor({ timeout: 5000 });
    // let the lazy chunk replace the Suspense fallback, and data arrive
    await page.waitForFunction((el) => !/Loading/.test(el.innerText), await w.elementHandle(), { timeout: 5000 }).catch(() => {});
    const text = (await w.innerText()).replace(/\s+/g, ' ').trim();
    if (/Loading/.test(text)) throw new Error(`stuck loading: "${text.slice(0, 100)}"`);
    if (/Unexpected .* data/.test(text)) throw new Error(`invalid data: "${text.slice(0, 100)}"`);
    if (expectText && !expectText.test(text)) throw new Error(`expected content missing: "${text.slice(0, 100)}"`);
    return text.slice(0, 140);
  });
}

const routes = [
  ['scoring-dashboard', 'scoring', null],
  ['certificate-gallery', 'certificates', null],
  ['team-mode', 'team', null],
];
for (const [name, path] of routes) {
  await check(name, async () => {
    await page.goto(`${BASE}${path}?demo=1`, { waitUntil: 'networkidle' });
    await page.getByTestId('app-root').waitFor();
    const body = (await page.getByTestId('app-root').innerText()).replace(/\s+/g, ' ').trim();
    if (!body) throw new Error('blank page');
    if (/^Loading…$/.test(body)) throw new Error('stuck on Loading…');
    return body.slice(0, 160);
  });
}

for (const [name, label] of [['communication-chat', /chat/i], ['communication-email', /email/i]]) {
  await check(name, async () => {
    await page.goto(BASE + '?demo=1', { waitUntil: 'networkidle' });
    const opener = page.getByRole('button', { name: label }).or(page.getByRole('tab', { name: label })).or(page.getByRole('link', { name: label }));
    if ((await opener.count()) === 0) throw new Error('no UI entry point: component is not mounted anywhere in the app');
    await opener.first().click();
    const region = page.getByRole('region', { name: label }).or(page.getByRole('log')).first();
    await region.waitFor({ timeout: 5000 });
    return (await region.innerText()).replace(/\s+/g, ' ').trim().slice(0, 160);
  });
}

console.log(`${'screen'.padEnd(24)} ${'verdict'.padEnd(8)} js-errors  detail`);
for (const r of results) console.log(`${r.name.padEnd(24)} ${r.verdict.padEnd(8)} ${String(r.errorsHere).padEnd(9)}  ${r.detail}`);
console.log('\n--- console errors/warnings, page errors, HTTP >= 400 ---');
console.log(logs.join('\n') || '(none)');
await browser.close();
