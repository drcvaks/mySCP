const pending = new Set<string>();
const seen = new Set<string>();
const key = (userId: string) => `myscp-install-invitation:${userId}`;

export function markRegisteredForInstall(userId: string) {
  try { if (localStorage.getItem(key(userId)) === "seen") return; } catch { /* Session fallback below. */ }
  if (seen.has(userId)) return;
  pending.add(userId);
  try { localStorage.setItem(key(userId), "pending"); } catch { /* Keep the invitation in memory for this session. */ }
  window.dispatchEvent(new Event("myscp-registration-ready"));
}

// Claim before opening so rerenders, navigation, and additional tabs do not repeat it.
export function claimInstallInvitation(userId: string) {
  if (seen.has(userId)) return false;
  let stored: string | null = null;
  try { stored = localStorage.getItem(key(userId)); } catch { /* Session fallback. */ }
  if (stored === "seen" || (!pending.has(userId) && stored !== "pending")) return false;
  pending.delete(userId);
  seen.add(userId);
  try { localStorage.setItem(key(userId), "seen"); } catch { /* Memory still prevents repeats this session. */ }
  return true;
}
