export type UserRole = 'FACULTY' | 'STAFF' | 'CANTEEN_STAFF' | 'SECURITY' | 'ADMIN' | 'SUPER_ADMIN'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
  departmentId: string | null
}

export type AuthSession = {
  user: AuthUser
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
}

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous'
