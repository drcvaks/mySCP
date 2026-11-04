import { ProgramSelector } from "../../src/shared/ProgramSelector";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  FilterChip,
  IconTile,
  MetaText,
  Pill,
  ProgressBar,
  Row,
  Screen,
  SectionTitle,
  StatusBanner,
  styles
} from "../../src/shared/components";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../src/shared/theme";
import { buildProgramWeeks, fallbackCurrentReviewWeek } from "../../src/shared/reviewWeeks";
import { useAppState } from "../../src/state/AppState";

interface Feedback {
  isCorrect: boolean;
  explanation: string;
}

export default function ReviewScreen() {
  const [selectedWeek, setSelectedWeek] = useState<number | "all">(fallbackCurrentReviewWeek);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const {
    checkReviewAnswer,
    chaburos,
    currentReviewWeek,
    loading,
    refresh,
    reviewQuestions,
    reviewSessions,
    saveReviewSession,
    selectedChaburahId,
    selectedProgramId,
    registerProgramEdits
  } = useAppState();
  const selectedChaburah = chaburos.find((chaburah) => chaburah.id === selectedChaburahId);
  useEffect(() => {
    registerProgramEdits("review-quiz", Object.keys(answers).length > 0 && !complete);
    return () => registerProgramEdits("review-quiz", false);
  }, [answers, complete, registerProgramEdits]);
  const visibleReviewQuestions = useMemo(
    () =>
      reviewQuestions.filter(
        (question) =>
          question.enabled &&
          question.publicationStatus === "published" &&
          !question.isLibraryQuestion &&
          question.chaburahId === selectedChaburahId
      ),
    [reviewQuestions, selectedChaburahId]
  );

  const currentQuestions = useMemo(
    () =>
      visibleReviewQuestions.filter((question) => selectedWeek === "all" || question.week === selectedWeek),
    [selectedWeek, visibleReviewQuestions]
  );
  const currentQuestion = currentQuestions[currentIndex];
  const selectedChoice = currentQuestion ? answers[currentQuestion.id] : undefined;
  const currentFeedback = currentQuestion ? feedback[currentQuestion.id] : undefined;
  const answered = selectedChoice !== undefined && currentFeedback !== undefined;
  const score = currentQuestions.filter((question) => feedback[question.id]?.isCorrect).length;
  const progress = currentQuestions.length
    ? ((currentIndex + (answered ? 1 : 0)) / currentQuestions.length) * 100
    : 0;
  const matchingSessions = reviewSessions.filter((session) => session.week === selectedWeek);
  const bestScore = matchingSessions.length
    ? Math.max(...matchingSessions.map((session) => Math.round((session.correctAnswers / session.totalQuestions) * 100)))
    : 0;
  const weeks = useMemo(() => {
    const maxQuestionWeek = visibleReviewQuestions.reduce((max, question) => Math.max(max, question.week), 0);
    return buildProgramWeeks(selectedProgramId, currentReviewWeek, maxQuestionWeek);
  }, [currentReviewWeek, visibleReviewQuestions, selectedProgramId]);

  useEffect(() => {
    setSelectedWeek((week) => (week === fallbackCurrentReviewWeek ? currentReviewWeek : week));
  }, [currentReviewWeek]);

  useEffect(() => { reset(currentReviewWeek); }, [selectedProgramId, selectedChaburahId]);

  function reset(week: number | "all" = selectedWeek) {
    setSelectedWeek(week);
    setCurrentIndex(0);
    setAnswers({});
    setFeedback({});
    setComplete(false);
    setMessage("");
  }

  async function selectAnswer(choiceIndex: number) {
    if (!currentQuestion || answers[currentQuestion.id] !== undefined) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: choiceIndex }));
    setSubmitting(true);
    setMessage("");
    try {
      const result = await checkReviewAnswer(currentQuestion.id, choiceIndex);
      setFeedback((current) => ({ ...current, [currentQuestion.id]: result }));
    } catch (answerError) {
      setAnswers((current) => {
        const next = { ...current };
        delete next[currentQuestion.id];
        return next;
      });
      setMessage(answerError instanceof Error ? answerError.message : "Unable to check the answer.");
    } finally {
      setSubmitting(false);
    }
  }

  async function finish() {
    if (!currentQuestions.length) return;
    setSubmitting(true);
    const result = await saveReviewSession(
      selectedWeek,
      currentQuestions.map((question) => ({
        questionId: question.id,
        choiceIndex: answers[question.id]
      }))
    );
    setSubmitting(false);
    if (result) {
      setMessage(result);
      return;
    }
    setComplete(true);
  }

  async function next() {
    if (!answered) return;
    if (currentIndex === currentQuestions.length - 1) {
      await finish();
      return;
    }
    setCurrentIndex((index) => index + 1);
  }

  if (complete) {
    const percentage = currentQuestions.length ? Math.round((score / currentQuestions.length) * 100) : 0;
    return (
      <Screen
        title="Review Complete"
        eyebrow={selectedWeek === "all" ? "All weeks" : `Week ${selectedWeek}`}
        onRefresh={refresh}
        refreshing={loading}
        programSelector={<ProgramSelector disabled={submitting} />}
      >
        <Card>
          <View style={choiceStyles.completionCenter}>
            <View style={choiceStyles.scoreCircle}>
              <Text style={choiceStyles.scorePctText}>{percentage}%</Text>
              <Text style={choiceStyles.scoreSubText}>
                {score} / {currentQuestions.length}
              </Text>
            </View>
            <Pill label={percentage >= 80 ? "Strong result" : "Keep reviewing"} tone={percentage >= 80 ? "success" : "accent"} />
            <SectionTitle>{score} of {currentQuestions.length} correct</SectionTitle>
            <View style={{ width: "100%", maxWidth: 360 }}>
              <ProgressBar value={percentage} />
            </View>
            <Text style={styles.muted}>This result has been saved to your Supabase review history.</Text>
            <Row>
              <Button label="Try Again" icon="refresh-outline" onPress={() => reset()} />
              {selectedWeek !== "all" && selectedWeek < weeks[weeks.length - 1] ? (
                <Button label={`Continue to Week ${selectedWeek + 1}`} onPress={() => reset(selectedWeek + 1)} variant="secondary" />
              ) : null}
            </Row>
          </View>
        </Card>

        <Card>
          <SectionTitle icon="time-outline">Recent Review History</SectionTitle>
          {reviewSessions.slice(0, 5).map((session) => (
            <Row key={session.id}>
              <MetaText>{session.week === "all" ? "All weeks" : `Week ${session.week}`} - {new Date(session.completedAt).toLocaleDateString()}</MetaText>
              <Pill
                label={`${Math.round((session.correctAnswers / session.totalQuestions) * 100)}%`}
                tone={session.correctAnswers / session.totalQuestions >= 0.8 ? "success" : "accent"}
              />
            </Row>
          ))}
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Review Questions" eyebrow="Bechina prep" onRefresh={refresh} refreshing={loading} programSelector={<ProgramSelector disabled={submitting} />}>
      <Card>
        <Row>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 220 }}>
            <IconTile icon="calendar-outline" tone="accent" size={40} />
            <View style={{ flex: 1 }}>
              <SectionTitle>Choose a Week</SectionTitle>
              <Text style={styles.muted}>
                {selectedChaburah
                  ? `Showing questions published for ${selectedChaburah.name}. Current week is Week ${currentReviewWeek}.`
                  : `Current week is Week ${currentReviewWeek}. Join or select a chaburah to see review questions.`}
              </Text>
            </View>
          </View>
          <Pill label={`${currentQuestions.length} questions`} tone="accent" />
        </Row>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <FilterChip
            label={`All (${visibleReviewQuestions.length})`}
            onPress={() => reset("all")}
            selected={selectedWeek === "all"}
          />
          {weeks.map((week) => {
            const count = visibleReviewQuestions.filter((question) => question.week === week).length;
            return (
              <FilterChip
                key={week}
                label={`Week ${week} (${count})`}
                onPress={() => reset(week)}
                selected={selectedWeek === week}
              />
            );
          })}
        </View>
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Text style={styles.muted}>Quiz progress</Text>
            <Text style={styles.statNumber}>{Math.round(progress)}%</Text>
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Text style={styles.muted}>Best saved score</Text>
            <Text style={styles.statNumber}>{bestScore}%</Text>
          </View>
        </Row>
        <ProgressBar value={progress} />
      </Card>

      {currentQuestion ? (
        <Card>
          <Row>
            <Pill label={`Question ${currentIndex + 1} of ${currentQuestions.length}`} tone="primary" />
            <Pill label={`Week ${currentQuestion.week}`} tone="accent" />
          </Row>
          <Text style={[styles.sectionTitle, { fontSize: 20, lineHeight: 28 }]}>{currentQuestion.prompt}</Text>

          <View style={{ gap: 10 }}>
            {currentQuestion.choices.map((choice, index) => {
              const isSelected = selectedChoice === index;
              const isCorrect = currentFeedback?.isCorrect && isSelected;
              const isIncorrect = currentFeedback && !currentFeedback.isCorrect && isSelected;
              return (
                <Pressable
                  accessibilityRole="button"
                  disabled={selectedChoice !== undefined || submitting}
                  key={choice}
                  onPress={() => selectAnswer(index)}
                  accessibilityState={{ selected: isSelected, disabled: selectedChoice !== undefined || submitting }}
                  style={({ pressed, hovered, focused }: { pressed: boolean; hovered?: boolean; focused?: boolean }) => [
                    choiceStyles.choice,
                    selectedChoice === undefined && (hovered || pressed) && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
                    focused && theme.focusRing,
                    selectedChoice !== undefined && !isSelected && { opacity: 0.6 },
                    isSelected && !currentFeedback && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
                    isCorrect && { backgroundColor: theme.colors.successSoft, borderColor: theme.colors.success },
                    isIncorrect && { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger }
                  ]}
                >
                  <View style={[choiceStyles.choiceMarker, isSelected && choiceStyles.choiceMarkerSelected,
                    isCorrect && { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
                    isIncorrect && { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger }]}>
                    {isCorrect || isIncorrect
                      ? <Ionicons name={isCorrect ? "checkmark" : "close"} size={16} color="#FFFFFF" />
                      : <Text style={[choiceStyles.choiceMarkerText, isSelected && choiceStyles.choiceMarkerTextSelected]}>
                          {String.fromCharCode(65 + index)}
                        </Text>}
                  </View>
                  <Text style={choiceStyles.choiceText}>{choice}</Text>
                </Pressable>
              );
            })}
          </View>

          {currentFeedback ? (
            <View
              style={[
                choiceStyles.feedback,
                {
                  backgroundColor: currentFeedback.isCorrect ? theme.colors.successSoft : theme.colors.dangerSoft,
                  borderColor: currentFeedback.isCorrect ? theme.colors.successBorder : theme.colors.dangerBorder
                }
              ]}
            >
              <Text style={[styles.body, { color: currentFeedback.isCorrect ? theme.colors.success : theme.colors.danger, fontWeight: "800" }]}>
                {currentFeedback.isCorrect ? "Correct" : "Not quite"}
              </Text>
              <MetaText>{currentFeedback.explanation}</MetaText>
            </View>
          ) : (
            <MetaText>{submitting ? "Checking answer..." : "Select an answer to continue."}</MetaText>
          )}

          <StatusBanner message={message} tone="error" />
          <Row>
            <View style={{ minWidth: 120 }}>
              <Button
                disabled={currentIndex === 0 || submitting}
                label="Previous"
                onPress={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                variant="ghost"
              />
            </View>
            <View style={{ minWidth: 160 }}>
              <Button
                disabled={!answered || submitting}
                label={currentIndex === currentQuestions.length - 1 ? "Finish Review" : "Next Question"}
                onPress={next}
              />
            </View>
          </Row>
        </Card>
      ) : (
        <EmptyState icon="help-circle-outline" title="No Questions Yet" body="No review questions have been published for this selection." />
      )}
    </Screen>
  );
}

const choiceStyles = StyleSheet.create({
  choice: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 58,
    padding: theme.spacing.md
  },
  choiceMarker: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  choiceMarkerSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  choiceMarkerText: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "800"
  },
  choiceMarkerTextSelected: {
    color: "#FFFFFF"
  },
  choiceText: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22
  },
  feedback: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 4,
    padding: theme.spacing.md
  },
  completionCenter: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 12
  },
  scoreCircle: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.accent,
    borderRadius: 56,
    borderWidth: 4,
    height: 112,
    justifyContent: "center",
    width: 112
  },
  scorePctText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800"
  },
  scoreSubText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "700"
  }
});
