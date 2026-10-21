import type { ContentChunk } from "./types";

export type PacketHeadingOptions = Partial<Record<"notes" | "qa", boolean>>;

export function includesChunkHeading(chunk: Pick<ContentChunk, "sourceType">, options?: PacketHeadingOptions): boolean {
  return (chunk.sourceType !== "notes" && chunk.sourceType !== "qa") || options?.[chunk.sourceType] !== false;
}
