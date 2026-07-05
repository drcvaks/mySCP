import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { formatSupabaseError } from "../lib/errors";
import { supabase } from "../lib/supabase";
import {
  Announcement,
  ChaburahMembership,
  ChaburahMemberDirectoryItem,
  AskRavQuestion,
  Chaburah,
  DiscussionMessage,
  LearningFile,
  ReviewQuestion,
  ReviewSession
} from "../shared/types";
import { useAuthState } from "./AuthState";

interface ReviewFeedback {
  isCorrect: boolean;
  explanation: string;
}

interface ReviewAnswer {
  questionId: string;
  choiceIndex: number;
}

interface AppStateValue {
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  selectedChaburahId?: string;
  chaburos: Chaburah[];
  memberships: ChaburahMembership[];
  chaburahMemberDirectory: ChaburahMemberDirectoryItem[];
  announcements: Announcement[];
  learningFiles: LearningFile[];
  reviewQuestions: ReviewQuestion[];
  reviewSessions: ReviewSession[];
  askRavQuestions: AskRavQuestion[];
  discussionMessages: DiscussionMessage[];
  refresh: () => Promise<void>;
  joinChaburah: (chaburahId: string) => Promise<string | null>;
  reviewMembershipRequest: (membershipId: string, approve: boolean) => Promise<string | null>;
  updateMembershipStatus: (
    membershipId: string,
    status: ChaburahMembership["status"]
  ) => Promise<string | null>;
  checkReviewAnswer: (questionId: string, choiceIndex: number) => Promise<ReviewFeedback>;
  saveReviewSession: (week: number | "all", answers: ReviewAnswer[]) => Promise<string | null>;
  submitAskRavQuestion: (question: string) => Promise<string | null>;
  submitDiscussionMessage: (body: string) => Promise<string | null>;
  hideDiscussionMessage: (messageId: string) => Promise<string | null>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { session, profile, refreshProfile } = useAuthState();
  const [chaburos, setChaburos] = useState<Chaburah[]>([]);
  const [memberships, setMemberships] = useState<ChaburahMembership[]>([]);
  const [chaburahMemberDirectory, setChaburahMemberDirectory] = useState<ChaburahMemberDirectoryItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [learningFiles, setLearningFiles] = useState<LearningFile[]>([]);
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [reviewSessions, setReviewSessions] = useState<ReviewSession[]>([]);
  const [askRavQuestions, setAskRavQuestions] = useState<AskRavQuestion[]>([]);
  const [discussionMessages, setDiscussionMessages] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setChaburos([]);
      setMemberships([]);
      setChaburahMemberDirectory([]);
      setAnnouncements([]);
      setLearningFiles([]);
      setReviewQuestions([]);
      setReviewSessions([]);
      setAskRavQuestions([]);
      setDiscussionMessages([]);
      setHydrated(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        chaburosResult,
        membershipsResult,
        profilesResult,
        announcementsResult,
        filesResult,
        questionsResult,
        sessionsResult,
        askRavResult,
        discussionResult,
        memberDirectoryResult
      ] = await Promise.all([
        supabase.from("chaburos").select("*").order("name"),
        supabase.from("chaburah_members").select("*").order("updated_at", { ascending: false }),
        supabase.from("profiles").select("id,email,full_name"),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }),
        supabase.from("learning_files").select("*").order("created_at", { ascending: false }),
        supabase.from("review_questions").select("*").order("week").order("created_at"),
        supabase.from("review_sessions").select("*").order("completed_at", { ascending: false }).limit(25),
        supabase.from("ask_rav_questions").select("*").order("submitted_at", { ascending: false }),
        supabase.from("discussion_messages").select("*").order("created_at", { ascending: false }).limit(100),
        profile?.chaburahId
          ? supabase.rpc("list_chaburah_member_directory", {
              target_chaburah_id: profile.chaburahId
            })
          : Promise.resolve({ data: [], error: null })
      ]);

      const firstError = [
        chaburosResult.error,
        membershipsResult.error,
        profilesResult.error,
        announcementsResult.error,
        filesResult.error,
        questionsResult.error,
        sessionsResult.error,
        askRavResult.error,
        discussionResult.error,
        memberDirectoryResult.error
      ].find(Boolean);

      if (firstError) {
        setError(formatSupabaseError(firstError));
        return;
      }

      setChaburos(
        (chaburosResult.data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          status: row.status,
          address: row.address ?? "",
          city: row.city,
          country: row.country,
          rabbiName: row.rabbi_name ?? "Rabbi not assigned",
          schedule: row.schedule_text ?? "Schedule not set",
          contactEmail: row.contact_email ?? undefined,
          memberCount: row.member_count,
          discussionEnabled: row.discussion_enabled,
          joinRequiresApproval: row.join_requires_approval,
          askRavEnabled: row.ask_rav_enabled ?? true,
          zoomLink: row.zoom_url ?? undefined,
          description: row.description ?? undefined
        }))
      );

      const profileById = new Map(
        (profilesResult.data ?? []).map((profileRow) => [
          profileRow.id,
          { email: profileRow.email, fullName: profileRow.full_name }
        ])
      );

      setMemberships(
        (membershipsResult.data ?? []).map((row) => {
          const memberProfile = profileById.get(row.user_id);
          return {
            id: row.id,
            userId: row.user_id,
            chaburahId: row.chaburah_id,
            memberRole: row.member_role,
            status: row.status,
            joinedAt: row.joined_at,
            fullName: memberProfile?.fullName,
            email: memberProfile?.email
          };
        })
      );

      const memberDirectory = (memberDirectoryResult.data ?? []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          chaburahId: row.chaburah_id,
          memberRole: row.member_role,
          joinedAt: row.joined_at,
          fullName: row.full_name ?? undefined
        }));

      setChaburahMemberDirectory(memberDirectory);

      const displayNameById = new Map<string, string>();
      profileById.forEach((value, key) => {
        if (value.fullName || value.email) displayNameById.set(key, value.fullName ?? value.email);
      });
      memberDirectory.forEach((member) => {
        if (member.fullName) displayNameById.set(member.userId, member.fullName);
      });

      setDiscussionMessages(
        (discussionResult.data ?? [])
          .map((row) => ({
            id: row.id,
            chaburahId: row.chaburah_id,
            authorId: row.author_id,
            authorName: displayNameById.get(row.author_id),
            parentMessageId: row.parent_message_id ?? undefined,
            body: row.body,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }))
          .reverse()
      );

      setAnnouncements(
        (announcementsResult.data ?? []).map((row) => ({
          id: row.id,
          chaburahId: row.chaburah_id ?? undefined,
          title: row.title,
          body: row.body,
          postedBy: row.posted_by,
          postedAt: row.created_at,
          isGlobal: row.visibility === "everyone",
          isPinned: row.is_pinned
        }))
      );

      setLearningFiles(
        (filesResult.data ?? []).map((row) => {
          const uploaderProfile = profileById.get(row.uploaded_by);
          return {
            id: row.id,
            chaburahId: row.chaburah_id ?? undefined,
            title: row.title,
            coverage: row.coverage ?? (row.week === null ? "entire_zman" : "week"),
            week: row.week,
            topic: row.topic,
            visibility: row.visibility,
            uploadedBy: row.uploaded_by,
            uploadedByName: uploaderProfile?.fullName ?? uploaderProfile?.email,
            fileType: row.file_type,
            url: row.external_url ?? undefined,
            storagePath: row.storage_path ?? undefined,
            description: row.description ?? undefined
          };
        })
      );

      setReviewQuestions(
        (questionsResult.data ?? []).map((row) => ({
          id: row.id,
          chaburahId: row.chaburah_id ?? undefined,
          sourceQuestionId: row.source_question_id ?? undefined,
          week: row.week,
          topic: row.topic,
          prompt: row.prompt,
          kind: row.kind,
          choices: Array.isArray(row.choices)
            ? row.choices.filter((choice): choice is string => typeof choice === "string")
            : [],
          visibility: row.visibility,
          publicationStatus: row.publication_status ?? "published",
          isLibraryQuestion: row.is_library_question ?? false,
          enabled: row.enabled
        }))
      );

      setReviewSessions(
        (sessionsResult.data ?? []).map((row) => ({
          id: row.id,
          week: row.week ?? "all",
          totalQuestions: row.total_questions,
          correctAnswers: row.correct_answers,
          completedAt: row.completed_at
        }))
      );

      setAskRavQuestions(
        (askRavResult.data ?? []).map((row) => {
          const askerProfile = profileById.get(row.asker_id);
          return {
            id: row.id,
            chaburahId: row.chaburah_id,
            askerId: row.asker_id,
            askerName: askerProfile?.fullName,
            askerEmail: askerProfile?.email,
            question: row.question,
            status: row.status === "answered" ? "answered" : "submitted",
            submittedAt: row.submitted_at,
            answer: row.answer ?? undefined,
            answeredAt: row.answered_at ?? undefined
          };
        })
      );
    } catch (refreshError) {
      setError(formatSupabaseError(refreshError));
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, [profile?.chaburahId, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<AppStateValue>(
    () => ({
      hydrated,
      loading,
      error,
      selectedChaburahId: profile?.chaburahId,
      chaburos,
      memberships,
      chaburahMemberDirectory,
      announcements,
      learningFiles,
      reviewQuestions,
      reviewSessions,
      askRavQuestions,
      discussionMessages,
      refresh,
      joinChaburah: async (chaburahId) => {
        const { data, error: joinError } = await supabase.rpc("join_chaburah", {
          target_chaburah_id: chaburahId
        });
        if (joinError) return joinError.message;
        if (data === "pending") {
          await refresh();
          return "Your membership request is pending approval.";
        }
        await refreshProfile();
        await refresh();
        return null;
      },
      reviewMembershipRequest: async (membershipId, approve) => {
        const { error: membershipError } = await supabase.rpc("review_membership_request", {
          target_membership_id: membershipId,
          approve_request: approve
        });
        if (membershipError) return membershipError.message;
        await refresh();
        return approve ? "Membership approved." : "Membership request rejected.";
      },
      updateMembershipStatus: async (membershipId, status) => {
        const { error: membershipError } = await supabase.rpc("update_membership_status", {
          target_membership_id: membershipId,
          new_status: status
        });
        if (membershipError) return membershipError.message;
        await refresh();
        if (status === "active") return "Membership reactivated.";
        if (status === "suspended") return "Member suspended.";
        if (status === "left") return "Member removed.";
        return "Membership updated.";
      },
      checkReviewAnswer: async (questionId, choiceIndex) => {
        const { data, error: answerError } = await supabase.rpc("check_review_answer", {
          target_question_id: questionId,
          selected_choice_index: choiceIndex
        });
        if (answerError) throw answerError;
        const feedback = data?.[0];
        if (!feedback) throw new Error("No answer feedback was returned.");
        return {
          isCorrect: feedback.is_correct,
          explanation: feedback.explanation
        };
      },
      saveReviewSession: async (week, answers) => {
        const { error: sessionError } = await supabase.rpc("complete_review_session", {
          target_week: week === "all" ? null : week,
          target_chaburah_id: profile?.chaburahId ?? null,
          submitted_answers: answers.map((answer) => ({
            question_id: answer.questionId,
            choice_index: answer.choiceIndex
          }))
        });
        if (sessionError) return sessionError.message;
        await refresh();
        return null;
      },
      submitAskRavQuestion: async (question) => {
        if (!session?.user.id || !profile?.chaburahId) {
          return "Join a chaburah before submitting a question.";
        }
        const currentChaburah = chaburos.find((chaburah) => chaburah.id === profile.chaburahId);
        if (currentChaburah && !currentChaburah.askRavEnabled) {
          return "Ask Rav is not enabled for this chaburah.";
        }
        const { error: questionError } = await supabase.from("ask_rav_questions").insert({
          chaburah_id: profile.chaburahId,
          asker_id: session.user.id,
          question
        });
        if (questionError) return questionError.message;
        await refresh();
        return null;
      },
      submitDiscussionMessage: async (body) => {
        if (!session?.user.id || !profile?.chaburahId) {
          return "Join a chaburah before posting in the discussion.";
        }
        const trimmedBody = body.trim();
        if (!trimmedBody) return "Write a message before posting.";
        const currentChaburah = chaburos.find((chaburah) => chaburah.id === profile.chaburahId);
        if (currentChaburah && !currentChaburah.discussionEnabled) {
          return "Discussion is not enabled for this chaburah.";
        }
        const { error: discussionError } = await supabase.from("discussion_messages").insert({
          chaburah_id: profile.chaburahId,
          author_id: session.user.id,
          body: trimmedBody
        });
        if (discussionError) return discussionError.message;
        await refresh();
        return null;
      },
      hideDiscussionMessage: async (messageId) => {
        const { error: discussionError } = await supabase
          .from("discussion_messages")
          .update({ status: "hidden" })
          .eq("id", messageId);
        if (discussionError) return discussionError.message;
        await refresh();
        return "Message hidden.";
      }
    }),
    [
      announcements,
      askRavQuestions,
      chaburos,
      chaburahMemberDirectory,
      discussionMessages,
      error,
      hydrated,
      learningFiles,
      loading,
      memberships,
      profile?.chaburahId,
      refresh,
      refreshProfile,
      reviewQuestions,
      reviewSessions,
      session?.user.id
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}
