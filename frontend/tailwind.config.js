/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        // Colores personalizados para el juego
        'mesa-oscura': '#4A2C2A',      // Marrón oscuro
        'dorado-juego': '#FFD700',     // Dorado clásico
        'piedra-oscura': '#1a1a1a',    // Piedra muy oscura
        'dorado-claro': '#FACC15',     // Dorado claro
        'dorado-oscuro': '#CA8A04',    // Dorado oscuro
        'marron-claro': '#A0522D',     // Marrón claro (sienna)
        'marron-medio': '#8B5C2A',     // Marrón medio
        'marron-oscuro': '#3E2723',    // Marrón muy oscuro
        'verde-mesa': '#357a38',       // Verde típico de mesa de cartas
        'verde-mesa-claro': '#4CAF50', // Verde más claro
        'gris-carta': '#E5E7EB',       // Gris claro para cartas
        'gris-medio': '#6B7280',       // Gris medio
        'negro-translucido': 'rgba(0,0,0,0.7)', // Fondo oscuro translúcido
        // Puedes agregar más según tu estética
      },
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

