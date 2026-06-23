/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Graphite / slate oscuro para fondos premium
        graphite: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d4d8e0',
          300: '#aeb6c4',
          400: '#828da0',
          500: '#5f6982',
          600: '#48516a',
          700: '#3a4156',
          800: '#222738',
          900: '#161a27',
          950: '#0d1018',
        },
        // Acento principal: teal / azul petróleo profundo
        teal: {
          50: '#eafbf7',
          100: '#cdf3ec',
          200: '#9ee7db',
          300: '#65d3c4',
          400: '#34b7a8',
          500: '#199b8e',
          600: '#0f7d74',
          700: '#11635d',
          800: '#124f4b',
          900: '#11423f',
        },
        // Alias de compatibilidad: 'brand' apunta al teal sofisticado
        // (mantiene funcionando las clases brand-* ya usadas en las páginas).
        brand: {
          50: '#eafbf7',
          100: '#cdf3ec',
          200: '#9ee7db',
          300: '#65d3c4',
          400: '#34b7a8',
          500: '#199b8e',
          600: '#0f7d74',
          700: '#11635d',
          800: '#124f4b',
          900: '#11423f',
        },
        // Acento secundario: verde menta sofisticado
        mint: {
          50: '#f0fbf4',
          100: '#dbf5e3',
          200: '#b9e9c9',
          300: '#8bd7a8',
          400: '#57bd82',
          500: '#34a169',
        },
        // Detalle: ámbar suave
        amberx: { 400: '#e0a44b', 500: '#cf8f37' },
        // Detalle: lavanda grisácea
        lavender: { 300: '#b7b3d6', 400: '#9a95c4' },
        // Superficie blanco cálido / perla (objeto con DEFAULT para que
        // bg-pearl / text-pearl / border-pearl resuelvan siempre en JIT)
        pearl: { DEFAULT: '#f7f6f3', 50: '#faf9f7', 100: '#f1efea' },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(13,16,24,0.04), 0 4px 16px rgba(13,16,24,0.06)',
        lift: '0 10px 30px -8px rgba(13,16,24,0.18)',
        glow: '0 0 0 1px rgba(25,155,142,0.18), 0 8px 30px -10px rgba(25,155,142,0.35)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
