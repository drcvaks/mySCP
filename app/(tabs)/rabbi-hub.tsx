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
  StatusBanner,
  TextArea,
  styles
} from "../../src/shared/components";
import { supabase } from "../../src/lib/supabase";
import { useAuthState } from "../../src/state/AuthState";
import { useAppState } from "../../src/state/AppState";
import { buildReviewWeeks, currentReviewWeek } from "../../src/shared/reviewWeeks";
import { ReviewQuestion, Visibility } from "../../src/shared/types";

const reviewWeeks = buildReviewWeeks();
const optionCounts = [1, 2, 3, 4];
type QuestionKind = "true_false" | "multiple_choice";

export default function RabbiHubScreen() {
  const { profile } = useAuthState();
  const { askRavQuestions, chaburos, refresh, reviewQuestions, selectedChaburahId } = useAppState();
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
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
  const manageableReviewQuestions = useMemo(
    () =>
      reviewQuestions.filter(
        (question) => profile?.role === "global_admin" || question.chaburahId === profile?.chaburahId
      ),
    [profile?.chaburahId, profile?.role, reviewQuestions]
  );
  const selectedWeekNumber = Number(week);
  const selectedWeekReviewQuestions = manageableReviewQuestions.filter(
    (question) => question.week === selectedWeekNumber
  );
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
          .map((_choice, index) => `Option ${String.fromCharCode(65 + index)}`);

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

  function resetReviewForm() {
    setEditingQuestionId(null);
    setWeek(String(currentReviewWeek));
    setQuestionKind("true_false");
    setPrompt("");
    setOptionCount(4);
    setMultipleChoiceOptions(["", "", "", ""]);
    setCorrectChoiceIndex("0");
    setExplanation("");
    setVisibility("chaburah");
  }

  async function startEditReviewQuestion(question: ReviewQuestion) {
    setSaving(true);
    setMessage("");
    const { data, error } = await supabase
      .from("review_question_answers")
      .select("correct_choice_index,explanation")
      .eq("question_id", question.id)
      .single();
    setSaving(false);
    if (error || !data) {
      setMessage(error?.message ?? "Unable to load the answer key for this question.");
      return;
    }

    const nextOptions = ["", "", "", ""];
    question.choices.slice(0, 4).forEach((choice, index) => {
      nextOptions[index] = choice;
    });

    setEditingQuestionId(question.id);
    setWeek(String(question.week));
    setQuestionKind(question.kind);
    setPrompt(question.prompt);
    setOptionCount(question.kind === "multiple_choice" ? Math.max(1, Math.min(4, question.choices.length)) : 4);
    setMultipleChoiceOptions(nextOptions);
    setCorrectChoiceIndex(String(data.correct_choice_index));
    setExplanation(data.explanation);
    setVisibility(question.visibility);
    setMessage("Editing review question.");
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

  async function saveReviewQuestion() {
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
    const questionPayload = {
        chaburah_id: visibility === "chaburah" ? managedChaburahId : null,
        topic: `Week ${parsedWeek} Review`,
        week: parsedWeek,
        prompt: prompt.trim(),
        kind: questionKind,
        choices: parsedChoices,
        visibility
    };
    const questionResult = editingQuestionId
      ? await supabase
          .from("review_questions")
          .update(questionPayload)
          .eq("id", editingQuestionId)
          .select("id")
          .single()
      : await supabase
          .from("review_questions")
          .insert({
            ...questionPayload,
            enabled: true,
            created_by: profile.id
          })
          .select("id")
          .single();

    if (questionResult.error || !questionResult.data) {
      setSaving(false);
      setMessage(questionResult.error?.message ?? "Unable to save the review question.");
      return;
    }

    const { error: answerError } = await supabase.from("review_question_answers").upsert({
      question_id: questionResult.data.id,
      correct_choice_index: parsedCorrect,
      explanation: explanation.trim()
    });
    setSaving(false);

    if (answerError) {
      setMessage(answerError.message);
      return;
    }

    resetReviewForm();
    setMessage(editingQuestionId ? "Review question updated." : "Review question published.");
    await refresh();
  }

  async function toggleReviewQuestion(question: ReviewQuestion) {
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("review_questions").update({ enabled: !question.enabled }).eq("id", question.id);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(question.enabled ? "Review question disabled." : "Review question enabled.");
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
      </Card>

      <StatusBanner
        message={message}
        tone={
          message.includes("Editing")
            ? "info"
            : message.includes("saved") ||
                message.includes("published") ||
                message.includes("updated") ||
                message.includes("enabled") ||
                message.includes("disabled")
              ? "success"
              : "error"
        }
      />

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
        <SectionTitle>{editingQuestionId ? "Edit Review Question" : "Publish Review Question"}</SectionTitle>
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
                label={questionKind === "multiple_choice" ? String.fromCharCode(65 + index) : choice}
                onPress={() => setCorrectChoiceIndex(String(index))}
                selected={correctChoiceIndex === String(index)}
              />
            ))}
          </View>
        </View>
        <TextArea onChangeText={setExplanation} placeholder="Explanation shown after the answer" value={explanation} />
        <Button disabled={saving} label={saving ? "Saving..." : editingQuestionId ? "Save Changes" : "Publish Question"} onPress={saveReviewQuestion} />
        {editingQuestionId ? <Button label="Cancel Edit" onPress={resetReviewForm} variant="ghost" /> : null}
      </Card>

      <Card>
        <SectionTitle>Manage Review Questions</SectionTitle>
        <Row>
          <Text style={styles.muted}>Showing questions for Week {week}.</Text>
          <Pill
            label={`${selectedWeekReviewQuestions.length} question${selectedWeekReviewQuestions.length === 1 ? "" : "s"}`}
            tone="accent"
          />
        </Row>
        {selectedWeekReviewQuestions.length === 0 ? (
          <Text style={styles.muted}>No review questions are available for this week yet.</Text>
        ) : null}
        {selectedWeekReviewQuestions.map((question) => (
          <View key={question.id} style={{ gap: 8 }}>
            <Row>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Text style={styles.body}>{question.prompt}</Text>
                <MetaText>
                  Week {question.week} - {question.kind === "true_false" ? "True / False" : "Multiple Choice"}
                </MetaText>
              </View>
              <Pill label={question.enabled ? "Enabled" : "Disabled"} tone={question.enabled ? "success" : "danger"} />
            </Row>
            <Row>
              <MetaText>{question.visibility === "everyone" ? "Everyone" : "Current Chaburah"}</MetaText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Button disabled={saving} label="Edit" onPress={() => startEditReviewQuestion(question)} variant="secondary" />
                <Button
                  disabled={saving}
                  label={question.enabled ? "Disable" : "Enable"}
                  onPress={() => toggleReviewQuestion(question)}
                  variant="ghost"
                />
              </View>
            </Row>
          </View>
        ))}
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
