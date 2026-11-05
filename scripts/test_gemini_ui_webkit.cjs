// Production UI smoke tests with local synthetic Supabase fixtures only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const cp = require('node:child_process');
const root = path.resolve('tmp/gemini-ui-export');
const output = path.resolve('tmp/gemini-ui-review');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve('tmp/webkit-browsers');
const { webkit, devices } = require(path.resolve('tmp/webkit-tests/node_modules/playwright'));
const types = { '.js': 'application/javascript', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ttf': 'font/ttf' };
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function main() {
  assert.ok(fs.existsSync(path.join(root, 'index.html')), 'Export the app before running this test');
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((request, response) => {
    let file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep) && file !== root) return response.writeHead(403).end();
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html');
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://localhost:${server.address().port}`;
  process.env.MYSCP_TEST_URL = base;
  const { fixture, signIn } = require('./test_mobile_webkit.cjs');
  const browser = await webkit.launch({ headless: true });
  let page;
  const failures = [], results = [];
  try {
    for (const role of process.env.MYSCP_UI_WORKFLOWS_ONLY === '1' ? [] : ['participant', 'local_rabbi', 'global_admin']) {
      const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      const now = new Date().toISOString();
      await fixture(context, role, {
        chaburos: [{ id: id(20), name: 'Preview Chaburah', slug: 'preview-chaburah', city: 'Test City', country: 'United States',
          rabbi_name: 'Preview Rav', schedule_text: 'Sunday 8:00 PM', status: 'active', member_count: 12,
          discussion_enabled: true, ask_rav_enabled: false, join_requires_approval: false, default_program_id: 'winter-5787' }],
        announcements: [{ id: id(201), title: 'Shiur Schedule', body: 'The shiur will take place at the regular time.', chaburah_id: id(20), visibility: 'chaburah', posted_by: id(10), created_at: now, is_pinned: true }],
        discussion_messages: [{ id: id(202), chaburah_id: id(20), author_id: id(10), body: 'Thank you for the clear review notes. This is a sample chaburah message.', status: 'active', created_at: now, updated_at: now }],
        learning_files: [{ id: id(203), title: 'Winter Challah Review Notes', topic: 'Challah', program_id: 'winter-5787', language: 'en', week: 1, coverage: 'week', chaburah_id: id(20), visibility: 'chaburah', uploaded_by: id(10), file_type: 'review_sheet', created_at: now }]
      });
      await context.route('**/rest/v1/rpc/bm_list_threads', route => route.request().method() === 'OPTIONS' ? route.fallback() : route.fulfill({
        status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
        body: JSON.stringify({ total: 1, moderator: role === 'global_admin', items: [{
          id: id(300), title: 'Understanding the Challah shiur', author_id: id(10), author_name: 'Preview Rav',
          excerpt: 'How do the measurements in the official notes apply to this case?', category: 'notes', status: 'open',
          program_id: 'winter-5787', language: 'en', is_hidden: false, deleted_at: null, created_at: now, updated_at: now,
          last_activity_at: now, reply_count: 3, unread: true, chunks: [{ id: id(301), code: 'HC1-A1', title: 'Introduction', section: 'A' }]
        }] })
      }));
      page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await signIn(page);
      await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Ask Rav', exact: true }).count(), 0, 'Disabled Ask Rav remains hidden');
      await page.getByRole('button', { name: 'Close navigation menu', exact: true }).click();
      const routes = ['dashboard', 'chaburah', 'files', 'review', 'directory', 'profile', 'settings', 'notifications', 'help'];
      if (role !== 'participant') routes.push('rabbi-hub', 'shiur-builder', 'beis-midrash', 'admin');
      if (role === 'global_admin') routes.push('global-admin');
      for (const route of routes) {
        await page.goto(base + '/' + route);
        await page.getByRole('heading').first().waitFor();
        for (const [width, height] of [[390, 844], [1440, 1000]]) {
          await page.setViewportSize({ width, height });
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const geometry = await page.evaluate(() => ({
            width: innerWidth, docWidth: document.documentElement.scrollWidth,
            outside: [...document.querySelectorAll('button,input,[role="tab"],a')].filter(el => {
              for (let parent = el.parentElement; parent; parent = parent.parentElement) {
                if (['auto', 'scroll'].includes(getComputedStyle(parent).overflowX) && parent.scrollWidth > parent.clientWidth + 2) return false;
              }
              const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.top >= 0 && b.top < innerHeight && (b.right > innerWidth + 2 || b.left < -2);
            }).map(el => el.getAttribute('aria-label') || el.textContent)
          }));
          if (geometry.docWidth > width + 1 || geometry.outside.length) failures.push({ role, route, width, geometry });
          results.push({ role, route, width });
          await page.screenshot({ path: path.join(output, `${role}-${route}-${width}.png`), scale: 'css' });
        }
      }
      assert.deepEqual(errors, [], `${role} runtime errors`);
      await context.close();
      console.log(`PASS: ${role} redesigned screens load without runtime errors.`);
    }
    if (results.length) fs.writeFileSync(path.join(output, 'screen-audit.json'), JSON.stringify({ results, failures }, null, 2));
    assert.deepEqual(failures, [], 'Responsive controls must remain on screen; see screen-audit.json');
    if (process.env.MYSCP_UI_EXTENDED_TESTS === '1') {
      for (const script of (process.env.MYSCP_UI_WORKFLOW_LIST || 'test_account_menu_webkit.cjs,test_hebrew_builder_webkit.cjs,test_beis_midrash_webkit.cjs').split(',')) {
        await new Promise((resolve, reject) => {
          const child = cp.spawn(process.execPath, [path.join('scripts', script)], { env: { ...process.env, MYSCP_TEST_URL: base }, windowsHide: true, stdio: 'inherit' });
          child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`)));
        });
      }
    }
    console.log(results.length ? `PASS: ${results.length} redesigned screen/viewport combinations.` : 'PASS: selected extended UI workflows.');
  } catch (error) {
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
