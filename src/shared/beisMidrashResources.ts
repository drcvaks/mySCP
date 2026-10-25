import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Linking, Platform } from "react-native";
import { supabase } from "../lib/supabase";
import { BmResource } from "./beisMidrash";

const mimeByExtension: Record<string, string> = {
  pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp"
};
const bucket = "bm-resources";

export async function discardBmResource(resource: BmResource) {
  const { error } = await supabase.storage.from(bucket).remove([resource.storage_path]);
  if (error) throw error;
  const result = await supabase.rpc("bm_discard_resource", { resource_id: resource.id });
  if (result.error) throw result.error;
}

export async function pickBmResource(): Promise<BmResource | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: Object.values(mimeByExtension), copyToCacheDirectory: true, multiple: false });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  const name = asset.name.replace(/[\\/\x00-\x1f\x7f]/g, "_").slice(0, 180);
  const mime = mimeByExtension[name.split(".").pop()?.toLowerCase() ?? ""];
  if (!mime) throw new Error("Choose a PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG, or WebP file.");
  if (asset.size && asset.size > 10485760) throw new Error("Files must be 10 MB or smaller.");
  const bytes = Platform.OS === "web"
    ? await (asset.file ?? await (await fetch(asset.uri)).blob()).arrayBuffer()
    : await new File(asset.uri).arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 10485760) throw new Error("Choose a nonempty file of 10 MB or smaller.");
  const reserved = await supabase.rpc("bm_prepare_resource", { file_name: name, mime_type: mime, byte_size: bytes.byteLength });
  if (reserved.error) throw new Error(reserved.error.message);
  const resource = reserved.data as unknown as BmResource;
  try {
    const { error } = await supabase.storage.from(bucket).upload(resource.storage_path, bytes, { contentType: mime, upsert: false });
    if (error) throw error;
    return resource;
  } catch (error) {
    await discardBmResource(resource).catch(() => undefined);
    throw error;
  }
}

export async function openBmResource(resource: BmResource) {
  // Reserve the tab during the click, before the signed-URL request can lose user activation.
  const tab = Platform.OS === "web" ? window.open("about:blank", "_blank") : null;
  if (tab) tab.opener = null;
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(resource.storage_path, 60, { download: resource.file_name });
    if (error) throw error;
    if (tab) tab.location.replace(data.signedUrl);
    else if (Platform.OS === "web") throw new Error("Allow this download to open in your browser, then try again.");
    else await Linking.openURL(data.signedUrl);
  } catch (error) { tab?.close(); throw error; }
}
