// Usuario logueado, tal como lo devuelve GET /me (ulm-core app/schemas/user.py).
export interface Me {
  id: number
  name: string
  email: string
  avatar_url: string | null
  timezone: string
}
