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
        brand: {
          50: '#f5f7ff',
          100: '#e8edff',
          200: '#cdd9ff',
          300: '#a4b8ff',
          400: '#7b8dff',
          500: '#5a6dff',
          600: '#4855f0',
          700: '#3d45cf',
          800: '#3339a3',
          900: '#2b307d'
        }
      }
    }
  },
  plugins: [],
};

export default config;
