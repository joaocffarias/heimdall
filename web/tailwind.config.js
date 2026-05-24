/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta Heimdall — Dark Navy / Slate
        navy: {
          950: '#030712',
          900: '#0a0f1e',
          800: '#0f172a',
          700: '#1e293b',
          600: '#2d3f5e',
          500: '#334155',
          400: '#475569',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        accent: {
          DEFAULT: '#3b82f6',  // azul principal
          hover: '#2563eb',
          light: '#60a5fa',
          glow: 'rgba(59,130,246,0.3)',
        },
        success: { DEFAULT: '#22c55e', light: '#4ade80', bg: 'rgba(34,197,94,0.1)' },
        warning: { DEFAULT: '#f59e0b', light: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
        danger:  { DEFAULT: '#ef4444', light: '#f87171', bg: 'rgba(239,68,68,0.1)' },
        pending: { DEFAULT: '#a855f7', light: '#c084fc', bg: 'rgba(168,85,247,0.1)' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #1a0f2e 100%)',
        'gradient-card': 'linear-gradient(135deg, #1e293b 0%, #162032 100%)',
        'glow-accent': 'radial-gradient(circle at center, rgba(59,130,246,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'glow': '0 0 20px rgba(59,130,246,0.25)',
        'glow-sm': '0 0 10px rgba(59,130,246,0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
