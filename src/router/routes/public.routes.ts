import type { RouteRecordRaw } from 'vue-router'

// Sitio publico, bajo /blog: la landing (descripcion de la app) y el blog de
// cada usuario en /blog/<username>. Las secciones van debajo del username,
// asi un username no choca con ellas (y los reservados, con rutas futuras;
// ver ulm-core app/services/username.py).
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
        path: '',
        name: 'blog-home',
        component: () => import('@/views/public/HomePage.vue'),
      },
      {
        path: 'about',
        name: 'blog-about',
        component: () => import('@/views/public/AboutPage.vue'),
      },
      {
        path: 'projects',
        name: 'blog-projects',
        component: () => import('@/views/public/ProjectsPage.vue'),
      },
      {
        path: 'writing',
        name: 'blog-writing',
        component: () => import('@/views/public/BlogListPage.vue'),
      },
      {
        path: 'writing/:slug',
        name: 'blog-writing-post',
        component: () => import('@/views/public/BlogPostPage.vue'),
        props: true,
      },
    ],
  },
]
