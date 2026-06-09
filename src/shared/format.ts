import { FileType, UserRole, Visibility } from "./types";

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
    pdf: "PDF",
    link: "Link"
  };
  return labels[type];
}

export function visibilityLabel(visibility: Visibility) {
  return visibility === "everyone" ? "Everyone" : "My Chaburah";
}
