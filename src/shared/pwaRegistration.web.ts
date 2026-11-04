const memoryState = new Map<string, "pending" | "claimed">();

function storageKey(userId: string) {
  return `myscp-install-registration:${userId}`;
}

function readState(userId: string): "pending" | "claimed" | null {
  try {
    const stored = localStorage.getItem(storageKey(userId));
    if (stored === "pending" || stored === "claimed") return stored;
  } catch {
    // Private browsing or blocked storage falls back to session memory.
  }
  return memoryState.get(userId) ?? null;
}

function writeState(userId: string, state: "pending" | "claimed") {
  memoryState.set(userId, state);
  try {
    localStorage.setItem(storageKey(userId), state);
  } catch {
    // Keep in-memory state when localStorage is unavailable.
  }
}

export function markRegisteredForInstall(userId: string) {
  if (!userId) return;
  if (readState(userId) === "claimed") return;
  writeState(userId, "pending");
  if (typeof window !== "undefined" && typeof Event !== "undefined") {
    window.dispatchEvent(new Event("myscp-registration-ready"));
  }
}

export function claimInstallInvitation(userId: string): boolean {
  if (!userId) return false;
  if (readState(userId) !== "pending") return false;
  writeState(userId, "claimed");
  return true;
}
