import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });

async function checkMobileLive() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('http://127.0.0.1:3000/bloom-tracker?fixture=strong', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.bloom-map-marker').length >= 5, null, { timeout: 15000 });

  if (await page.locator('.bloom-map-tooltip').count() !== 0) throw new Error('mobile still renders permanent destination labels');
  if (await page.locator('.bloom-carto-map path[stroke-dasharray]').count() !== 0) throw new Error('mobile still renders dotted route/progression paths');
  if (await page.locator('.bloom-map-decision-controls').count() !== 1) throw new Error('live mobile decision controls missing');
  const text = await page.locator('body').innerText();
  if (text.includes('April through June')) throw new Error('spring-only product copy still visible');
  if (!text.includes('summer lavender and sunflower fields into September')) throw new Error('extended season value is not visible');
  if (errors.length) throw new Error(`mobile console errors: ${errors.join(' | ')}`);

  await page.screenshot({ path: '/tmp/bloom-persona-mobile.png', fullPage: true });
  await page.close();
}

async function checkDesktopLive() {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.goto('http://127.0.0.1:3000/bloom-tracker?fixture=strong', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.bloom-map-marker').length >= 5, null, { timeout: 15000 });

  if (await page.locator('.bloom-map-tooltip').count() < 5) throw new Error('desktop lost useful permanent destination labels');
  if (await page.locator('.bloom-carto-map path[stroke-dasharray]').count() !== 0) throw new Error('desktop still renders dotted route/progression paths');
  await page.screenshot({ path: '/tmp/bloom-persona-desktop.png', fullPage: true });
  await page.close();
}

async function checkSeasonalMode() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.goto('http://127.0.0.1:3000/bloom-tracker', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.bloom-map-marker').length >= 5, null, { timeout: 15000 });

  if (await page.locator('.bloom-map-decision-controls').count() !== 0) throw new Error('off-season still exposes non-causal live/origin controls');
  if (await page.locator('.bloom-carto-map path[stroke-dasharray]').count() !== 0) throw new Error('off-season still renders dotted location connectors');
  const legend = await page.locator('.bloom-map-v2-legend').innerText();
  if (!legend.includes('April') || !legend.includes('September')) throw new Error(`season legend does not span April to September: ${legend}`);
  await page.screenshot({ path: '/tmp/bloom-persona-seasonal.png', fullPage: true });
  await page.close();
}

await checkMobileLive();
await checkDesktopLive();
await checkSeasonalMode();
await browser.close();
console.log('Bloom persona browser verification passed.');
