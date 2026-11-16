<script setup lang="ts">
import { useId } from 'vue'

/**
 * Logo de ULM: simbolo SVG inline + wordmark en HTML (hereda fuente y color
 * del tema). Fuente del diseño: ulm-doc/img/logo.svg.
 */
withDefaults(defineProps<{ tagline?: boolean }>(), { tagline: false })

// ids unicos por instancia: el SVG es inline y puede aparecer varias veces.
const uid = useId()
const gradientId = `ulm-hub-${uid}`
const maskId = `ulm-hole-${uid}`
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <svg viewBox="6 6 108 108" class="h-7 w-7 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stop-color="#D45A96" />
          <stop offset="100%" stop-color="#3FA7C4" />
        </linearGradient>
        <!-- Centro calado (no blanco): se ve el fondo en tema claro y oscuro. -->
        <mask :id="maskId">
          <rect x="0" y="0" width="120" height="120" fill="white" />
          <circle cx="60" cy="60" r="9" fill="black" />
        </mask>
      </defs>
      <g :mask="`url(#${maskId})`">
        <path
          d="M60 12 C86 12 108 34 108 60 C108 86 86 108 60 108 C34 108 12 86 12 60"
          fill="none"
          :stroke="`url(#${gradientId})`"
          stroke-width="7"
          stroke-linecap="round"
        />
        <path
          d="M60 34 L60 60 L84 75 M60 60 L35 77"
          fill="none"
          :stroke="`url(#${gradientId})`"
          stroke-width="6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="60" cy="34" r="8" fill="#3FA7C4" />
        <circle cx="35" cy="77" r="8" fill="#D45A96" />
        <circle cx="84" cy="75" r="8" fill="#3FA7C4" />
      </g>
    </svg>
    <span class="flex flex-col leading-none">
      <span class="text-xl font-bold tracking-tight text-foreground">ulm</span>
      <span v-if="tagline" class="mt-1 text-[0.6rem] uppercase tracking-[0.15em] text-muted">
        Unified Life Manager
      </span>
    </span>
  </span>
</template>
