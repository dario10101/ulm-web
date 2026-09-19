import type { RouteRecordRaw } from 'vue-router'

// Sitio publico (presentacion personal + blog). Vive bajo /blog.
export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: 'public-home',
    component: () => import('@/views/public/HomePage.vue'),
  },
  {
    path: 'about',
    name: 'public-about',
    component: () => import('@/views/public/AboutPage.vue'),
  },
  {
    path: 'projects',
    name: 'public-projects',
    component: () => import('@/views/public/ProjectsPage.vue'),
  },
  {
    path: 'writing',
    name: 'public-writing',
    component: () => import('@/views/public/BlogListPage.vue'),
  },
  {
    path: 'writing/:slug',
    name: 'public-writing-post',
    component: () => import('@/views/public/BlogPostPage.vue'),
    props: true,
  },
]
