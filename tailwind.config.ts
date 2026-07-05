import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0f766e",
          dark: "#115e59",
        },
        transcom: "#2563eb",
        bpcl: "#16a34a",
      },
    },
  },
  plugins: [],
};

export default config;
