async function request(path, options = {}) {
  const response = await fetch(path, { credentials:'same-origin', headers:{'Content-Type':'application/json',...(options.headers||{})}, ...options })
  const data = response.status === 204 ? null : await response.json().catch(()=>({error:'پاسخ نامعتبر سرور.'}))
  if (!response.ok) throw Object.assign(new Error(data?.error || 'درخواست ناموفق بود.'),{status:response.status,data})
  return data
}

export const api = {
  auth:()=>request('/api/auth'), login:password=>request('/api/auth',{method:'POST',body:JSON.stringify({password})}),
  logout:()=>request('/api/auth',{method:'DELETE'}), list:()=>request('/api/games'),
  get:id=>request(`/api/games?id=${encodeURIComponent(id)}`),
  create:game=>request('/api/games',{method:'POST',body:JSON.stringify({game})}),
  mutate:(game,action,extra={})=>request(`/api/games?id=${encodeURIComponent(game.id)}`,{method:'PUT',body:JSON.stringify({action,revision:game.revision,...extra})}),
  remove:game=>request(`/api/games?id=${encodeURIComponent(game.id)}&revision=${game.revision}`,{method:'DELETE'}),
}
