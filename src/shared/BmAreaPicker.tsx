import { BmArea, bmAreas } from "./beisMidrash";
import { SegmentedTabs, TabOption } from "./ui";

// Three areas plus "All Areas" retain the existing category IDs and accessible labels.
const options: TabOption[] = [
  { id: "message", label: bmAreas.message.label, icon: "chatbubbles",
    hint: "Discuss official Notes, official Questions, and other learning questions." },
  { id: "resources", label: bmAreas.resources.label, icon: "folder-open",
    hint: "Share and find files, links, and learning material for Rabbonim." },
  { id: "teaching", label: bmAreas.teaching.label, icon: "school",
    hint: "Ideas for teaching, leading a chaburah, and general SCP discussion." },
  { id: "all", label: "All Areas", icon: "grid",
    hint: "Show discussions from Message Board, Resources & Materials, and Teaching & Chaburah." }
];

export function BmAreaPicker({ value, onChange, includeAll = true }: {
  value: BmArea | "all"; onChange: (area: BmArea | "all") => void; includeAll?: boolean;
}) {
  return <SegmentedTabs value={value} options={includeAll ? options : options.filter(option => option.id !== "all")}
    onChange={id => onChange(id as BmArea | "all")} />;
}
