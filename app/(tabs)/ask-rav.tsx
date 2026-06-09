import { Text } from "react-native";
import { chaburos, currentUser } from "../../src/data/mockData";
import { Button, Card, Screen, SectionTitle, styles } from "../../src/shared/components";

const chaburah = chaburos.find((item) => item.id === currentUser.chaburahId);

export default function AskRavScreen() {
  return (
    <Screen title="Ask the Rav" eyebrow={chaburah?.rabbiName}>
      <Card>
        <SectionTitle>Submit a Question</SectionTitle>
        <Text style={styles.muted}>
          Participants can send questions to their local rabbi. Private answers will remain visible only to the asker,
          rabbi, and admins once backend permissions are added.
        </Text>
        <Button label="New Question" />
      </Card>

      <Card>
        <SectionTitle>Question Archive</SectionTitle>
        <Text style={styles.muted}>A searchable local halachic Q&A archive will appear here.</Text>
      </Card>
    </Screen>
  );
}
