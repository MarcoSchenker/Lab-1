/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      animation: {
        'carta-desliza-arriba': 'deslizaArriba 1s ease-out forwards',
        'carta-desliza-abajo': 'deslizaAbajo 1s ease-out forwards',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        deslizaArriba: {
          '0%': { transform: 'translateY(-100px) scale(0.9)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        deslizaAbajo: {
          '0%': { transform: 'translateY(100px) scale(0.9)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

