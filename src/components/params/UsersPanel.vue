<script setup lang="ts">
import { KeyRound, Plus, UserCheck, UserX } from '@lucide/vue'
import { computed, onMounted, ref, shallowRef } from 'vue'

import ParamDialog from '@/components/params/ParamDialog.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { PERMISSION_DOMAINS, type Permission } from '@/config/permissions'
import { ApiError } from '@/lib/http'
import { domainSummary, setDomainAccess, setDomainAi } from '@/lib/userPermissions'
import {
  disableUser,
  enableUser,
  inviteUser,
  listUsers,
  setUserPermissions,
} from '@/services/adminUsersApi'
import type { AdminUser, UserStatus } from '@/types/adminUsers'

/**
 * Usuarios y sus permisos de dominio (solo admin). Mismas reglas que
 * scripts/manage_users.py, porque las dos usan el mismo service del backend.
 * El admin (ADMIN_EMAILS) aparece pero no se edita.
 */
function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}

const users = shallowRef<AdminUser[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    users.value = await listUsers()
  } catch (err) {
    loadError.value = messageOf(err, 'Could not load the users.')
  } finally {
    loading.value = false
  }
}

function replace(updated: AdminUser): void {
  users.value = users.value.some((u) => u.id === updated.id)
    ? users.value.map((u) => (u.id === updated.id ? updated : u))
    : [...users.value, updated]
}

const STATUS: Record<UserStatus, { label: string; tone: 'neutral' | 'accent' | 'ruby' }> = {
  active: { label: 'Active', tone: 'accent' },
  invited: { label: 'Invited', tone: 'neutral' },
  disabled: { label: 'Disabled', tone: 'ruby' },
}

function lastLoginText(user: AdminUser): string {
  if (!user.last_login_at) return 'Never signed in'
  return `Last sign-in ${new Date(user.last_login_at).toLocaleDateString()}`
}

function accessText(user: AdminUser): string {
  if (user.is_admin) return 'All access (admin from ADMIN_EMAILS)'
  return domainSummary(user.permissions) || 'No modules yet'
}

// --- Invitar ---

const inviteOpen = ref(false)
const inviteEmail = ref('')
const inviteName = ref('')
const inviteSaving = ref(false)
const inviteError = ref<string | null>(null)

function openInvite(): void {
  inviteEmail.value = ''
  inviteName.value = ''
  inviteError.value = null
  inviteOpen.value = true
}

async function submitInvite(): Promise<void> {
  inviteSaving.value = true
  inviteError.value = null
  try {
    const created = await inviteUser({
      email: inviteEmail.value,
      name: inviteName.value.trim() || null,
    })
    replace(created)
    inviteOpen.value = false
    // Una invitacion sin permisos solo ve lo que no es de un modulo: el paso
    // natural es asignarlos ya.
    openPermissions(created)
  } catch (err) {
    inviteError.value = messageOf(err, 'Could not invite this person.')
  } finally {
    inviteSaving.value = false
  }
}

// --- Permisos ---

const editing = shallowRef<AdminUser | null>(null)
const draft = ref<Permission[]>([])
const permissionsSaving = ref(false)
const permissionsError = ref<string | null>(null)

function openPermissions(user: AdminUser): void {
  editing.value = user
  draft.value = [...user.permissions]
  permissionsError.value = null
}

async function submitPermissions(): Promise<void> {
  if (!editing.value) return
  permissionsSaving.value = true
  permissionsError.value = null
  try {
    replace(await setUserPermissions(editing.value.id, draft.value))
    editing.value = null
  } catch (err) {
    permissionsError.value = messageOf(err, 'Could not save the permissions.')
  } finally {
    permissionsSaving.value = false
  }
}

// --- Deshabilitar / habilitar ---

const disabling = shallowRef<AdminUser | null>(null)
const statusSaving = ref(false)
const statusError = ref<string | null>(null)

function askDisable(user: AdminUser): void {
  disabling.value = user
  statusError.value = null
}

async function confirmDisable(): Promise<void> {
  if (!disabling.value) return
  statusSaving.value = true
  statusError.value = null
  try {
    replace(await disableUser(disabling.value.id))
    disabling.value = null
  } catch (err) {
    statusError.value = messageOf(err, 'Could not disable this user.')
  } finally {
    statusSaving.value = false
  }
}

const notice = ref<string | null>(null)

async function enable(user: AdminUser): Promise<void> {
  notice.value = null
  try {
    replace(await enableUser(user.id))
  } catch (err) {
    notice.value = messageOf(err, 'Could not enable this user.')
  }
}

const editableCount = computed(() => users.value.filter((u) => !u.is_admin).length)

onMounted(load)
</script>

<template>
  <div>
    <BaseCard>
      <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-foreground">
          Users <span class="font-normal text-muted">({{ users.length }})</span>
        </h2>
        <BaseButton variant="secondary" class="!px-3 !py-1.5" @click="openInvite">
          <Plus class="h-4 w-4" />
          Invite user
        </BaseButton>
      </header>

      <p v-if="notice" class="mb-3 rounded-lg bg-ruby/10 px-3 py-2 text-xs text-ruby-text">
        {{ notice }}
      </p>

      <p v-if="loading && !users.length" class="py-6 text-center text-sm text-muted">Loading...</p>
      <p v-else-if="loadError" class="py-6 text-center text-sm text-ruby-text">{{ loadError }}</p>

      <ul v-else class="divide-y divide-subtle">
        <li
          v-for="user in users"
          :key="user.id"
          class="flex items-center gap-3 py-3"
          :class="user.status === 'disabled' ? 'opacity-60' : ''"
          :data-test="`user-row-${user.id}`"
        >
          <img
            v-if="user.avatar_url"
            :src="user.avatar_url"
            alt=""
            referrerpolicy="no-referrer"
            class="h-8 w-8 shrink-0 rounded-full"
          />
          <span
            v-else
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold uppercase text-accent-text"
            aria-hidden="true"
          >
            {{ user.name.charAt(0) }}
          </span>

          <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-center gap-2 text-sm text-foreground">
              <span class="truncate">{{ user.name }}</span>
              <BaseBadge v-if="user.is_admin" tone="accent">Admin</BaseBadge>
              <BaseBadge v-else :tone="STATUS[user.status].tone">
                {{ STATUS[user.status].label }}
              </BaseBadge>
            </p>
            <p class="truncate text-xs text-muted">{{ user.email }} · {{ lastLoginText(user) }}</p>
            <p class="truncate text-xs text-foreground" data-test="access">
              {{ accessText(user) }}
            </p>
          </div>

          <div v-if="!user.is_admin" class="flex shrink-0 gap-1">
            <button
              type="button"
              :title="`Edit permissions of ${user.name}`"
              class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
              @click="openPermissions(user)"
            >
              <KeyRound class="h-4 w-4" />
            </button>
            <button
              v-if="user.status === 'disabled'"
              type="button"
              :title="`Enable ${user.name}`"
              class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-success-text"
              @click="enable(user)"
            >
              <UserCheck class="h-4 w-4" />
            </button>
            <button
              v-else
              type="button"
              :title="`Disable ${user.name}`"
              class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
              @click="askDisable(user)"
            >
              <UserX class="h-4 w-4" />
            </button>
          </div>
        </li>
      </ul>

      <p v-if="!loading && !loadError && !editableCount" class="pt-2 text-xs text-muted">
        Only you so far. Invite someone to give them access.
      </p>
    </BaseCard>

    <ParamDialog
      :open="inviteOpen"
      title="Invite user"
      submit-label="Invite"
      :saving="inviteSaving"
      :error="inviteError"
      @close="inviteOpen = false"
      @submit="submitInvite"
    >
      <label class="block text-sm">
        <span class="mb-1 block text-muted">Google email *</span>
        <input
          v-model="inviteEmail"
          type="email"
          maxlength="255"
          required
          class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
        />
      </label>
      <label class="block text-sm">
        <span class="mb-1 block text-muted">Name</span>
        <input
          v-model="inviteName"
          type="text"
          maxlength="120"
          placeholder="Taken from Google on the first sign-in"
          class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
        />
      </label>
      <p class="text-xs text-muted">
        While the Google app is in Testing mode, also add this email as a test user (see Access).
      </p>
    </ParamDialog>

    <ParamDialog
      :open="editing !== null"
      :title="`Permissions of ${editing?.name ?? ''}`"
      :saving="permissionsSaving"
      :error="permissionsError"
      @close="editing = null"
      @submit="submitPermissions"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-muted">
            <th class="pb-2 font-medium">Module</th>
            <th class="w-16 pb-2 text-center font-medium">Access</th>
            <th class="w-16 pb-2 text-center font-medium">AI</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-subtle">
          <tr v-for="domain in PERMISSION_DOMAINS" :key="domain.id">
            <td class="py-2">
              <p class="text-foreground">{{ domain.label }}</p>
              <p class="text-xs text-muted">{{ domain.description }}</p>
            </td>
            <td class="py-2 text-center">
              <input
                type="checkbox"
                :aria-label="`${domain.label} access`"
                :checked="draft.includes(domain.id)"
                class="h-4 w-4 accent-cta"
                @change="
                  draft = setDomainAccess(
                    draft,
                    domain.id,
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              />
            </td>
            <td class="py-2 text-center">
              <input
                v-if="domain.ai"
                type="checkbox"
                :aria-label="`${domain.label} AI`"
                :checked="draft.includes(domain.ai)"
                :disabled="!draft.includes(domain.id)"
                class="h-4 w-4 accent-cta disabled:opacity-40"
                @change="
                  draft = setDomainAi(draft, domain.id, ($event.target as HTMLInputElement).checked)
                "
              />
            </td>
          </tr>
        </tbody>
      </table>
      <p class="text-xs text-muted">
        AI needs access to the module. Changes apply on their next request; their menu updates when
        they reload.
      </p>
    </ParamDialog>

    <div
      v-if="disabling"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="disabling = null"
    >
      <div
        role="alertdialog"
        :aria-label="`Disable ${disabling.name}`"
        class="w-full max-w-sm space-y-4 rounded-xl border border-subtle bg-surface p-5"
      >
        <h3 class="text-sm font-semibold text-foreground">Disable "{{ disabling.name }}"?</h3>
        <p class="text-sm text-muted">
          They are signed out right away and can't sign in again. Their data and permissions are
          kept: enabling them restores everything.
        </p>
        <p v-if="statusError" class="text-sm text-ruby-text">{{ statusError }}</p>
        <div class="flex justify-end gap-2">
          <BaseButton variant="ghost" @click="disabling = null">Cancel</BaseButton>
          <button
            type="button"
            :disabled="statusSaving"
            class="inline-flex items-center justify-center rounded-lg bg-ruby px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ruby/90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="confirmDisable"
          >
            {{ statusSaving ? 'Working...' : 'Disable' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
