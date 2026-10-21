import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { supabase } from "../lib/supabase";
import { Database } from "../lib/database.types";
import { Card, FilterChip, FormInput, MetaText, Pill, Row, SectionTitle, StatusBanner, styles } from "./components";
import { theme } from "./theme";
import { availableContentWidth } from "./responsiveLayout";

type Result = Database["public"]["Functions"]["get_chaburah_review_results"]["Returns"][number];

export function ChaburahReviewResults({ chaburahId, programId, weeks, refreshing = false }: {
  chaburahId: string; programId: string; weeks: number[]; refreshing?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const compact = availableContentWidth(width, height) < 640;
  const [week, setWeek] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const listRef = useRef<ScrollView>(null);
  useEffect(() => { listRef.current?.scrollTo({ y: 0, animated: false }); }, [search, week]);
  const [state, setState] = useState<{ rows: Result[]; loading: boolean; error: string; scope: string }>({
    rows: [], loading: true, error: "", scope: ""
  });
  const scope = `${chaburahId}/${programId}/${week}/${revision}`;
  useEffect(() => {
    let cancelled = false;
    setState({ rows: [], loading: true, error: "", scope });
    if (refreshing) return () => { cancelled = true; };
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("get_chaburah_review_results", {
          target_chaburah_id: chaburahId, target_program_id: programId,
          target_week: week === "all" ? null : week
        });
        if (cancelled) return;
        const message = error
          ? ["PGRST202", "42883"].includes(error.code)
            ? "Review results need the latest database update. Please contact the Global Admin."
            : "Unable to load review results. Please try refreshing."
          : "";
        setState({ rows: data ?? [], loading: false, error: message, scope });
      } catch {
        if (!cancelled) setState({ rows: [], loading: false, error: "Unable to load review results. Please try refreshing.", scope });
      }
    })();
    return () => { cancelled = true; };
  }, [chaburahId, programId, week, revision, scope, refreshing]);
  const current = state.scope === scope;
  const loading = !current || state.loading;
  const rows = current && !state.error ? state.rows : [];
  const filtered = rows.filter(row => row.display_name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const attempted = rows.filter(row => row.answered_questions > 0).length;
  const available = rows[0]?.available_questions ?? 0;

  return <View testID="chaburah-review-results"><Card>
    <Row>
      <View style={{ flex: 1, minWidth: 160 }}>
        <SectionTitle>Chaburah Results</SectionTitle>
        <MetaText>First answer per question</MetaText>
      </View>
      <Pill label="Rabbi only" />
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh review results"
        disabled={loading} onPress={() => setRevision(value => value + 1)}
        {...(Platform.OS === "web" ? { title: "Refresh review results" } : {})}
        style={[s.refresh, loading && { opacity: 0.4 }]}>
        <Ionicons name="refresh-outline" size={20} color={theme.colors.info} />
      </Pressable>
    </Row>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      <FilterChip label="All Weeks" selected={week === "all"} onPress={() => setWeek("all")} />
      {weeks.map(value => <FilterChip key={value} label={`Week ${value}`} selected={week === value} onPress={() => setWeek(value)} />)}
    </ScrollView>
    <FormInput value={search} onChangeText={setSearch} placeholder="Search participants" />
    {current && state.error ? <StatusBanner message={state.error} tone="error" /> : null}
    {loading ? <Text style={styles.muted}>Loading results...</Text> : null}
    {!loading && !state.error ? <>
      <MetaText>{attempted} of {rows.length} members participated - {available} published questions</MetaText>
      {rows.length === 0 ? <Text style={styles.muted}>No active members found.</Text> :
        filtered.length === 0 ? <Text style={styles.muted}>No matching participants.</Text> :
        compact ? <ScrollView ref={listRef} testID="review-results-list" nestedScrollEnabled
          showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" style={{ maxHeight: 320 }}
          accessibilityLabel="Chaburah first-answer results">
          {filtered.map(row => <View key={row.user_id} style={s.compactRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[s.cell, { width: 24 }, row.score_rank !== null && row.score_rank <= 3 && s.topRank]}>{row.score_rank ?? "-"}</Text>
              <Text style={[s.cell, { flex: 1, fontWeight: "600" }]}>{row.display_name}</Text>
              <Text style={s.cell}>{row.answered_questions ? `${Number((100 * row.correct_answers / row.answered_questions).toFixed(1))}%` : "-"}</Text>
            </View>
            <View style={{ marginLeft: 32, gap: 3 }}>
              <MetaText>{row.correct_answers}/{row.answered_questions} correct - {row.weeks_attempted} week{row.weeks_attempted === 1 ? "" : "s"} tried</MetaText>
              <MetaText>Participation: {row.answered_questions}/{row.available_questions} ({row.available_questions ? Math.round(100 * row.answered_questions / row.available_questions) : 0}%)</MetaText>
            </View>
          </View>)}
        </ScrollView> : <ScrollView horizontal contentContainerStyle={{ minWidth: "100%" }}>
          <ScrollView ref={listRef} testID="review-results-list" nestedScrollEnabled showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled" stickyHeaderIndices={[0]}
            style={{ flex: 1, minWidth: 640, maxHeight: 400 }} accessibilityLabel="Chaburah first-answer results">
            <View style={[s.row, s.header]}>
              <Text style={[s.label, s.rank]}>Rank</Text>
              <Text style={[s.label, s.name]}>Participant</Text>
              <Text style={[s.label, s.score]}>Score</Text>
              <Text style={[s.label, s.correct]}>Correct</Text>
              <Text style={[s.label, s.participation]}>Participation</Text>
              <Text style={[s.label, s.weeks]}>Weeks tried</Text>
            </View>
            {filtered.map(row => <View key={row.user_id} style={s.row}>
              <Text style={[s.cell, s.rank, row.score_rank !== null && row.score_rank <= 3 && s.topRank]}>{row.score_rank ?? "-"}</Text>
              <Text style={[s.cell, s.name]}>{row.display_name}</Text>
              <Text style={[s.cell, s.score]}>{row.answered_questions ? `${Number((100 * row.correct_answers / row.answered_questions).toFixed(1))}%` : "-"}</Text>
              <Text style={[s.cell, s.correct]}>{row.correct_answers}/{row.answered_questions}</Text>
              <Text style={[s.cell, s.participation]}>{row.answered_questions}/{row.available_questions} ({row.available_questions ? Math.round(100 * row.answered_questions / row.available_questions) : 0}%)</Text>
              <Text style={[s.cell, s.weeks]}>{row.weeks_attempted}</Text>
            </View>)}
          </ScrollView>
        </ScrollView>}
    </> : null}
  </Card></View>;
}

const s = StyleSheet.create({
  refresh: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8 },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: theme.colors.border, paddingVertical: 11, paddingHorizontal: 8, gap: 8 },
  compactRow: { gap: 4, paddingVertical: 12, borderBottomWidth: 1, borderColor: theme.colors.border },
  header: { backgroundColor: "#F1F5F9" },
  label: { color: theme.colors.muted, fontSize: 12, fontWeight: "700" },
  cell: { fontSize: 14, lineHeight: 20, color: theme.colors.ink },
  rank: { width: 40 }, name: { flex: 1, minWidth: 170 }, score: { width: 70 }, correct: { width: 74 },
  participation: { width: 132 }, weeks: { width: 68 },
  topRank: { color: theme.colors.info, fontWeight: "700" }
});
