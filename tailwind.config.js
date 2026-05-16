/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
    // Add paths to your template files
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#17A697",
          foreground: "#141414",
          50: "#f0faf9",
          100: "#e1f5f3",
          200: "#c3eae7",
          300: "#a4dfdb",
          400: "#5bc4b5",
          500: "#17A697",
          600: "#149181",
          700: "#10726a",
          800: "#0c5354",
          900: "#083437",
        },
        secondary: {
          DEFAULT: "#079B8F",
          foreground: "#eaeaea",
          50: "#effbf9",
          100: "#d7f4f0",
          200: "#afe9e2",
          300: "#7bd8cd",
          400: "#31bdae",
          500: "#079B8F",
          600: "#078478",
          700: "#086a62",
          800: "#08554f",
          900: "#063a38",
        },
      },
    },
  },
  plugins: [],
};
