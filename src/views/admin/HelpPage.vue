<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'

const faqs = [
  {
    question: 'Is my data saved anywhere?',
    answer: 'Not yet — this is a navigable prototype without a backend connection.',
  },
  {
    question: 'Can I add new record types?',
    answer: 'That will be configurable from Settings once the data model is in place.',
  },
  {
    question: 'How is my data used?',
    answer:
      "This is a private, personal tool — nothing here is shared or public unless it's in the Blog section.",
  },
]
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">Help</h1>
      <p class="text-sm text-muted">Quick answers while this is still taking shape.</p>
    </div>

    <BaseCard>
      <div class="divide-y divide-subtle">
        <details v-for="faq in faqs" :key="faq.question" class="group py-3 first:pt-0 last:pb-0">
          <summary class="cursor-pointer list-none text-sm font-medium text-foreground">
            {{ faq.question }}
          </summary>
          <p class="mt-2 text-sm text-muted">{{ faq.answer }}</p>
        </details>
      </div>
    </BaseCard>
  </div>
</template>
