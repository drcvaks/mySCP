const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/shared/pwaCapabilities.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, { exports: exportsObject });
const { installDevice, isHomeScreenApp } = exportsObject;
assert.equal(installDevice({ userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 }), 'ios');
assert.equal(installDevice({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 }), 'ios');
assert.equal(installDevice({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 0 }), 'desktop');
assert.equal(installDevice({ userAgent: 'Android Chrome', platform: 'Linux', maxTouchPoints: 5 }), 'android');
assert.equal(isHomeScreenApp({ standalone: true }, () => ({ matches: false })), true);
assert.equal(isHomeScreenApp({}, query => ({ matches: query.includes('standalone') })), true);
assert.equal(isHomeScreenApp({}, () => ({ matches: false })), false);
const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, '/dashboard');
assert.equal(manifest.scope, '/');
assert.ok(!manifest.orientation, 'Do not force portrait; landscape Shiur Builder stays available.');
for (const icon of manifest.icons) {
  const png = fs.readFileSync('public' + icon.src);
  assert.equal(png.readUInt32BE(16), Number(icon.sizes.split('x')[0]));
  assert.equal(png.readUInt32BE(20), Number(icon.sizes.split('x')[1]));
}
const bootstrapEvents = {}, browser = { addEventListener: (name, fn) => bootstrapEvents[name] = fn, dispatchEvent() {} };
vm.runInNewContext(fs.readFileSync('public/pwa-bootstrap.js', 'utf8'), { window: browser, Event: class {} });
const prompt = { preventDefault() { this.prevented = true; } };
bootstrapEvents.beforeinstallprompt(prompt);
assert.equal(browser.__mySCPInstallPrompt, prompt);
assert.ok(prompt.prevented);
bootstrapEvents.appinstalled();
assert.equal(browser.__mySCPInstalled, true);
assert.equal(browser.__mySCPInstallPrompt, undefined);
const handlers = {}, cached = [];
vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), {
  self: { location: { origin: 'https://example.invalid' }, addEventListener: (name, fn) => handlers[name] = fn },
  URL, Request, Response, fetch: async () => { throw new Error('offline'); },
  caches: { match: async key => { cached.push(key); return new Response('Offline notice'); } }
});
for (const request of [
  { url: 'https://supabase.invalid/rest/v1/profiles', method: 'GET', mode: 'cors' },
  { url: 'https://example.invalid/private.pdf', method: 'GET', mode: 'cors' },
  { url: 'https://example.invalid/auth', method: 'POST', mode: 'navigate' }
]) handlers.fetch({ request, respondWith: () => assert.fail('Private data/assets must not be handled or cached') });
let response;
handlers.fetch({ request: { url: 'https://example.invalid/dashboard', method: 'GET', mode: 'navigate' }, respondWith: p => response = p });
Promise.resolve(response).then(async value => {
  assert.equal(await value.text(), 'Offline notice');
  assert.deepEqual(cached, ['/offline.html']);
  console.log('PASS: device/standalone detection, early install events, manifest/icons, landscape support, and network-only private data.');
}).catch(error => { console.error(error); process.exitCode = 1; });
