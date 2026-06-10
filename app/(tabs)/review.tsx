import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { reviewQuestions } from "../../src/data/mockData";
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

const weeks = [1, 2, 3, 4, 5, 6, 7];

export default function ReviewScreen() {
  const [selectedWeek, setSelectedWeek] = useState<number | "all">(1);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  const currentQuestions = useMemo(
    () =>
      reviewQuestions.filter(
        (question) => question.enabled && (selectedWeek === "all" || question.week === selectedWeek)
      ),
    [selectedWeek]
  );
  const firstQuestion = currentQuestions[0];
  const answered = selectedChoice !== null;
  const isCorrect = answered && firstQuestion ? selectedChoice === firstQuestion.correctChoiceIndex : false;

  function chooseWeek(week: number | "all") {
    setSelectedWeek(week);
    setSelectedChoice(null);
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
            onPress={() => chooseWeek("all")}
            selected={selectedWeek === "all"}
          />
          {weeks.map((week) => {
            const count = reviewQuestions.filter((question) => question.enabled && question.week === week).length;
            return (
              <FilterChip
                key={week}
                label={`Week ${week} (${count})`}
                onPress={() => chooseWeek(week)}
                selected={selectedWeek === week}
              />
            );
          })}
        </View>
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Text style={styles.muted}>{selectedWeek === "all" ? "All weeks" : `Week ${selectedWeek}`} progress</Text>
            <Text style={styles.statNumber}>80%</Text>
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Text style={styles.muted}>Best score</Text>
            <Text style={styles.statNumber}>92%</Text>
          </View>
        </Row>
        <ProgressBar value={80} />
      </Card>

      {firstQuestion ? (
        <Card>
          <Row>
            <Pill label={`Week ${firstQuestion.week}`} tone="primary" />
            <Pill label={firstQuestion.kind === "true_false" ? "True / False" : "Multiple Choice"} tone="accent" />
          </Row>
          <Text style={[styles.sectionTitle, { fontSize: 20, lineHeight: 28 }]}>{firstQuestion.prompt}</Text>

          <View style={{ gap: 10 }}>
            {firstQuestion.choices.map((choice, index) => {
              const isSelected = selectedChoice === index;
              const isAnswer = index === firstQuestion.correctChoiceIndex;
              const feedbackStyle = answered
                ? isAnswer
                  ? { backgroundColor: theme.colors.successSoft, borderColor: theme.colors.success }
                  : isSelected
                    ? { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger }
                    : {}
                : {};

              return (
                <Pressable
                  accessibilityRole="button"
                  disabled={answered}
                  key={choice}
                  onPress={() => setSelectedChoice(index)}
                  style={[choiceStyles.choice, feedbackStyle]}
                >
                  <View
                    style={[
                      choiceStyles.choiceMarker,
                      (isSelected || (answered && isAnswer)) && choiceStyles.choiceMarkerSelected
                    ]}
                  >
                    <Text
                      style={[
                        choiceStyles.choiceMarkerText,
                        (isSelected || (answered && isAnswer)) && choiceStyles.choiceMarkerTextSelected
                      ]}
                    >
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text style={choiceStyles.choiceText}>{choice}</Text>
                </Pressable>
              );
            })}
          </View>

          {answered ? (
            <View
              style={[
                choiceStyles.feedback,
                { backgroundColor: isCorrect ? theme.colors.successSoft : theme.colors.dangerSoft }
              ]}
            >
              <Text style={[styles.body, { color: isCorrect ? theme.colors.success : theme.colors.danger, fontWeight: "900" }]}>
                {isCorrect ? "Correct" : "Not quite"}
              </Text>
              <MetaText>{firstQuestion.explanation}</MetaText>
            </View>
          ) : (
            <MetaText>Select an answer to see immediate feedback and the explanation.</MetaText>
          )}

          <Button label="Reset Question" onPress={() => setSelectedChoice(null)} variant="secondary" />
        </Card>
      ) : (
        <Card>
          <SectionTitle>No Questions Yet</SectionTitle>
          <Text style={styles.muted}>There are no enabled review questions for this selection.</Text>
        </Card>
      )}

      <Card>
        <SectionTitle>Retry</SectionTitle>
        <Text style={styles.muted}>Participants can retry each week for a better score.</Text>
        <Button label={selectedWeek === "all" ? "Retry All Weeks" : `Retry Week ${selectedWeek}`} onPress={() => setSelectedChoice(null)} />
      </Card>
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
