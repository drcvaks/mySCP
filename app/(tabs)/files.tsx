import { ProgramSelector } from "../../src/shared/ProgramSelector";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  FilterChip,
  IconTile,
  MetaText,
  Pill,
  Row,
  Screen,
  SearchField,
  SectionTitle,
  SegmentedTabs,
  styles
} from "../../src/shared/components";
import { fileCoverageDetailLabel, fileCoverageLabel, fileTypeLabel, learningFileTypeLabel, visibilityLabel } from "../../src/shared/format";
import { buildProgramWeeks, fallbackCurrentReviewWeek } from "../../src/shared/reviewWeeks";
import { FileCoverage, FileType, LearningFile, Visibility } from "../../src/shared/types";
import { useRefreshOnFocus } from "../../src/shared/useRefreshOnFocus";
import { useAppState } from "../../src/state/AppState";
import { useAuthState } from "../../src/state/AuthState";
import { openLearningFile } from "../../src/shared/openLearningFile";
import { PacketPreviewModal } from "../../src/shared/PacketPreviewModal";
import { materialTextStyle } from "../../src/shared/materialLanguages";
import { theme } from "../../src/shared/theme";
import { Ionicons } from "@expo/vector-icons";

type FileTypeFilter = FileType | "all" | "qa_packet";

const fileTypes: Array<FileTypeFilter> = ["all", "source_sheet", "review_sheet", "qa_packet", "recording", "video", "pdf", "other"];
const scopes: Array<Visibility | "all"> = ["all", "everyone", "chaburah"];
const coverages: Array<FileCoverage | "all"> = ["all", "week", "bechina_review", "entire_zman"];

export default function FilesScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<FileTypeFilter>("all");
  const [selectedScope, setSelectedScope] = useState<Visibility | "all">("all");
  const [selectedCoverage, setSelectedCoverage] = useState<FileCoverage | "all">("all");
  const [selectedWeek, setSelectedWeek] = useState(fallbackCurrentReviewWeek);
  const [previewPacketId, setPreviewPacketId] = useState<string | null>(null);
  const { chaburos, currentReviewWeek, learningFiles, loading, refresh, selectedChaburahId, selectedProgramId, selectedProgram } = useAppState();
  const { profile } = useAuthState();
  const isGlobalAdmin = profile?.role === "global_admin";
  useRefreshOnFocus(refresh);

  useEffect(() => {
    setSelectedWeek((week) => (week === fallbackCurrentReviewWeek ? currentReviewWeek : week));
  }, [currentReviewWeek]);
  useEffect(() => { setSelectedWeek(currentReviewWeek); setPreviewPacketId(null); }, [selectedProgramId, selectedChaburahId]);

  const visibleFiles = useMemo(
    () =>
      isGlobalAdmin
        ? learningFiles
        : learningFiles.filter((file) => file.visibility === "everyone" || file.chaburahId === selectedChaburahId),
    [isGlobalAdmin, learningFiles, selectedChaburahId]
  );
  const fileWeeks = useMemo(
    () =>
      buildProgramWeeks(selectedProgramId,
        currentReviewWeek,
        Math.max(
          0,
          ...visibleFiles
            .filter((file) => file.coverage === "week")
            .map((file) => file.week ?? 0)
        )
      ),
    [currentReviewWeek, visibleFiles, selectedProgramId]
  );

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visibleFiles.filter((file) => {
      const matchesSearch =
        query.length === 0 ||
        file.title.toLowerCase().includes(query) ||
        file.topic.toLowerCase().includes(query) ||
        learningFileTypeLabel(file).toLowerCase().includes(query);
      const matchesType = matchesFileTypeFilter(file, selectedType);
      const matchesScope = selectedScope === "all" || file.visibility === selectedScope;
      const matchesCoverage =
        selectedCoverage === "all" ||
        (selectedCoverage === "week"
          ? file.coverage === "week" && file.week === selectedWeek
          : file.coverage === selectedCoverage);
      return matchesSearch && matchesType && matchesScope && matchesCoverage;
    });
  }, [search, selectedCoverage, selectedScope, selectedType, selectedWeek, visibleFiles]);

  function selectCoverage(coverage: FileCoverage | "all") {
    setSelectedCoverage(coverage);
    if (coverage === "week") {
      setSelectedWeek(currentReviewWeek);
    }
  }

  async function openFile(fileId: string) {
    const file = learningFiles.find((item) => item.id === fileId);
    if (!file) return;
    if (file.fileType === "custom_review_packet" && file.reviewPacketId) {
      setPreviewPacketId(file.reviewPacketId);
      return;
    }
    await openLearningFile(file);
  }

  const hasFilters = Boolean(search.trim()) || selectedType !== "all" || selectedScope !== "all" || selectedCoverage !== "all";

  return (
    <Screen title="Files" eyebrow="Source sheets, review sheets, recordings" onRefresh={refresh} refreshing={loading} programSelector={<ProgramSelector />}>
      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle icon="folder-open-outline">Find Learning Materials</SectionTitle>
            <Text style={styles.muted}>Organized by title, topic, coverage, type, and scope.</Text>
          </View>
          {hasFilters ? (
            <Button
              label="Reset Filters"
              variant="secondary"
              compact
              onPress={() => {
                setSearch("");
                setSelectedType("all");
                setSelectedScope("all");
                setSelectedCoverage("all");
              }}
            />
          ) : null}
        </Row>

        <SearchField onChangeText={setSearch} placeholder="Search by title, topic, or type..." value={search} />

        <SegmentedTabs
          options={scopes.map((scope) => ({
            key: scope,
            label: scopeLabel(scope, isGlobalAdmin),
            count:
              scope === "all"
                ? visibleFiles.length
                : visibleFiles.filter((f) => f.visibility === scope).length
          }))}
          value={selectedScope}
          onChange={setSelectedScope}
        />

        <View style={{ gap: 6 }}>
          <MetaText>Format</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {fileTypes.map((type) => (
              <FilterChip
                key={type}
                label={fileTypeFilterLabel(type)}
                onPress={() => setSelectedType(type)}
                selected={selectedType === type}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <MetaText>Coverage</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {coverages.map((coverage) => (
              <FilterChip
                key={coverage}
                label={coverage === "all" ? "All Files" : coverage === "week" ? "Week" : fileCoverageLabel(coverage)}
                onPress={() => selectCoverage(coverage)}
                selected={selectedCoverage === coverage}
              />
            ))}
          </View>
        </View>

        {selectedCoverage === "week" ? (
          <View style={{ gap: 6 }}>
            <MetaText>Current week is Week {currentReviewWeek}</MetaText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {fileWeeks.map((week) => (
                <FilterChip
                  key={week}
                  label={`Week ${week}`}
                  onPress={() => setSelectedWeek(week)}
                  selected={selectedWeek === week}
                />
              ))}
            </View>
          </View>
        ) : null}
      </Card>

      <Row>
        <SectionTitle>{filteredFiles.length} Files</SectionTitle>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Pill label={scopeLabel(selectedScope, isGlobalAdmin)} tone="accent" />
          <Pill
            label={
              selectedCoverage === "all"
                ? "All files"
                : selectedCoverage === "week"
                  ? `Week ${selectedWeek}`
                  : fileCoverageLabel(selectedCoverage)
            }
            tone="primary"
          />
        </View>
      </Row>

      {filteredFiles.length === 0 ? (
        <EmptyState icon="folder-open-outline" title="No Files Found" body="Try a different search term or filter." />
      ) : (
        <View style={[s.grid, wide && s.gridWide]}>
          {filteredFiles.map((file) => (
            <View key={file.id} style={[s.fileCard, wide && s.fileCardWide]}>
              <View style={s.fileTopRow}>
                <View style={{ flex: 1, minWidth: 200, flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                  <IconTile
                    icon={fileIcon(file)}
                    tone={file.fileType === "recording" || file.fileType === "video" || file.fileType === "custom_review_packet" ? "accent" : "brand"}
                    size={42}
                  />
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text testID={`file-title-${file.id}`} style={[styles.sectionTitle, { fontSize: 16, lineHeight: 22 }, materialTextStyle(file.language)]}>
                      {file.title}
                    </Text>
                    <Text style={styles.muted}>
                      {fileCoverageDetailLabel(file.coverage, file.week)} - {file.topic}
                    </Text>
                    {file.description ? (
                      <Text numberOfLines={2} style={[styles.muted, { fontSize: 12 }]}>
                        {file.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <Pill label={learningFileTypeLabel(file)} tone="accent" />
                  <View style={{ minWidth: 96 }}>
                    <Button
                      label={file.fileType === "custom_review_packet" || file.url || file.storagePath ? "Open" : "Details"}
                      onPress={() => openFile(file.id)}
                      variant="primary"
                      compact
                    />
                  </View>
                </View>
              </View>

              <View style={s.pillsRow}>
                {isGlobalAdmin ? (
                  <Pill
                    label={file.visibility === "everyone" ? "Everyone" : chaburahFileLabel(file.chaburahId, chaburos)}
                    tone={file.visibility === "everyone" ? "primary" : "neutral"}
                  />
                ) : (
                  <Pill label={visibilityLabel(file.visibility)} tone={file.visibility === "everyone" ? "primary" : "neutral"} />
                )}
                <Pill label={`By ${uploaderLabel(file, isGlobalAdmin, profile)}`} />
                <Pill label={selectedProgram.name} />
                <Pill label={file.language === "he" ? "Hebrew" : "English"} />
              </View>
            </View>
          ))}
        </View>
      )}
      <PacketPreviewModal
        packetId={previewPacketId}
        visible={Boolean(previewPacketId)}
        onClose={() => setPreviewPacketId(null)}
      />
    </Screen>
  );
}

function fileIcon(file: LearningFile): keyof typeof Ionicons.glyphMap {
  const label = learningFileTypeLabel(file);
  if (label === "Q&A") return "help-circle-outline";
  if (file.fileType === "video") return "videocam-outline";
  if (file.fileType === "recording") return "mic-outline";
  if (file.fileType === "link") return "link-outline";
  if (file.fileType === "pdf") return "document-outline";
  if (file.fileType === "review_sheet" || label === "Review Notes") return "reader-outline";
  return "document-text-outline";
}

function scopeLabel(scope: Visibility | "all", isGlobalAdmin: boolean) {
  if (scope === "all") return "All";
  if (scope === "chaburah" && isGlobalAdmin) return "Chaburah Files";
  return visibilityLabel(scope);
}

function fileTypeFilterLabel(type: FileTypeFilter) {
  if (type === "all") return "All Types";
  if (type === "qa_packet") return "Q&A";
  if (type === "review_sheet") return "Review Notes";
  return fileTypeLabel(type);
}

function matchesFileTypeFilter(file: LearningFile, selectedType: FileTypeFilter) {
  if (selectedType === "all") return true;
  const materialLabel = learningFileTypeLabel(file);
  if (selectedType === "source_sheet") return file.fileType === "source_sheet" || materialLabel === "Source Sheets";
  if (selectedType === "review_sheet") return file.fileType === "review_sheet" || materialLabel === "Review Notes";
  if (selectedType === "qa_packet") return materialLabel === "Q&A";
  return file.fileType === selectedType;
}

function chaburahFileLabel(chaburahId: string | undefined, chaburos: { id: string; name: string }[]) {
  if (!chaburahId) return "Unassigned Chaburah";
  return chaburos.find((chaburah) => chaburah.id === chaburahId)?.name ?? "Unknown Chaburah";
}

function uploaderLabel(
  file: { uploadedBy: string; uploadedByName?: string; visibility: Visibility },
  isGlobalAdmin: boolean,
  profile: { id: string; fullName?: string; email?: string } | null
) {
  if (file.uploadedByName) return file.uploadedByName;
  if (profile?.id === file.uploadedBy) return profile.fullName || profile.email || "You";
  if (isGlobalAdmin) return file.uploadedBy;
  return file.visibility === "everyone" ? "Program" : "Local Admin";
}

const s = StyleSheet.create({
  grid: {
    gap: 12
  },
  gridWide: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  fileCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 12,
    justifyContent: "space-between",
    padding: 16,
    ...theme.shadows.card
  },
  fileCardWide: {
    flexBasis: "48.8%",
    flexGrow: 1,
    minWidth: 340
  },
  fileTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between"
  },
  pillsRow: {
    borderTopColor: theme.colors.borderSoft,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 10
  }
});
