export const SUMMER_PROGRAM = "summer-5786";
export const WINTER_PROGRAM = "winter-5787";

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

export function belongsToProgram(item: { programId?: string }, programId: string) {
  return (item.programId ?? SUMMER_PROGRAM) === programId;
}

export function programName(programId?: string, programs: LearningProgram[] = []) {
  const id = programId ?? SUMMER_PROGRAM;
  return programs.find((p) => p.id === id)?.name ??
    (id === SUMMER_PROGRAM ? "Summer 5786" : id === WINTER_PROGRAM ? "Winter 5787" : id);
}
