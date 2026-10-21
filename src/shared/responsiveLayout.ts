export function usesCompactNavigation(width: number, height: number) {
  return width < 768 || height < 600;
}

export function usesLandscapeRail(width: number, height: number) {
  return width >= 600 && width > height && height < 600;
}

export function navigationRailWidth(width: number, height: number) {
  return usesLandscapeRail(width, height) ? 64 : usesCompactNavigation(width, height) ? 0 : width < 1100 ? 224 : 248;
}

export function availableContentWidth(width: number, height: number) {
  return Math.min(1040, width - navigationRailWidth(width, height)) - (usesCompactNavigation(width, height) ? 24 : 48);
}

export function shiurBuilderLayout(width: number, height: number) {
  const contentWidth = availableContentWidth(width, height);
  return {
    twoColumns: contentWidth >= 560,
    compact: contentWidth < 900 || usesLandscapeRail(width, height),
    columnHeight: Math.max(220, Math.min(560, height - 180))
  };
}
