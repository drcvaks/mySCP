import { useMemo, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import {
  Button,
  Card,
  FilterChip,
  MetaText,
  Pill,
  Row,
  Screen,
  SearchField,
  SectionTitle,
  styles
} from "../../src/shared/components";
import { fileCoverageDetailLabel, fileCoverageLabel, fileTypeLabel, visibilityLabel } from "../../src/shared/format";
import { buildReviewWeeks, currentReviewWeek } from "../../src/shared/reviewWeeks";
import { FileCoverage, FileType, Visibility } from "../../src/shared/types";
import { useAppState } from "../../src/state/AppState";
import { useAuthState } from "../../src/state/AuthState";
import { supabase } from "../../src/lib/supabase";

const fileTypes: Array<FileType | "all"> = ["all", "source_sheet", "review_sheet", "recording", "video", "pdf", "other"];
const scopes: Array<Visibility | "all"> = ["all", "everyone", "chaburah"];
const coverages: Array<FileCoverage | "all"> = ["all", "week", "bechina_review", "entire_zman"];

export default function FilesScreen() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<FileType | "all">("all");
  const [selectedScope, setSelectedScope] = useState<Visibility | "all">("all");
  const [selectedCoverage, setSelectedCoverage] = useState<FileCoverage | "all">("all");
  const [selectedWeek, setSelectedWeek] = useState(currentReviewWeek);
  const { chaburos, learningFiles, selectedChaburahId } = useAppState();
  const { profile } = useAuthState();
  const isGlobalAdmin = profile?.role === "global_admin";

  const visibleFiles = useMemo(
    () =>
      isGlobalAdmin
        ? learningFiles
        : learningFiles.filter((file) => file.visibility === "everyone" || file.chaburahId === selectedChaburahId),
    [isGlobalAdmin, learningFiles, selectedChaburahId]
  );
  const fileWeeks = useMemo(
    () =>
      buildReviewWeeks(
        Math.max(
          0,
          ...visibleFiles
            .filter((file) => file.coverage === "week")
            .map((file) => file.week ?? 0)
        )
      ),
    [visibleFiles]
  );

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visibleFiles.filter((file) => {
      const matchesSearch =
        query.length === 0 ||
        file.title.toLowerCase().includes(query) ||
        file.topic.toLowerCase().includes(query) ||
        fileTypeLabel(file.fileType).toLowerCase().includes(query);
      const matchesType = selectedType === "all" || file.fileType === selectedType;
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
    let targetUrl = file.url;
    if (!targetUrl && file.storagePath) {
      const { data, error } = await supabase.storage
        .from("learning-files")
        .createSignedUrl(file.storagePath, 60);
      if (error) {
        Alert.alert("Cannot Open File", error.message);
        return;
      }
      targetUrl = data.signedUrl;
    }

    if (!targetUrl) {
      Alert.alert(
        file.title,
        "This file record does not have an uploaded object or external URL."
      );
      return;
    }

    try {
      await Linking.openURL(targetUrl);
    } catch (openError) {
      Alert.alert(
        "Cannot Open File",
        openError instanceof Error ? openError.message : "This device could not open the file URL."
      );
    }
  }

  return (
    <Screen title="Files" eyebrow="Source sheets, review sheets, recordings">
      <Card>
        <SectionTitle>Find Learning Materials</SectionTitle>
        <Text style={styles.muted}>Organized by title, topic, coverage, type, and scope.</Text>
        <SearchField onChangeText={setSearch} placeholder="Search by title, topic, or type..." value={search} />

        <View style={{ gap: 8 }}>
          <MetaText>Scope</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {scopes.map((scope) => (
              <FilterChip
                key={scope}
                label={scopeLabel(scope, isGlobalAdmin)}
                onPress={() => setSelectedScope(scope)}
                selected={selectedScope === scope}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <MetaText>Type</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {fileTypes.map((type) => (
              <FilterChip
                key={type}
                label={type === "all" ? "All Types" : fileTypeLabel(type)}
                onPress={() => setSelectedType(type)}
                selected={selectedType === type}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
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
          <View style={{ gap: 8 }}>
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
        <Card>
          <SectionTitle>No Files Found</SectionTitle>
          <Text style={styles.muted}>Try a different search term or filter.</Text>
        </Card>
      ) : (
        filteredFiles.map((file) => (
          <Card key={file.id}>
            <Row>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Text style={styles.sectionTitle}>{file.title}</Text>
                <Text style={styles.muted}>{fileCoverageDetailLabel(file.coverage, file.week)} - {file.topic}</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <Pill label={fileTypeLabel(file.fileType)} tone="accent" />
                <View style={{ minWidth: 112 }}>
                  <Button
                    label={file.url || file.storagePath ? "Open" : "Details"}
                    onPress={() => openFile(file.id)}
                    variant="secondary"
                  />
                </View>
              </View>
            </Row>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {isGlobalAdmin ? (
                <Pill
                  label={file.visibility === "everyone" ? "Everyone" : chaburahFileLabel(file.chaburahId, chaburos)}
                  tone={file.visibility === "everyone" ? "primary" : "neutral"}
                />
              ) : (
                <Pill label={visibilityLabel(file.visibility)} tone={file.visibility === "everyone" ? "primary" : "neutral"} />
              )}
              <Pill label={`By ${uploaderLabel(file, isGlobalAdmin, profile)}`} />
            </View>

          </Card>
        ))
      )}
    </Screen>
  );
}

function scopeLabel(scope: Visibility | "all", isGlobalAdmin: boolean) {
  if (scope === "all") return "All";
  if (scope === "chaburah" && isGlobalAdmin) return "Chaburah Files";
  return visibilityLabel(scope);
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
