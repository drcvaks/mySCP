import { FileCoverage, FileType, UserRole, Visibility } from "./types";

export function roleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    participant: "Participant",
    local_rabbi: "Local Rabbi",
    local_admin: "Local Admin",
    global_admin: "Global Admin"
  };
  return labels[role];
}

export function fileTypeLabel(type: FileType) {
  const labels: Record<FileType, string> = {
    source_sheet: "Source Sheet",
    review_sheet: "Review Sheet",
    recording: "Recording",
    video: "Video",
    pdf: "PDF",
    other: "Other",
    link: "Link",
    custom_review_packet: "Review Packet"
  };
  return labels[type];
}

export function learningFileTypeLabel(file: { fileType: FileType; title?: string }) {
  if (file.fileType !== "custom_review_packet") return fileTypeLabel(file.fileType);
  const title = file.title?.toLowerCase() ?? "";
  if (title.includes("source sheet")) return "Source Sheets";
  if (title.includes("q&a") || title.includes("q & a")) return "Q&A";
  if (title.includes("review note")) return "Review Notes";
  return "Review Packet";
}

export function visibilityLabel(visibility: Visibility) {
  return visibility === "everyone" ? "Everyone" : "My Chaburah";
}

export function fileCoverageLabel(coverage: FileCoverage) {
  const labels: Record<FileCoverage, string> = {
    week: "Weekly",
    bechina_review: "Bechina Review",
    entire_zman: "Entire Zman"
  };
  return labels[coverage];
}

export function fileCoverageDetailLabel(coverage: FileCoverage, week: number | null) {
  return coverage === "week" && week !== null ? `Week ${week}` : fileCoverageLabel(coverage);
}
