import { StyleSheet, Text, View } from "react-native";
import { Card, MetaText, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";
import { theme } from "../../src/shared/theme";
import { useAuthState } from "../../src/state/AuthState";

const guides = [
  {
    role: "Participant",
    audience: ["participant", "local_rabbi", "local_admin", "global_admin"],
    steps: [
      "Dashboard: check assigned review, new uploads, announcements, and discussion reminders.",
      "My Chaburah: review chaburah information, members, announcements, recent files, and discussion.",
      "Files: search and filter source sheets, review sheets, recordings, videos, and links.",
      "Review: choose a week and answer the published review questions.",
      "Beta Feedback: report bugs, confusing screens, and suggestions."
    ]
  },
  {
    role: "Rabbi",
    audience: ["local_rabbi", "global_admin"],
    steps: [
      "Rabbi Hub: build weekly questions in the staging area before publishing.",
      "Model Questions: stage all model questions for the selected week when you are short on time.",
      "Public Question Library: browse public/model questions, copy useful ones, and adjust them before publishing.",
      "Ask Rav: answer participant questions when Ask Rav is enabled for the chaburah.",
      "My Chaburah: watch discussion and announcements from the participant view."
    ]
  },
  {
    role: "Local Admin",
    audience: ["local_admin", "local_rabbi", "global_admin"],
    steps: [
      "Admin: approve join requests and manage active members.",
      "Admin: publish source sheets, review sheets, recordings, videos, PDFs, or external links.",
      "Admin: edit or hide files if a tester reports an issue.",
      "Dashboard: use Review Requests when a pending join request appears.",
      "Beta Feedback: reply to tester feedback and mark items reviewed."
    ]
  },
  {
    role: "Global Admin",
    audience: ["global_admin"],
    steps: [
      "Global Admin: create, search, update, activate, or deactivate chaburos.",
      "Global Admin: set the current review week for the whole app.",
      "Admin: select a managed chaburah before assigning local rabbis/admins or publishing local files.",
      "Rabbi Hub: add public library questions and mark model questions for rabbonim.",
      "Beta Feedback: review tester issues across platforms and roles."
    ]
  }
];

export default function HelpScreen() {
  const { profile } = useAuthState();
  const role = profile?.role ?? "participant";
  const visibleGuides = guides.filter((guide) => guide.audience.includes(role));

  return (
    <Screen title="Help / How to Use" eyebrow="Beta quick start">
      <Card>
        <SectionTitle>Quick Start</SectionTitle>
        <Text style={styles.muted}>Short, screen-based reminders for the role you are testing.</Text>
        <Pill label={roleLabel(role)} tone="primary" />
      </Card>

      {visibleGuides.map((guide) => (
        <Card key={guide.role}>
          <Row>
            <View style={{ flex: 1, minWidth: 220 }}>
              <SectionTitle>{guide.role}</SectionTitle>
              <Text style={styles.muted}>Use these screens first during beta testing.</Text>
            </View>
            <Pill label="Guide" tone="accent" />
          </Row>
          <View style={localStyles.videoPlaceholder}>
            <Text style={localStyles.videoTitle}>Tutorial video placeholder</Text>
            <MetaText>Short screen recording can be added here later.</MetaText>
          </View>
          {guide.steps.map((step, index) => (
            <View key={step} style={localStyles.stepRow}>
              <Text style={localStyles.stepNumber}>{index + 1}</Text>
              <Text style={styles.body}>{step}</Text>
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

function roleLabel(role: string) {
  if (role === "global_admin") return "Global Admin";
  if (role === "local_admin") return "Local Admin";
  if (role === "local_rabbi") return "Rabbi";
  return "Participant";
}

const localStyles = StyleSheet.create({
  stepNumber: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "900",
    width: 24
  },
  stepRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  videoPlaceholder: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 3,
    padding: theme.spacing.md
  },
  videoTitle: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "900"
  }
});
