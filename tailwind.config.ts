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
        bb: {
          bg: '#050505',
          surface: '#0a0a0a',
          raised: '#0f0f0f',
          border: '#1a1a1a',
          muted: '#858585',
          accent: '#34d399',
          up: '#34d399',
          down: '#f87171',
        },
        bbl: {
          bg: '#f7f5f2',
          surface: '#ffffff',
          border: '#e7e2dc',
          text: '#1c1917',
          muted: '#78716c',
          accent: '#f97316',
          like: '#f43f5e',
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
