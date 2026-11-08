// Pages Function: reenvia https://getulm.app/api/* al backend en Cloud Run.
//
// Es el equivalente en produccion del proxy de Vite (vite.config.ts): el
// navegador solo habla con getulm.app, asi que front y API son el mismo
// origen. La cookie de sesion (SameSite=Lax, sin Domain) queda en getulm.app y
// viaja sola en cada fetch; no hace falta CORS con credenciales.
//
// Corre en Cloudflare, no en el navegador: no entra en el build de Vite ni en
// tsconfig (que solo incluye src/).

const BACKEND_ORIGIN = 'https://ulm-core-802907629918.us-east1.run.app'

export const onRequest = async ({ request }: { request: Request }): Promise<Response> => {
  const url = new URL(request.url)
  const target = new URL(url.pathname + url.search, BACKEND_ORIGIN)

  // fetch toma el Host de la URL destino (*.run.app), que es como Cloud Run
  // sabe a que servicio va. El resto de los headers (cookie, origin,
  // content-type) pasan tal cual.
  return fetch(target, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    // Los 302 del login (a Google y de vuelta al front) los tiene que seguir
    // el navegador, no este proxy: si no, se pierde el Set-Cookie y la
    // redireccion.
    redirect: 'manual',
  })
}
