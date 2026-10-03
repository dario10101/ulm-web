<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ExpenseForm from '@/components/quick-add/ExpenseForm.vue'
import IncomeForm from '@/components/quick-add/IncomeForm.vue'
import MealForm from '@/components/quick-add/MealForm.vue'
import TaskForm from '@/components/quick-add/TaskForm.vue'
import WeightForm from '@/components/quick-add/WeightForm.vue'
import { recordTypes, type RecordType } from '@/config/recordTypes'

// Un form por tipo. Un tipo sin entrada aca no se puede seleccionar.
const formByType: Record<string, Component> = {
  expense: ExpenseForm,
  income: IncomeForm,
  weight: WeightForm,
  meal: MealForm,
  task: TaskForm,
}

const route = useRoute()
const router = useRouter()

// El tipo seleccionado vive en la URL (param opcional `type`), no en estado local.
const selected = computed<RecordType | null>(
  () => recordTypes.find((t) => t.implemented && t.id === route.params.type) ?? null,
)
const selectedForm = computed(() => (selected.value ? formByType[selected.value.id] : null))

// Param invalido o tipo sin form todavia: volver al menu en vez de mostrar nada.
watch(
  () => route.params.type,
  (type) => {
    if (type && !selectedForm.value) router.replace({ name: 'admin-quick-add' })
  },
  { immediate: true },
)

const formSection = ref<HTMLElement | null>(null)

function selectType(type: RecordType) {
  router.push({ name: 'admin-quick-add', params: { type: type.id } })
}

// En mobile el menu de tipos ocupa casi toda la pantalla: al elegir uno se
// baja hasta el form para que sea lo unico visible. En desktop el menu se
// compacta y no hace falta scrollear.
function scrollToFormOnMobile() {
  if (!selected.value || !window.matchMedia?.('(max-width: 639px)').matches) return
  formSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(() => selected.value?.id, scrollToFormOnMobile, { flush: 'post' })
onMounted(scrollToFormOnMobile)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">Add a record</h1>
      <p class="text-sm text-muted">
        Pick what you want to log. The faster this is, the more useful the app becomes.
      </p>
    </div>

    <!-- Con un tipo elegido, desde sm el menu se compacta a una fila de chips -->
    <div
      class="grid grid-cols-2 gap-3"
      :class="selected ? 'sm:flex sm:flex-wrap sm:gap-2' : 'sm:grid-cols-4'"
    >
      <button
        v-for="type in recordTypes"
        :key="type.id"
        type="button"
        :disabled="!type.implemented"
        :title="type.implemented ? undefined : 'Coming soon'"
        class="flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors"
        :class="[
          selected && 'sm:flex-row sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-1.5',
          selected?.id === type.id
            ? 'border-accent bg-accent/10 text-accent-text'
            : 'border-subtle text-muted hover:border-accent-text/50',
          type.implemented ? '' : 'pointer-events-none opacity-40',
        ]"
        @click="selectType(type)"
      >
        <component :is="type.icon" class="h-5 w-5" :class="selected && 'sm:h-4 sm:w-4'" />
        {{ type.label }}
      </button>
    </div>

    <!--
      min-h en mobile: si el form es corto igual debe poder quedar solo en
      pantalla al scrollear (100dvh - topbar - padding de main).
      scroll-mt deja el form por debajo del topbar sticky.
      KeepAlive: cambiar de tipo no borra lo que ya se habia escrito en otro form.
    -->
    <div
      v-if="selectedForm"
      ref="formSection"
      class="scroll-mt-16 max-sm:min-h-[calc(100dvh-5rem)]"
    >
      <KeepAlive>
        <component :is="selectedForm" />
      </KeepAlive>
    </div>
  </div>
</template>
