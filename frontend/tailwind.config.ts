import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#6366F1", dark: "#4F46E5" },
      },
    },
  },
  plugins: [],
};

export default config;
