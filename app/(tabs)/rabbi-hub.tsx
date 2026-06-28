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

const currentReviewWeek = 9;
const reviewWeeks = Array.from({ length: currentReviewWeek + 3 }, (_, index) => index + 1);
const optionCounts = [1, 2, 3, 4];
type QuestionKind = "true_false" | "multiple_choice";

export default function RabbiHubScreen() {
  const { profile } = useAuthState();
  const { askRavQuestions, chaburos, refresh, selectedChaburahId } = useAppState();
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [week, setWeek] = useState(String(currentReviewWeek));
  const [questionKind, setQuestionKind] = useState<QuestionKind>("true_false");
  const [prompt, setPrompt] = useState("");
  const [optionCount, setOptionCount] = useState(4);
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState(["", "", "", ""]);
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState("0");
  const [explanation, setExplanation] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("chaburah");
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
  const parsedChoices =
    questionKind === "true_false"
      ? ["True", "False"]
      : multipleChoiceOptions
          .slice(0, optionCount)
          .map((choice) => choice.trim());
  const correctAnswerOptions =
    questionKind === "true_false"
      ? parsedChoices
      : multipleChoiceOptions
          .slice(0, optionCount)
          .map((choice, index) => choice.trim() || `Option ${String.fromCharCode(65 + index)}`);

  function updateOptionCount(count: number) {
    setOptionCount(count);
    setCorrectChoiceIndex((current) => (Number(current) >= count ? "0" : current));
  }

  function updateMultipleChoiceOption(index: number, value: string) {
    setMultipleChoiceOptions((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

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
    if (!prompt.trim() || !explanation.trim()) {
      setMessage("Add a prompt and explanation.");
      return;
    }
    if (questionKind === "multiple_choice" && parsedChoices.some((choice) => choice.length === 0)) {
      setMessage("Fill in each selected multiple-choice option.");
      return;
    }
    if (parsedChoices.length < 2) {
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
        topic: `Week ${parsedWeek} Review`,
        week: parsedWeek,
        prompt: prompt.trim(),
        kind: questionKind,
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

    setWeek(String(currentReviewWeek));
    setQuestionKind("true_false");
    setPrompt("");
    setOptionCount(4);
    setMultipleChoiceOptions(["", "", "", ""]);
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
        <View style={{ gap: 8 }}>
          <MetaText>Current week is Week {currentReviewWeek}</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {reviewWeeks.map((reviewWeek) => (
              <FilterChip
                key={reviewWeek}
                label={`Week ${reviewWeek}`}
                onPress={() => setWeek(String(reviewWeek))}
                selected={week === String(reviewWeek)}
              />
            ))}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <MetaText>Question Type</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <FilterChip
              label="True / False"
              onPress={() => {
                setQuestionKind("true_false");
                setCorrectChoiceIndex("0");
              }}
              selected={questionKind === "true_false"}
            />
            <FilterChip
              label="Multiple Choice"
              onPress={() => {
                setQuestionKind("multiple_choice");
                setCorrectChoiceIndex("0");
              }}
              selected={questionKind === "multiple_choice"}
            />
          </View>
        </View>
        <TextArea
          onChangeText={setPrompt}
          placeholder="Write the review question exactly as participants should see it..."
          value={prompt}
        />
        {questionKind === "multiple_choice" ? (
          <View style={{ gap: 8 }}>
            <MetaText>How many answer options?</MetaText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {optionCounts.map((count) => (
                <FilterChip
                  key={count}
                  label={`${count}`}
                  onPress={() => updateOptionCount(count)}
                  selected={optionCount === count}
                />
              ))}
            </View>
            {multipleChoiceOptions.slice(0, optionCount).map((option, index) => (
              <FormInput
                key={index}
                onChangeText={(value) => updateMultipleChoiceOption(index, value)}
                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                value={option}
              />
            ))}
          </View>
        ) : null}
        <View style={{ gap: 8 }}>
          <MetaText>Correct Answer</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {correctAnswerOptions.map((choice, index) => (
              <FilterChip
                key={`${choice}-${index}`}
                label={questionKind === "multiple_choice" ? `${String.fromCharCode(65 + index)}. ${choice}` : choice}
                onPress={() => setCorrectChoiceIndex(String(index))}
                selected={correctChoiceIndex === String(index)}
              />
            ))}
          </View>
        </View>
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
