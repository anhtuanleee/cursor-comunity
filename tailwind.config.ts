import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"Courier New"', 'monospace'],
      },
      fontSize: {
        'display': ['1.5rem', { lineHeight: '2rem', fontWeight: '500' }],
        'h1': ['1.25rem', { lineHeight: '1.875rem', fontWeight: '500' }],
        'h2': ['0.9375rem', { lineHeight: '1.40625rem', fontWeight: '500' }],
        'body': ['0.875rem', { lineHeight: '1.3125rem' }],
        'button': ['0.8125rem', { lineHeight: '1.21875rem' }],
        'caption': ['0.75rem', { lineHeight: '1.125rem' }],
        'overline': ['0.6875rem', { lineHeight: '1.03125rem', fontWeight: '500', letterSpacing: '0.03125rem' }],
      },
      colors: {
        primary: '#202020',
        'text-primary': '#000000',
        'text-secondary': '#8D8D8D',
        'text-disabled': '#8D8D8D',
        'bg-elevated': '#FCFCFC',
        'bg-secondary': '#F7F7F7',
        'bg-tertiary': '#F0F0F0',
        'bg-ghost': '#F9F9F9',
        'bg-alternate': '#F2F2F2',
        'border-light': '#E0E0E0',
        'border-divider': '#F0F0F0',
        'border-field': '#8D8D8D',
      },
      borderRadius: {
        'btn': '9999rem',
        'input': '0.625rem',
        'badge': '0.375rem',
        'modal': '0.75rem',
        'card': '0.75rem',
      },
      borderWidth: {
        DEFAULT: '0.0625rem',
        0: '0',
        2: '0.125rem',
        4: '0.25rem',
        8: '0.5rem',
      },
      ringWidth: {
        DEFAULT: '0.1875rem',
        0: '0',
        1: '0.0625rem',
        2: '0.125rem',
        4: '0.25rem',
        8: '0.5rem',
      },
      boxShadow: {
        'card': 'rgba(0,0,0,0.10) 0 0.125rem 0.375rem 0, rgba(0,0,0,0.04) 0 0 0 0.0625rem',
        'card-hover': 'rgba(0,0,0,0.15) 0 0.25rem 0.75rem 0',
        'floating': 'rgba(255,255,255,0.35) 0 -0.0625rem 0 0, rgba(0,0,0,0.20) 0 0.0625rem 0.0625rem 0',
        'modal': '0 0.625rem 2.5rem rgba(0,0,0,0.10)',
        'inner': 'inset 0 0.125rem 0.25rem 0 rgba(0,0,0,0.05)',
        'card-flat': 'none',
      },
      dropShadow: {
        sm: '0 0.0625rem 0.0625rem rgba(0,0,0,0.05)',
      },
      maxWidth: {
        content: '80rem',
      },
    },
  },
  plugins: [],
};

export default config;
