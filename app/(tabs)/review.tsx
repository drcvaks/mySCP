import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Button,
  Card,
  FilterChip,
  MetaText,
  Pill,
  ProgressBar,
  Row,
  Screen,
  SectionTitle,
  styles
} from "../../src/shared/components";
import { theme } from "../../src/shared/theme";
import { useAppState } from "../../src/state/AppState";

const weeks = [1, 2, 3, 4, 5, 6, 7];

interface Feedback {
  isCorrect: boolean;
  explanation: string;
}

export default function ReviewScreen() {
  const [selectedWeek, setSelectedWeek] = useState<number | "all">(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const {
    checkReviewAnswer,
    reviewQuestions,
    reviewSessions,
    saveReviewSession
  } = useAppState();

  const currentQuestions = useMemo(
    () =>
      reviewQuestions.filter(
        (question) => question.enabled && (selectedWeek === "all" || question.week === selectedWeek)
      ),
    [reviewQuestions, selectedWeek]
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
    const percentage = Math.round((score / currentQuestions.length) * 100);
    return (
      <Screen title="Review Complete" eyebrow={selectedWeek === "all" ? "All weeks" : `Week ${selectedWeek}`}>
        <Card>
          <Pill label={percentage >= 80 ? "Strong result" : "Keep reviewing"} tone={percentage >= 80 ? "success" : "accent"} />
          <Text style={[styles.statNumber, { fontSize: 44 }]}>{percentage}%</Text>
          <SectionTitle>{score} of {currentQuestions.length} correct</SectionTitle>
          <ProgressBar value={percentage} />
          <Text style={styles.muted}>This result has been saved to your Supabase review history.</Text>
          <Button label="Try Again" onPress={() => reset()} />
          {selectedWeek !== "all" && selectedWeek < 7 ? (
            <Button label={`Continue to Week ${selectedWeek + 1}`} onPress={() => reset(selectedWeek + 1)} variant="secondary" />
          ) : null}
        </Card>

        <Card>
          <SectionTitle>Recent Review History</SectionTitle>
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
    <Screen title="Review Questions" eyebrow="Bechina prep">
      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Choose a Week</SectionTitle>
            <Text style={styles.muted}>Review by week or practice the full question bank.</Text>
          </View>
          <Pill label={`${currentQuestions.length} questions`} tone="accent" />
        </Row>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <FilterChip
            label={`All (${reviewQuestions.filter((question) => question.enabled).length})`}
            onPress={() => reset("all")}
            selected={selectedWeek === "all"}
          />
          {weeks.map((week) => {
            const count = reviewQuestions.filter((question) => question.enabled && question.week === week).length;
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
                  style={[
                    choiceStyles.choice,
                    isCorrect && { backgroundColor: theme.colors.successSoft, borderColor: theme.colors.success },
                    isIncorrect && { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger }
                  ]}
                >
                  <View style={[choiceStyles.choiceMarker, isSelected && choiceStyles.choiceMarkerSelected]}>
                    <Text style={[choiceStyles.choiceMarkerText, isSelected && choiceStyles.choiceMarkerTextSelected]}>
                      {String.fromCharCode(65 + index)}
                    </Text>
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
                { backgroundColor: currentFeedback.isCorrect ? theme.colors.successSoft : theme.colors.dangerSoft }
              ]}
            >
              <Text style={[styles.body, { color: currentFeedback.isCorrect ? theme.colors.success : theme.colors.danger, fontWeight: "900" }]}>
                {currentFeedback.isCorrect ? "Correct" : "Not quite"}
              </Text>
              <MetaText>{currentFeedback.explanation}</MetaText>
            </View>
          ) : (
            <MetaText>{submitting ? "Checking answer..." : "Select an answer to continue."}</MetaText>
          )}

          {message ? <Text style={styles.errorText}>{message}</Text> : null}
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
        <Card>
          <SectionTitle>No Questions Yet</SectionTitle>
          <Text style={styles.muted}>No review questions have been published for this selection.</Text>
        </Card>
      )}
    </Screen>
  );
}

const choiceStyles = {
  choice: {
    alignItems: "center" as const,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row" as const,
    gap: theme.spacing.sm,
    minHeight: 54,
    padding: theme.spacing.md
  },
  choiceMarker: {
    alignItems: "center" as const,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center" as const,
    width: 28
  },
  choiceMarkerSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  choiceMarkerText: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "900" as const
  },
  choiceMarkerTextSelected: {
    color: "#FFFFFF"
  },
  choiceText: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: "700" as const,
    lineHeight: 21
  },
  feedback: {
    borderRadius: theme.radius.sm,
    gap: 4,
    padding: theme.spacing.md
  }
};
