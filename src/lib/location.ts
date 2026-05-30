import { NextRequest } from 'next/server'
import { prisma } from './prisma'

interface GeoData {
  country: string | null
  state: string | null
  city: string | null
  ip: string
}

export function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || 'unknown'
}

export async function resolveLocation(ip: string): Promise<GeoData> {
  const geo: GeoData = { country: null, state: null, city: null, ip }
  if (!ip || ip === 'unknown' || ip === '127.0.0.1') return geo

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city`, {
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = await res.json()
      geo.country = data.country || null
      geo.state = data.regionName || null
      geo.city = data.city || null
    }
  } catch {
    // silently fail — location is best-effort
  }
  return geo
}

export async function trackLocation(
  userId: string,
  event: 'REGISTRATION' | 'QUIZ_SUBMIT',
  req: NextRequest,
) {
  const ip = getClientIp(req)
  const geo = await resolveLocation(ip)

  // Check for location mismatch on submission
  let flagged = false
  let flagReason: string | null = null

  if (event === 'QUIZ_SUBMIT') {
    const regLog = await prisma.locationLog.findFirst({
      where: { userId, event: 'REGISTRATION' },
      orderBy: { createdAt: 'desc' },
    })

    if (regLog && regLog.country && geo.country) {
      if (regLog.country !== geo.country) {
        flagged = true
        flagReason = `Country mismatch: registered from ${regLog.country}, submitted from ${geo.country}`
      } else if (regLog.state && geo.state && regLog.state !== geo.state) {
        flagged = true
        flagReason = `State mismatch: registered from ${regLog.state}, submitted from ${geo.state}`
      }
    }

    if (regLog && regLog.ipAddress && regLog.ipAddress !== ip) {
      if (!flagged) {
        flagged = true
        flagReason = `IP changed: registration ${regLog.ipAddress}, submission ${ip}`
      } else {
        flagReason += ` | IP changed: ${regLog.ipAddress} → ${ip}`
      }
    }
  }

  await prisma.locationLog.create({
    data: {
      userId, event, ipAddress: ip,
      country: geo.country, state: geo.state, city: geo.city,
      flagged, flagReason,
    },
  })

  return { geo, flagged, flagReason }
}
