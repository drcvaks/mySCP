import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, FilterChip, MetaText, Row, Screen, SectionTitle, StatusBanner, styles } from "../../src/shared/components";
import { supabase } from "../../src/lib/supabase";
import { useAuthState } from "../../src/state/AuthState";

type NotificationEventKey = "reviewQuestions" | "discussionPosts" | "rabbiAnswers" | "uploads";
type NotificationChannel = "email" | "inApp";

type NotificationPreferences = Record<NotificationEventKey, Record<NotificationChannel, boolean>>;

const defaultPreferences: NotificationPreferences = {
  reviewQuestions: { email: true, inApp: true },
  discussionPosts: { email: false, inApp: true },
  rabbiAnswers: { email: true, inApp: true },
  uploads: { email: false, inApp: true }
};

const notificationEvents: Array<{ key: NotificationEventKey; title: string; description: string }> = [
  {
    key: "reviewQuestions",
    title: "New Review Questions",
    description: "When new review questions are published for your chaburah."
  },
  {
    key: "discussionPosts",
    title: "New Discussion Posts",
    description: "When new messages are posted in your chaburah discussion."
  },
  {
    key: "rabbiAnswers",
    title: "Rabbi Answers",
    description: "When your Ask Rav question receives an answer."
  },
  {
    key: "uploads",
    title: "New Uploads",
    description: "When new source sheets, recordings, links, or review files are uploaded."
  }
];

export default function SettingsScreen() {
  const { profile } = useAuthState();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPreferences();
  }, [profile?.id]);

  async function loadPreferences() {
    if (!profile?.id) return;
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle();
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setPreferences(data ? mapPreferencesFromRow(data) : defaultPreferences);
  }

  function togglePreference(eventKey: NotificationEventKey, channel: NotificationChannel) {
    setPreferences((current) => ({
      ...current,
      [eventKey]: {
        ...current[eventKey],
        [channel]: !current[eventKey][channel]
      }
    }));
  }

  async function savePreferences() {
    if (!profile?.id) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("notification_preferences").upsert({
      user_id: profile.id,
      review_questions_email: preferences.reviewQuestions.email,
      review_questions_in_app: preferences.reviewQuestions.inApp,
      discussion_posts_email: preferences.discussionPosts.email,
      discussion_posts_in_app: preferences.discussionPosts.inApp,
      rabbi_answers_email: preferences.rabbiAnswers.email,
      rabbi_answers_in_app: preferences.rabbiAnswers.inApp,
      uploads_email: preferences.uploads.email,
      uploads_in_app: preferences.uploads.inApp
    });
    setSaving(false);
    setMessage(error ? error.message : "Notification preferences saved.");
  }

  return (
    <Screen title="Settings" eyebrow="Preferences" onRefresh={loadPreferences} refreshing={loading}>
      {message ? (
        <StatusBanner
          message={message}
          tone={message.includes("saved") ? "success" : "error"}
        />
      ) : null}

      <Card>
        <SectionTitle>Notifications</SectionTitle>
        <Text style={styles.muted}>Choose how you want to be notified. Delivery will use these settings as notification features are connected.</Text>
        {notificationEvents.map((event) => (
          <View key={event.key} style={{ gap: 8 }}>
            <Row>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Text style={styles.body}>{event.title}</Text>
                <Text style={styles.muted}>{event.description}</Text>
              </View>
            </Row>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <FilterChip
                label="Email"
                onPress={() => togglePreference(event.key, "email")}
                selected={preferences[event.key].email}
              />
              <FilterChip
                label="In App"
                onPress={() => togglePreference(event.key, "inApp")}
                selected={preferences[event.key].inApp}
              />
            </View>
          </View>
        ))}
        <Button disabled={saving || loading} label={saving ? "Saving..." : "Save Notification Settings"} onPress={savePreferences} />
      </Card>

      <Card>
        <SectionTitle>Delivery Notes</SectionTitle>
        <MetaText>Email and in-app notification delivery will be connected in a later checkpoint.</MetaText>
        <Text style={styles.muted}>These preferences are saved now so future notification features can respect each user's choices.</Text>
      </Card>
    </Screen>
  );
}

function mapPreferencesFromRow(row: {
  review_questions_email: boolean;
  review_questions_in_app: boolean;
  discussion_posts_email: boolean;
  discussion_posts_in_app: boolean;
  rabbi_answers_email: boolean;
  rabbi_answers_in_app: boolean;
  uploads_email: boolean;
  uploads_in_app: boolean;
}): NotificationPreferences {
  return {
    reviewQuestions: { email: row.review_questions_email, inApp: row.review_questions_in_app },
    discussionPosts: { email: row.discussion_posts_email, inApp: row.discussion_posts_in_app },
    rabbiAnswers: { email: row.rabbi_answers_email, inApp: row.rabbi_answers_in_app },
    uploads: { email: row.uploads_email, inApp: row.uploads_in_app }
  };
}
