// Synthetic accounts only; all non-local network requests are intercepted.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { fixture, signIn, ensureServer, stopServer } = require("./test_mobile_webkit.cjs");
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve("tmp/webkit-browsers");
const { webkit, devices } = require(path.resolve("tmp/webkit-tests/node_modules/playwright"));
const output = path.resolve("tmp/account-menu-webkit");

async function main() {
  await ensureServer();
  const browser = await webkit.launch({ headless: true });
  fs.mkdirSync(output, { recursive: true });
  let page;
  try {
    const context = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    await fixture(context, "local_rabbi");
    let logoutRequests = 0, failLogout = false, dataRequests = 0;
    await context.route("**/auth/v1/logout**", async route => {
      if (route.request().method() === "OPTIONS") return route.fallback();
      logoutRequests++;
      await route.fulfill({ status: failLogout ? 400 : 204,
        headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
        body: failLogout ? JSON.stringify({ code: "unexpected_failure", msg: "Synthetic sign-out failure" }) : "" });
    });
    page = await context.newPage();
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    page.on("request", request => { if (request.url().includes("/rest/v1/")) dataRequests++; });
    await signIn(page);
    const trigger = page.getByRole("button", { name: "Open account menu", exact: true });
    const menu = page.getByLabel("Account menu", { exact: true });
    assert.equal(await trigger.innerText(), "WU");
    assert.equal(await page.getByRole("button", { name: "Refresh", exact: true }).count(), 0, "Standalone refresh is removed from the header");
    for (const [width, height] of [[390, 844], [320, 700], [844, 390], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      await trigger.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await trigger.click();
      await menu.getByText("webkit-test@example.invalid", { exact: true }).waitFor();
      const box = await menu.boundingBox();
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height,
        `Account menu fits ${width}x${height}: ${JSON.stringify(box)}`);
      for (const name of ["My Profile", "Refresh Data", "Sign Out"]) assert.ok(await menu.getByRole("button", { name, exact: true }).isVisible());
      await menu.evaluate(async element => {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        for (let parent = element; parent; parent = parent.parentElement) {
          await Promise.all(parent.getAnimations().map(animation => animation.finished.catch(() => {})));
        }
      });
      await page.screenshot({ path: path.join(output, `account-${width}.png`), scale: "css" });
      await page.keyboard.press("Escape");
      await menu.waitFor({ state: "hidden" });
    }
    await trigger.click();
    const before = dataRequests;
    await menu.getByRole("button", { name: "Refresh Data", exact: true }).click();
    await menu.waitFor({ state: "hidden" });
    assert.ok(dataRequests > before, "Refresh Data retains the existing refresh action");
    await trigger.click();
    await menu.getByRole("button", { name: "My Profile", exact: true }).click();
    await page.getByRole("heading", { name: "Profile", exact: true }).waitFor();
    await menu.waitFor({ state: "hidden" });
    await trigger.click();
    await page.getByRole("button", { name: "Dismiss account menu", exact: true }).click({ position: { x: 2, y: 2 } });
    await menu.waitFor({ state: "hidden" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Open navigation menu", exact: true }).click();
    const navigation = page.getByLabel("Main navigation", { exact: true });
    const logout = navigation.getByRole("button", { name: "Sign Out", exact: true });
    const footerBox = await logout.boundingBox();
    assert.ok(footerBox.y + footerBox.height <= 844 && footerBox.y > 700, "Sign Out is in the fixed drawer footer");
    const list = navigation.getByRole("button", { name: "Review", exact: true });
    await list.waitFor({ state: "attached" });
    await navigation.getByRole("button", { name: "Settings", exact: true }).scrollIntoViewIfNeeded();
    assert.equal((await logout.boundingBox()).y, footerBox.y, "Drawer scrolling does not move Sign Out");
    await page.screenshot({ path: path.join(output, "drawer-footer.png"), scale: "css" });
    await page.getByRole("button", { name: "Close navigation menu", exact: true }).click();
    await trigger.click();
    failLogout = true;
    const failedSignOut = page.waitForEvent("dialog");
    await menu.getByRole("button", { name: "Sign Out", exact: true }).click();
    const errorAlert = await failedSignOut;
    assert.match(errorAlert.message(), /Unable to sign out/);
    await errorAlert.accept();
    await page.waitForFunction(() => !!document.querySelector('[aria-label="Open account menu"]'));
    await menu.getByRole("button", { name: "Sign Out", exact: true }).waitFor({ state: "visible" });
    failLogout = false;
    await menu.getByRole("button", { name: "Sign Out", exact: true }).click();
    await page.getByRole("button", { name: "Sign In", exact: true }).waitFor();
    assert.equal(logoutRequests, 2);
    await signIn(page);
    await page.getByRole("tab", { name: /Rabbi Hub/ }).click();
    await page.getByPlaceholder("Write the review question exactly as participants should see it...").fill("Unsaved synthetic review question");
    await trigger.click();
    const confirmSignOut = page.waitForEvent("dialog");
    const clickSignOut = menu.getByRole("button", { name: "Sign Out", exact: true }).click();
    const confirmation = await confirmSignOut;
    assert.equal(confirmation.type(), "confirm");
    assert.match(confirmation.message(), /unsaved work/);
    await confirmation.dismiss();
    await clickSignOut;
    assert.equal(logoutRequests, 2, "Cancelling preserves the session and unsaved work");
    assert.ok(await menu.getByRole("button", { name: "Sign Out", exact: true }).isVisible());
    assert.equal(errors.length, 0, errors.join("\n"));
    await context.close();
    console.log("PASS: account menu, initials and identity, mobile/landscape/desktop bounds, keyboard/outside dismissal, profile navigation, refresh, fixed drawer footer, sign-out error handling, successful sign-out and unsaved-work cancellation.");
  } catch (error) {
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
    throw error;
  } finally { await browser.close(); stopServer(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
