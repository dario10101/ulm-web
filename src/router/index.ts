import { createRouter, createWebHistory } from 'vue-router'

import AppShellLayout from '@/layouts/AppShellLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import PublicLayout from '@/layouts/PublicLayout.vue'

import { installAuthGuard } from './authGuard'
import { adminRoutes } from './routes/admin.routes'
import { authRoutes } from './routes/auth.routes'
import { publicRoutes } from './routes/public.routes'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: { name: 'public-home' } },
    { path: '/blog', component: PublicLayout, children: publicRoutes },
    {
      path: '/admin',
      component: AppShellLayout,
      children: adminRoutes,
      meta: { requiresAuth: true },
    },
    { path: '/login', component: AuthLayout, children: authRoutes },
    { path: '/:pathMatch(.*)*', redirect: { name: 'public-home' } },
  ],
  scrollBehavior(to, from) {
    if (to.name === from.name && to.meta.managesOwnScroll) return false
    return { top: 0 }
  },
})

installAuthGuard(router)

export default router
