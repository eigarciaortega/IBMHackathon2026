import { peticion, URLS } from '../lib/api'
import type { LoginResponse, Usuario } from '../types'

export const authApi = {
  login(email: string, password: string) {
    return peticion<LoginResponse>(URLS.auth, '/auth/login', {
      method: 'POST',
      body: { email, password },
      publico: true,
    })
  },
  me() {
    return peticion<Usuario>(URLS.auth, '/auth/me')
  },
}
