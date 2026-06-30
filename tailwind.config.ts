import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./studio/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        folk: {
          cobalt: "#1B3A8C",
          terracotta: "#C4522A",
          "terracotta-dark": "#9A3E1F",
          cream: "#F5F0E8",
          gold: "#D4A843",
          forest: "#2E5C3A",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Pretendard", "system-ui", "sans-serif"],
        display: ["var(--font-folk-display)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      animation: {
        "folk-float": "folk-float 4s ease-in-out infinite",
        "moco-fade-up": "moco-fade-up 0.45s ease-out backwards",
        "moco-fade-in": "moco-fade-in 0.35s ease-out backwards",
        "moco-scale-in": "moco-scale-in 0.4s cubic-bezier(0.22,1,0.36,1) backwards",
        "moco-shimmer": "moco-shimmer 1.8s ease-in-out infinite",
        "moco-slide-up": "moco-slide-up 0.4s cubic-bezier(0.22,1,0.36,1) backwards",
        "moco-pop": "moco-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) backwards",
        "moco-float": "moco-float 3s ease-in-out infinite",
        "moco-pulse-soft": "moco-pulse-soft 2.5s ease-in-out infinite",
      },
      keyframes: {
        "folk-float": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-4px) rotate(1deg)" },
        },
        "moco-fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "moco-fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "moco-scale-in": {
          from: { opacity: "0", transform: "scale(0.94)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "moco-shimmer": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        "moco-slide-up": {
          from: { opacity: "0", transform: "translateY(100%)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "moco-pop": {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "70%": { transform: "scale(1.04)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "moco-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "moco-pulse-soft": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.05)", opacity: "0.92" },
        },
      },
      boxShadow: {
        folk: "3px 4px 0 rgba(27, 58, 140, 0.15)",
        "folk-sm": "2px 2px 0 rgba(27, 58, 140, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
