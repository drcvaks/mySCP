// Generated HTML comes from test_rich_content.cjs; no live APIs are used.
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..");
const { chromium } = require(path.join(root, "tmp/webkit-tests/node_modules/playwright"));
const output = path.join(root, "tmp/print-logo-preview");

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    for (const category of ["notes", "qa", "sources"]) {
      const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
      await page.goto(pathToFileURL(path.join(output, `${category}.html`)).href);
      await page.emulateMedia({ media: "print" });
      await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
      const logo=page.locator("header .packet-logo");
      const box=await logo.boundingBox(), heading=await page.locator(".packet-heading").boundingBox();
      assert.ok(box.x>=heading.x+heading.width,`${category}: logo is to the right, not over the title`);
      assert.ok(Math.abs(box.y-heading.y)<1);
      assert.equal(box.width,96);
      assert.equal(await logo.getAttribute("alt"),"SCP logo");
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(output,`${category}-print.png`),fullPage:true});
      await page.close();
    }
    console.log("PASS: Edge print-media layouts for Notes, Q&A, Source Sheets; logo loaded at top-right without title overlap.");
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
