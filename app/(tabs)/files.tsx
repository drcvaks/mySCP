import { Text, View } from "react-native";
import { currentUser, learningFiles } from "../../src/data/mockData";
import { Card, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";
import { fileTypeLabel, visibilityLabel } from "../../src/shared/format";

const visibleFiles = learningFiles.filter(
  (file) => file.visibility === "everyone" || file.chaburahId === currentUser.chaburahId
);

export default function FilesScreen() {
  return (
    <Screen title="Files" eyebrow="Source sheets, review sheets, recordings">
      <Card>
        <SectionTitle>Search & Filters</SectionTitle>
        <Text style={styles.muted}>Search by title, topic, or type. Filter by Everyone or My Chaburah.</Text>
        <Row>
          <Pill label="Everyone" tone="primary" />
          <Pill label="My Chaburah" />
          <Pill label="Source Sheets" />
          <Pill label="Review Sheets" />
        </Row>
      </Card>

      {visibleFiles.map((file) => (
        <Card key={file.id}>
          <Row>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{file.title}</Text>
              <Text style={styles.muted}>Week {file.week} · {file.topic}</Text>
            </View>
            <Pill label={fileTypeLabel(file.fileType)} tone="accent" />
          </Row>
          <Text style={styles.muted}>Uploaded by {file.uploadedBy}</Text>
          <Text style={styles.muted}>Visible to {visibilityLabel(file.visibility)}</Text>
        </Card>
      ))}
    </Screen>
  );
}
