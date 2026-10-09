import { useState } from "react";
import { Redirect } from "expo-router";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SidebarItem, SidebarNavigation, SidebarRoute } from "../src/shared/SidebarNavigation";
import { PageHeading } from "../src/shared/PageHeading";
import { WorkflowCard } from "../src/shared/WorkflowCard";
import { Button, Card, FilterChip, MetaText, Pill, Row, SectionTitle, styles } from "../src/shared/components";
import { globalStyles } from "../src/shared/theme";

const labels: [SidebarRoute, string][] = [
  ["dashboard", "Dashboard"], ["chaburah", "My Chaburah"], ["review", "Review"], ["files", "Files"],
  ["rabbi-hub", "Rabbi Hub"], ["admin", "Admin"], ["global-admin", "Global Admin"],
  ["beta-feedback", "Beta Feedback"], ["help", "Help / How to Use"], ["testing-checklist", "Tester Checklist"],
  ["directory", "Directory"], ["ask-rav", "Ask Rav"], ["profile", "Profile"], ["notifications", "Notifications"], ["settings", "Settings"]
];
export default function NavigationPreview() {
  const [selected, setSelected] = useState<SidebarRoute>("rabbi-hub");
  const [winter, setWinter] = useState(true);
  const [tool, setTool] = useState("quick-review");
  const { width } = useWindowDimensions();
  if (!__DEV__) return <Redirect href="/auth" />;
  const items: SidebarItem[] = labels.map(([name, label]) => ({ name, label, href: "/navigation-preview",
    onSelect: () => { setSelected(name); return false; } }));
  return <View style={{ flex: 1, flexDirection: "row", backgroundColor: "#F8FAFC" }}>
    {width >= 768 ? <SidebarNavigation items={items} selected={selected} chaburah="Preview Chaburah" width={width < 1100 ? 224 : 248} /> : null}
    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={styles.headerShell}><View style={[styles.screenHeader, width >= 768 && styles.wideHeaderContent]}>
        <PageHeading title={labels.find(([name]) => name === selected)?.[1] ?? "Rabbi Hub"}
          eyebrow={selected === "chaburah" ? "Preview Chaburah" : "Questions and review library"}
          pathname={`/${selected}`} onRefresh={() => undefined} />
      </View></View>
      <ScrollView contentContainerStyle={[globalStyles.content, width >= 768 && styles.wideContent]}>
        <View style={styles.betaNotice}><Ionicons name="flask-outline" color="#967019" size={16} />
          <Text style={styles.betaNoticeText}>You are using a beta version of mySCP. Please report bugs or confusing parts in Beta Feedback.</Text>
        </View>
        <View style={{ gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingBottom: 14 }}>
          <MetaText>Learning Program</MetaText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <FilterChip label="Summer 5786" selected={!winter} onPress={() => setWinter(false)} />
            <FilterChip label="Winter 5787" selected={winter} onPress={() => setWinter(true)} />
          </View><MetaText>{winter ? "Challah & Terumos/Maasros" : "Nat Bar Nat"} - Current Week 1</MetaText>
        </View>
        {selected === "chaburah" ? <>
          <Card><Row><View style={{ flex: 1, minWidth: 0 }}><SectionTitle>Preview Chaburah</SectionTitle>
            <Text style={styles.muted}>Rabbi</Text></View><Pill label="Announcement Only" tone="accent" /></Row>
            <Text style={styles.body}>Schedule not set</Text><Button label="Join or Change Chaburah" variant="secondary" />
          </Card>
          <Card><SectionTitle icon="compass-outline">Index</SectionTitle><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {["Members", "Messages", "Files", "Ask Rav"].map((label) => <Button key={label} label={label} variant="secondary" />)}
          </View></Card>
          <Card><Row><SectionTitle icon="people-outline">Members</SectionTitle><Pill label="2 active" tone="success" /></Row>
            <MetaText>Active people in this chaburah.</MetaText>
          </Card>
        </> : <>
          <Card><SectionTitle icon="library-outline">Rabbi Tools</SectionTitle><Text style={styles.muted}>Choose the workflow you want to work on.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
              <WorkflowCard label="Ask Rav Inbox" meta="Participant questions waiting for a Rav response." count={0}
                active={tool === "ask-rav"} onPress={() => setTool("ask-rav")} />
              <WorkflowCard label="Shiur Builder" meta="Longer packets and table-talk review from official SCP material."
                active={tool === "shiur-builder"} onPress={() => setTool("shiur-builder")} />
              <WorkflowCard label="Quick Review Questions" meta="Short weekly quiz questions for participants to answer in Review." count={0}
                active={tool === "quick-review"} onPress={() => setTool("quick-review")} />
            </View>
          </Card>
          <Card><SectionTitle>{tool === "quick-review" ? "Quick Review Question Workspace" : tool === "shiur-builder" ? "Shiur Builder" : "Ask Rav Inbox"}</SectionTitle>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[1, 2, 3, 4].map((week) => <FilterChip key={week} label={`Week ${week}`} selected={week === 1} />)}</View>
          </Card>
        </>}
      </ScrollView>
    </View>
  </View>;
}
