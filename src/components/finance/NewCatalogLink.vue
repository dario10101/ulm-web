<script setup lang="ts">
import { useRoute } from 'vue-router'

/**
 * "+ New" junto al titulo de un campo de catalogo en Add record (tags,
 * categorias, metodos de pago, fuentes, subcategorias). Abre el panel de ese
 * catalogo con ?from= para que su "Back" vuelva aca (ver RecordParamsPage).
 * Mismo estilo que "+ Add note": chico pero con el color distintivo.
 */
defineProps<{
  /** Id del tipo de registro (config/recordTypes.ts): expense, income. */
  type: string
  /** Id del panel (config/paramPanels.ts): tags, categories... */
  panel: string
  /** Como se llama un item, para el tooltip ("tag", "payment method"). */
  noun: string
}>()

const route = useRoute()
</script>

<template>
  <RouterLink
    :to="{ name: 'admin-record-params', params: { type, panel }, query: { from: route.fullPath } }"
    :title="`Create a new ${noun}`"
    class="text-xs font-medium text-accent-text hover:underline"
  >
    + New
  </RouterLink>
</template>
