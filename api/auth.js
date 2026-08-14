import { clearSession, isAuthenticated, issueSession, passwordMatches } from './_lib/auth.js'

export default async function handler(request,response) {
  if (request.method === 'GET') return response.json({ authenticated:isAuthenticated(request) })
  if (request.method === 'DELETE') { clearSession(response); return response.status(204).end() }
  if (request.method !== 'POST') return response.status(405).json({error:'روش درخواست پشتیبانی نمی‌شود.'})
  if (!passwordMatches(request.body?.password)) return response.status(401).json({error:'رمز عبور نادرست است.'})
  issueSession(response)
  return response.json({authenticated:true})
}
