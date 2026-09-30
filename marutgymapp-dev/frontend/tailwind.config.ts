import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        tenant: {
          primary: "var(--tenant-primary, #2563eb)",
          "primary-hover": "var(--tenant-primary-hover, #1d4ed8)",
          secondary: "var(--tenant-secondary, #0f172a)",
        }
      },
    },
  },
  plugins: [],
};
export default config;
