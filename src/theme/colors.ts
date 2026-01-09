export const colors = {
  // Verdes (base)
  forest900: "#0E2A24",
  forest800: "#12332D",
  forest700: "#18443B",
  forest600: "#1F564B",
  forest500: "#2A7563",
  forest400: "#3D9179",
  forest300: "#5BAD92",
  forest200: "#8BC9B3",
  forest100: "#C5E5D8",

  // Terra
  earth900: "#2A221A",
  earth700: "#4A3A2A",
  earth600: "#5B4634",

  // Papel
  paper50: "#F3EFE9",
  paper100: "#EFE9DF",
  paper200: "#E6DED2",

  // Dourado queimado (acento)
  brass600: "#B08D57",
  brass500: "#9E7C42",

  // Texto (em fundo escuro)
  textPrimaryOnDark: "rgba(243,239,233,0.96)",
  textSecondaryOnDark: "rgba(243,239,233,0.80)",
  textMutedOnDark: "rgba(243,239,233,0.62)",

  // Texto (em fundo claro)
  textPrimaryOnLight: "#0E2A24", // forest900
  textSecondaryOnLight: "#18443B", // forest700
  textMutedOnLight: "#5B4634", // earth600

  // Feedback (discreto)
  danger: "#8A3D32",
  warning: "#B58B3B",
  success: "#2F6F5F",

  // Texture kit specifics (cores derivadas apenas dos tokens acima)
  screenGradient: {
    from: "#12332D", // forest800
    to: "#0E2A24", // forest900
  },

  // SurfaceCard
  surfaceCardBg: "#12332D", // forest800
  surfaceCardBorder: "rgba(243,239,233,0.10)",
  bevelTop: "rgba(243,239,233,0.10)",
  bevelBottom: "rgba(0,0,0,0.22)",

  // SurfaceCard (tema claro)
  surfaceCardBgLight: "#EFE9DF", // paper100
  surfaceCardBorderLight: "rgba(14,42,36,0.10)",
  bevelTopLight: "rgba(243,239,233,0.65)",
  bevelBottomLight: "rgba(14,42,36,0.12)",

  // Inputs / overlays (derivados)
  inputBgDark: "rgba(18,51,45,0.62)",
  inputBorderDark: "rgba(243,239,233,0.10)",
  inputBgLight: "rgba(243,239,233,0.86)",
  inputBorderLight: "rgba(14,42,36,0.10)",
  overlayBackdrop: "rgba(0,0,0,0.45)",

  // Safe-area scrim (apenas nas faixas de insets; fundo continua vindo da scene)
  safeAreaScrim: "rgba(0,0,0,0.05)",

  // Screen vignette
  vignette: "rgba(0,0,0,0.25)",
  vignetteLight: "rgba(14,42,36,0.10)",
} as const;

export type SaravafyColors = typeof colors;
