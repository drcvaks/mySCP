type TitleLanguage = "en" | "he";
const hebrewTypes: Record<string, string> = {
  "Review Notes": "סיכום השיעור", "Q&A": "שאלות ותשובות", "Source Sheets": "דפי מקורות"
};

export function defaultPacketTitle(chaburahName: string, week: number, categoryLabel: string, language: TitleLanguage = "en") {
  const weekLabel = language === "he" ? "שבוע" : "Week";
  const typeLabel = language === "he" ? hebrewTypes[categoryLabel] ?? categoryLabel : categoryLabel;
  return `${chaburahName} - ${weekLabel} ${week} - ${typeLabel}`;
}

export function buildPublishedCategoryTitle(baseTitle: string, categoryLabel: string, language: TitleLanguage = "en") {
  const cleanTitle = baseTitle || (language === "he" ? "חוברת חזרה" : "Review Packet");
  const localized = language === "he" ? hebrewTypes[categoryLabel] ?? categoryLabel : categoryLabel;
  // Retain explicitly entered/previously saved titles, including older English type labels.
  return [categoryLabel, localized].some(label => cleanTitle.toLowerCase().includes(label.toLowerCase()))
    ? cleanTitle : `${cleanTitle} - ${localized}`;
}
