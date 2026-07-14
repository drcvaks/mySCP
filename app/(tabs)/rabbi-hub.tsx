import { useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
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
type LibraryWeek = number | "all";
type LibraryKind = "all" | "model";

export default function RabbiHubScreen() {
  const { profile } = useAuthState();
  const scrollRef = useRef<ScrollView | null>(null);
  const { askRavQuestions, chaburos, loading, memberships, refresh, reviewQuestions, selectedChaburahId } = useAppState();
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [buildWeek, setBuildWeek] = useState(currentReviewWeek);
  const [libraryWeek, setLibraryWeek] = useState<LibraryWeek>(currentReviewWeek);
  const [libraryKind, setLibraryKind] = useState<LibraryKind>("all");
  const [questionKind, setQuestionKind] = useState<QuestionKind>("true_false");
  const [prompt, setPrompt] = useState("");
  const [optionCount, setOptionCount] = useState(4);
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState(["", "", "", ""]);
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState("0");
  const [explanation, setExplanation] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("chaburah");
  const [isModelQuestion, setIsModelQuestion] = useState(false);
  const [questionFormOffset, setQuestionFormOffset] = useState(0);
  const [stagedQuestionsOffset, setStagedQuestionsOffset] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const managedChaburahId = profile?.role === "global_admin" ? selectedChaburahId : profile?.chaburahId;
  const managedChaburah = chaburos.find((chaburah) => chaburah.id === managedChaburahId);
  const canAnswerAskRav = memberships.some(
    (membership) =>
      membership.userId === profile?.id &&
      membership.chaburahId === managedChaburahId &&
      membership.status === "active" &&
      membership.memberRole === "rabbi"
  );
  const visibleQuestions = useMemo(
    () =>
      canAnswerAskRav
        ? askRavQuestions.filter((question) => question.chaburahId === managedChaburahId)
        : [],
    [askRavQuestions, canAnswerAskRav, managedChaburahId]
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
  const selectedWeekReviewQuestions = manageableReviewQuestions.filter((question) => question.week === buildWeek);
  const stagedQuestions = selectedWeekReviewQuestions.filter(
    (question) => question.publicationStatus === "draft" && !question.isLibraryQuestion
  );
  const publishedQuestions = selectedWeekReviewQuestions.filter(
    (question) => question.publicationStatus === "published" && !question.isLibraryQuestion
  );
  const publicLibraryQuestions = reviewQuestions.filter(
    (question) =>
      question.isLibraryQuestion &&
      question.enabled &&
      question.publicationStatus === "published" &&
      (libraryWeek === "all" || question.week === libraryWeek)
  );
  const modelLibraryQuestions = publicLibraryQuestions.filter((question) => question.isModelQuestion);
  const visibleLibraryQuestions = publicLibraryQuestions.filter(
    (question) => libraryKind === "all" || question.isModelQuestion
  );
  const stagedLibraryQuestions =
    profile?.role === "global_admin"
      ? reviewQuestions.filter(
          (question) =>
            question.isLibraryQuestion &&
            question.publicationStatus === "draft" &&
            question.week === buildWeek
        )
      : [];
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
    setQuestionKind("true_false");
    setPrompt("");
    setOptionCount(4);
    setMultipleChoiceOptions(["", "", "", ""]);
    setCorrectChoiceIndex("0");
    setExplanation("");
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
    setBuildWeek(question.week);
    setQuestionKind(question.kind);
    setPrompt(question.prompt);
    setOptionCount(question.kind === "multiple_choice" ? Math.max(1, Math.min(4, question.choices.length)) : 4);
    setMultipleChoiceOptions(nextOptions);
    setCorrectChoiceIndex(String(data.correct_choice_index));
    setExplanation(data.explanation);
    setVisibility(question.visibility);
    setIsModelQuestion(question.isModelQuestion);
    setMessage("Editing review question.");
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(questionFormOffset - 12, 0), animated: true });
    });
  }

  async function submitAnswer(questionId: string) {
    if (!profile?.id || !canAnswerAskRav || answer.trim().length < 5) return;
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
    await supabase.rpc("notify_rabbi_answer", {
      target_question_id: questionId
    });
    setAnswer("");
    setActiveQuestionId(null);
    setMessage("Answer saved.");
    await refresh();
  }

  async function saveReviewQuestion() {
    if (!profile?.id) return;
    const editingQuestion = reviewQuestions.find((question) => question.id === editingQuestionId);
    const parsedWeek = buildWeek;
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
    const shouldScrollToStaged = !editingQuestionId && visibility === "chaburah";

    setSaving(true);
    setMessage("");
    const questionPayload = {
        chaburah_id: visibility === "chaburah" ? managedChaburahId : null,
        topic: `Week ${parsedWeek} Review`,
        week: parsedWeek,
        prompt: prompt.trim(),
        kind: questionKind,
        choices: parsedChoices,
        visibility,
        is_library_question: visibility === "everyone",
        is_model_question: visibility === "everyone" && isModelQuestion,
        publication_status: editingQuestion?.publicationStatus ?? "draft"
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
    setMessage(
      editingQuestionId
        ? "Review question updated."
        : visibility === "everyone"
          ? "Library question staged."
          : "Review question staged."
    );
    await refresh();
    if (shouldScrollToStaged) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: Math.max(stagedQuestionsOffset - 12, 0), animated: true });
      });
    }
  }

  async function cloneLibraryQuestion(questionId: string) {
    if (!managedChaburahId) {
      setMessage("Choose or join a chaburah before using a library question.");
      return;
    }
    setSaving(true);
    setMessage("");
    const { error } = await supabase.rpc("clone_review_question", {
      source_review_question_id: questionId,
      target_chaburah_id: managedChaburahId,
      target_week: buildWeek
    });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(`Question copied to Week ${buildWeek} staging.`);
    await refresh();
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(stagedQuestionsOffset - 12, 0), animated: true });
    });
  }

  async function cloneAllModelQuestions() {
    if (!managedChaburahId) {
      setMessage("Choose or join a chaburah before using model questions.");
      return;
    }
    if (modelLibraryQuestions.length === 0) {
      setMessage("No model questions are available for this library selection.");
      return;
    }

    setSaving(true);
    setMessage("");
    let copiedCount = 0;
    for (const question of modelLibraryQuestions) {
      const { error } = await supabase.rpc("clone_review_question", {
        source_review_question_id: question.id,
        target_chaburah_id: managedChaburahId,
        target_week: buildWeek
      });
      if (error) {
        setSaving(false);
        setMessage(
          copiedCount > 0
            ? `${copiedCount} model question${copiedCount === 1 ? "" : "s"} staged before an error: ${error.message}`
            : error.message
        );
        await refresh();
        return;
      }
      copiedCount += 1;
    }
    setSaving(false);
    setMessage(`${copiedCount} model question${copiedCount === 1 ? "" : "s"} staged for Week ${buildWeek}.`);
    await refresh();
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(stagedQuestionsOffset - 12, 0), animated: true });
    });
  }

  async function publishStagedWeek() {
    if (!managedChaburahId) {
      setMessage("Choose or join a chaburah before publishing questions.");
      return;
    }
    setSaving(true);
    setMessage("");
    const { data, error } = await supabase.rpc("publish_review_week", {
      target_chaburah_id: managedChaburahId,
      target_week: buildWeek
    });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    await supabase.rpc("notify_review_questions_published", {
      target_chaburah_id: managedChaburahId,
      target_week: buildWeek
    });
    setMessage(`${data ?? 0} staged question${data === 1 ? "" : "s"} published for Week ${buildWeek}.`);
    await refresh();
  }

  async function publishStagedLibraryWeek() {
    setSaving(true);
    setMessage("");
    const { error } = await supabase
      .from("review_questions")
      .update({
        enabled: true,
        publication_status: "published",
        published_at: new Date().toISOString()
      })
      .eq("is_library_question", true)
      .eq("publication_status", "draft")
      .eq("week", buildWeek);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(`${stagedLibraryQuestions.length} library question${stagedLibraryQuestions.length === 1 ? "" : "s"} published for Week ${buildWeek}.`);
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

  async function removeStagedQuestion(question: ReviewQuestion) {
    if (question.publicationStatus !== "draft") return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("review_questions").delete().eq("id", question.id);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (editingQuestionId === question.id) {
      resetReviewForm();
    }
    setMessage("Staged question removed.");
    await refresh();
  }

  return (
    <Screen title="Rabbi Hub" eyebrow="Questions and review library" onRefresh={refresh} refreshing={loading} scrollRef={scrollRef}>
      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Ask the Rav Queue</SectionTitle>
            <Text style={styles.muted}>
              {managedChaburah ? managedChaburah.name : "Current chaburah"} questions that need a response.
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
                message.includes("staged") ||
                message.includes("copied") ||
                message.includes("updated") ||
                message.includes("enabled") ||
                message.includes("disabled") ||
                message.includes("removed")
              ? "success"
              : "error"
        }
      />

      {submittedQuestions.length === 0 ? (
        <Card>
          <SectionTitle>No Open Questions</SectionTitle>
          <Text style={styles.muted}>Submitted questions will appear here for the assigned rabbi.</Text>
        </Card>
      ) : (
        submittedQuestions.map((question) => (
          <Card key={question.id}>
            <Row>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Pill label="Submitted" tone="accent" />
                <MetaText>
                  From {question.askerName || question.askerEmail || "Unknown participant"} - {new Date(question.submittedAt).toLocaleDateString()}
                </MetaText>
              </View>
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
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Review Question Builder</SectionTitle>
            <Text style={styles.muted}>
              Build a staged set for your chaburah, then publish the week when the questions are ready.
            </Text>
          </View>
          <Pill label={`Week ${buildWeek}`} tone="primary" />
        </Row>
        <View style={{ gap: 8 }}>
          <MetaText>Build Questions For</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {reviewWeeks.map((reviewWeek) => (
              <FilterChip
                key={reviewWeek}
                label={`Week ${reviewWeek}`}
                onPress={() => setBuildWeek(reviewWeek)}
                selected={buildWeek === reviewWeek}
              />
            ))}
          </View>
        </View>
        <Row>
          <Pill label={`${stagedQuestions.length} staged`} tone={stagedQuestions.length ? "accent" : "neutral"} />
          <Pill label={`${publishedQuestions.length} published`} tone={publishedQuestions.length ? "success" : "neutral"} />
        </Row>
      </Card>

      <View onLayout={(event) => setQuestionFormOffset(event.nativeEvent.layout.y)}>
        <Card>
        <SectionTitle>{editingQuestionId ? "Edit Review Question" : "Create Staged Question"}</SectionTitle>
        <Text style={styles.muted}>New questions stay staged until you publish the selected week.</Text>
        {profile?.role === "global_admin" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <FilterChip label="Public Library" onPress={() => setVisibility("everyone")} selected={visibility === "everyone"} />
            <FilterChip
              label="Current Chaburah"
              onPress={() => {
                setVisibility("chaburah");
                setIsModelQuestion(false);
              }}
              selected={visibility === "chaburah"}
            />
          </View>
        ) : null}
        {profile?.role === "global_admin" && visibility === "everyone" ? (
          <View style={{ gap: 8 }}>
            <MetaText>Library Use</MetaText>
            <Text style={styles.muted}>Model questions are quick defaults rabbonim can stage when they do not have time to build a full set.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <FilterChip label="Model Question" onPress={() => setIsModelQuestion(true)} selected={isModelQuestion} />
              <FilterChip label="Regular Library" onPress={() => setIsModelQuestion(false)} selected={!isModelQuestion} />
            </View>
          </View>
        ) : null}
        <MetaText>Saving to Week {buildWeek}. Current week is Week {currentReviewWeek}.</MetaText>
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
        <Button
          disabled={saving}
          label={saving ? "Saving..." : editingQuestionId ? "Save Changes" : visibility === "everyone" ? "Stage Library Question" : "Stage Question"}
          onPress={saveReviewQuestion}
        />
        {editingQuestionId ? <Button label="Cancel Edit" onPress={resetReviewForm} variant="ghost" /> : null}
        </Card>
      </View>

      <View onLayout={(event) => setStagedQuestionsOffset(event.nativeEvent.layout.y)}>
        <Card>
          <SectionTitle>Staged Questions</SectionTitle>
          <Row>
            <Text style={styles.muted}>These Week {buildWeek} questions are not visible to participants yet.</Text>
            <Pill label={`${stagedQuestions.length} staged`} tone={stagedQuestions.length ? "accent" : "neutral"} />
          </Row>
          {stagedQuestions.length === 0 ? (
            <Text style={styles.muted}>No staged questions for this week yet. Create one or use the public library below.</Text>
          ) : null}
          {stagedQuestions.length > 0 ? (
            <ScrollView style={{ maxHeight: 420 }} nestedScrollEnabled>
              <View style={{ gap: 12 }}>
                {stagedQuestions.map((question, index) => (
                  <ReviewQuestionManagerRow
                    key={question.id}
                    index={index}
                    question={question}
                    saving={saving}
                    onEdit={startEditReviewQuestion}
                    onRemove={removeStagedQuestion}
                    onToggle={toggleReviewQuestion}
                  />
                ))}
              </View>
            </ScrollView>
          ) : null}
          {stagedQuestions.length > 0 ? (
            <Button
              disabled={saving}
              label={saving ? "Publishing..." : `Publish Week ${buildWeek}`}
              onPress={publishStagedWeek}
            />
          ) : null}
        </Card>
      </View>

      {profile?.role === "global_admin" ? (
        <Card>
          <SectionTitle>Staged Library Questions</SectionTitle>
          <Row>
            <Text style={styles.muted}>These Week {buildWeek} questions are not visible in the public library yet.</Text>
            <Pill label={`${stagedLibraryQuestions.length} staged`} tone={stagedLibraryQuestions.length ? "accent" : "neutral"} />
          </Row>
          {stagedLibraryQuestions.length === 0 ? (
            <Text style={styles.muted}>No staged public-library questions for this week yet.</Text>
          ) : null}
          {stagedLibraryQuestions.map((question, index) => (
            <ReviewQuestionManagerRow
              key={question.id}
              index={index}
              question={question}
              saving={saving}
              onEdit={startEditReviewQuestion}
              onRemove={removeStagedQuestion}
              onToggle={toggleReviewQuestion}
            />
          ))}
          {stagedLibraryQuestions.length > 0 ? (
            <Button
              disabled={saving}
              label={saving ? "Publishing..." : `Publish Library Week ${buildWeek}`}
              onPress={publishStagedLibraryWeek}
            />
          ) : null}
        </Card>
      ) : null}

      <Card>
        <SectionTitle>Model Questions</SectionTitle>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Text style={styles.muted}>Quick-stage the full model set into Week {buildWeek}. Browse individual model questions in the Public Question Library below.</Text>
          </View>
          <Pill label={`${modelLibraryQuestions.length} model`} tone={modelLibraryQuestions.length ? "accent" : "neutral"} />
        </Row>
        <Button
          disabled={saving || !managedChaburahId || modelLibraryQuestions.length === 0}
          label={saving ? "Staging..." : `Stage All Model Questions (${modelLibraryQuestions.length})`}
          onPress={cloneAllModelQuestions}
        />
        {modelLibraryQuestions.length === 0 ? (
          <Text style={styles.muted}>No model questions match this library week yet.</Text>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Public Question Library</SectionTitle>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Text style={styles.muted}>
              Browse all published public library questions, including model and regular questions, and copy useful ones into Week {buildWeek} staging.
            </Text>
          </View>
          <Pill
            label={`${visibleLibraryQuestions.length} shown`}
            tone="accent"
          />
        </Row>
        <View style={{ gap: 8 }}>
          <MetaText>Question Type</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <FilterChip label="All" onPress={() => setLibraryKind("all")} selected={libraryKind === "all"} />
            <FilterChip label="Model Questions" onPress={() => setLibraryKind("model")} selected={libraryKind === "model"} />
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <MetaText>Browse Library From</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <FilterChip label="All Weeks" onPress={() => setLibraryWeek("all")} selected={libraryWeek === "all"} />
            {reviewWeeks.map((reviewWeek) => (
              <FilterChip
                key={reviewWeek}
                label={`Week ${reviewWeek}`}
                onPress={() => setLibraryWeek(reviewWeek)}
                selected={libraryWeek === reviewWeek}
              />
            ))}
          </View>
        </View>
        {publicLibraryQuestions.length === 0 ? (
          <Text style={styles.muted}>No published public library questions match this week yet.</Text>
        ) : null}
        {publicLibraryQuestions.length > 0 && visibleLibraryQuestions.length === 0 ? (
          <Text style={styles.muted}>No model questions match this library week yet.</Text>
        ) : null}
        {visibleLibraryQuestions.length > 0 ? (
          <ScrollView style={{ maxHeight: 420 }} nestedScrollEnabled>
            <View style={{ gap: 12 }}>
              {visibleLibraryQuestions.map((question) => (
                <View key={question.id} style={{ gap: 8 }}>
                  <Row>
                    <View style={{ flex: 1, minWidth: 220 }}>
                      <Text style={styles.body}>{question.prompt}</Text>
                      <MetaText>
                        Week {question.week} - {question.kind === "true_false" ? "True / False" : "Multiple Choice"}
                      </MetaText>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {question.isModelQuestion ? <Pill label="Model" tone="accent" /> : null}
                      <Pill label="Library" tone="primary" />
                    </View>
                  </Row>
                  <Row>
                    <MetaText>Copies into Week {buildWeek}</MetaText>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <Button disabled={saving || !managedChaburahId} label="Use Question" onPress={() => cloneLibraryQuestion(question.id)} variant="secondary" />
                      {profile?.role === "global_admin" ? (
                        <Button disabled={saving} label="Edit Library" onPress={() => startEditReviewQuestion(question)} variant="ghost" />
                      ) : null}
                    </View>
                  </Row>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Published Questions</SectionTitle>
        <Row>
          <Text style={styles.muted}>These Week {buildWeek} questions are live for participants to review.</Text>
          <Pill label={`${publishedQuestions.length} published`} tone={publishedQuestions.length ? "success" : "neutral"} />
        </Row>
        {publishedQuestions.length === 0 ? (
          <Text style={styles.muted}>No published questions for this week yet.</Text>
        ) : null}
        {publishedQuestions.map((question, index) => (
          <ReviewQuestionManagerRow
            key={question.id}
            index={index}
            question={question}
            saving={saving}
            onEdit={startEditReviewQuestion}
            onRemove={removeStagedQuestion}
            onToggle={toggleReviewQuestion}
          />
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

function ReviewQuestionManagerRow({
  index,
  question,
  saving,
  onEdit,
  onRemove,
  onToggle
}: {
  index: number;
  question: ReviewQuestion;
  saving: boolean;
  onEdit: (question: ReviewQuestion) => void;
  onRemove: (question: ReviewQuestion) => void;
  onToggle: (question: ReviewQuestion) => void;
}) {
  const staged = question.publicationStatus === "draft";
  return (
    <View style={{ gap: 8 }}>
      <Row>
        <View style={{ flex: 1, minWidth: 220 }}>
          <MetaText>
            Question {index + 1} - {question.kind === "true_false" ? "True / False" : "Multiple Choice"}
          </MetaText>
          <Text style={styles.body}>{question.prompt}</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Pill
            label={question.publicationStatus === "published" ? "Published" : "Staged"}
            tone={question.publicationStatus === "published" ? "success" : "accent"}
          />
          {!staged ? <Pill label={question.enabled ? "Enabled" : "Disabled"} tone={question.enabled ? "success" : "danger"} /> : null}
        </View>
      </Row>
      <Row>
        <MetaText>{question.sourceQuestionId ? "Copied from public library" : "Original question"}</MetaText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button disabled={saving} label="Edit" onPress={() => onEdit(question)} variant="secondary" />
          {staged ? (
            <Button disabled={saving} label="Remove" onPress={() => onRemove(question)} variant="ghost" />
          ) : (
            <Button
              disabled={saving}
              label={question.enabled ? "Disable" : "Enable"}
              onPress={() => onToggle(question)}
              variant="ghost"
            />
          )}
        </View>
      </Row>
    </View>
  );
}
