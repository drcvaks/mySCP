// Synthetic accounts and responses only; every non-local request is intercepted.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { fixture, signIn, ensureServer } = require("./test_mobile_webkit.cjs");
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve("tmp/webkit-browsers");
const { webkit, devices } = require(path.resolve("tmp/webkit-tests/node_modules/playwright"));
const output = path.resolve("tmp/review-results-webkit");
const cid = "00000000-0000-4000-8000-000000000020";
const rows = [
  { user_id: "a", display_name: "Aaron Review", score_rank: 1, correct_answers: 2, answered_questions: 3, available_questions: 6, weeks_attempted: 2 },
  { user_id: "b", display_name: "Ben Review", score_rank: 2, correct_answers: 1, answered_questions: 2, available_questions: 6, weeks_attempted: 1 },
  { user_id: "c", display_name: "No Answers Yet", score_rank: null, correct_answers: 0, answered_questions: 0, available_questions: 6, weeks_attempted: 0 }
];
async function main() {
  await ensureServer();
  const browser = await webkit.launch({ headless: true });
  fs.mkdirSync(output, { recursive: true });
  let page;
  try {
    const context = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    await fixture(context, "global_admin");
    const calls = [];
    let fail = false;
    await context.route("**/rest/v1/rpc/get_chaburah_review_results", async route => {
      if (route.request().method() === "OPTIONS") return route.fallback();
      const args = route.request().postDataJSON(); calls.push(args);
      const data = args.target_program_id === "summer-5787" ? [] : args.target_week === 2 ? [rows[0]] : rows;
      await route.fulfill({ status: fail ? 404 : 200,
        headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
        body: JSON.stringify(fail ? { code: "PGRST202", message: "Function missing" } : data) });
    });
    page = await context.newPage();
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    await signIn(page);
    await page.getByRole("tab", { name: /Rabbi Hub/ }).click();
    const table = page.getByTestId("chaburah-review-results");
    await table.getByText("Aaron Review", { exact: true }).waitFor();
    assert.ok(await table.getByText("66.7%", { exact: true }).isVisible());
    assert.ok(await table.getByText("Participation: 3/6 (50%)", { exact: true }).isVisible());
    assert.ok(await table.getByText("No Answers Yet", { exact: true }).isVisible());
    assert.ok(calls.every(args => args.target_chaburah_id === cid && args.target_program_id === "winter-5787"));
    assert.equal(calls.at(-1).target_week, null);
    await table.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, "portrait.png"), scale: "css" });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await table.getByPlaceholder("Search participants").fill("Ben");
    await table.getByText("Ben Review", { exact: true }).waitFor();
    assert.equal(await table.getByText("Aaron Review", { exact: true }).count(), 0);
    assert.ok(await table.getByText("2", { exact: true }).isVisible(), "Search retains the server's original rank");
    await table.getByPlaceholder("Search participants").fill("Nobody matches");
    await table.getByText("No matching participants.", { exact: true }).waitFor();
    await table.getByPlaceholder("Search participants").fill("");
    await table.getByRole("button", { name: "Week 2", exact: true }).click();
    await table.getByText("Aaron Review", { exact: true }).waitFor();
    assert.equal(calls.at(-1).target_week, 2);
    assert.equal(await table.getByText("Ben Review", { exact: true }).count(), 0);
    await table.getByRole("button", { name: "All Weeks", exact: true }).click();
    await table.getByText("Ben Review", { exact: true }).waitFor();
    const previous = calls.length;
    await table.getByRole("button", { name: "Refresh review results", exact: true }).click();
    await table.getByText("Ben Review", { exact: true }).waitFor();
    assert.ok(calls.length > previous);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await table.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, "desktop.png"), scale: "css" });
    await page.getByRole("button", { name: "Summer 5787", exact: true }).click();
    await table.getByText("No active members found.", { exact: true }).waitFor();
    assert.equal(calls.at(-1).target_program_id, "summer-5787");
    assert.equal(await table.getByText("Aaron Review", { exact: true }).count(), 0, "Old zeman results disappear");
    fail = true;
    await table.getByRole("button", { name: "Refresh review results", exact: true }).click();
    await table.getByText(/Review results need the latest database update/).waitFor();
    assert.equal(errors.length, 0, errors.join("\n"));
    await context.close();
    const participant = await browser.newContext({ ...devices["iPhone 13"], serviceWorkers: "block" });
    await fixture(participant, "participant");
    page = await participant.newPage();
    await signIn(page);
    await page.goto("http://localhost:8081/rabbi-hub");
    await page.getByRole("heading", { name: "This Week in SCP", exact: true }).waitFor();
    assert.equal(await page.getByTestId("chaburah-review-results").count(), 0);
    await participant.close();
    console.log("PASS: Rabbi results table, scores and participation, no-answer members, search, week filtering, refresh, mobile/desktop layout, program switching, missing migration message and participant guard.");
  } catch (error) {
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
