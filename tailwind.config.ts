import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pos: '#16a34a',
        neg: '#dc2626',
        warn: '#ea580c',
        info: '#2563eb',
      },
    },
  },
  plugins: [],
};

export default config;
