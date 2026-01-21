// Palette: Natureza sofisticada (bem-estar/meditação)
// Base
const forest = "#1F5E4B";
const leaf = "#4F8A72";
const sand = "#F6F3EA";
const clay = "#A56A5A";

export default {
  light: {
    // Semantic tokens
    background: sand,
    surface: "#FFFFFF",
    text: "#161A18",
    mutedText: "#3E3A35",
    border: "#D9D1C6",

    primary: forest,
    primaryMuted: leaf,
    accent: clay,

    // Expo template compatibility
    tint: forest,
    tabIconDefault: "#B8B1A6",
    tabIconSelected: forest,
  },
  dark: {
    // Semantic tokens
    background: "#0F1714",
    surface: "#15211D",
    text: "#F4F1EA",
    mutedText: "#C8C1B7",
    border: "#2A3A34",

    primary: "#7FB79E",
    primaryMuted: leaf,
    accent: "#C97C5D",

    // Expo template compatibility
    tint: "#7FB79E",
    tabIconDefault: "#6F7B75",
    tabIconSelected: "#7FB79E",
  },
} as const;
