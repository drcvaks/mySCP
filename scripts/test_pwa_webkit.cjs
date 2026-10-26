// Run against the production export with synthetic auth; no live accounts/data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve('tmp/pwa-export');
const output = path.resolve('tmp/pwa-tests');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve('tmp/webkit-browsers');
const { webkit, chromium, devices } = require(path.resolve('tmp/webkit-tests/node_modules/playwright'));
const types = { '.js': 'application/javascript', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ttf': 'font/ttf' };
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) { response.writeHead(403).end(); return; }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html');
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://localhost:${server.address().port}`;
  process.env.MYSCP_TEST_URL = base;
  const { fixture, signIn } = require('./test_mobile_webkit.cjs');
  const browser = await webkit.launch({ headless: true });
  let page, edge;
  const errors = [];
  try {
    const context = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
    await fixture(context, 'participant');
    page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await signIn(page);
    assert.equal(await page.locator('link[rel="manifest"]').getAttribute('href'), '/manifest.webmanifest');
    await page.getByTestId('pwa-install-banner').waitFor();
    await page.getByRole('button', { name: 'Install mySCP from banner', exact: true }).click();
    const instructions = page.getByLabel('Install mySCP instructions', { exact: true });
    await instructions.getByText(/Open mySCP in Safari/).waitFor();
    await page.waitForFunction(() => Array.from(document.images).some(image => image.src.includes('icon-192-v2.png') && image.complete && image.naturalWidth === 192));
    for (const [width, height] of [[390, 844], [320, 700], [844, 390], [1024, 768]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
      const box = await instructions.boundingBox();
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, `install-ios-${width}.png`), scale: 'css' });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Got It', exact: true }).click();
    await page.getByTestId('pwa-install-banner').waitFor({ state: 'hidden' });
    await page.reload();
    await page.getByRole('heading', { name: 'This Week in SCP', exact: true }).waitFor();
    assert.equal(await page.getByTestId('pwa-install-banner').count(), 0, 'Dismissal survives reload');
    await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
    await page.getByRole('button', { name: 'Install mySCP', exact: true }).click();
    await instructions.getByText(/Open mySCP in Safari/).waitFor();
    await page.getByRole('button', { name: 'Close installation instructions', exact: true }).click();
    await context.close();
    console.log('PASS: iPhone install instructions, mobile/tablet/landscape sizing, dismissal, persistent menu option.');

    const standalone = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
    await standalone.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
    await fixture(standalone, 'participant'); page = await standalone.newPage(); await signIn(page);
    assert.equal(await page.getByTestId('pwa-install-banner').count(), 0);
    await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Install mySCP', exact: true }).count(), 0);
    await standalone.close();

    edge = await chromium.launch({ channel: 'msedge', headless: true });
    const android = await edge.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
    await fixture(android, 'participant'); page = await android.newPage(); await signIn(page);
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = () => { window.__testPrompts = (window.__testPrompts || 0) + 1; return Promise.resolve(); };
      event.userChoice = Promise.resolve({ outcome: 'dismissed' });
      window.dispatchEvent(event);
    });
    await page.getByRole('button', { name: 'Install mySCP from banner', exact: true }).click();
    await page.waitForFunction(() => window.__testPrompts === 1);
    await page.getByTestId('pwa-install-banner').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
    await page.getByRole('button', { name: 'Install mySCP', exact: true }).click();
    await page.getByText('Open mySCP in Chrome on your Android device.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close installation instructions', exact: true }).click();
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Install mySCP', exact: true }).count(), 0);
    await android.close();
    console.log('PASS: standalone suppression, Android prompt, one-use prompt handling, manual fallback, appinstalled event.');

    const swContext = await edge.newContext({ serviceWorkers: 'allow' });
    // Only the auth page is opened; intercept all non-local requests.
    await fixture(swContext, 'participant');
    page = await swContext.newPage();
    await page.goto(base + '/auth');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const manifest = JSON.parse(await (await page.request.get(base + '/manifest.webmanifest')).text());
    assert.equal(manifest.display, 'standalone');
    const cache = await page.evaluate(async () => {
      const names = await caches.keys();
      return Promise.all(names.map(async name => ({ name, keys: (await (await caches.open(name)).keys()).map(r => new URL(r.url).pathname) })));
    });
    assert.deepEqual(cache, [{ name: 'myscp-connection-notice-v1', keys: ['/offline.html'] }]);
    await swContext.setOffline(true);
    await page.goto(base + '/dashboard');
    await page.getByText(/You are offline/).waitFor();
    await page.screenshot({ path: path.join(output, 'offline.png') });
    await swContext.setOffline(false);
    await page.getByRole('link', { name: 'Try Again', exact: true }).click();
    await page.getByPlaceholder('Email', { exact: true }).waitFor();
    console.log('PASS: production service worker registration, generic-only cache, offline notice, reconnect, and SPA deep links.');
    assert.equal(errors.length, 0, errors.join('\n'));
  } catch (error) {
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
  } finally {
    if (edge) await edge.close();
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
