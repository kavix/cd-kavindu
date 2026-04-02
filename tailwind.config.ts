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
        'custom-bg': '#F2EAE0',
        'custom-blue': '#B4D3D9',
        'custom-purple-light': '#BDA6CE',
        'custom-purple-dark': '#9B8EC7',
      },
    },
  },
  plugins: [],
};
export default config;
