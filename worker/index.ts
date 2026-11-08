// Worker de Cloudflare: sirve el front (dist/) y reenvia /api/* al backend en
// Cloud Run. Config en wrangler.jsonc.
//
// Es el equivalente en produccion del proxy de Vite (vite.config.ts): el
// navegador solo habla con getulm.app, asi que front y API son el mismo
// origen. La cookie de sesion (SameSite=Lax, sin Domain) queda en getulm.app y
// viaja sola en cada fetch; no hace falta CORS con credenciales.
//
// Corre en Cloudflare, no en el navegador: no entra en el build de Vite ni en
// tsconfig (que solo incluye src/).

const BACKEND_ORIGIN = 'https://ulm-core-802907629918.us-east1.run.app'

interface Env {
  // Los archivos de dist/ (binding "ASSETS" en wrangler.jsonc).
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

function proxyToBackend(request: Request): Promise<Response> {
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return proxyToBackend(request)
    }
    // Por run_worker_first solo /api/* llega aca; esto es por las dudas.
    return env.ASSETS.fetch(request)
  },
}
