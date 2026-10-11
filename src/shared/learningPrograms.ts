export const SUMMER_PROGRAM = "summer-5786";
export const WINTER_PROGRAM = "winter-5787";
// Disable after the Winter rollout to restore the multi-program selector.
export const WINTER_ONLY_ROLLOUT = true;

export interface LearningProgram {
  id: string;
  name: string;
  topic: string;
  defaultWeek: number;
  archived: boolean;
}

export const legacySummerProgram: LearningProgram = {
  id: SUMMER_PROGRAM, name: "Summer 5786", topic: "Nat Bar Nat", defaultWeek: 12, archived: false
};

export function selectablePrograms(programs: LearningProgram[]) {
  return WINTER_ONLY_ROLLOUT && programs.some((p) => p.id === WINTER_PROGRAM)
    ? programs.filter((p) => p.id === WINTER_PROGRAM) : programs;
}

export function rolloutProgramSelection(requested: string | undefined, programs: LearningProgram[], ready: boolean) {
  return ready && WINTER_ONLY_ROLLOUT && programs.some((p) => p.id === WINTER_PROGRAM)
    ? WINTER_PROGRAM : requested ?? SUMMER_PROGRAM;
}

export function belongsToProgram(item: { programId?: string }, programId: string) {
  return (item.programId ?? SUMMER_PROGRAM) === programId;
}

export function programName(programId?: string, programs: LearningProgram[] = []) {
  const id = programId ?? SUMMER_PROGRAM;
  return programs.find((p) => p.id === id)?.name ??
    (id === SUMMER_PROGRAM ? "Summer 5786" : id === WINTER_PROGRAM ? "Winter 5787" : id);
}
