export function usesCompactNavigation(width: number, height: number) {
  return width < 768 || height < 600;
}

export function shiurBuilderLayout(width: number, height: number) {
  const compactNavigation = usesCompactNavigation(width, height);
  const sidebarWidth = compactNavigation ? 0 : width < 1100 ? 224 : 248;
  const contentWidth = Math.min(1040, width - sidebarWidth) - (compactNavigation ? 24 : 48);
  return {
    twoColumns: contentWidth >= 620,
    compact: contentWidth < 900,
    columnHeight: Math.max(220, Math.min(560, height - 180))
  };
}
