import type { Config } from 'tailwindcss';

const c = (rgb: string, a = 1) =>
  (({ opacityValue }: { opacityValue?: string }) =>
    `rgb(${rgb} / ${opacityValue ?? a})`) as unknown as string;

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
          bg: c('5 5 5'),
          surface: c('10 10 10'),
          raised: c('15 15 15'),
          border: c('255 255 255', 0.07),
          muted: c('255 255 255', 0.52),
          accent: c('52 211 153'),
          up: c('52 211 153'),
          down: c('248 113 113'),
        },
        bbl: {
          bg: c('247 245 242'),
          surface: c('255 255 255'),
          border: c('28 25 23', 0.1),
          text: c('28 25 23'),
          muted: c('120 113 108'),
          accent: c('249 115 22'),
          like: c('244 63 94'),
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
