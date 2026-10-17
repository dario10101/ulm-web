import type { RouteRecordRaw } from 'vue-router'

// Sitio publico, bajo /blog: la landing (descripcion de la app) y el blog de
// cada usuario en /blog/<username>. Las secciones son dinamicas: cada una
// tiene su slug (PLAN-BLOG.md, B12) y la pagina monta la vista de su tipo
// (config/blogSectionTypes.ts). Viven debajo del username, asi que no chocan
// con rutas de la app.
export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: 'public-home',
    component: () => import('@/views/public/BlogLandingPage.vue'),
  },
  {
    path: ':username',
    children: [
      {
        // Sin seccion: redirige a la primera del menu.
        path: '',
        name: 'blog-home',
        component: () => import('@/views/public/blog/BlogIndexPage.vue'),
      },
      {
        path: ':section',
        name: 'blog-section',
        component: () => import('@/views/public/blog/BlogSectionPage.vue'),
        props: true,
      },
      {
        // Un elemento (.md) de una coleccion. Su URL no depende de la
        // subseccion (B15): moverlo no rompe el link.
        path: ':section/:item',
        name: 'blog-item',
        component: () => import('@/views/public/blog/BlogItemPage.vue'),
        props: true,
      },
    ],
  },
]
