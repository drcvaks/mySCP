export const fallbackCurrentReviewWeek = 12;

export function buildReviewWeeks(currentReviewWeek = fallbackCurrentReviewWeek, maxQuestionWeek = 0) {
  const maxWeek = Math.max(currentReviewWeek + 3, maxQuestionWeek);
  return Array.from({ length: maxWeek }, (_item, index) => index + 1);
}
