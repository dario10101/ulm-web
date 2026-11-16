<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'

import MoveButtons from '@/components/blog-admin/MoveButtons.vue'
import LinkTypeIcon from '@/components/blog/LinkTypeIcon.vue'
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue'
import { groupByCategory, LINK_CATEGORY_LABELS_EN } from '@/config/blogLinks'
import { ApiError } from '@/lib/http'
import { getBlogSettings, listLinks, setSectionLinks } from '@/services/blogAdminApi'
import type {
  AdminLink,
  AdminSection,
  BlogSettings,
  LinkSlot,
  SectionLinks,
} from '@/types/blogAdmin'

/**
 * Links de una seccion (PLAN-BLOG-LINKS.md): de la lista del usuario, cuales
 * se muestran en medio de la pagina (icono + nombre) y cuales al final (solo
 * icono), y en que orden. En la pagina se agrupan por categoria, asi que el
 * orden se cambia dentro de cada una. Cada cambio se guarda al momento.
 */
const props = defineProps<{ section: AdminSection }>()
const emit = defineEmits<{ saved: [section: AdminSection] }>()

type Placement = keyof SectionLinks

const PLACEMENTS: { key: Placement; title: string; hint: string }[] = [
  {
    key: 'inline',
    title: 'In the page',
    hint: 'Buttons with icon and name, in the middle of the section (on Home, below the intro).',
  },
  { key: 'end', title: 'At the end', hint: 'Icons only, at the bottom of the section.' },
]

const settings = shallowRef<BlogSettings | null>(null)
const links = shallowRef<AdminLink[]>([])
const loadError = ref<string | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)

onMounted(async () => {
  try {
    ;[settings.value, links.value] = await Promise.all([getBlogSettings(), listLinks()])
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : 'Could not load your links.'
  }
})

const linksById = computed(() => new Map(links.value.map((link) => [link.id, link] as const)))
const typesByKey = computed(
  () => new Map((settings.value?.link_types ?? []).map((t) => [t.type, t] as const)),
)
const categoryOf = (slot: LinkSlot) => {
  const link = linksById.value.get(slot.id)
  return (link && typesByKey.value.get(link.type)?.category) ?? 'other'
}
const nameOf = (link: AdminLink) =>
  link.label || typesByKey.value.get(link.type)?.label || link.type

function groups(placement: Placement) {
  const slots = props.section.links[placement].filter((slot) => linksById.value.has(slot.id))
  return groupByCategory(slots, categoryOf, settings.value?.link_categories ?? [])
}

const enabledCount = (placement: Placement) =>
  props.section.links[placement].filter((slot) => slot.enabled && linksById.value.has(slot.id))
    .length

async function save(placement: Placement, slots: LinkSlot[]) {
  saving.value = true
  saveError.value = null
  try {
    emit(
      'saved',
      await setSectionLinks(props.section.id, { ...props.section.links, [placement]: slots }),
    )
  } catch (err) {
    saveError.value = err instanceof ApiError ? err.message : 'Could not save the links.'
  } finally {
    saving.value = false
  }
}

function toggle(placement: Placement, id: string) {
  save(
    placement,
    props.section.links[placement].map((slot) =>
      slot.id === id ? { ...slot, enabled: !slot.enabled } : slot,
    ),
  )
}

/** Sube o baja dentro de su categoria: intercambia con el vecino de la misma
 * categoria en la lista completa. */
function move(placement: Placement, group: LinkSlot[], index: number, delta: -1 | 1) {
  const a = group[index].id
  const b = group[index + delta].id
  save(
    placement,
    props.section.links[placement].map((slot) =>
      slot.id === a ? group[index + delta] : slot.id === b ? group[index] : slot,
    ),
  )
}
</script>

<template>
  <CollapsibleCard title="Links" storage-key="blog-section.links">
    <p class="mb-4 text-xs text-muted">
      Choose which of your links this section shows. New links start hidden. They're grouped by
      category on the blog (Contact, Professional, Social media...) and empty categories don't show.
      Changes are saved right away.
    </p>
    <p v-if="loadError" class="text-sm text-ruby-text" role="alert">{{ loadError }}</p>
    <p v-else-if="settings && !links.length" class="text-sm text-muted">
      You have no links yet. Add them in
      <RouterLink :to="{ name: 'admin-blog' }" class="text-accent-text hover:underline">
        Blog → Links
      </RouterLink>
      first.
    </p>

    <div v-else-if="settings" class="grid gap-6 lg:grid-cols-2">
      <section
        v-for="placement in PLACEMENTS"
        :key="placement.key"
        :data-test="`links-${placement.key}`"
      >
        <h4 class="text-sm font-semibold text-foreground">
          {{ placement.title }}
          <span class="font-normal text-muted">· {{ enabledCount(placement.key) }} shown</span>
        </h4>
        <p class="mb-3 text-xs text-muted">{{ placement.hint }}</p>

        <div class="space-y-3">
          <div v-for="group in groups(placement.key)" :key="group.category">
            <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {{ LINK_CATEGORY_LABELS_EN[group.category] ?? 'Other' }}
            </p>
            <ul class="divide-y divide-subtle">
              <li
                v-for="(slot, index) in group.items"
                :key="slot.id"
                class="flex items-center gap-2 py-1.5"
              >
                <MoveButtons
                  :index="index"
                  :count="group.items.length"
                  :label="nameOf(linksById.get(slot.id)!)"
                  :disabled="saving"
                  @move="(delta) => move(placement.key, group.items, index, delta)"
                />
                <label class="flex min-w-0 flex-1 items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    class="h-4 w-4 shrink-0 accent-cta"
                    :checked="slot.enabled"
                    :disabled="saving"
                    :aria-label="`Show ${nameOf(linksById.get(slot.id)!)} ${placement.title.toLowerCase()}`"
                    @change="toggle(placement.key, slot.id)"
                  />
                  <LinkTypeIcon
                    :type="linksById.get(slot.id)!.type"
                    class="h-4 w-4 shrink-0 text-muted"
                  />
                  <span class="truncate" :class="{ 'text-muted': !slot.enabled }">
                    {{ nameOf(linksById.get(slot.id)!) }}
                  </span>
                </label>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
    <p v-if="saveError" class="mt-3 text-sm text-ruby-text" role="alert">{{ saveError }}</p>
  </CollapsibleCard>
</template>
