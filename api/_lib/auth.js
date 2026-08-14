import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE = 'wizarding_session'
const DAY = 86400

const sign = (value) => createHmac('sha256', process.env.SESSION_SECRET || 'dev-only-change-me').update(value).digest('base64url')
const safeEqual = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function issueSession(response) {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000) + DAY })).toString('base64url')
  const secure = process.env.VERCEL ? '; Secure' : ''
  response.setHeader('Set-Cookie', `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DAY}${secure}`)
}

export function clearSession(response) {
  response.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`)
}

export function isAuthenticated(request) {
  const cookie = request.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1)
  if (!cookie) return false
  const [payload, signature] = cookie.split('.')
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false
  try { return JSON.parse(Buffer.from(payload,'base64url').toString()).exp > Date.now()/1000 } catch { return false }
}

export function requireAuth(request, response) {
  if (isAuthenticated(request)) return true
  response.status(401).json({ error: 'نشست معتبر نیست.' })
  return false
}

export function passwordMatches(value) {
  const expected = process.env.ADMIN_PASSWORD
  return Boolean(expected && typeof value === 'string' && safeEqual(value, expected))
}
