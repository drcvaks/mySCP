import { useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../lib/supabase";
import { Json } from "../lib/database.types";
import { useAppState } from "../state/AppState";
import { useAuthState } from "../state/AuthState";
import { Button, Card, FilterChip, MetaText, Pill, Row, SectionTitle, StatusBanner, styles } from "./components";
import { LearningProgram, selectablePrograms } from "./learningPrograms";
import { CsvIssue, MAX_REVIEW_CSV_BYTES, parseReviewQuestionCsv, REVIEW_CSV_TEMPLATE, ReviewCsvResult, ReviewImportQuestion, reviewImportWeeks } from "./reviewQuestionCsv";

export interface ImportPreview {
  program_id: string; row_count: number; new_count: number; skipped_count: number; errors: CsvIssue[]; committed: boolean;
}

export function confirmReviewImport(program: string, count: number, skipped: number): Promise<boolean> {
  const message = `Add ${count} questions to the ${program} public review library? ${skipped} identical questions will be skipped. No questions will be published to a chaburah.`;
  if (Platform.OS === "web") return Promise.resolve(window.confirm(message));
  return new Promise(resolve => Alert.alert("Import Public Questions?", message, [
    { text: "Cancel", style: "cancel", onPress: () => resolve(false) }, { text: "Import", onPress: () => resolve(true) }
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}

export function PublicReviewCsvImport() {
  const { profile } = useAuthState();
  const { programs, programsReady, refresh } = useAppState();
  if (profile?.role !== "global_admin") return null;
  return <PublicReviewCsvImportTool programs={programs} programsReady={programsReady} refresh={refresh}
    request={async (programId, rows, commit) => {
      const { data, error } = await supabase.rpc("import_public_review_library", {
        target_program_id: programId, questions: rows as unknown as Json, apply_import: commit
      });
      if (error) throw new Error(error.code === "PGRST202" ? "CSV import is not installed in Supabase yet." : error.message);
      return data as unknown as ImportPreview;
    }} />;
}

export function PublicReviewCsvImportTool({ programs, programsReady, refresh, request }: {
  programs: LearningProgram[]; programsReady: boolean; refresh: () => Promise<unknown>;
  request: (programId: string, rows: ReviewImportQuestion[], commit: boolean) => Promise<ImportPreview>;
}) {
  const [programId, setProgramId] = useState("");
  const [filename, setFilename] = useState("");
  const [parsed, setParsed] = useState<ReviewCsvResult | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const available = selectablePrograms(programs, { isGlobalAdmin: true }).filter(program => !program.archived);
  const program = available.find(item => item.id === programId);
  const errors = [...(parsed?.errors ?? []), ...(preview?.errors ?? [])];
  const question = parsed?.rows[index];
  const canValidate = !!program && !!parsed?.rows.length && !parsed.errors.length;

  async function chooseCsv() {
    setBusy(true);
    setMessage("");
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/comma-separated-values", "application/vnd.ms-excel", "text/plain"], copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      setParsed(null); setPreview(null); setIndex(0); setFilename(asset.name);
      if (!asset.name.toLowerCase().endsWith(".csv")) throw new Error("Choose a .csv file, not an Excel workbook.");
      if ((asset.size ?? 0) > MAX_REVIEW_CSV_BYTES) throw new Error("CSV must be 2 MB or smaller.");
      const text = Platform.OS === "web" && asset.file
        ? await asset.file.text()
        : Platform.OS === "web" ? await (await fetch(asset.uri)).text()
        : await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      setParsed(parseReviewQuestionCsv(text));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to read CSV."); }
    finally { setBusy(false); }
  }

  async function checkOrImport(commit: boolean) {
    if (!canValidate || busy || !parsed || !program || (commit && (!preview || preview.errors.length || preview.new_count === 0))) return;
    setBusy(true); setMessage("");
    try {
      if (commit && !(await confirmReviewImport(program.name, preview!.new_count, preview!.skipped_count))) return;
      const result = await request(program.id, parsed.rows, commit);
      setPreview(result);
      if (commit && result.committed) {
        setMessage(`Imported ${result.new_count} questions into ${program.name}. Skipped ${result.skipped_count} identical questions.`);
        await refresh();
      }
    } catch (error) { setPreview(null); setMessage(error instanceof Error ? error.message : "Import could not be confirmed. Validate again before retrying."); }
    finally { setBusy(false); }
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob(["\uFEFF" + REVIEW_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "mySCP_Public_Review_Questions_Template.csv";
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <Card>
    <SectionTitle icon="cloud-upload-outline">Public Review Library</SectionTitle>
    <MetaText>Import from CSV</MetaText>
    <MetaText>Learning Program</MetaText>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {available.map(item => <FilterChip key={item.id} label={item.name} selected={programId === item.id}
        onPress={() => { if (!busy) { setProgramId(item.id); setPreview(null); setMessage(""); } }} />)}
    </View>
    {program ? <MetaText>{program.topic}</MetaText> : null}
    <Row>
      <Button label="Choose CSV" variant="secondary" disabled={busy || !programsReady} onPress={chooseCsv} />
      {Platform.OS === "web" ? <Button label="Download CSV Template" variant="ghost" onPress={downloadTemplate} /> : null}
    </Row>
    {filename ? <MetaText>{filename}</MetaText> : null}
    <StatusBanner message={message} tone={preview?.committed ? "success" : "error"} />
    {!programsReady ? <MetaText>Learning programs are not configured.</MetaText> : null}
    {parsed ? <>
      <Row><Pill label={`${parsed.rows.length} valid questions`} tone="primary" /><Pill label={`${parsed.rows.filter(row => row.is_model_question).length} model`} tone="success" />
        <Pill label={`${parsed.rows.filter(row => !row.is_model_question).length} extra`} /></Row>
      {errors.length ? <ScrollView style={{ maxHeight: 180 }} contentContainerStyle={{ gap: 4 }}>
        {errors.slice(0,50).map((error,i) => <Text key={i} style={{ color: "#B42318", fontSize: 13 }}>Row {error.row || "-"}: {error.message}</Text>)}
        {errors.length > 50 ? <MetaText>{errors.length - 50} more errors</MetaText> : null}
      </ScrollView> : null}
      {parsed.warnings.map(warning => <StatusBanner key={warning} message={warning} tone="info" />)}
      <ScrollView style={{ maxHeight: 160 }} contentContainerStyle={{ gap: 4 }}>
        {reviewImportWeeks(parsed.rows).map(week => <MetaText key={week.week}>Week {week.week}: {week.count} questions / {week.model} model / {week.count - week.model} extra</MetaText>)}
      </ScrollView>
      {question ? <View style={{ borderTopWidth: 1, borderColor: "#DDE5EF", paddingTop: 12, gap: 8 }}>
        <MetaText>Question {index + 1} of {parsed.rows.length} - Week {question.week} - {question.is_model_question ? "Model" : "Extra"}</MetaText>
        <Text style={styles.body}>{question.prompt}</Text>
        {question.choices.map((choice,i) => <Text key={i} style={[styles.body, i === question.correct_choice_index && { fontWeight: "700", color: "#167347" }]}>{"ABCD"[i]}. {choice}</Text>)}
        <MetaText>{question.explanation}</MetaText>
        <Row><Button label="Previous" variant="secondary" disabled={index === 0 || busy} onPress={() => setIndex(value => value-1)} />
          <Button label="Next" variant="secondary" disabled={index === parsed.rows.length-1 || busy} onPress={() => setIndex(value => value+1)} /></Row>
      </View> : null}
      {preview && !preview.errors.length ? <MetaText>{preview.new_count} new / {preview.skipped_count} identical existing questions{preview.committed ? " / Imported" : ""}</MetaText> : null}
      <Row>
        <Button label={busy ? "Checking..." : "Validate Import"} variant="secondary" disabled={!canValidate || busy || preview?.committed} onPress={() => checkOrImport(false)} />
        <Button label={busy ? "Working..." : `Import ${preview?.new_count ?? ""} Questions`.replace("  "," ")}
          disabled={busy || !preview || preview.errors.length > 0 || preview.new_count === 0 || preview.committed}
          onPress={() => checkOrImport(true)} />
      </Row>
    </> : null}
  </Card>;
}
