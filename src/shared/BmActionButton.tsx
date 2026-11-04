import { useEffect, useId, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "./theme";

// Tone keys are kept for existing call sites; they now map onto the navy/gold palette.
const tones = {
  blue: { ink: theme.colors.primary, tint: theme.colors.primarySoft, border: theme.colors.primaryBorder, fill: theme.colors.primary, fillHover: theme.colors.primaryDark },
  teal: { ink: theme.colors.info, tint: theme.colors.infoSoft, border: theme.colors.primaryBorder, fill: theme.colors.info, fillHover: theme.colors.primary },
  amber: { ink: theme.colors.accentText, tint: theme.colors.accentSoft, border: theme.colors.accentBorder, fill: theme.colors.accent, fillHover: "#E5A91F" },
  red: { ink: theme.colors.danger, tint: theme.colors.dangerSoft, border: "#F4C7C3", fill: theme.colors.danger, fillHover: "#8E1B12" }
};

export function BmActionButton({ label, caption, description, icon, onPress, selected, solid = false, disabled = false, tone = "blue", minWidth }: {
  label: string; caption?: string; description: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void;
  selected?: boolean; solid?: boolean; disabled?: boolean; tone?: keyof typeof tones; minWidth?: number;
}) {
  const anchor = useRef<View>(null);
  const tooltipId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const palette = tones[tone];
  const filled = solid || selected;
  useEffect(() => {
    if (Platform.OS !== "web" || !showHelp || disabled) return;
    // A body-level tooltip avoids clipping by cards, nested scroll views, and toolbars.
    const tip = document.createElement("div");
    tip.id = tooltipId; tip.setAttribute("role", "tooltip"); tip.textContent = `${label}: ${description}`;
    Object.assign(tip.style, {
      position: "fixed", zIndex: "10000", pointerEvents: "none", boxSizing: "border-box",
      width: "260px", maxWidth: "calc(100vw - 16px)", padding: "10px 12px", borderRadius: "6px",
      background: "#0E1A3A", color: "#FFFFFF", font: "13px/19px system-ui, sans-serif", letterSpacing: "0",
      boxShadow: "0 4px 16px #17203326", overflowWrap: "anywhere", visibility: "hidden"
    });
    let active = true;
    function position() {
      anchor.current?.measureInWindow((x, y, width, height) => {
        if (!active || !tip.isConnected) return;
        if (y + height < 0 || y > window.innerHeight || x + width < 0 || x > window.innerWidth) { setShowHelp(false); return; }
        const rect = tip.getBoundingClientRect();
        const left = Math.max(8, Math.min(x + width / 2 - rect.width / 2, window.innerWidth - rect.width - 8));
        const below = y + height + 8;
        tip.style.left = `${left}px`;
        tip.style.top = `${Math.max(8, below + rect.height <= window.innerHeight - 8 ? below : y - rect.height - 8)}px`;
        tip.style.visibility = "visible";
      });
    }
    const timer = setTimeout(() => { document.body.appendChild(tip); position(); }, 180);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setShowHelp(false); };
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, true);
    document.addEventListener("keydown", escape);
    return () => {
      active = false; clearTimeout(timer); tip.remove();
      window.removeEventListener("resize", position);
      document.removeEventListener("scroll", position, true);
      document.removeEventListener("keydown", escape);
    };
  }, [showHelp, disabled, label, description, tooltipId]);
  return <Pressable ref={anchor} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={description}
    accessibilityState={{ disabled }} disabled={disabled}
    {...(selected !== undefined ? { "aria-pressed": selected } : {})}
    {...(Platform.OS === "web" ? { "aria-describedby": showHelp ? tooltipId : undefined } : {})}
    onHoverIn={() => { setHovered(true); setShowHelp(true); }} onHoverOut={() => { setHovered(false); setShowHelp(false); }}
    onFocus={() => { setFocused(true); setShowHelp(true); }} onBlur={() => { setFocused(false); setShowHelp(false); }}
    onLongPress={Platform.OS !== "web" ? () => Alert.alert(label, description) : undefined}
    onPress={() => { setShowHelp(false); onPress(); }}
    style={({ pressed }) => [s.button, {
      backgroundColor: filled ? palette.fill : palette.tint,
      borderColor: filled ? palette.fill : palette.border,
      minWidth,
      ...(caption ? { paddingHorizontal: 12 } : { width: 44 }),
      ...((hovered || pressed) && !disabled ? { borderColor: palette.ink, backgroundColor: filled ? palette.fillHover : palette.border } : {}),
      ...(focused ? theme.focusRing : {}), ...(disabled ? { opacity: 0.45 } : {})
    }]}>
    <Ionicons name={icon} size={21} color={filled ? (tone === "amber" ? theme.colors.ink : theme.colors.onPrimary) : palette.ink} />
    {caption ? <Text style={[s.caption, { color: filled ? (tone === "amber" ? theme.colors.ink : theme.colors.onPrimary) : palette.ink }]}>{caption}</Text> : null}
  </Pressable>;
}
const s = StyleSheet.create({
  button: { minHeight: 44, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.md, borderWidth: 1.5, flexShrink: 0 },
  caption: { fontSize: 13, lineHeight: 19, fontWeight: "700" }
});
