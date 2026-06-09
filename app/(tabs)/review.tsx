import { Text, View } from "react-native";
import { reviewQuestions } from "../../src/data/mockData";
import { Button, Card, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";

const selectedWeek = 1;
const currentQuestions = reviewQuestions.filter((question) => question.week === selectedWeek && question.enabled);

export default function ReviewScreen() {
  const firstQuestion = currentQuestions[0];

  return (
    <Screen title="Review" eyebrow="Bechina prep">
      <Card>
        <SectionTitle>Week Selector</SectionTitle>
        <Row>
          {[1, 2, 3, 4, 5, 6, 7].map((week) => (
            <Pill key={week} label={`Week ${week}`} tone={week === selectedWeek ? "primary" : "neutral"} />
          ))}
        </Row>
      </Card>

      <Card>
        <Row>
          <View>
            <Text style={styles.muted}>Week 1 progress</Text>
            <Text style={styles.statNumber}>80%</Text>
          </View>
          <View>
            <Text style={styles.muted}>Best score</Text>
            <Text style={styles.statNumber}>92%</Text>
          </View>
        </Row>
      </Card>

      {firstQuestion ? (
        <Card>
          <Pill label={firstQuestion.topic} tone="accent" />
          <SectionTitle>{firstQuestion.prompt}</SectionTitle>
          {firstQuestion.choices.map((choice) => (
            <Button key={choice} label={choice} variant="secondary" />
          ))}
          <Text style={styles.muted}>Immediate feedback and explanations will appear after an answer.</Text>
        </Card>
      ) : null}

      <Card>
        <SectionTitle>Retry</SectionTitle>
        <Text style={styles.muted}>Participants can retry each week for a better score.</Text>
        <Button label="Retry Week 1" />
      </Card>
    </Screen>
  );
}
