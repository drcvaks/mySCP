import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import fixture from "../data/winter5787Pace.json";
import { ImportBlock, ImportDocument } from "./ImportDocument";

const blocks = fixture.blocks as ImportBlock[];

export function PaceReference() {
  const [open, setOpen] = useState(false);
  const { height } = useWindowDimensions();
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="View Zman Pace" onPress={() => setOpen(true)}
      style={({ pressed }) => [s.button, pressed && { backgroundColor: "#E8F0FF" }]}>
      <Ionicons name="calendar-outline" color="#2563EB" size={18} />
      <Text style={s.buttonText}>View Zman Pace</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
        <Pressable style={[s.panel, { maxHeight: Math.max(180, height - 32) }]} onPress={(event) => event.stopPropagation()}>
          <View style={s.header}>
            <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Winter 5787 - Zman Pace</Text>
              <Text style={s.meta}>Hafrashas Challah and Terumos Uma’asros</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close pace" onPress={() => setOpen(false)} style={s.close}>
              <Ionicons name="close" size={22} color="#42516B" />
            </Pressable>
          </View>
          <ScrollView style={s.document} contentContainerStyle={s.documentContent}>
            <ImportDocument blocks={blocks} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#DCE5F1", backgroundColor: "#F3F7FF" },
  buttonText: { color: "#2456A0", fontSize: 13, fontWeight: "600", lineHeight: 18 },
  backdrop: { flex: 1, backgroundColor: "rgba(23,32,51,0.35)", alignItems: "center", justifyContent: "center", padding: 16 },
  panel: { width: "100%", maxWidth: 900, minHeight: 0, backgroundColor: "#FFFFFF", borderRadius: 8, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  heading: { flex: 1, minWidth: 0, gap: 3 },
  title: { color: "#172033", fontSize: 18, lineHeight: 24, fontWeight: "700" },
  meta: { color: "#65748B", fontSize: 12, lineHeight: 18 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: "#F0F4FA", borderRadius: 8 },
  document: { flexShrink: 1, minHeight: 0 },
  documentContent: { paddingVertical: 8 }
});
