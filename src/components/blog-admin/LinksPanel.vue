<script setup lang="ts">
import { Pencil, Plus, TriangleAlert, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref, shallowRef } from 'vue'

import { INPUT, LABEL } from '@/components/blog-admin/styles'
import LinkTypeIcon from '@/components/blog/LinkTypeIcon.vue'
import ParamDialog from '@/components/params/ParamDialog.vue'
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { groupByCategory, LINK_CATEGORY_LABELS_EN, validateLinkInput } from '@/config/blogLinks'
import { ApiError } from '@/lib/http'
import { createLink, deleteLink, listLinks, updateLink } from '@/services/blogAdminApi'
import type { AdminLink, BlogLinkType, BlogSettings } from '@/types/blogAdmin'

/**
 * Lista de links del usuario (redes, contacto, tiendas). Aca solo se guardan:
 * cada seccion elige en su editor cuales mostrar, en medio y al final
 * (opt-in: uno nuevo no aparece en ninguna hasta habilitarlo ahi).
 */
const props = defineProps<{ settings: BlogSettings }>()

const messageOf = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback

const links = shallowRef<AdminLink[]>([])
const loadError = ref<string | null>(null)

onMounted(async () => {
  try {
    links.value = await listLinks()
  } catch (err) {
    loadError.value = messageOf(err, 'Could not load your links.')
  }
})

const typesByKey = computed(
  () => new Map(props.settings.link_types.map((t) => [t.type, t] as const)),
)
const typeOf = (link: AdminLink) => typesByKey.value.get(link.type)

const grouped = computed(() =>
  groupByCategory(
    links.value,
    (link) => typeOf(link)?.category ?? 'other',
    props.settings.link_categories,
  ),
)
const typeGroups = computed(() =>
  groupByCategory(props.settings.link_types, (t) => t.category, props.settings.link_categories),
)

/** Lo que se ve del link: el correo o el telefono sin el prefijo tecnico. */
function displayValue(url: string): string {
  return url.replace(/^mailto:/, '').replace(/^https:\/\/wa\.me\//, '+')
}

function countOfType(type: string, exceptId: string | null) {
  return links.value.filter((link) => link.type === type && link.id !== exceptId).length
}

// --- Alta / edicion ---
const dialogOpen = ref(false)
const editing = shallowRef<AdminLink | null>(null)
const formType = ref('')
const formUrl = ref('')
const formLabel = ref('')
const saving = ref(false)
const formError = ref<string | null>(null)
const touched = ref(false)

const formRules = computed<BlogLinkType | undefined>(() => typesByKey.value.get(formType.value))
const typeFull = computed(
  () =>
    !!formRules.value &&
    countOfType(formRules.value.type, editing.value?.id ?? null) >=
      props.settings.max_links_per_type,
)
const urlError = computed(() =>
  formRules.value ? validateLinkInput(formRules.value, formUrl.value) : null,
)
// Un "Sitio web" sin nombre no dice nada (L4); el resto usa el del sitio.
const labelError = computed(() =>
  formRules.value?.requires_label && !formLabel.value.trim()
    ? 'Give it a name (it can be the same link).'
    : null,
)
const valueLabel = computed(() => {
  switch (formRules.value?.kind) {
    case 'email':
      return 'Email address'
    case 'phone':
      return 'Phone number with country code'
    default:
      return 'Link (https)'
  }
})

function openDialog(link: AdminLink | null) {
  editing.value = link
  formType.value = link?.type ?? props.settings.link_types[0]?.type ?? ''
  formUrl.value = link ? displayValue(link.url) : ''
  formLabel.value = link?.label ?? ''
  formError.value = null
  touched.value = false
  dialogOpen.value = true
}

async function submit() {
  touched.value = true
  if (urlError.value || labelError.value || typeFull.value) return
  saving.value = true
  formError.value = null
  const payload = {
    type: formType.value,
    url: formUrl.value.trim(),
    label: formLabel.value.trim() || null,
  }
  try {
    if (editing.value) {
      const updated = await updateLink(editing.value.id, payload)
      links.value = links.value.map((link) => (link.id === updated.id ? updated : link))
    } else {
      links.value = [...links.value, await createLink(payload)]
    }
    dialogOpen.value = false
  } catch (err) {
    formError.value = messageOf(err, 'Could not save the link.')
  } finally {
    saving.value = false
  }
}

// --- Borrado ---
const deleting = shallowRef<AdminLink | null>(null)
const deleteBusy = ref(false)
const deleteError = ref<string | null>(null)

async function confirmDelete() {
  if (!deleting.value) return
  deleteBusy.value = true
  deleteError.value = null
  try {
    await deleteLink(deleting.value.id)
    links.value = links.value.filter((link) => link.id !== deleting.value?.id)
    deleting.value = null
  } catch (err) {
    deleteError.value = messageOf(err, 'Could not delete the link.')
  } finally {
    deleteBusy.value = false
  }
}
</script>

<template>
  <CollapsibleCard :title="`Links · ${links.length}`" storage-key="blog.links">
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-sm font-medium text-accent-text hover:underline"
        @click="openDialog(null)"
      >
        <Plus class="h-4 w-4" /> New link
      </button>
    </template>

    <p class="mb-3 text-xs text-muted">
      Your social networks, contact and shops. Saving a link here doesn't publish it: enable it in
      each section's <span class="font-medium">Links</span> block, in the page or at the end. Up to
      {{ settings.max_links_per_type }} per type.
    </p>
    <p v-if="loadError" class="text-sm text-ruby-text" role="alert">{{ loadError }}</p>
    <p v-else-if="!links.length" class="text-sm text-muted">No links yet.</p>

    <div v-else class="space-y-4">
      <div v-for="group in grouped" :key="group.category">
        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          {{ LINK_CATEGORY_LABELS_EN[group.category] ?? 'Other' }}
        </p>
        <ul class="divide-y divide-subtle">
          <li
            v-for="link in group.items"
            :key="link.id"
            class="flex items-center gap-3 py-2"
            data-test="link-row"
          >
            <LinkTypeIcon :type="link.type" class="h-4 w-4 shrink-0 text-muted" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-foreground">
                {{ link.label || typeOf(link)?.label || link.type }}
              </p>
              <p class="truncate text-xs text-muted">{{ displayValue(link.url) }}</p>
            </div>
            <span class="hidden text-xs text-muted sm:inline">
              {{
                link.used_in
                  ? `In ${link.used_in} section${link.used_in > 1 ? 's' : ''}`
                  : 'Not shown'
              }}
            </span>
            <button
              type="button"
              class="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
              :aria-label="`Edit ${link.label || typeOf(link)?.label}`"
              @click="openDialog(link)"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
              :aria-label="`Delete ${link.label || typeOf(link)?.label}`"
              @click="((deleting = link), (deleteError = null))"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </li>
        </ul>
      </div>
    </div>
  </CollapsibleCard>

  <ParamDialog
    :open="dialogOpen"
    :title="editing ? 'Edit link' : 'New link'"
    :submit-label="editing ? 'Save' : 'Add'"
    :saving="saving"
    :error="formError"
    @close="dialogOpen = false"
    @submit="submit"
  >
    <label class="block">
      <span :class="LABEL">Type</span>
      <select v-model="formType" :class="INPUT" aria-label="Link type" @change="touched = false">
        <optgroup
          v-for="group in typeGroups"
          :key="group.category"
          :label="LINK_CATEGORY_LABELS_EN[group.category] ?? 'Other'"
        >
          <option v-for="t in group.items" :key="t.type" :value="t.type">{{ t.label }}</option>
        </optgroup>
      </select>
    </label>
    <p v-if="typeFull" class="text-xs text-ruby-text">
      You already have {{ settings.max_links_per_type }} {{ formRules?.label }} links.
    </p>

    <label class="block">
      <span :class="LABEL">{{ valueLabel }}</span>
      <input
        v-model="formUrl"
        :class="INPUT"
        :type="formRules?.kind === 'email' ? 'email' : 'text'"
        :inputmode="formRules?.kind === 'phone' ? 'tel' : undefined"
        :placeholder="formRules?.placeholder"
        maxlength="500"
        :aria-label="valueLabel"
        @blur="touched = true"
      />
    </label>
    <p v-if="touched && urlError" class="text-xs text-ruby-text">{{ urlError }}</p>

    <label class="block">
      <span :class="LABEL">
        Name to show
        {{ formRules?.requires_label ? '(required)' : `(default: ${formRules?.label})` }}
      </span>
      <input
        v-model="formLabel"
        :class="INPUT"
        maxlength="60"
        :placeholder="formRules?.requires_label ? 'e.g. My portfolio' : formRules?.label"
        aria-label="Name to show"
      />
    </label>
    <p v-if="touched && labelError" class="text-xs text-ruby-text">{{ labelError }}</p>

    <p
      v-if="formRules?.sensitive"
      class="flex gap-2 rounded-lg bg-ruby-text/10 p-3 text-xs text-foreground"
      role="note"
    >
      <TriangleAlert class="h-4 w-4 shrink-0 text-ruby-text" />
      <span>
        Anyone who visits your blog will see this
        {{ formRules.kind === 'email' ? 'email' : 'number' }}. It's lightly hidden from simple bots,
        not from people or advanced scrapers. Consider a secondary
        {{ formRules.kind === 'email' ? 'address' : 'or business number' }} to avoid spam.
      </span>
    </p>
  </ParamDialog>

  <ConfirmDialog
    :open="deleting !== null"
    :title="`Delete ${deleting?.label || (deleting && typeOf(deleting)?.label) || 'link'}?`"
    :saving="deleteBusy"
    :error="deleteError"
    @close="deleting = null"
    @confirm="confirmDelete"
  >
    {{
      deleting?.used_in
        ? `It's removed from the ${deleting.used_in} section${deleting.used_in > 1 ? 's' : ''} where it's shown.`
        : "It isn't shown in any section."
    }}
  </ConfirmDialog>
</template>
