import type { RichContentDocument } from "./documentContent";

type SourceImage = { uri: string; width: number; height: number };
const cache = new Map<string, Promise<SourceImage | null>>();

export function sourceInkBounds(pixels: Uint8ClampedArray, width: number, height: number, omitSplitPageLabel = false) {
  let scanHeight = height;
  if (omitSplitPageLabel) {
    // Split Challah pages add a duplicate, centered source label below a large blank gap.
    const rows: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (pixels[i + 3] && Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 245) { rows.push(y); break; }
      }
    }
    const last = rows[rows.length - 1];
    let start = rows.length - 1;
    while (start > 0 && rows[start] - rows[start - 1] <= 3) start--;
    const first = rows[start], previous = rows[start - 1];
    if (first > height * 0.94 && last - first < height * 0.04 && first - previous > height * 0.2) {
      let minX = width, maxX = -1;
      for (let y = first; y <= last; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (pixels[i + 3] && Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 245) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        }
      }
      if (minX > width * 0.35 && maxX < width * 0.65) scanHeight = first;
    }
  }
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < scanHeight; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (pixels[i + 3] > 0 && Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 245) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left) return null;
  const padding = Math.max(12, Math.round(width * 0.015));
  left = Math.max(0, left - padding); top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding); bottom = Math.min(height - 1, bottom + padding);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

export async function compactSourceImage(uri: string, omitSplitPageLabel = false): Promise<SourceImage | null> {
  if (typeof document === "undefined" || typeof window === "undefined" || typeof window.Image !== "function") return null;
  const key = `${omitSplitPageLabel}:${uri}`;
  if (cache.has(key)) return cache.get(key)!;
  const pending = new Promise<SourceImage | null>((resolve) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => resolve(null), 20000);
    const finish = (result: SourceImage | null) => { window.clearTimeout(timer); resolve(result); };
    image.onerror = () => finish(null);
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) { finish(null); return; }
        context.drawImage(image, 0, 0);
        const bounds = sourceInkBounds(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, omitSplitPageLabel);
        if (!bounds) { finish(null); return; }
        const cropped = document.createElement("canvas");
        cropped.width = bounds.width; cropped.height = bounds.height;
        const target = cropped.getContext("2d");
        if (!target) { finish(null); return; }
        target.fillStyle = "white";
        target.fillRect(0, 0, cropped.width, cropped.height);
        target.drawImage(canvas, bounds.left, bounds.top, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
        finish({ uri: cropped.toDataURL("image/png"), width: bounds.width, height: bounds.height });
      } catch {
        // Keep the original visible if cross-origin restrictions prevent reading its pixels.
        finish(null);
      }
    };
    image.src = uri;
  });
  cache.set(key, pending);
  if (cache.size > 80) cache.delete(cache.keys().next().value!);
  return pending;
}

export async function compactSourceDocument(doc: RichContentDocument): Promise<RichContentDocument> {
  return { ...doc, blocks: await Promise.all(doc.blocks.map(async (block) => {
    if (block.kind !== "image" || !block.uri) return block;
    const image = await compactSourceImage(block.uri, /^Official Hafrashas Challah source \d+, PDF page \d+$/.test(block.alt ?? ""));
    return image ? { ...block, ...image } : block;
  })) };
}
