export const currentReviewWeek = 9;

export function buildReviewWeeks(maxQuestionWeek = 0) {
  const maxWeek = Math.max(currentReviewWeek + 3, maxQuestionWeek);
  return Array.from({ length: maxWeek }, (_item, index) => index + 1);
}
