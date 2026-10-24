import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
    './types/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bbl: {
          bg: 'var(--bbl-bg)',
          surface: 'var(--bbl-surface)',
          border: 'var(--bbl-border)',
          text: 'var(--bbl-text)',
          muted: 'var(--bbl-muted)',
          accent: 'var(--bbl-accent)',
          like: 'var(--bbl-like)',
        },
        bb: {
          bg: 'var(--bb-bg)',
          surface: 'var(--bb-surface)',
          raised: 'var(--bb-surface-raised)',
          border: 'var(--bb-border)',
          muted: 'var(--bb-text-muted)',
          accent: 'var(--bb-accent)',
          up: 'var(--bb-up)',
          down: 'var(--bb-down)',
        },
        brand: {
          50: '#f6f1e7', 100: '#f0e4cf', 200: '#e3c997', 300: '#d5ad5f',
          400: '#c99433', 500: '#b97714', 600: '#9e630f', 700: '#7f4f0c',
          800: '#5f3b09', 900: '#432c09',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 40px 120px rgba(245, 158, 11, 0.16)',
      },
    },
  },
  plugins: [],
};

export default config;
