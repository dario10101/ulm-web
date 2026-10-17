<script setup lang="ts">
import { FileQuestion, Menu, X } from '@lucide/vue'
import { computed, onMounted, provide, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import UserMenu from '@/components/layout/UserMenu.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { blogOwnerKey, type BlogOwner } from '@/composables/useBlogOwner'
import { isKnownSectionType } from '@/config/blogSectionTypes'
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
    // Ya cargado (ej. tras corregir la URL a la forma canonica): no se repite.
    if (requested && owner.value?.username === requested) return
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
      owner.value = {
        username: blog.username,
        displayName: blog.display_name,
        // Un tipo que el front todavia no sabe pintar no sale en el menu.
        sections: blog.sections.filter((section) => isKnownSectionType(section.type)),
      }
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

// Seccion activa en el menu, tambien dentro de uno de sus elementos (la ruta
// del elemento es hermana de la de la seccion, asi que RouterLink no la marca).
const activeSection = computed(() =>
  typeof route.params.section === 'string' ? route.params.section.toLowerCase() : null,
)

// Menu de secciones: horizontal desde `sm`; en movil, desplegable (hasta 6
// botones no caben en una fila).
const menuOpen = ref(false)
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <!-- Encabezado a todo el ancho: marca a la izquierda, acciones a la
         derecha y el menu en el medio. Desde `lg` todo en una fila; antes, el
         menu (hasta 6 secciones) no cabe y pasa a un desplegable debajo. -->
    <header class="border-b border-subtle">
      <div class="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
        <RouterLink
          v-if="owner"
          :to="{ name: 'blog-home', params: { username: owner.username } }"
          class="shrink-0 font-semibold text-foreground"
        >
          {{ owner.displayName || `@${owner.username}` }}
        </RouterLink>
        <RouterLink
          v-else
          :to="{ name: 'public-home' }"
          class="shrink-0 font-semibold text-foreground"
        >
          Unified Life Manager
        </RouterLink>

        <div class="ml-auto flex shrink-0 items-center gap-3 lg:order-last">
          <button
            v-if="owner?.sections.length"
            type="button"
            class="rounded-md p-1.5 text-muted hover:bg-surface-hover lg:hidden"
            :aria-expanded="menuOpen"
            aria-controls="blog-sections"
            aria-label="Secciones del blog"
            @click="menuOpen = !menuOpen"
          >
            <X v-if="menuOpen" class="h-5 w-5" />
            <Menu v-else class="h-5 w-5" />
          </button>
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

        <nav
          v-if="owner?.sections.length"
          id="blog-sections"
          class="w-full flex-col gap-1 text-sm font-medium text-muted lg:flex lg:w-auto lg:flex-1 lg:flex-row lg:justify-center lg:gap-x-6"
          :class="menuOpen ? 'flex' : 'hidden'"
        >
          <RouterLink
            v-for="section in owner.sections"
            :key="section.slug"
            :to="{
              name: 'blog-section',
              params: { username: owner.username, section: section.slug },
            }"
            class="whitespace-nowrap rounded-md px-2 py-1.5 hover:text-foreground lg:px-0 lg:py-0"
            :class="{ 'text-foreground': activeSection === section.slug }"
          >
            {{ section.label }}
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
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
