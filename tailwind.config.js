/** @type {import('tailwindcss').Config} */

// Cada color de la app es una variable CSS (canales RGB, ver src/style.css):
// el tema claro/oscuro solo cambia las variables, no las clases. El formato
// `rgb(var(--x) / <alpha-value>)` mantiene vivos los modificadores de
// opacidad (bg-accent/10, border-accent-text/50...).
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  // La clase `dark` en <html> la pone useTheme (o el script de index.html
  // antes del primer pintado). Solo la usan los colores de la paleta por
  // defecto de Tailwind (text-rose-600 dark:text-rose-400): los tokens de
  // abajo ya cambian solos.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Fondo, texto y 2 acentos + color de boton/CTA.
        background: token('background'),
        surface: token('surface'), // cards, sidebar, inputs: separado del fondo para dar profundidad
        'surface-hover': token('surface-hover'),
        foreground: token('foreground'),
        muted: token('muted'), // texto secundario (fechas, descripciones, nav inactivo)
        subtle: token('subtle'), // bordes
        accent: {
          // Acento 1 (verde azulado oscuro): fill solido con texto claro encima.
          DEFAULT: token('accent'),
          // Mismo tono con contraste suficiente como texto, links e iconos.
          text: token('accent-text'),
        },
        ruby: {
          // Acento 2 (rubi): acento "de personalidad" (avatar, tags del blog, detalles puntuales).
          DEFAULT: token('ruby'),
          text: token('ruby-text'),
        },
        success: {
          // Estado positivo (tarea completada). Distinto de "cta" para no confundir con botones de accion.
          DEFAULT: token('success'),
          text: token('success-text'),
        },
        cta: {
          // Color de boton/accion.
          DEFAULT: token('cta'),
          hover: token('cta-hover'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
