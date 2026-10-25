import { supabase } from "../lib/supabase";
import { ContentChunk } from "./types";
import { readRichContent } from "./documentContent";

export type MaterialLanguage = "en" | "he";
export const materialLanguageName = (language?: string) => language === "he" ? "Hebrew" : "English";
export const materialTextStyle = (language?: string) => language === "he"
  ? { textAlign: "right" as const, writingDirection: "rtl" as const } : { textAlign: "left" as const, writingDirection: "ltr" as const };
export const hebrewSectionLabels: Record<string, string> = { A: "א", B: "ב", C: "ג", D: "ד", E: "ה", F: "ו", G: "ז" };

export interface ChunkTranslation {
  chunk_id: string; language: string; workbook_title: string; section_title: string; chunk_title: string;
  chunk_summary: string | null; content_markdown: string; content_document: unknown; source_file_name: string;
}

export function applyMaterialLanguage(chunks: ContentChunk[], translations: ChunkTranslation[], language: MaterialLanguage, strict = false): ContentChunk[] {
  if (language === "en") return chunks.map(chunk => ({ ...chunk, language: "en" }));
  const byId = new Map(translations.filter(t => t.language === "he").map(t => [t.chunk_id, t]));
  return chunks.flatMap(chunk => {
    if (chunk.sourceType === "source") return [{ ...chunk, language: "he" as const }];
    const translation = byId.get(chunk.id);
    const document = translation && readRichContent(translation.content_document);
    if (!translation || !document) {
      if (strict) throw new Error(`Hebrew text is unavailable for ${chunk.chunkCode}. English has not been substituted.`);
      return [];
    }
    return [{ ...chunk, language: "he" as const, workbookTitle: translation.workbook_title, sectionTitle: translation.section_title,
      chunkTitle: translation.chunk_title, chunkSummary: translation.chunk_summary ?? undefined,
      contentMarkdown: translation.content_markdown, contentDocument: document, sourceFileName: translation.source_file_name }];
  });
}

export async function loadMaterialLanguage(chunks: ContentChunk[], language: MaterialLanguage, strict = false): Promise<ContentChunk[]> {
  const ids = chunks.filter(c => c.sourceType !== "source").map(c => c.id);
  if (language === "en" || !ids.length) return applyMaterialLanguage(chunks, [], language, strict);
  const { data, error } = await supabase.from("content_chunk_translations").select("*").eq("language", "he").in("chunk_id", ids);
  if (error) throw new Error("Unable to load Hebrew material. Check that the language migration and approved Hebrew import have been applied.");
  return applyMaterialLanguage(chunks, data ?? [], language, strict);
}
