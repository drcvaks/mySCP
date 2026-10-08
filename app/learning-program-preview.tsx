import { Redirect } from "expo-router";
import { useState } from "react";
import { Button, Pill, Row, Screen } from "../src/shared/components";
import { ProgramControls } from "../src/shared/ProgramSelector";
import { legacySummerProgram, SUMMER_PROGRAM, WINTER_PROGRAM } from "../src/shared/learningPrograms";

// Development-only controls demonstration; no user/content data or database writes.
export default function LearningProgramPreview() {
  const [id, setId] = useState(SUMMER_PROGRAM);
  const [defaultId, setDefaultId] = useState(SUMMER_PROGRAM);
  const [weeks, setWeeks] = useState<Record<string, number>>({ [SUMMER_PROGRAM]: 12, [WINTER_PROGRAM]: 1 });
  const [manager, setManager] = useState(true);
  if (!__DEV__) return <Redirect href="/auth" />;
  const programs = [legacySummerProgram, {
    id: WINTER_PROGRAM, name: "Winter 5787", topic: "Challah & Terumos/Maasros", defaultWeek: 1, archived: false
  }];
  return <Screen title="Learning Programs" eyebrow="Local Preview">
    <Row><Pill label="Not saved to Supabase" tone="accent" />
      <Button label={manager ? "Participant View" : "Manager View"} variant="secondary" onPress={() => setManager(!manager)} />
    </Row>
    <ProgramControls canManage={manager} state={{
      programs, programsReady: true, selectedProgramId: id, selectedProgram: programs.find((p) => p.id === id)!,
      selectedChaburahId: "preview", chaburos: [{ id: "preview", defaultProgramId: defaultId }],
      selectProgram: setId, currentReviewWeek: weeks[id], makeProgramDefault: async () => { setDefaultId(id); return null; },
      updateCurrentReviewWeek: async (week) => {
        if (!Number.isInteger(week) || week < 1 || week > 52) return "Week must be between 1 and 52.";
        setWeeks((values) => ({ ...values, [id]: week })); return null;
      }
    }} />
  </Screen>;
}
