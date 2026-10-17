<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'

import BlogNoContent from '@/components/blog/BlogNoContent.vue'
import { useBlogOwner } from '@/composables/useBlogOwner'

// /blog/<username> sin seccion: va a la primera del menu (el orden lo elige
// el dueño). replace: el boton "atras" no vuelve a esta redireccion.
const owner = useBlogOwner()
const router = useRouter()

watch(
  owner,
  (blog) => {
    const first = blog?.sections[0]
    if (blog && first) {
      router.replace({
        name: 'blog-section',
        params: { username: blog.username, section: first.slug },
      })
    }
  },
  { immediate: true },
)
</script>

<template>
  <BlogNoContent
    v-if="owner && !owner.sections.length"
    title="Este blog aún no tiene secciones"
    description="Vuelve más tarde: su autor todavía lo está preparando."
  />
</template>
