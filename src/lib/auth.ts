import { compare, hash } from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { Role } from '@prisma/client'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'prokip-qualification-secret-key-change-in-production'
)

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: Role
  state?: string
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword)
}

export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({ 
    id: user.id, 
    email: user.email, 
    fullName: user.fullName, 
    role: user.role,
    state: user.state 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session-token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(roles?: Role[]): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  if (roles && !roles.includes(session.role)) {
    throw new Error('Forbidden')
  }
  return session
}
