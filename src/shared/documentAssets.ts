import { supabase } from "../lib/supabase";
import { OFFICIAL_ASSET_BUCKET, RichContentDocument } from "./documentContent";

const signedCache = new Map<string, { uri: string; expires: number }>();

export async function resolveDocumentAssets(documents: RichContentDocument[]): Promise<RichContentDocument[]> {
  const paths = [...new Set(documents.flatMap((doc) => [...doc.blocks, ...doc.footnotes.flatMap((note) => note.blocks)])
    .filter((block) => block.kind === "image" && block.storagePath).map((block) => block.storagePath!))];
  if (paths.some((path) => !/^sha256\/[a-f0-9]{64}\.(png|jpg|jpeg|webp)$/.test(path))) throw new Error("Invalid official image path.");
  const missing = paths.filter((path) => (signedCache.get(path)?.expires ?? 0) < Date.now());
  if (missing.length) {
    const { data, error } = await supabase.storage.from(OFFICIAL_ASSET_BUCKET).createSignedUrls(missing, 3600);
    if (error) throw error;
    for (const asset of data ?? []) {
      if (!asset.path || !asset.signedUrl || asset.error) throw new Error("Unable to load an official image.");
      signedCache.set(asset.path, { uri: asset.signedUrl, expires: Date.now() + 55 * 60 * 1000 });
    }
  }
  return documents.map((doc) => {
    const resolve = (block: (typeof doc.blocks)[number]) => {
      if (!block.storagePath) return block;
      const uri = signedCache.get(block.storagePath)?.uri;
      if (!uri) throw new Error("An official image is missing.");
      return { ...block, uri };
    };
    return { ...doc, blocks: doc.blocks.map(resolve),
      footnotes: doc.footnotes.map((note) => ({ ...note, blocks: note.blocks.map(resolve) })) };
  });
}
