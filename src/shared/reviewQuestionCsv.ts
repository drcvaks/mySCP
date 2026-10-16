import Papa from "papaparse";

export const MAX_REVIEW_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_REVIEW_IMPORT_ROWS = 500;
export interface ReviewImportQuestion {
  week: number; topic: string; prompt: string; kind: "true_false" | "multiple_choice";
  choices: string[]; correct_choice_index: number; explanation: string; is_model_question: boolean;
}
export interface CsvIssue { row: number; message: string }
export interface ReviewCsvResult { rows: ReviewImportQuestion[]; errors: CsvIssue[]; warnings: string[] }

const required = ["week", "question_type", "prompt", "choice_a", "choice_b", "choice_c", "choice_d", "correct_choice", "explanation", "is_model_question"];
const optional = ["section", "topic", "difficulty", "correct_answer"];
const aliases: Record<string, string> = { type: "question_type", question: "prompt", correct_letter: "correct_choice", "model question": "is_model_question" };

export function parseReviewQuestionCsv(text: string): ReviewCsvResult {
  const rows: ReviewImportQuestion[] = [], errors: CsvIssue[] = [], warnings: string[] = [];
  const issue = (row: number, message: string) => errors.push({ row, message });
  const bytes = Array.from(text).reduce((size, char) => {
    const code = char.codePointAt(0)!;
    return size + (code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4);
  }, 0);
  if (bytes > MAX_REVIEW_CSV_BYTES) {
    return { rows, errors: [{ row: 0, message: "CSV must be 2 MB or smaller." }], warnings };
  }
  if (text.includes("\uFFFD") || text.includes("\0")) {
    return { rows, errors: [{ row: 0, message: "This file is not readable as UTF-8 CSV. In Excel, choose Save As and select CSV UTF-8 (Comma delimited) (*.csv), then upload the saved file. Renaming a file to .csv does not change its encoding." }], warnings };
  }
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), { skipEmptyLines: "greedy" });
  parsed.errors.forEach(error => issue((error.row ?? 0) + 1, error.message));
  const header = (parsed.data[0] ?? []).map(value => {
    const key = value.trim().toLowerCase();
    return aliases[key] ?? key;
  });
  if (new Set(header).size !== header.length) issue(1, "Duplicate column names, including aliases, are not allowed.");
  required.filter(key => !header.includes(key)).forEach(key => issue(1, `Missing column: ${key}.`));
  header.filter(key => ![...required, ...optional].includes(key)).forEach(key => issue(1, `Unsupported column: ${key || "(blank)"}.`));
  if (parsed.data.length < 2) issue(0, "CSV contains no questions.");
  if (parsed.data.length - 1 > MAX_REVIEW_IMPORT_ROWS) issue(0, "Import at most 500 questions at a time.");
  if (errors.length) return { rows, errors, warnings };
  const seen = new Set<string>();
  parsed.data.slice(1).forEach((values, index) => {
    const row = index + 2, before = errors.length;
    if (values.length !== header.length) { issue(row, `Expected ${header.length} columns; found ${values.length}.`); return; }
    const raw = Object.fromEntries(header.map((key, i) => [key, values[i].trim()]));
    const week = Number(raw.week);
    if (!/^\d+$/.test(raw.week) || !Number.isInteger(week) || week < 1 || week > 52) issue(row, "Week must be a whole number from 1 to 52.");
    const kind = raw.question_type.toLowerCase().replace(/[ -]/g, "_").replace("/", "_");
    if (!["true_false", "multiple_choice"].includes(kind)) issue(row, "question_type must be true_false or multiple_choice.");
    const model = raw.is_model_question.toLowerCase();
    if (!["true", "false", "y", "n"].includes(model)) issue(row, "is_model_question must be TRUE or FALSE (legacy y/n is also accepted).");
    if (!raw.prompt || raw.prompt.length > 4000) issue(row, "Prompt must contain 1-4000 characters.");
    if (!raw.explanation || raw.explanation.length > 10000) issue(row, "Explanation must contain 1-10000 characters.");
    if (raw.difficulty && !["easy", "medium", "hard"].includes(raw.difficulty.toLowerCase())) issue(row, "difficulty must be easy, medium, or hard.");
    const originalChoices = [raw.choice_a, raw.choice_b, raw.choice_c, raw.choice_d];
    let choices = originalChoices;
    if (kind === "true_false") {
      if (raw.choice_a.toLowerCase() !== "true" || raw.choice_b.toLowerCase() !== "false" || raw.choice_c || raw.choice_d) {
        issue(row, "True/False requires A=True, B=False, with C and D empty.");
      }
      choices = ["True", "False"];
    } else if (choices.some(choice => !choice || choice.length > 1000) || new Set(choices.map(choice => choice.toLowerCase())).size !== 4) {
      issue(row, "Multiple choice requires four distinct choices, each 1-1000 characters.");
    }
    const correct = "ABCD".indexOf(raw.correct_choice.toUpperCase());
    if (raw.correct_choice.length !== 1 || correct < 0 || correct >= choices.length) issue(row, "correct_choice must point to an available answer (A/B for True/False).");
    if (raw.correct_answer && (kind === "true_false"
      ? raw.correct_answer.toLowerCase() !== originalChoices[correct]?.toLowerCase()
      : raw.correct_answer !== originalChoices[correct])) issue(row, "correct_answer does not match correct_choice.");
    const topic = [raw.section ? `Section ${raw.section}` : "", raw.topic].filter(Boolean).join(" - ") || `Week ${week} Quick Review`;
    if (topic.length > 200) issue(row, "Combined section/topic must be 200 characters or shorter.");
    const key = `${week}:${raw.prompt.toLowerCase()}`;
    if (seen.has(key)) issue(row, "Duplicate prompt in the same week within this CSV.");
    seen.add(key);
    if (before === errors.length) rows.push({ week, topic, prompt: raw.prompt, kind: kind as ReviewImportQuestion["kind"], choices,
      correct_choice_index: correct, explanation: raw.explanation, is_model_question: ["true", "y"].includes(model) });
  });
  const tf = rows.filter(row => row.kind === "true_false");
  if (tf.length > 1 && new Set(tf.map(row => row.correct_choice_index)).size === 1) warnings.push("All True/False questions have the same answer.");
  for (const week of [...new Set(rows.map(row => row.week))].sort((a,b) => a-b)) {
    if (!rows.some(row => row.week === week && row.is_model_question)) warnings.push(`Week ${week} has no model questions.`);
  }
  return { rows, errors, warnings };
}

export function reviewImportWeeks(rows: ReviewImportQuestion[]) {
  return [...new Set(rows.map(row => row.week))].sort((a,b) => a-b).map(week => ({ week,
    count: rows.filter(row => row.week === week).length,
    model: rows.filter(row => row.week === week && row.is_model_question).length }));
}

export const REVIEW_CSV_TEMPLATE = "week,section,topic,difficulty,question_type,prompt,choice_a,choice_b,choice_c,choice_d,correct_choice,correct_answer,explanation,is_model_question\r\n" +
  "1,A,Sample topic,easy,multiple_choice,Which option is correct?,First,Second,Third,Fourth,B,Second,Replace this sample with your reviewed explanation.,TRUE\r\n";
