import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
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
      },
      keyframes: {
        "folk-float": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-4px) rotate(1deg)" },
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
