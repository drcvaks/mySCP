import { Redirect } from "expo-router";
import { Screen } from "../src/shared/components";
import { PublicReviewCsvImportTool } from "../src/shared/PublicReviewCsvImport";

// Development-only UI test. Neither validation nor import calls Supabase.
export default function PublicReviewImportPreview() {
  if (!__DEV__) return <Redirect href="/auth" />;
  return <Screen title="Public Review CSV" eyebrow="Local Preview - No Database Writes">
    <PublicReviewCsvImportTool programsReady refresh={async () => {}} programs={[
      { id: "winter-5787", name: "Winter 5787", topic: "Challah & Terumos/Maasros", defaultWeek: 1, archived: false },
      { id: "summer-5787", name: "Summer 5787", topic: "Hilchos Tefillin", defaultWeek: 1, archived: false, earlyAccess: true }
    ]} request={async (programId, rows, commit) => ({ program_id: programId, row_count: rows.length,
      new_count: rows.length, skipped_count: 0, errors: [], committed: commit })} />
  </Screen>;
}
