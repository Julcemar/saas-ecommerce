/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta oficial dinâmica por tokens CSS
        brand: {
          DEFAULT: "var(--brand-primary)",
          primary: "var(--brand-primary)",
          hover: "var(--brand-primary-hover)",
          accent: "var(--brand-accent)",
          secondary: "var(--brand-secondary-accent)",
        },
        bg: {
          main: "var(--bg-main)",
          surface: "var(--bg-surface)",
          subtle: "var(--bg-subtle)",
        },
        content: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
        },
        border: {
          theme: "var(--border-color)",
        },
        status: {
          success: "var(--status-success)",
          warning: "var(--status-warning)",
          error: "var(--status-error)",
          info: "var(--status-info)",
        },
        // Compatibilidade com Vitrines personalizáveis por tenant
        primary: "var(--color-primary, #084D6E)",
        secondary: "var(--color-secondary, #00B4D8)",
      },
      boxShadow: {
        comic: "3px 3px 0px #111111",
        "comic-lg": "5px 5px 0px #111111",
        "comic-sm": "2px 2px 0px #111111",
      },
      borderWidth: {
        comic: "2px",
        "comic-thick": "3px",
      },
    },
  },
  plugins: [],
};
