import type { RouteRecordRaw } from 'vue-router'

// Login con Google (unico metodo por ahora). Si se agrega contraseña, aca
// van tambien las rutas de recuperacion.
export const authRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: 'auth-login',
    component: () => import('@/views/auth/LoginPage.vue'),
  },
]
