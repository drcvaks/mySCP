export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string;
  avatar_url: string | null;
  role: Database["public"]["Enums"]["app_role"];
  current_chaburah_id: string | null;
  created_at: string;
  updated_at: string;
};

type ChaburahRow = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string;
  state: string | null;
  country: string;
  rabbi_name: string | null;
  schedule_text: string | null;
  contact_email: string | null;
  zoom_url: string | null;
  description: string | null;
  status: Database["public"]["Enums"]["chaburah_status"];
  discussion_enabled: boolean;
  join_requires_approval: boolean;
  member_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ChaburahMemberRow = {
  id: string;
  user_id: string;
  chaburah_id: string;
  member_role: Database["public"]["Enums"]["membership_role"];
  status: Database["public"]["Enums"]["membership_status"];
  joined_at: string;
  updated_at: string;
};

type AnnouncementRow = {
  id: string;
  chaburah_id: string | null;
  title: string;
  body: string;
  visibility: Database["public"]["Enums"]["content_visibility"];
  is_pinned: boolean;
  posted_by: string;
  created_at: string;
  updated_at: string;
};

type LearningFileRow = {
  id: string;
  chaburah_id: string | null;
  title: string;
  description: string | null;
  topic: string;
  week: number;
  file_type: Database["public"]["Enums"]["learning_file_type"];
  visibility: Database["public"]["Enums"]["content_visibility"];
  storage_path: string | null;
  external_url: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
};

type ReviewQuestionRow = {
  id: string;
  chaburah_id: string | null;
  topic: string;
  week: number;
  prompt: string;
  kind: Database["public"]["Enums"]["review_question_kind"];
  choices: Json;
  visibility: Database["public"]["Enums"]["content_visibility"];
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type ReviewQuestionAnswerRow = {
  question_id: string;
  correct_choice_index: number;
  explanation: string;
  updated_at: string;
};

type ReviewSessionRow = {
  id: string;
  user_id: string;
  chaburah_id: string | null;
  week: number | null;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
};

type AskRavRow = {
  id: string;
  chaburah_id: string;
  asker_id: string;
  question: string;
  status: Database["public"]["Enums"]["ask_rav_status"];
  answer: string | null;
  answered_by: string | null;
  submitted_at: string;
  answered_at: string | null;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        Omit<ProfileRow, "created_at" | "updated_at" | "role"> & {
          role?: Database["public"]["Enums"]["app_role"];
          created_at?: string;
          updated_at?: string;
        },
        Partial<Pick<ProfileRow, "full_name" | "phone" | "city" | "state" | "country" | "avatar_url">>
      >;
      chaburos: Table<ChaburahRow>;
      chaburah_members: Table<ChaburahMemberRow>;
      announcements: Table<AnnouncementRow>;
      learning_files: Table<LearningFileRow>;
      review_questions: Table<ReviewQuestionRow>;
      review_question_answers: Table<ReviewQuestionAnswerRow>;
      review_sessions: Table<ReviewSessionRow>;
      ask_rav_questions: Table<
        AskRavRow,
        Pick<AskRavRow, "chaburah_id" | "asker_id" | "question"> &
          Partial<Omit<AskRavRow, "chaburah_id" | "asker_id" | "question">>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      join_chaburah: {
        Args: { target_chaburah_id: string };
        Returns: Database["public"]["Enums"]["membership_status"];
      };
      set_current_chaburah: {
        Args: { target_chaburah_id: string };
        Returns: undefined;
      };
      check_review_answer: {
        Args: { target_question_id: string; selected_choice_index: number };
        Returns: Array<{ is_correct: boolean; explanation: string }>;
      };
      complete_review_session: {
        Args: {
          target_week: number | null;
          target_chaburah_id: string | null;
          submitted_answers: Json;
        };
        Returns: ReviewSessionRow;
      };
      admin_set_user_role: {
        Args: { target_user_id: string; new_role: Database["public"]["Enums"]["app_role"] };
        Returns: undefined;
      };
      review_role_request: {
        Args: { target_request_id: string; approve: boolean; note: string | null };
        Returns: undefined;
      };
      review_membership_request: {
        Args: { target_membership_id: string; approve_request: boolean };
        Returns: ChaburahMemberRow;
      };
      assign_chaburah_leader: {
        Args: {
          target_chaburah_id: string;
          target_user_email: string;
          target_member_role: Database["public"]["Enums"]["membership_role"];
        };
        Returns: ChaburahMemberRow;
      };
      update_membership_status: {
        Args: {
          target_membership_id: string;
          new_status: Database["public"]["Enums"]["membership_status"];
        };
        Returns: ChaburahMemberRow;
      };
    };
    Enums: {
      app_role: "participant" | "local_rabbi" | "local_admin" | "global_admin";
      chaburah_status: "pending" | "active" | "inactive";
      membership_role: "participant" | "rabbi" | "admin";
      membership_status: "pending" | "active" | "suspended" | "left";
      content_visibility: "everyone" | "chaburah";
      learning_file_type: "source_sheet" | "review_sheet" | "recording" | "pdf" | "link";
      review_question_kind: "multiple_choice" | "true_false";
      ask_rav_status: "submitted" | "answered" | "archived";
    };
    CompositeTypes: Record<string, never>;
  };
}
