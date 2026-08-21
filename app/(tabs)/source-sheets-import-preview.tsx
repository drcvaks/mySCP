import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, MetaText, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";
import { theme } from "../../src/shared/theme";
import { sourceSheetPreviewSources, sourceSheetPreviewTitle } from "../../src/data/sourceSheetImportPreview";

export default function SourceSheetsImportPreviewScreen() {
  return (
    <Screen title="Source Sheets Preview" eyebrow="Rabbi Hub">
      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 260 }}>
            <SectionTitle>{sourceSheetPreviewTitle}</SectionTitle>
            <Text style={styles.muted}>Local preview only. This does not read from or write to Supabase.</Text>
          </View>
          <Pill label={`${sourceSheetPreviewSources.length} sources`} tone="primary" />
        </Row>
      </Card>

      <Card>
        <View style={localStyles.previewShell}>
          {sourceSheetPreviewSources.map((source) => (
            <View key={source.number} style={localStyles.sourceCard}>
              <Row>
                <View style={{ flex: 1, minWidth: 260 }}>
                  <MetaText>Source {source.number} - PDF page {source.page}</MetaText>
                  <Text style={localStyles.sourceTitle}>{source.title}</Text>
                </View>
                <View style={localStyles.notePills}>
                  {source.relatedNotes.map((noteCode) => (
                    <Pill key={noteCode} label={noteCode} tone="success" />
                  ))}
                </View>
              </Row>
              <ScrollView horizontal style={localStyles.imageScroll}>
                <Image source={{ uri: source.imageDataUri }} style={localStyles.sourceImage} resizeMode="contain" />
              </ScrollView>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const localStyles = StyleSheet.create({
  previewShell: {
    backgroundColor: "#EEF2F7",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md
  },
  sourceCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D8DEE8",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  sourceTitle: {
    color: theme.colors.ink,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 25
  },
  notePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end"
  },
  imageScroll: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1
  },
  sourceImage: {
    backgroundColor: "#FFFFFF",
    height: 360,
    minWidth: 860
  }
});
