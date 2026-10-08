import { useEffect, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import { useAppState } from "../state/AppState";
import { useAuthState } from "../state/AuthState";
import { Button, FilterChip, FormInput, MetaText, Row, styles } from "./components";

type SelectorProps = {
  manage?: boolean; unsaved?: boolean; disabled?: boolean;
};

export function ProgramSelector({ manage = false, ...props }: SelectorProps) {
  const state = useAppState();
  const { profile } = useAuthState();
  const canManage = manage && !!state.selectedChaburahId && (profile?.role === "global_admin" || state.memberships.some((m) =>
    m.chaburahId === state.selectedChaburahId && m.userId === profile?.id && m.status === "active" && ["rabbi", "admin"].includes(m.memberRole)));
  return <ProgramControls {...props} unsaved={props.unsaved || state.hasUnsavedProgramEdits} state={state} canManage={canManage} />;
}

export function confirmProgramSwitch(): Promise<boolean> {
  const body = "Unsaved edits will be cleared. Saved drafts remain in their original program.";
  if (Platform.OS === "web") return Promise.resolve(window.confirm(body));
  return new Promise((resolve) => {
    Alert.alert("Switch learning program?", body, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Switch", onPress: () => resolve(true) }
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export function confirmDefaultProgram(programName: string, chaburahName: string, otherPrograms: string[]): Promise<boolean> {
  const remaining = otherPrograms.length ? `${otherPrograms.join(", ")} will remain available.` : "Existing content will remain available.";
  const body = `Members of ${chaburahName} will start in ${programName} when they open or reload the app. ${remaining} Week counters won't change.`;
  if (Platform.OS === "web") return Promise.resolve(window.confirm(body));
  return new Promise((resolve) => {
    Alert.alert(`Set ${programName} as Default?`, body, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Set Default", onPress: () => resolve(true) }
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export function ProgramControls({ state, canManage, unsaved = false, disabled = false }: {
  state: Pick<ReturnType<typeof useAppState>, "programs" | "programsReady" | "selectedProgram" | "selectedProgramId" |
    "selectedChaburahId" | "selectProgram" | "currentReviewWeek" | "updateCurrentReviewWeek" | "makeProgramDefault"> &
    { chaburos: { id: string; name?: string; defaultProgramId?: string }[] };
  canManage: boolean; unsaved?: boolean; disabled?: boolean;
}) {
  const { programs, programsReady, selectedProgram, selectedProgramId, selectedChaburahId, selectProgram,
    currentReviewWeek, updateCurrentReviewWeek, makeProgramDefault, chaburos } = state;
  const [showPast, setShowPast] = useState(false);
  const [editingWeek, setEditingWeek] = useState(false);
  const [week, setWeek] = useState(String(currentReviewWeek));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setWeek(String(currentReviewWeek)); setEditingWeek(false); setMessage(""); }, [selectedProgramId, currentReviewWeek, selectedChaburahId]);
  const chaburah = chaburos.find((c) => c.id === selectedChaburahId);

  async function choose(id: string) {
    if (disabled || saving || id === selectedProgramId) return;
    if (unsaved && !(await confirmProgramSwitch())) return;
    selectProgram(id);
  }
  async function saveWeek() {
    setSaving(true);
    const result = await updateCurrentReviewWeek(Number(week));
    setSaving(false);
    setMessage(result ?? "Current week updated for this chaburah and program.");
    if (!result) setEditingWeek(false);
  }
  async function setDefaultProgram() {
    if (disabled || saving) return;
    setSaving(true);
    try {
      const confirmed = await confirmDefaultProgram(selectedProgram.name, chaburah?.name ?? "this chaburah",
        programs.filter((p) => p.id !== selectedProgramId).map((p) => p.name));
      if (!confirmed) return;
      const result = await makeProgramDefault();
      setMessage(result ?? `${selectedProgram.name} is now the default for ${chaburah?.name ?? "this chaburah"}.`);
    } finally {
      setSaving(false);
    }
  }
  return <View style={{ gap: 8, paddingVertical: 8 }}>
    <MetaText>Learning Program</MetaText>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {programs.filter((p) => !p.archived || showPast || p.id === selectedProgramId).map((p) =>
        <FilterChip key={p.id} label={p.name} selected={p.id === selectedProgramId} onPress={() => choose(p.id)} />)}
      {programs.some((p) => p.archived) ? <FilterChip label="Past Programs" selected={showPast} onPress={() => setShowPast(!showPast)} /> : null}
    </View>
    <MetaText>{selectedProgram.topic} - Current Week {currentReviewWeek}</MetaText>
    {canManage && programsReady ? <Row>
      <Button label={editingWeek ? "Cancel Week Change" : "Change Current Week"} variant="secondary"
        disabled={disabled || saving} onPress={() => setEditingWeek(!editingWeek)} />
      {chaburah?.defaultProgramId !== selectedProgramId ? <View style={{ maxWidth: "100%", flexShrink: 1 }}>
        <Button label={`Set ${selectedProgram.name} as Chaburah Default`} variant="secondary" disabled={disabled || saving}
          onPress={() => { void setDefaultProgram(); }} />
      </View> : null}
    </Row> : null}
    {editingWeek ? <Row>
      <View style={{ minWidth: 120, maxWidth: 180, flex: 1 }}>
        <FormInput placeholder="Current Week" value={week} onChangeText={setWeek} keyboardType="numeric" />
      </View>
      <Button label="Save Week" disabled={saving || disabled} onPress={() => { void saveWeek(); }} />
    </Row> : null}
    {!programsReady ? <MetaText>Summer content is available. Install the learning-program migration to enable Winter.</MetaText> : null}
    {message ? <Text style={styles.muted}>{message}</Text> : null}
  </View>;
}
