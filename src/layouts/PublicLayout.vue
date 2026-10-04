<script setup lang="ts">
import { FileQuestion } from '@lucide/vue'
import { computed, onMounted, provide, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import UserMenu from '@/components/layout/UserMenu.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { blogOwnerKey, type BlogOwner } from '@/composables/useBlogOwner'
import { hasDemoContent } from '@/data/blogDemo'
import { ApiError } from '@/lib/http'
import { getPublicBlog } from '@/services/publicBlogApi'

// El sitio publico esta en espanol; el area privada (/admin) sigue en ingles.
onMounted(() => {
  document.documentElement.lang = 'es'
})

const route = useRoute()
const router = useRouter()

// Sin username en la URL es la landing (/blog): no hay blog que resolver.
const username = computed(() =>
  typeof route.params.username === 'string' ? route.params.username : null,
)

type LoadState = 'loading' | 'ready' | 'not-found' | 'error'
const state = ref<LoadState>('ready')
const owner = shallowRef<BlogOwner | null>(null)

provide(
  blogOwnerKey,
  computed(() => owner.value),
)

watch(
  username,
  async (requested) => {
    owner.value = null
    if (!requested) {
      state.value = 'ready'
      return
    }
    state.value = 'loading'
    try {
      const blog = await getPublicBlog(requested)
      // Se navego a otro blog mientras cargaba: esta respuesta ya no aplica.
      if (username.value !== requested) return
      owner.value = { username: blog.username, hasDemoContent: hasDemoContent(blog.username) }
      state.value = 'ready'
      // La URL canonica va en minusculas (/blog/Ruben -> /blog/ruben).
      if (blog.username !== requested) {
        router.replace({ params: { ...route.params, username: blog.username } })
      }
    } catch (err) {
      if (username.value !== requested) return
      state.value = err instanceof ApiError && err.status === 404 ? 'not-found' : 'error'
    }
  },
  { immediate: true },
)

const navLinks = [
  { label: 'Inicio', name: 'blog-home' },
  { label: 'Sobre mí', name: 'blog-about' },
  { label: 'Proyectos', name: 'blog-projects' },
  { label: 'Escritos', name: 'blog-writing' },
]
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <header class="border-b border-subtle">
      <div class="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-y-3 px-6 py-5">
        <RouterLink
          v-if="owner"
          :to="{ name: 'blog-home', params: { username: owner.username } }"
          class="font-semibold text-foreground"
        >
          @{{ owner.username }}
        </RouterLink>
        <RouterLink v-else :to="{ name: 'public-home' }" class="font-semibold text-foreground">
          Unified Life Manager
        </RouterLink>

        <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
          <nav
            v-if="owner"
            class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-muted"
          >
            <RouterLink
              v-for="link in navLinks"
              :key="link.name"
              :to="{ name: link.name, params: { username: owner.username } }"
              class="hover:text-foreground"
              active-class="text-foreground"
            >
              {{ link.label }}
            </RouterLink>
          </nav>

          <div
            class="flex items-center gap-3"
            :class="{ 'sm:border-l sm:border-subtle sm:pl-5': owner }"
          >
            <RouterLink
              :to="{ name: 'admin-dashboard' }"
              class="rounded-lg border border-subtle px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
            >
              Admin
            </RouterLink>
            <UserMenu
              account-label="Ajustes de la cuenta"
              log-out-label="Cerrar sesión"
              sign-in-label="Iniciar sesión"
            />
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <EmptyState
        v-if="state === 'not-found'"
        :icon="FileQuestion"
        title="Este blog no existe"
        description="Revisa la dirección: puede que el usuario no exista o que su blog no esté activo."
      >
        <RouterLink :to="{ name: 'public-home' }" class="text-sm text-accent-text hover:underline">
          Ir al inicio
        </RouterLink>
      </EmptyState>
      <p v-else-if="state === 'error'" class="text-center text-sm text-ruby-text">
        No se pudo cargar el blog. Intenta de nuevo en un momento.
      </p>
      <RouterView v-else-if="state === 'ready'" />
    </main>

    <footer class="border-t border-subtle py-6 text-center text-sm text-muted">
      <RouterLink :to="{ name: 'public-home' }" class="hover:text-foreground">
        Unified Life Manager
      </RouterLink>
    </footer>
  </div>
</template>
