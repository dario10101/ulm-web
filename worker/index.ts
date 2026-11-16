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

/**
 * Los archivos de /assets/* llevan hash en el nombre y cada deploy borra los
 * anteriores. Si uno no existe (una pestaña con un index.html viejo), el modo
 * SPA devolveria index.html con 200: el navegador lo rechaza como script y la
 * pagina queda en blanco sin un error claro. Con 404 falla explicito, y el
 * front recarga solo (ver src/lib/reloadOnStaleAssets.ts).
 */
async function serveAsset(request: Request, env: Env): Promise<Response> {
  const response = await env.ASSETS.fetch(request)
  if (response.headers.get('Content-Type')?.startsWith('text/html')) {
    return new Response('Not found', { status: 404 })
  }
  return response
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname.startsWith('/api/')) {
      return proxyToBackend(request)
    }
    if (pathname.startsWith('/assets/')) {
      return serveAsset(request, env)
    }
    // Por run_worker_first solo /api/* y /assets/* llegan aca; esto es por las dudas.
    return env.ASSETS.fetch(request)
  },
}
