import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  Button,
  Card,
  MetaText,
  Pill,
  Row,
  Screen,
  SectionTitle,
  StatusBanner,
  TextArea,
  styles
} from "../../src/shared/components";
import { useAppState } from "../../src/state/AppState";

export default function AskRavScreen() {
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const { askRavQuestions, chaburos, selectedChaburahId, submitAskRavQuestion } = useAppState();
  const chaburah = chaburos.find((item) => item.id === selectedChaburahId);
  const localQuestions = useMemo(
    () => askRavQuestions.filter((question) => question.chaburahId === selectedChaburahId),
    [askRavQuestions, selectedChaburahId]
  );
  const trimmedDraft = draft.trim();

  async function submit() {
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
    <Screen title="Ask the Rav" eyebrow={chaburah?.rabbiName}>
      <Card>
        <SectionTitle>Submit a Question</SectionTitle>
        <Text style={styles.muted}>
          Your question will be associated with {chaburah?.name ?? "your current chaburah"} and is protected by database privacy rules.
        </Text>
        <TextArea
          onChangeText={(value) => {
            setDraft(value);
            setMessage("");
          }}
          placeholder="Type your halachic question..."
          value={draft}
        />
        <Row>
          <MetaText>{trimmedDraft.length} characters - minimum 10</MetaText>
          <Pill label="Private draft" tone="accent" />
        </Row>
        <StatusBanner message={message} tone={message.startsWith("Please") ? "error" : "success"} />
        <Button disabled={trimmedDraft.length === 0} label="Submit Question" onPress={submit} />
      </Card>

      <Card>
        <Row>
          <SectionTitle>My Questions</SectionTitle>
          <Pill label={`${localQuestions.length} submitted`} tone="primary" />
        </Row>
        {localQuestions.length === 0 ? (
          <Text style={styles.muted}>No questions submitted yet.</Text>
        ) : (
          localQuestions.map((question) => (
            <View key={question.id} style={{ gap: 6 }}>
              <Row>
                <Pill label={question.status === "answered" ? "Answered" : "Submitted"} tone={question.status === "answered" ? "success" : "accent"} />
                <MetaText>{new Date(question.submittedAt).toLocaleDateString()}</MetaText>
              </Row>
              <Text style={styles.body}>{question.question}</Text>
              {question.answer ? <Text style={styles.muted}>{question.answer}</Text> : null}
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
