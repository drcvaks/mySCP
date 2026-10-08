import { SUMMER_PROGRAM } from "./learningPrograms";

export const fallbackCurrentReviewWeek = 12;

export function buildReviewWeeks(currentReviewWeek = fallbackCurrentReviewWeek, maxQuestionWeek = 0) {
  const maxWeek = Math.max(currentReviewWeek + 3, maxQuestionWeek);
  return Array.from({ length: maxWeek }, (_item, index) => index + 1);
}

export function buildProgramWeeks(programId: string, currentReviewWeek: number, maxQuestionWeek = 0) {
  return buildReviewWeeks(currentReviewWeek, Math.max(maxQuestionWeek, programId === SUMMER_PROGRAM ? 16 : 0));
}
