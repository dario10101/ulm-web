/**
 * Dueño del contenido quemado del blog (posts.ts y las paginas de Inicio,
 * Sobre mi y Proyectos). Solo su blog lo muestra: cualquier otro usuario ve
 * sus secciones vacias. Temporal, hasta que el contenido salga de la base
 * (ver PLAN-BLOG.md). Debe coincidir con el username creado en Settings.
 */
export const DEMO_BLOG_USERNAME = 'ruben'

export function hasDemoContent(username: string): boolean {
  return username === DEMO_BLOG_USERNAME
}
