export const typography = {
  fonts: {
    sans:
      '"Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
  },
  sizes: {
    xs: 11,
    sm: 12.5,
    base: 14,
    md: 16,
    lg: 20,
    xl: 28,
  },
  weights: {
    regular: 450,
    medium: 500,
    semibold: 600,
  },
  letterSpacing: {
    tight: "-0.02em",
    normal: "-0.005em",
  },
} as const;
