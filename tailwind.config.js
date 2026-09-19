/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta fija (no hay modo claro): fondo, texto y 2 acentos + color de boton/CTA.
        background: '#1A1A1A',
        surface: '#242424', // cards, sidebar, inputs: un tono mas claro que el fondo para dar profundidad
        'surface-hover': '#2E2E2E',
        foreground: '#F0F0F0',
        muted: '#A6A6A6', // texto secundario (fechas, descripciones, nav inactivo)
        subtle: '#333333', // bordes
        accent: {
          // Acento 1 (verde azulado oscuro): uso como fill solido en chips grandes con texto claro encima.
          DEFAULT: '#004D61',
          // Version clara del mismo tono: para texto, links e iconos sobre el fondo oscuro
          // (el tono oscuro puro no tiene contraste suficiente como texto).
          text: '#3FA7C4',
        },
        ruby: {
          // Acento 2 (rubi intenso): acento "de personalidad" (avatar, tags del blog, detalles puntuales).
          DEFAULT: '#822659',
          text: '#D45A96',
        },
        success: {
          // Estado positivo (tarea completada). Distinto de "cta" para no confundir con botones de accion.
          DEFAULT: '#1E5631',
          text: '#4ADE80',
        },
        cta: {
          // Color de boton/accion.
          DEFAULT: '#3E5641',
          hover: '#4F6E53',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
