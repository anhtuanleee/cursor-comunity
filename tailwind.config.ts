import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'h1': ['15px', { lineHeight: '22.5px', fontWeight: '500' }],
        'body': ['13px', { lineHeight: '19.5px' }],
        'caption': ['12px', { lineHeight: '18px' }],
      },
      colors: {
        primary: '#202020',
        'text-primary': '#000000',
        'text-secondary': '#5A5A5A',
        'text-disabled': '#A0A0A0',
        'bg-secondary': '#F7F7F7',
        'bg-tertiary': '#F0F0F0',
        'bg-ghost': '#F9F9F9',
        'border-light': '#E0E0E0',
        'border-divider': '#F0F0F0',
      },
      borderRadius: {
        'btn': '9999px',
        'input': '6px',
        'modal': '12px',
        'card': '0px',
      },
      boxShadow: {
        'card-hover': 'rgba(0,0,0,0.1) 0px 2px 6px 0px, rgba(0,0,0,0.04) 0px 0px 0px 1px',
        'modal': 'rgba(0,0,0,0.1) 0px 2px 6px 0px, rgba(0,0,0,0.04) 0px 0px 0px 1px',
        'card-flat': 'none',
      },
    },
  },
  plugins: [],
};

export default config;
