import { supabase } from "../lib/supabase";
import { Json } from "../lib/database.types";

export const bmCategories = { notes: "Official Notes", questions: "Official Questions", torah: "Other Learning Questions",
  resources: "Resources & Materials", teaching: "Teaching Ideas", program: "Chaburah & SCP", general: "General Chaburah Discussion" } as const;
export const bmAreas = {
  message: { label: "Message Board", categories: ["notes", "questions", "torah"] },
  resources: { label: "Resources & Materials", categories: ["resources"] },
  teaching: { label: "Teaching & Chaburah", categories: ["teaching", "program", "general"] }
} as const;
export type BmArea = keyof typeof bmAreas;
export function bmAreaForCategory(category: BmCategory): BmArea {
  return (Object.keys(bmAreas) as BmArea[]).find(area => (bmAreas[area].categories as readonly string[]).includes(category)) ?? "message";
}
export type BmMaterialType = "notes" | "qa" | "all";
export function bmMaterialType(category: string): BmMaterialType {
  return category === "notes" ? "notes" : category === "questions" ? "qa" : "all";
}
export const bmStatuses = { open: "Open", answered: "Answered", needs_clarification: "Needs Official Clarification", archived: "Archived" } as const;
export type BmCategory = keyof typeof bmCategories;
export type BmStatus = keyof typeof bmStatuses;
export interface BmChunk { id: string; code: string; title: string; section: string; section_title?: string; workbook_title?: string; program_id?: string; source_type?: "notes" | "qa" }
export function groupBmMaterial(chunks: BmChunk[]) {
  const groups = new Map<string, { key: string; section: string; title?: string; workbook?: string; program?: string; type: "notes" | "qa"; chunks: BmChunk[] }>();
  for (const chunk of chunks) {
    const type = chunk.source_type ?? "notes";
    const key = JSON.stringify([chunk.program_id, chunk.workbook_title, type, chunk.section]);
    if (!groups.has(key)) groups.set(key, { key, section: chunk.section, title: chunk.section_title, workbook: chunk.workbook_title, program: chunk.program_id, type, chunks: [] });
    groups.get(key)!.chunks.push(chunk);
  }
  return [...groups.values()];
}
export function groupBmWorkbooks(chunks: BmChunk[]) {
  const workbooks = new Map<string, { key: string; title: string; program?: string; sections: ReturnType<typeof groupBmMaterial> }>();
  for (const section of groupBmMaterial(chunks)) {
    const key = JSON.stringify([section.program, section.workbook ?? ""]);
    if (!workbooks.has(key)) workbooks.set(key, { key, title: section.workbook || "Official Material", program: section.program, sections: [] });
    workbooks.get(key)!.sections.push(section);
  }
  return [...workbooks.values()];
}
export interface BmThread {
  id: string; author_id: string; author_name: string; title: string; body?: string; excerpt?: string;
  category: BmCategory; status: BmStatus; program_id: string | null; language: "en" | "he" | "mixed";
  resource_url?: string | null; resource_label?: string | null;
  is_hidden: boolean; deleted_at: string | null; created_at: string; updated_at: string; last_activity_at: string;
  chunks?: BmChunk[]; reply_count?: number; following?: boolean; bookmarked?: boolean; unread?: boolean;
}
export interface BmReply { id: string; thread_id: string; author_id: string; author_name: string; body: string;
  parent_reply_id: string | null; parent_author_name: string | null; is_hidden: boolean; deleted_at: string | null;
  created_at: string; updated_at: string }
export interface BmResource { id: string; file_name: string; storage_path: string; mime_type: string; byte_size: number }
export interface BmDetail { thread: BmThread; chunks: BmChunk[]; resources?: BmResource[]; replies: BmReply[]; reply_total: number; following: boolean; bookmarked: boolean; moderator: boolean }
export interface BmReport { id: string; thread_id: string; reply_id: string | null; title: string; reason: string; created_at: string }

function fail(error: { code?: string; message: string } | null) {
  if (!error) return;
  throw new Error(error.code === "PGRST202" || error.code === "42P01"
    ? "Beis Midrash needs the latest database update. Please contact the Global Admin." : error.message);
}
export async function listBmThreads(filters: Record<string, Json | undefined>) {
  const { data, error } = await supabase.rpc("bm_list_threads", { filters }); fail(error);
  return data as unknown as { items: BmThread[]; total: number; moderator: boolean };
}
export async function getBmThread(id: string, offset = 0) {
  const { data, error } = await supabase.rpc("bm_get_thread", { target_thread_id: id, reply_offset: offset }); fail(error);
  return data as unknown as BmDetail;
}
export async function mutateBm(action: string, id: string | null = null, payload: Json = {}) {
  const { data, error } = await supabase.rpc("bm_mutate", { action, target_id: id, payload }); fail(error);
  return data as unknown as { id: string };
}
export async function listBmReports() {
  const { data, error } = await supabase.rpc("bm_list_reports"); fail(error);
  return data as unknown as BmReport[];
}
export async function findBmChunks(search: string, program: string | null, materialType: BmMaterialType = "notes") {
  const { data, error } = await supabase.rpc("bm_find_material", { search_text: search, target_program: program, material_type: materialType }); fail(error);
  return data as unknown as BmChunk[];
}
// Align mixed-language paragraphs by their first strong character, not by numbers/codes.
export function bmIsRtl(text: string) { return /^[^A-Za-z\u0590-\u05ff]*[\u0590-\u05ff]/.test(text); }
