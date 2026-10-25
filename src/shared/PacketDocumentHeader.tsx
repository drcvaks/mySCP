import { Image, StyleSheet, Text, View } from "react-native";
import { uri as logoUri } from "../data/scpLogo.json";

export function PacketDocumentHeader({ title, meta, language = "en" }: { title: string; meta?: string; language?: "en" | "he" }) {
  return <View style={s.header}>
    <View style={s.text}>
      <Text style={[s.title, { textAlign: language === "he" ? "right" : "left", writingDirection: language === "he" ? "rtl" : "ltr" }]}>{title}</Text>
      {meta ? <Text style={[s.meta, { textAlign: language === "he" ? "right" : "left" }]}>{meta}</Text> : null}
    </View>
    <Image accessibilityLabel="SCP logo" source={{ uri: logoUri }} resizeMode="contain" style={s.logo} />
  </View>;
}

const s = StyleSheet.create({
  header: { flexDirection: "row", direction: "ltr", alignItems: "flex-start", gap: 12, borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1", paddingBottom: 12, marginBottom: 16, width: "100%" },
  text: { flex: 1, minWidth: 0, gap: 6 },
  title: { color: "#172033", fontSize: 22, lineHeight: 28, fontWeight: "700" },
  meta: { color: "#64748B", fontSize: 13, lineHeight: 19 },
  logo: { width: 96, height: 96, flexShrink: 0 }
});
