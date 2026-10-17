<script setup lang="ts">
import { computed } from 'vue'

import { renderMarkdown } from '@/lib/markdown'

// Unico v-html del sitio publico: siempre sobre la salida de renderMarkdown
// (markdown-it sin HTML + DOMPurify). Ver src/lib/markdown.ts.
const props = defineProps<{ source: string }>()

const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- sanitizado en renderMarkdown -->
  <div class="markdown" v-html="html" />
</template>

<style scoped>
/* Estilos del markdown renderizado. Sin plugin de tipografia: pocas reglas,
   con los tokens del tema para que funcionen en claro y oscuro. */
.markdown :deep(> * + *) {
  margin-top: 1em;
}
.markdown :deep(h1),
.markdown :deep(h2),
.markdown :deep(h3) {
  color: rgb(var(--color-foreground));
  font-weight: 600;
  line-height: 1.3;
  margin-top: 1.5em;
}
.markdown :deep(h1) {
  font-size: 1.5rem;
}
.markdown :deep(h2) {
  font-size: 1.25rem;
}
.markdown :deep(h3) {
  font-size: 1.1rem;
}
.markdown :deep(a) {
  color: rgb(var(--color-accent-text));
  text-decoration: underline;
  text-underline-offset: 2px;
}
.markdown :deep(strong) {
  color: rgb(var(--color-foreground));
}
.markdown :deep(ul) {
  list-style: disc;
  padding-left: 1.5em;
}
.markdown :deep(ol) {
  list-style: decimal;
  padding-left: 1.5em;
}
.markdown :deep(blockquote) {
  border-left: 3px solid rgb(var(--color-subtle));
  padding-left: 1em;
  font-style: italic;
}
.markdown :deep(code) {
  background: rgb(var(--color-surface-hover));
  border-radius: 4px;
  font-size: 0.875em;
  padding: 0.1em 0.35em;
}
.markdown :deep(pre) {
  background: rgb(var(--color-surface));
  border: 1px solid rgb(var(--color-subtle));
  border-radius: 8px;
  overflow-x: auto;
  padding: 1em;
}
.markdown :deep(pre code) {
  background: none;
  padding: 0;
}
.markdown :deep(img) {
  border-radius: 8px;
  max-width: 100%;
}
</style>
