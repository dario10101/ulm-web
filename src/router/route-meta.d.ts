import 'vue-router'

// Extiende el meta de vue-router para que el layout privado sepa
// cuando mostrar la seccion de filtros del sidebar y con que contenido.
declare module 'vue-router' {
  interface RouteMeta {
    hasFilters?: boolean
    filterLabels?: string[]
    // Si la vista cambia solo de params (misma ruta), ella misma decide el scroll.
    managesOwnScroll?: boolean
  }
}
