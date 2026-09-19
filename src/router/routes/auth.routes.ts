import type { RouteRecordRaw } from 'vue-router'

// Flujo de login. Sin backend de auth todavia: el submit del form
// solo simula la navegacion hacia el area privada.
export const authRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: 'auth-login',
    component: () => import('@/views/auth/LoginPage.vue'),
  },
  {
    path: 'recover',
    name: 'auth-recover',
    component: () => import('@/views/auth/RecoverPasswordPage.vue'),
  },
]
