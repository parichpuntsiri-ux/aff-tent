import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#070b14", 900: "#0b1220", 800: "#111a2e", 700: "#1a2540", 600: "#26345a" },
        bull: "#16c784",
        bear: "#ea3943",
        accent: "#3b82f6",
        gold: "#f5b301",
      },
      fontFamily: { mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"] },
    },
  },
  plugins: [],
};
export default config;
