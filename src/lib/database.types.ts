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
  ask_rav_enabled: boolean;
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

type ChaburahMemberDirectoryRow = {
  id: string;
  user_id: string;
  chaburah_id: string;
  member_role: Database["public"]["Enums"]["membership_role"];
  joined_at: string;
  full_name: string | null;
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
  coverage: Database["public"]["Enums"]["file_coverage"];
  week: number | null;
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
  source_question_id: string | null;
  topic: string;
  week: number;
  prompt: string;
  kind: Database["public"]["Enums"]["review_question_kind"];
  choices: Json;
  visibility: Database["public"]["Enums"]["content_visibility"];
  publication_status: Database["public"]["Enums"]["review_publication_status"];
  is_library_question: boolean;
  is_model_question: boolean;
  published_at: string | null;
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

type DiscussionMessageRow = {
  id: string;
  chaburah_id: string;
  author_id: string;
  parent_message_id: string | null;
  body: string;
  status: Database["public"]["Enums"]["discussion_message_status"];
  created_at: string;
  updated_at: string;
};

type DiscussionReadRow = {
  user_id: string;
  chaburah_id: string;
  last_read_at: string;
  updated_at: string;
};

type NotificationPreferenceRow = {
  user_id: string;
  review_questions_email: boolean;
  review_questions_in_app: boolean;
  discussion_posts_email: boolean;
  discussion_posts_in_app: boolean;
  ask_rav_questions_email: boolean;
  ask_rav_questions_in_app: boolean;
  rabbi_answers_email: boolean;
  rabbi_answers_in_app: boolean;
  uploads_email: boolean;
  uploads_in_app: boolean;
  created_at: string;
  updated_at: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  chaburah_id: string | null;
  type: Database["public"]["Enums"]["notification_type"];
  title: string;
  body: string;
  action_route: string | null;
  action_params: Json;
  read_at: string | null;
  created_at: string;
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
      discussion_messages: Table<
        DiscussionMessageRow,
        Pick<DiscussionMessageRow, "chaburah_id" | "author_id" | "body"> &
          Partial<Omit<DiscussionMessageRow, "chaburah_id" | "author_id" | "body">>
      >;
      discussion_reads: Table<
        DiscussionReadRow,
        Pick<DiscussionReadRow, "user_id" | "chaburah_id"> & Partial<Omit<DiscussionReadRow, "user_id" | "chaburah_id">>
      >;
      notification_preferences: Table<
        NotificationPreferenceRow,
        Pick<NotificationPreferenceRow, "user_id"> & Partial<Omit<NotificationPreferenceRow, "user_id">>
      >;
      notifications: Table<
        NotificationRow,
        Pick<NotificationRow, "user_id" | "type" | "title" | "body"> & Partial<Omit<NotificationRow, "user_id" | "type" | "title" | "body">>
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
      list_chaburah_member_directory: {
        Args: { target_chaburah_id: string };
        Returns: ChaburahMemberDirectoryRow[];
      };
      clone_review_question: {
        Args: { source_review_question_id: string; target_chaburah_id: string; target_week: number };
        Returns: ReviewQuestionRow;
      };
      publish_review_week: {
        Args: { target_chaburah_id: string; target_week: number };
        Returns: number;
      };
      update_discussion_message: {
        Args: { target_message_id: string; new_body: string };
        Returns: DiscussionMessageRow;
      };
      delete_discussion_message: {
        Args: { target_message_id: string };
        Returns: DiscussionMessageRow;
      };
      count_unread_discussion_messages: {
        Args: { target_chaburah_id: string };
        Returns: number;
      };
      mark_discussion_read: {
        Args: { target_chaburah_id: string };
        Returns: DiscussionReadRow;
      };
      notify_discussion_post: {
        Args: { target_message_id: string };
        Returns: number;
      };
      notify_rabbi_answer: {
        Args: { target_question_id: string };
        Returns: number;
      };
      notify_ask_rav_question: {
        Args: { target_question_id: string };
        Returns: number;
      };
      notify_learning_file: {
        Args: { target_file_id: string };
        Returns: number;
      };
      notify_review_questions_published: {
        Args: { target_chaburah_id: string; target_week: number };
        Returns: number;
      };
      notify_join_request: {
        Args: { target_membership_id: string };
        Returns: number;
      };
    };
    Enums: {
      app_role: "participant" | "local_rabbi" | "local_admin" | "global_admin";
      chaburah_status: "pending" | "active" | "inactive";
      membership_role: "participant" | "rabbi" | "admin";
      membership_status: "pending" | "active" | "suspended" | "left";
      content_visibility: "everyone" | "chaburah";
      file_coverage: "week" | "bechina_review" | "entire_zman";
      learning_file_type: "source_sheet" | "review_sheet" | "recording" | "video" | "pdf" | "other" | "link";
      review_publication_status: "draft" | "published" | "archived";
      review_question_kind: "multiple_choice" | "true_false";
      ask_rav_status: "submitted" | "answered" | "archived";
      discussion_message_status: "active" | "hidden" | "deleted";
      notification_type:
        | "review_questions"
        | "discussion_posts"
        | "ask_rav_questions"
        | "rabbi_answers"
        | "uploads"
        | "join_requests"
        | "system";
    };
    CompositeTypes: Record<string, never>;
  };
}
