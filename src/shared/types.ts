export type UserRole = "participant" | "local_rabbi" | "local_admin" | "global_admin";
export type FileType = "source_sheet" | "review_sheet" | "recording" | "pdf" | "link";
export type Visibility = "everyone" | "chaburah";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  country: string;
  city: string;
  role: UserRole;
  roleRequest?: Exclude<UserRole, "global_admin">;
  roleRequestStatus?: "none" | "pending" | "approved" | "rejected";
  chaburahId?: string;
}

export interface Chaburah {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  rabbiName: string;
  schedule: string;
  memberCount: number;
  discussionEnabled: boolean;
  joinRequiresApproval: boolean;
  zoomLink?: string;
  description?: string;
}

export interface Announcement {
  id: string;
  chaburahId?: string;
  title: string;
  body: string;
  postedBy: string;
  postedAt: string;
  isGlobal: boolean;
  isPinned?: boolean;
}

export interface LearningFile {
  id: string;
  title: string;
  week: number;
  topic: string;
  visibility: Visibility;
  chaburahId?: string;
  uploadedBy: string;
  fileType: FileType;
  url?: string;
  storagePath?: string;
  description?: string;
}

export interface ReviewQuestion {
  id: string;
  chaburahId?: string;
  week: number;
  topic: string;
  prompt: string;
  kind: "multiple_choice" | "true_false";
  choices: string[];
  visibility: Visibility;
  correctChoiceIndex?: number;
  explanation?: string;
  enabled: boolean;
}

export interface AskRavQuestion {
  id: string;
  chaburahId: string;
  askerId: string;
  question: string;
  status: "submitted" | "answered";
  submittedAt: string;
  answer?: string;
  answeredAt?: string;
}

export interface ReviewSession {
  id: string;
  week: number | "all";
  totalQuestions: number;
  correctAnswers: number;
  completedAt: string;
}
