<script setup lang="ts">
import { Sparkles } from '@lucide/vue'

/**
 * Marca de "esta accion gasta tokens de IA": el mismo icono en todos los
 * botones que llaman a OpenAI. El tamaño lo pone quien lo usa (class).
 * BaseButton la muestra con `ai-cost`; los botones de solo icono la ponen
 * como insignia en una esquina (ver SpeakingStep).
 */
// Dos nodos raiz: sin esto el `class` de quien lo usa no llega al icono.
defineOptions({ inheritAttrs: false })
</script>

<template>
  <Sparkles v-bind="$attrs" class="shrink-0" aria-hidden="true" />
  <span class="sr-only">(uses AI tokens)</span>
</template>
