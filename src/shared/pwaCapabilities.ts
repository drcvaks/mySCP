export function isHomeScreenApp(browser: { standalone?: boolean }, match: (query: string) => { matches: boolean }) {
  return browser.standalone === true || match("(display-mode: standalone)").matches || match("(display-mode: fullscreen)").matches;
}

export function installDevice(browser: { userAgent: string; platform: string; maxTouchPoints: number }) {
  if (/iPad|iPhone|iPod/.test(browser.userAgent) || (browser.platform === "MacIntel" && browser.maxTouchPoints > 1)) return "ios";
  return /Android/i.test(browser.userAgent) ? "android" : "desktop";
}

export const installDismissKey = "myscp-install-dismissed-until";
export const installDismissDays = 7;
