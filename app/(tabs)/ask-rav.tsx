import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  IconTile,
  MetaText,
  Pill,
  Row,
  Screen,
  SectionTitle,
  StatusBanner,
  TextArea,
  styles
} from "../../src/shared/components";
import { theme } from "../../src/shared/theme";
import { useAuthState } from "../../src/state/AuthState";
import { useAppState } from "../../src/state/AppState";

export default function AskRavScreen() {
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const { profile } = useAuthState();
  const { askRavQuestions, chaburos, loading, memberships, refresh, selectedChaburahId, submitAskRavQuestion } = useAppState();
  const chaburah = chaburos.find((item) => item.id === selectedChaburahId);
  const canViewChaburahQuestions = memberships.some(
    (membership) =>
      membership.userId === profile?.id &&
      membership.chaburahId === selectedChaburahId &&
      membership.status === "active" &&
      membership.memberRole === "rabbi"
  );
  const localQuestions = useMemo(
    () =>
      askRavQuestions.filter(
        (question) =>
          question.chaburahId === selectedChaburahId &&
          (question.askerId === profile?.id || canViewChaburahQuestions)
      ),
    [askRavQuestions, canViewChaburahQuestions, profile?.id, selectedChaburahId]
  );
  const trimmedDraft = draft.trim();

  async function submit() {
    if (!chaburah?.askRavEnabled) {
      setMessage("Ask Rav is not enabled for this chaburah.");
      return;
    }
    if (trimmedDraft.length < 10) {
      setMessage("Please enter at least 10 characters so the question has enough detail.");
      return;
    }
    const result = await submitAskRavQuestion(trimmedDraft);
    if (result) {
      setMessage(result);
      return;
    }
    setDraft("");
    setMessage("Your question was submitted.");
  }

  return (
    <Screen title="Ask the Rav" eyebrow={chaburah?.rabbiName} onRefresh={refresh} refreshing={loading}>
      <Card>
        <Row>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 220 }}>
            <IconTile icon="help-buoy-outline" tone="accent" size={42} />
            <View style={{ flex: 1 }}>
              <SectionTitle>Submit a Question</SectionTitle>
              <Text style={styles.muted}>
                Submit a question about this week's SCP material to {chaburah?.rabbiName ?? "your local Rav"}.
              </Text>
            </View>
          </View>
        </Row>
        {chaburah && !chaburah.askRavEnabled ? (
          <>
            <Text style={styles.muted}>Ask Rav is not enabled for this chaburah.</Text>
            <StatusBanner message={message} tone="error" />
          </>
        ) : (
          <>
            <TextArea
              onChangeText={(value) => {
                setDraft(value);
                setMessage("");
              }}
              placeholder="Type your SCP question..."
              value={draft}
            />
            <Row>
              <MetaText>{trimmedDraft.length} characters - minimum 10</MetaText>
              <Pill label="Private draft" tone="accent" />
            </Row>
            <StatusBanner message={message} tone={message.startsWith("Please") || message.includes("not enabled") ? "error" : "success"} />
            <Button disabled={trimmedDraft.length === 0} label="Submit Question" icon="send-outline" onPress={submit} />
          </>
        )}
      </Card>

      <Card>
        <Row>
          <SectionTitle icon="chatbubbles-outline">My Questions</SectionTitle>
          <Pill label={`${localQuestions.length} submitted`} tone="primary" />
        </Row>
        {localQuestions.length === 0 ? (
          <EmptyState icon="help-circle-outline" title="No questions submitted yet" body="Questions you send to your Rav and his responses will appear here." />
        ) : (
          localQuestions.map((question) => (
            <View key={question.id} style={s.questionItem}>
              <Row>
                <Pill label={question.status === "answered" ? "Answered" : "Submitted"} tone={question.status === "answered" ? "success" : "accent"} />
                <MetaText>{new Date(question.submittedAt).toLocaleDateString()}</MetaText>
              </Row>
              <Text style={[styles.body, { fontWeight: "700" }]}>{question.question}</Text>
              {question.answer ? (
                <View style={s.answerBox}>
                  <MetaText>Rav's Response</MetaText>
                  <Text style={styles.body}>{question.answer}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  questionItem: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  answerBox: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentBorder,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 4,
    padding: 12
  }
});
