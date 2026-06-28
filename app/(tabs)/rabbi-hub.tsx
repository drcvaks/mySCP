import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  Button,
  Card,
  FilterChip,
  FormInput,
  MetaText,
  Pill,
  Row,
  Screen,
  SectionTitle,
  TextArea,
  styles
} from "../../src/shared/components";
import { supabase } from "../../src/lib/supabase";
import { useAuthState } from "../../src/state/AuthState";
import { useAppState } from "../../src/state/AppState";
import { Visibility } from "../../src/shared/types";

export default function RabbiHubScreen() {
  const { profile } = useAuthState();
  const { askRavQuestions, chaburos, refresh, selectedChaburahId } = useAppState();
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [topic, setTopic] = useState("");
  const [week, setWeek] = useState("1");
  const [prompt, setPrompt] = useState("");
  const [choices, setChoices] = useState("True, False");
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState("0");
  const [explanation, setExplanation] = useState("");
  const [visibility, setVisibility] = useState<Visibility>(profile?.role === "global_admin" ? "everyone" : "chaburah");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const managedChaburahId = profile?.role === "global_admin" ? selectedChaburahId : profile?.chaburahId;
  const managedChaburah = chaburos.find((chaburah) => chaburah.id === managedChaburahId);
  const visibleQuestions = useMemo(
    () =>
      askRavQuestions.filter(
        (question) => profile?.role === "global_admin" || question.chaburahId === profile?.chaburahId
      ),
    [askRavQuestions, profile?.chaburahId, profile?.role]
  );
  const submittedQuestions = visibleQuestions.filter((question) => question.status === "submitted");
  const answeredQuestions = visibleQuestions.filter((question) => question.status === "answered");

  async function submitAnswer(questionId: string) {
    if (!profile?.id || answer.trim().length < 5) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase
      .from("ask_rav_questions")
      .update({
        answer: answer.trim(),
        answered_by: profile.id,
        answered_at: new Date().toISOString(),
        status: "answered"
      })
      .eq("id", questionId);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setAnswer("");
    setActiveQuestionId(null);
    setMessage("Answer saved.");
    await refresh();
  }

  async function createReviewQuestion() {
    if (!profile?.id) return;
    const parsedWeek = Number(week);
    const parsedCorrect = Number(correctChoiceIndex);
    const parsedChoices = choices
      .split(",")
      .map((choice) => choice.trim())
      .filter(Boolean);
    if (!topic.trim() || !prompt.trim() || parsedChoices.length < 2 || !explanation.trim()) {
      setMessage("Add a topic, prompt, at least two choices, and an explanation.");
      return;
    }
    if (!Number.isInteger(parsedWeek) || parsedWeek < 1 || parsedWeek > 52) {
      setMessage("Week must be a number from 1 to 52.");
      return;
    }
    if (!Number.isInteger(parsedCorrect) || parsedCorrect < 0 || parsedCorrect >= parsedChoices.length) {
      setMessage("Correct choice number must match one of the choices. Use 0 for the first choice.");
      return;
    }
    if (visibility === "chaburah" && !managedChaburahId) {
      setMessage("Choose or join a chaburah before creating chaburah-only questions.");
      return;
    }

    setSaving(true);
    setMessage("");
    const { data: question, error: questionError } = await supabase
      .from("review_questions")
      .insert({
        chaburah_id: visibility === "chaburah" ? managedChaburahId : null,
        topic: topic.trim(),
        week: parsedWeek,
        prompt: prompt.trim(),
        kind: parsedChoices.length === 2 && parsedChoices.join("|").toLowerCase() === "true|false" ? "true_false" : "multiple_choice",
        choices: parsedChoices,
        visibility,
        enabled: true,
        created_by: profile.id
      })
      .select("id")
      .single();

    if (questionError || !question) {
      setSaving(false);
      setMessage(questionError?.message ?? "Unable to create the review question.");
      return;
    }

    const { error: answerError } = await supabase.from("review_question_answers").upsert({
      question_id: question.id,
      correct_choice_index: parsedCorrect,
      explanation: explanation.trim()
    });
    setSaving(false);

    if (answerError) {
      setMessage(answerError.message);
      return;
    }

    setTopic("");
    setWeek("1");
    setPrompt("");
    setChoices("True, False");
    setCorrectChoiceIndex("0");
    setExplanation("");
    setMessage("Review question published.");
    await refresh();
  }

  return (
    <Screen title="Rabbi Hub" eyebrow="Questions and review library">
      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Ask the Rav Queue</SectionTitle>
            <Text style={styles.muted}>
              {managedChaburah ? managedChaburah.name : "Global view"} questions that need a response.
            </Text>
          </View>
          <Pill label={`${submittedQuestions.length} open`} tone={submittedQuestions.length ? "accent" : "success"} />
        </Row>
        {message ? <Text style={message.includes("saved") || message.includes("published") ? styles.successText : styles.errorText}>{message}</Text> : null}
      </Card>

      {submittedQuestions.length === 0 ? (
        <Card>
          <SectionTitle>No Open Questions</SectionTitle>
          <Text style={styles.muted}>Submitted questions will appear here for the rabbi or global admin.</Text>
        </Card>
      ) : (
        submittedQuestions.map((question) => (
          <Card key={question.id}>
            <Row>
              <Pill label="Submitted" tone="accent" />
              <MetaText>{new Date(question.submittedAt).toLocaleDateString()}</MetaText>
            </Row>
            <Text style={styles.body}>{question.question}</Text>
            {activeQuestionId === question.id ? (
              <>
                <TextArea onChangeText={setAnswer} placeholder="Write the answer..." value={answer} />
                <Row>
                  <View style={{ minWidth: 130 }}>
                    <Button disabled={saving || answer.trim().length < 5} label="Save Answer" onPress={() => submitAnswer(question.id)} />
                  </View>
                  <View style={{ minWidth: 100 }}>
                    <Button label="Cancel" onPress={() => setActiveQuestionId(null)} variant="ghost" />
                  </View>
                </Row>
              </>
            ) : (
              <Button
                label="Answer Question"
                onPress={() => {
                  setActiveQuestionId(question.id);
                  setAnswer("");
                }}
                variant="secondary"
              />
            )}
          </Card>
        ))
      )}

      <Card>
        <SectionTitle>Publish Review Question</SectionTitle>
        <Text style={styles.muted}>Correct answers stay in the protected answer table and are checked by RPC.</Text>
        {profile?.role === "global_admin" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <FilterChip label="Everyone" onPress={() => setVisibility("everyone")} selected={visibility === "everyone"} />
            <FilterChip label="Current Chaburah" onPress={() => setVisibility("chaburah")} selected={visibility === "chaburah"} />
          </View>
        ) : null}
        <FormInput onChangeText={setTopic} placeholder="Topic" value={topic} />
        <FormInput keyboardType="numeric" onChangeText={setWeek} placeholder="Week" value={week} />
        <TextArea onChangeText={setPrompt} placeholder="Question prompt" value={prompt} />
        <FormInput onChangeText={setChoices} placeholder="Choices separated by commas" value={choices} />
        <FormInput keyboardType="numeric" onChangeText={setCorrectChoiceIndex} placeholder="Correct choice index, starting at 0" value={correctChoiceIndex} />
        <TextArea onChangeText={setExplanation} placeholder="Explanation shown after the answer" value={explanation} />
        <Button disabled={saving} label={saving ? "Saving..." : "Publish Question"} onPress={createReviewQuestion} />
      </Card>

      <Card>
        <SectionTitle>Recently Answered</SectionTitle>
        {answeredQuestions.slice(0, 4).map((question) => (
          <View key={question.id} style={{ gap: 4 }}>
            <MetaText>{new Date(question.answeredAt ?? question.submittedAt).toLocaleDateString()}</MetaText>
            <Text style={styles.muted}>{question.question}</Text>
          </View>
        ))}
        {answeredQuestions.length === 0 ? <Text style={styles.muted}>No answered questions yet.</Text> : null}
      </Card>
    </Screen>
  );
}
