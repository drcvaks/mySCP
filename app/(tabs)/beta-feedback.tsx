import { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, FilterChip, FormInput, MetaText, Pill, Row, Screen, SectionTitle, StatusBanner, TextArea, styles } from "../../src/shared/components";
import { supabase } from "../../src/lib/supabase";
import { formatSupabaseError } from "../../src/lib/errors";
import { isAdmin, isGlobalAdmin, isRabbi } from "../../src/shared/permissions";
import { theme } from "../../src/shared/theme";
import { useAuthState } from "../../src/state/AuthState";

type FeedbackCategory = "liked" | "confusing" | "improvement" | "praise";
type FeedbackFilter = "all" | FeedbackCategory | "reviewed";
type FeedbackPlatform = "web" | "android" | "ios" | "unknown";

interface FeedbackItem {
  id: string;
  userId: string;
  userName?: string;
  role: string;
  category: FeedbackCategory;
  body: string;
  platform: FeedbackPlatform;
  screenName?: string;
  adminResponse?: string;
  reviewedAt?: string;
  createdAt: string;
}

const filters: { key: FeedbackFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "liked", label: "Liked" },
  { key: "confusing", label: "Confusing" },
  { key: "improvement", label: "Suggestions" },
  { key: "praise", label: "Praise" },
  { key: "reviewed", label: "Reviewed" }
];

export default function BetaFeedbackScreen() {
  const { profile } = useAuthState();
  const [liked, setLiked] = useState("");
  const [confusing, setConfusing] = useState("");
  const [improvement, setImprovement] = useState("");
  const [screenName, setScreenName] = useState("");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [filter, setFilter] = useState<FeedbackFilter>("all");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const canReview = profile ? isAdmin(profile) || isRabbi(profile) || isGlobalAdmin(profile) : false;

  const visibleFeedback = useMemo(
    () =>
      feedback.filter((item) => {
        if (filter === "all") return true;
        if (filter === "reviewed") return Boolean(item.reviewedAt);
        return item.category === filter;
      }),
    [feedback, filter]
  );

  useEffect(() => {
    void loadFeedback();
  }, []);

  async function loadFeedback() {
    setLoading(true);
    setMessage("");
    const [feedbackResult, profilesResult] = await Promise.all([
      supabase.from("beta_feedback").select("*").order("created_at", { ascending: false }).limit(150),
      supabase.from("profiles").select("id,email,full_name")
    ]);
    setLoading(false);

    const firstError = feedbackResult.error ?? profilesResult.error;
    if (firstError) {
      setMessage(formatSupabaseError(firstError, "Unable to load beta feedback."));
      return;
    }

    const profileNames = new Map(
      (profilesResult.data ?? []).map((row) => [row.id, row.full_name ?? row.email ?? "Tester"])
    );
    const mapped = (feedbackResult.data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: profileNames.get(row.user_id),
      role: row.role,
      category: row.category,
      body: row.body,
      platform: row.platform,
      screenName: row.screen_name ?? undefined,
      adminResponse: row.admin_response ?? undefined,
      reviewedAt: row.reviewed_at ?? undefined,
      createdAt: row.created_at
    }));
    setFeedback(mapped);
  }

  async function submitFeedback() {
    if (!profile) return;
    const entries = [
      { category: "liked" as const, body: liked.trim() },
      { category: "confusing" as const, body: confusing.trim() },
      { category: "improvement" as const, body: improvement.trim() }
    ].filter((entry) => entry.body);

    if (entries.length === 0) {
      setMessage("Add at least one feedback note before posting.");
      return;
    }

    setSaving(true);
    setMessage("");
    const platform = detectPlatform();
    const { error } = await supabase.from("beta_feedback").insert(
      entries.map((entry) => ({
        user_id: profile.id,
        role: profile.role,
        category: entry.category,
        body: entry.body,
        platform,
        screen_name: screenName.trim() || null
      }))
    );
    setSaving(false);

    if (error) {
      setMessage(formatSupabaseError(error, "Unable to post feedback."));
      return;
    }

    setLiked("");
    setConfusing("");
    setImprovement("");
    setScreenName("");
    setMessage("Feedback posted. Thank you.");
    await loadFeedback();
  }

  async function saveReply(item: FeedbackItem) {
    if (!profile) return;
    setSaving(true);
    setMessage("");
    const response = replyDrafts[item.id]?.trim() || item.adminResponse || "";
    const { error } = await supabase
      .from("beta_feedback")
      .update({
        admin_response: response || null,
        reviewed_at: item.reviewedAt ?? new Date().toISOString(),
        reviewed_by: profile.id
      })
      .eq("id", item.id);
    setSaving(false);
    if (error) {
      setMessage(formatSupabaseError(error, "Unable to update feedback."));
      return;
    }
    setReplyDrafts((current) => ({ ...current, [item.id]: "" }));
    setMessage("Feedback updated.");
    await loadFeedback();
  }

  async function markReviewed(item: FeedbackItem) {
    if (!profile) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase
      .from("beta_feedback")
      .update({
        reviewed_at: item.reviewedAt ? null : new Date().toISOString(),
        reviewed_by: item.reviewedAt ? null : profile.id
      })
      .eq("id", item.id);
    setSaving(false);
    if (error) {
      setMessage(formatSupabaseError(error, "Unable to update reviewed status."));
      return;
    }
    setMessage(item.reviewedAt ? "Feedback marked unreviewed." : "Feedback marked reviewed.");
    await loadFeedback();
  }

  return (
    <Screen title="Beta Feedback" eyebrow="Private beta" onRefresh={loadFeedback} refreshing={loading}>
      <Card>
        <SectionTitle>Post Feedback</SectionTitle>
        <Text style={styles.muted}>Your platform is detected automatically as {platformLabel(detectPlatform())}.</Text>
        <FormInput onChangeText={setScreenName} placeholder="Screen name, optional" value={screenName} />
        <TextArea onChangeText={setLiked} placeholder="What I liked..." value={liked} />
        <TextArea onChangeText={setConfusing} placeholder="What was confusing..." value={confusing} />
        <TextArea onChangeText={setImprovement} placeholder="What needs improvement..." value={improvement} />
        {message ? (
          <StatusBanner
            message={message}
            tone={message.includes("Unable") || message.includes("Add at least") ? "error" : "success"}
          />
        ) : null}
        <Button disabled={saving} label={saving ? "Posting..." : "Post Feedback"} onPress={submitFeedback} />
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Tester Feedback</SectionTitle>
            <Text style={styles.muted}>Visible to logged-in beta testers. Admin replies appear under the original note.</Text>
          </View>
          <Pill label={`${visibleFeedback.length} shown`} tone="primary" />
        </Row>
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>
          {filters.map((item) => (
            <FilterChip key={item.key} label={item.label} selected={filter === item.key} onPress={() => setFilter(item.key)} />
          ))}
        </ScrollView>
        {visibleFeedback.length === 0 ? <Text style={styles.muted}>No feedback in this filter yet.</Text> : null}
        {visibleFeedback.map((item) => (
          <View key={item.id} style={localStyles.feedbackCard}>
            <Row>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Text style={styles.body}>{item.userName ?? "Tester"}</Text>
                <MetaText>
                  {categoryLabel(item.category)} - {platformLabel(item.platform)} - {roleLabel(item.role)} - {formatDate(item.createdAt)}
                </MetaText>
              </View>
              <Pill label={item.reviewedAt ? "Reviewed" : "Open"} tone={item.reviewedAt ? "success" : "accent"} />
            </Row>
            {item.screenName ? <MetaText>Screen: {item.screenName}</MetaText> : null}
            <Text style={styles.body}>{item.body}</Text>
            {item.adminResponse ? (
              <View style={localStyles.replyBox}>
                <Text style={localStyles.replyTitle}>Admin reply</Text>
                <Text style={styles.body}>{item.adminResponse}</Text>
              </View>
            ) : null}
            {canReview ? (
              <View style={{ gap: 8 }}>
                <TextArea
                  onChangeText={(value) => setReplyDrafts((current) => ({ ...current, [item.id]: value }))}
                  placeholder="Admin reply..."
                  value={replyDrafts[item.id] ?? ""}
                />
                <Row>
                  <Button disabled={saving} label="Save Reply" onPress={() => saveReply(item)} variant="secondary" />
                  <Button
                    disabled={saving}
                    label={item.reviewedAt ? "Mark Open" : "Mark Reviewed"}
                    onPress={() => markReviewed(item)}
                    variant={item.reviewedAt ? "ghost" : "primary"}
                  />
                </Row>
              </View>
            ) : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}

function detectPlatform(): FeedbackPlatform {
  if (Platform.OS === "web" || Platform.OS === "android" || Platform.OS === "ios") return Platform.OS;
  return "unknown";
}

function categoryLabel(category: FeedbackCategory) {
  if (category === "liked") return "Liked";
  if (category === "confusing") return "Confusing";
  if (category === "improvement") return "Suggestion";
  return "Praise";
}

function platformLabel(platform: FeedbackPlatform) {
  if (platform === "ios") return "iOS";
  if (platform === "android") return "Android";
  if (platform === "web") return "Web";
  return "Unknown platform";
}

function roleLabel(role: string) {
  if (role === "global_admin") return "Global Admin";
  if (role === "local_admin") return "Local Admin";
  if (role === "local_rabbi") return "Rabbi";
  return "Participant";
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const localStyles = StyleSheet.create({
  feedbackCard: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  replyBox: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.sm,
    gap: 4,
    padding: theme.spacing.md
  },
  replyTitle: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "900"
  }
});
