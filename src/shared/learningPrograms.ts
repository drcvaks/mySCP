export const SUMMER_PROGRAM = "summer-5786";
export const WINTER_PROGRAM = "winter-5787";
export const TEFILLIN_PROGRAM = "summer-5787";
// Hide the old test program while retaining access to authorized new programs.
export const WINTER_ONLY_ROLLOUT = true;

export interface LearningProgram {
  id: string;
  name: string;
  topic: string;
  defaultWeek: number;
  archived: boolean;
  earlyAccess?: boolean;
  allowedChaburahIds?: string[];
}

export interface ProgramAccessContext {
  chaburahId?: string;
  isGlobalAdmin?: boolean;
}

export const legacySummerProgram: LearningProgram = {
  id: SUMMER_PROGRAM, name: "Summer 5786", topic: "Nat Bar Nat", defaultWeek: 12, archived: false
};

export function rolloutPrograms(programs: LearningProgram[]) {
  const hideLegacy = WINTER_ONLY_ROLLOUT && programs.some((p) => p.id === WINTER_PROGRAM);
  return programs.filter((p) => !hideLegacy || p.id !== SUMMER_PROGRAM);
}

export function selectablePrograms(programs: LearningProgram[], access: ProgramAccessContext = {}) {
  return rolloutPrograms(programs).filter((p) =>
    !p.earlyAccess || access.isGlobalAdmin || (access.chaburahId && p.allowedChaburahIds?.includes(access.chaburahId)));
}

export function rolloutProgramSelection(requested: string | undefined, programs: LearningProgram[], ready: boolean,
  access: ProgramAccessContext = {}) {
  if (!ready) return SUMMER_PROGRAM;
  const available = selectablePrograms(programs, access);
  if (available.some((p) => p.id === requested)) return requested!;
  return available.find((p) => p.id === WINTER_PROGRAM)?.id ?? available[0]?.id ?? SUMMER_PROGRAM;
}

export function belongsToProgram(item: { programId?: string }, programId: string) {
  return (item.programId ?? SUMMER_PROGRAM) === programId;
}

export function programName(programId?: string, programs: LearningProgram[] = []) {
  const id = programId ?? SUMMER_PROGRAM;
  return programs.find((p) => p.id === id)?.name ??
    (id === SUMMER_PROGRAM ? "Summer 5786" : id === WINTER_PROGRAM ? "Winter 5787" : id === TEFILLIN_PROGRAM ? "Summer 5787" : id);
}
