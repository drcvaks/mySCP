import { Redirect } from "expo-router";
import { Screen } from "../src/shared/components";
import { ChallahImportPreview } from "../src/shared/ChallahImportPreview";

// Temporary content inspection without a sign-in, available only in development.
export default function LocalShiurPreview() {
  if (!__DEV__) return <Redirect href="/auth" />;
  return <Screen title="Shiur Import Preview" eyebrow="Winter 5787"><ChallahImportPreview /></Screen>;
}
