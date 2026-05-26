import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        serif: ['Instrument Serif', 'serif'],
      },
      colors: {
        bg: '#030303',
        surface: '#080808',
        border: '#141414',
        blue: '#3b82f6',
        green: '#22c55e',
        amber: '#f59e0b',
        red: '#f87171',
        purple: '#a78bfa',
      }
    },
  },
  plugins: [],
}
export default config
