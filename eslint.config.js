// Configuracion plana de ESLint (formato nuevo, sin .eslintrc).
import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import ts from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default ts.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },

  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: ts.parser },
    },
  },

  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      // TypeScript ya detecta identificadores inexistentes, y conoce los tipos
      // del DOM (document, HTMLElement, PointerEvent...). Dejar no-undef
      // activo solo produce falsos positivos sobre globals del navegador.
      'no-undef': 'off',
    },
  },

  {
    rules: {
      // El proyecto usa componentes de una sola palabra a proposito
      // (DailyView, TopBar...), y el router ya evita colisiones con HTML.
      'vue/multi-word-component-names': 'off',
      // `_` como prefijo marca lo intencionalmente sin usar.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Va ultimo: apaga las reglas de ESLint que chocan con Prettier, para que
  // el formateo lo decida un solo programa.
  prettier,
)
