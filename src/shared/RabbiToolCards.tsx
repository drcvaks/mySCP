import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { useAppState } from "../state/AppState";
import { belongsToProgram } from "./learningPrograms";
import { availableContentWidth } from "./responsiveLayout";
import { RabbiTool } from "./RabbiToolSwitcher";
import { SectionTitle } from "./components";
import { WorkflowCard } from "./WorkflowCard";

export function useExpandedRabbiTools() {
  const { width, height } = useWindowDimensions();
  return Platform.OS === "web" && height >= 600 && availableContentWidth(width, height) >= 900;
}

export function RabbiToolCards({ active, askRavEnabled, beisMidrashEnabled = false, localTools = true, onSelect }: {
  active: RabbiTool; askRavEnabled: boolean; beisMidrashEnabled?: boolean; localTools?: boolean; onSelect: (tool: RabbiTool) => void;
}) {
  const { askRavQuestions, reviewQuestions, currentReviewWeek, selectedProgramId, selectedChaburahId } = useAppState();
  const open = askRavQuestions.filter(question => !!selectedChaburahId && question.chaburahId === selectedChaburahId && question.status === "submitted").length;
  const weekly = reviewQuestions.filter(question => !!selectedChaburahId && question.chaburahId === selectedChaburahId &&
    belongsToProgram(question, selectedProgramId) && question.week === currentReviewWeek && !question.isLibraryQuestion);
  const published = weekly.filter(question => question.publicationStatus === "published").length;
  const drafts = weekly.filter(question => question.publicationStatus === "draft").length;
  const tools: { key: RabbiTool; label: string; meta: string; count?: number; countLabel?: string; visible: boolean }[] = [
    { key: "ask-rav", label: "Ask Rav Inbox", meta: "Participant questions waiting for a Rav response.", count: open, countLabel: "open", visible: localTools && askRavEnabled },
    { key: "shiur-builder", label: "Shiur Builder", meta: "Prepare for shiur and publish packets from official SCP material.", visible: localTools },
    { key: "quick-review", label: "Quick Review Questions", meta: `Short weekly quizzes for participants. Week ${currentReviewWeek}: ${drafts} ${drafts === 1 ? "draft" : "drafts"}.`, count: published, countLabel: "published", visible: localTools },
    { key: "beis-midrash", label: "Beis Midrash", meta: "Worldwide discussions and learning with SCP Rabbonim.", visible: beisMidrashEnabled }
  ];
  return <View style={s.section}>
    <SectionTitle icon="library-outline">Rabbi Tools</SectionTitle>
    <View style={s.row} accessibilityRole="tablist" accessibilityLabel="Rabbi tools">
      {tools.filter(tool => tool.visible).map(tool => <WorkflowCard key={tool.key} equalWidth navigationLabel={tool.label}
        label={tool.label} meta={tool.meta} count={tool.count} countLabel={tool.countLabel} active={active === tool.key}
        onPress={() => { if (active !== tool.key) onSelect(tool.key); }} />)}
    </View>
  </View>;
}
const s = StyleSheet.create({
  section: { gap: 12 },
  row: { flexDirection: "row", alignItems: "stretch", gap: 12 }
});
