/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        partyA: "#2f6fed",
        partyB: "#f97316",
        partyC: "#22c55e",
        neutral: "#94a3b8"
      }
    }
  },
  plugins: [],
};
