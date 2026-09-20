import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--fw-paper)",
        "paper-raised": "var(--fw-paper-raised)",
        ink: "var(--fw-ink)",
        "ink-soft": "var(--fw-ink-soft)",
        muted: "var(--fw-muted)",
        faint: "var(--fw-faint)",
        line: "var(--fw-line)",
        "line-strong": "var(--fw-line-strong)",
        accent: {
          DEFAULT: "var(--fw-accent)",
          hover: "var(--fw-accent-hover)",
          soft: "var(--fw-accent-soft)",
        },
        level: {
          DEFAULT: "var(--fw-level)",
          soft: "var(--fw-level-soft)",
        },
        warn: {
          DEFAULT: "var(--fw-warn)",
          soft: "var(--fw-warn-soft)",
        },
        danger: {
          DEFAULT: "var(--fw-danger)",
          soft: "var(--fw-danger-soft)",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-newsreader)", "Georgia", "serif"],
      },
      maxWidth: {
        phone: "430px",
      },
      boxShadow: {
        fw: "var(--fw-shadow)",
      },
      borderRadius: {
        fw: "var(--fw-radius)",
        "fw-sm": "var(--fw-radius-sm)",
      },
    },
  },
  plugins: [],
};
export default config;
