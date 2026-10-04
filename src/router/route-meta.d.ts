import 'vue-router'

import type { PermissionRequirement } from '@/config/permissions'

// Extiende el meta de vue-router para que el layout privado sepa
// cuando mostrar la seccion de filtros del sidebar y con que contenido.
declare module 'vue-router' {
  interface RouteMeta {
    hasFilters?: boolean
    filterLabels?: string[]
    // Si la vista cambia solo de params (misma ruta), ella misma decide el scroll.
    managesOwnScroll?: boolean
    // Exige sesion: sin ella el guard manda a /login (ver router/authGuard.ts).
    requiresAuth?: boolean
    // Permiso de dominio (o lista: cualquiera de). Sin el, el guard manda a
    // admin-no-access. Solo UX: el backend responde 403 igual.
    permission?: PermissionRequirement
  }
}
