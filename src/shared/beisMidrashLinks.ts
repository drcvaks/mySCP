import { Linking, Platform } from "react-native";

export function normalizeBmResourceUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const invalid = () => new Error("Enter a valid http:// or https:// web address without a username or password.");
  if (trimmed.length > 2048 || !/^https?:\/\//i.test(trimmed) || /[\s\\\x00-\x1f\x7f]/.test(trimmed)) throw invalid();
  let url: URL;
  try { url = new URL(trimmed); } catch { throw invalid(); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password ||
    !/^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\[[0-9a-f:.]+\])$/i.test(url.hostname) || url.href.length > 2048) throw invalid();
  return url.href;
}

export function bmResourceLinkError(url: string, label: string): string {
  try {
    if (!normalizeBmResourceUrl(url) && label.trim()) return "Enter a resource link or clear its display name.";
    return "";
  } catch (error) { return error instanceof Error ? error.message : "Invalid resource link."; }
}

export async function openBmResourceLink(value: string) {
  const url = normalizeBmResourceUrl(value);
  if (!url) throw new Error("This resource does not have a web address.");
  if (Platform.OS === "web") {
    // Open directly during the click, without sharing the opener or private page URL.
    window.open(url, "_blank", "noopener,noreferrer");
  } else await Linking.openURL(url);
}
