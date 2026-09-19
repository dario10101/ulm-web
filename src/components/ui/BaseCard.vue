<script setup lang="ts">
withDefaults(defineProps<{ title?: string }>(), { title: '' })
</script>

<template>
  <section class="rounded-xl border border-subtle bg-surface p-5">
    <header v-if="title || $slots.actions" class="mb-4 flex items-center justify-between gap-2">
      <h3 v-if="title" class="text-sm font-semibold text-foreground">
        {{ title }}
      </h3>
      <div v-if="$slots.actions"><slot name="actions" /></div>
    </header>
    <slot />
  </section>
</template>
