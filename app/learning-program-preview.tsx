import { Redirect } from "expo-router";
import { useState } from "react";
import { Button, Pill, Row, Screen } from "../src/shared/components";
import { ProgramControls } from "../src/shared/ProgramSelector";
import { legacySummerProgram, rolloutProgramSelection, SUMMER_PROGRAM, TEFILLIN_PROGRAM, WINTER_PROGRAM } from "../src/shared/learningPrograms";

// Development-only controls demonstration; no user/content data or database writes.
export default function LearningProgramPreview() {
  const [requestedId, setId] = useState(WINTER_PROGRAM);
  const [defaultId, setDefaultId] = useState(WINTER_PROGRAM);
  const [weeks, setWeeks] = useState<Record<string, number>>({ [SUMMER_PROGRAM]: 12, [WINTER_PROGRAM]: 1, [TEFILLIN_PROGRAM]: 1 });
  const [manager, setManager] = useState(true);
  const [pilot, setPilot] = useState(true);
  if (!__DEV__) return <Redirect href="/auth" />;
  const programs = [legacySummerProgram, {
    id: WINTER_PROGRAM, name: "Winter 5787", topic: "Challah & Terumos/Maasros", defaultWeek: 1, archived: false
  }, { id: TEFILLIN_PROGRAM, name: "Summer 5787", topic: "Hilchos Tefillin", defaultWeek: 1, archived: false,
    earlyAccess: true, allowedChaburahIds: ["pilot-preview"] }];
  const access = { chaburahId: pilot ? "pilot-preview" : "regular-preview" };
  const id = rolloutProgramSelection(requestedId, programs, true, access);
  return <Screen title="Learning Programs" eyebrow="Local Preview">
    <Row><Pill label="Not saved to Supabase" tone="accent" />
      <Button label={manager ? "Participant View" : "Manager View"} variant="secondary" onPress={() => setManager(!manager)} />
      <Button label={pilot ? "Regular Chaburah View" : "Pilot Chaburah View"} variant="secondary" onPress={() => setPilot(!pilot)} />
    </Row>
    <ProgramControls canManage={manager} access={access} state={{
      programs, programsReady: true, selectedProgramId: id, selectedProgram: programs.find((p) => p.id === id)!,
      selectedChaburahId: access.chaburahId, chaburos: [{ id: access.chaburahId, defaultProgramId: defaultId }],
      selectProgram: setId, currentReviewWeek: weeks[id], makeProgramDefault: async () => { setDefaultId(id); return null; },
      updateCurrentReviewWeek: async (week) => {
        if (!Number.isInteger(week) || week < 1 || week > 52) return "Week must be between 1 and 52.";
        setWeeks((values) => ({ ...values, [id]: week })); return null;
      }
    }} />
  </Screen>;
}
