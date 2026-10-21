// Synthetic content/accounts only. All non-local network requests are intercepted.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { fixture, signIn, ensureServer } = require("./test_mobile_webkit.cjs");
const root = path.resolve(__dirname, "..");
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, "tmp/webkit-browsers");
const { webkit, devices } = require(path.join(root, "tmp/webkit-tests/node_modules/playwright"));
const output = path.join(root, "tmp/builder-mobile-results");
fs.mkdirSync(output, { recursive: true });
const originalSource = require("../src/data/challahImportPreview.json").chunks.find(c => c.sourceType === "sources");
const sourceImage = originalSource.blocks.find(b => b.kind === "image");
const chunk = (id, code, type, title, section = "A") => ({
  id, chunk_code: code, source_type: type, chunk_title: title, section_key: section,
  section_title: "Test Section", workbook_title: "Challah Part 1", program_id: "winter-5787", siman: "Challah",
  chunk_summary: "Preview test material", content_markdown: "Official test text.", is_selectable: true,
  sort_order: Number(code.match(/\d+$/)[0]), tags: [], difficulty: "standard"
});
const notes = [chunk("n1", "HC1-A1", "notes", "First Review Note"), chunk("n2", "HC1-A2", "notes", "Second Review Note"),
  chunk("n3", "HC1-B1", "notes", "Other Section Note", "B")];
notes[0].content_document = { version: 1, blocks: [{ kind: "paragraph", paragraph: 1,
  text: "Formatted official note [1].", spans: [{ text: "Formatted official note", bold: true }, { text: " [1]." }] }],
  footnotes: [{ id: 1, blocks: [{ kind: "paragraph", paragraph: 2, text: "Official footnote.", spans: [{ text: "Official footnote." }] }] }] };
const qa = chunk("q1", "HC1-Q1", "qa", "First Review Question");
qa.content_markdown = "Question: What is the review topic?\n\nAnswer: Challah.";
const source = chunk("s1", "HC1-S1", "source", "First Source");
source.content_document = { version: 1, blocks: [sourceImage], footnotes: [] };
const link = (parent, related) => ({ id: `${parent}-${related}`, parent_chunk_id: parent, related_chunk_id: related, relation_type: "suggested" });

async function main() {
  await ensureServer();
  const browser = await webkit.launch({ headless: true });
  let page;
  try {
    const context = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    await fixture(context, "local_rabbi", { content_chunks: [...notes, qa, source], content_chunk_links: [link("n1", "q1"), link("n1", "s1")] });
    page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await signIn(page);
    await page.getByRole("tab", { name: /Rabbi Hub/ }).click();
    await page.getByRole("tab", { name: "Shiur Builder", exact: true }).click();
    const official = page.getByTestId("builder-official-pane"), packet = page.getByTestId("builder-packet-pane");
    await official.getByRole("button", { name: "Expand Section A - Test Section", exact: true }).waitFor();
    assert.ok(await official.isVisible());
    assert.equal(await packet.isVisible(), false);
    await official.getByRole("button", { name: "Add Section ->", exact: true }).first().click();
    await page.getByRole("tab", { name: "My Packet", exact: true }).click();
    assert.ok(await packet.isVisible());
    assert.equal(await official.isVisible(), false);
    await packet.getByRole("button", { name: "Move item down", exact: true }).first().click();
    await packet.getByRole("button", { name: "View", exact: true }).first().click();
    await page.getByText("Second Review Note", { exact: true }).last().waitFor();
    assert.ok(await page.getByRole("button", { name: "Next", exact: true }).isEnabled());
    await page.getByRole("button", { name: "Remove from Packet", exact: true }).click();
    await page.getByText("Official footnote.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Next", exact: true }).isEnabled(), false);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("tab", { name: /Q&A/ }).click();
    await packet.getByText("Suggested Q&A", { exact: true }).waitFor();
    await packet.getByRole("button", { name: "Add All Suggested (1)", exact: true }).click();
    await page.getByRole("tab", { name: /Source Sheets/ }).click();
    await packet.getByRole("button", { name: "View", exact: true }).click();
    await page.waitForFunction(() => [...document.images].some(image => image.naturalWidth > 100));
    assert.ok(await page.evaluate(() => [...document.images].filter(image => image.naturalWidth > 100).every(image => {
      const box = image.getBoundingClientRect();
      return box.width > 0 && box.left >= 0 && box.right <= innerWidth;
    })), "Source-sheet images fit the phone preview");
    await page.getByRole("button", { name: "Add to Packet", exact: true }).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    assert.ok(await packet.getByRole("button", { name: "Save Draft", exact: true }).isEnabled());
    assert.ok(await packet.getByRole("button", { name: "Publish Source Sheets", exact: true }).isEnabled());
    // Switch to both other tools and back without losing the current packet.
    await page.getByRole("tab", { name: "Ask Rav Inbox", exact: true }).click();
    await page.getByRole("heading", { name: "Rabbi Hub", exact: true }).waitFor();
    assert.equal(await page.getByRole("tab", { name: "Ask Rav Inbox", exact: true }).getAttribute("aria-selected"), "true");
    await page.getByRole("tab", { name: "Quick Review Questions", exact: true }).click();
    assert.equal(await page.getByRole("tab", { name: "Quick Review Questions", exact: true }).getAttribute("aria-selected"), "true");
    await page.getByRole("tab", { name: "Shiur Builder", exact: true }).click();
    await packet.getByText("First Source", { exact: true }).waitFor();
    await page.getByRole("tab", { name: "Ask Rav Inbox", exact: true }).click();
    assert.equal(await page.getByRole("tab", { name: "Ask Rav Inbox", exact: true }).getAttribute("aria-selected"), "true", "Returning to Ask Rav works even after an earlier question-tool switch");
    await page.getByRole("tab", { name: "Shiur Builder", exact: true }).click();
    await packet.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, "portrait-packet.png"), scale: "css" });
    for (const [width, height] of [[844, 390], [667, 375], [1024, 768], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      await official.waitFor({ state: "visible" });
      await packet.waitFor({ state: "visible" });
      const a = await official.boundingBox(), b = await packet.boundingBox();
      assert.ok(b.x >= a.x + a.width, `Two columns at ${width}px: ${JSON.stringify({a,b})}`);
      assert.ok(Math.abs(a.y - b.y) < 2);
      assert.equal(await page.getByRole("tab", { name: "Official Material", exact: true }).count(), 0);
      if (height < 600) {
        await page.getByRole("button", { name: "Open navigation menu", exact: true }).waitFor();
        assert.equal(await page.locator('[aria-label="Main navigation"]').count(),0,"Landscape has no persistent sidebar");
        assert.equal(await page.getByRole("tab",{name:/Dashboard/}).count(),0,"Landscape has no bottom tabs");
        await page.getByRole("button",{name:"Open navigation menu",exact:true}).click();
        const menu=page.locator('[aria-label="Main navigation"]');
        for(const label of ["Dashboard","My Chaburah","Review","Files","Rabbi Hub","Admin","Settings"]){
          await menu.getByRole("button",{name:label,exact:true}).waitFor({state:"attached"});
        }
        assert.equal(await menu.getByRole("button",{name:"Rabbi Hub",exact:true}).getAttribute("aria-current"),"page");
        await page.getByRole("button",{name:"Close navigation menu",exact:true}).click();
      }
      await official.scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, `landscape-${width}.png`), scale: "css" });
    }
    await page.setViewportSize({ width: 320, height: 740 });
    await page.getByRole("tab", { name: "My Packet", exact: true }).waitFor();
    assert.ok(await packet.isVisible(), "Rotation preserves the active portrait pane and selections");
    await page.getByRole("tab", { name: /Review Notes/ }).click();
    await packet.getByText("First Review Note", { exact: true }).waitFor();
    await page.getByRole("tab", { name: "Official Material", exact: true }).click();
    await official.scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(output, "portrait-320.png"), scale: "css" });
    assert.deepEqual(errors, []);
    console.log(`PASS: portrait/landscape builder, category suggestions, selection persistence, reorder/remove, rich preview and sources. ${output}`);
  } catch (error) {
    await page?.screenshot({ path: path.join(output, "failure.png"), scale: "css" });
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
