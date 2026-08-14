import { del, get, list, put, BlobPreconditionFailedError } from '@vercel/blob'
import { normalizeGame } from '../../src/domain/model.js'

const pathFor = (id) => `games/${id}.json`
const options = { access: 'private' }

async function streamText(stream) {
  return new Response(stream).text()
}

export async function listGames() {
  const result = await list({ prefix:'games/', ...options })
  const games = await Promise.all(result.blobs.map(async blob => {
    const item = await get(blob.pathname,{...options,useCache:false})
    if (!item) return null
    const game = normalizeGame(JSON.parse(await streamText(item.stream)))
    return { id:game.id,title:game.title,status:game.status,archived:game.archived,nightNumber:game.nightNumber,updatedAt:game.updatedAt,revision:game.revision }
  }))
  return games.filter(Boolean).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
}

export async function readGame(id) {
  const item = await get(pathFor(id),{...options,useCache:false})
  if (!item) return null
  return { game:normalizeGame(JSON.parse(await streamText(item.stream))), etag:item.blob.etag }
}

export async function createGame(game) {
  game.revision = 1
  game.updatedAt = new Date().toISOString()
  await put(pathFor(game.id),JSON.stringify(game),{...options,contentType:'application/json',addRandomSuffix:false})
  return game
}

export async function saveGame(game, expectedRevision, current) {
  if (!current) throw Object.assign(new Error('بازی پیدا نشد.'),{status:404})
  if (current.game.revision !== expectedRevision) throw Object.assign(new Error('بازی در جای دیگری تغییر کرده است.'),{status:409})
  game.revision = current.game.revision + 1
  game.updatedAt = new Date().toISOString()
  try {
    await put(pathFor(game.id),JSON.stringify(game),{...options,contentType:'application/json',allowOverwrite:true,ifMatch:current.etag})
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) throw Object.assign(new Error('بازی هنگام ذخیره هم‌زمان تغییر کرد؛ دوباره تلاش کنید.'),{status:409})
    throw error
  }
  return game
}

export async function deleteGame(id, expectedRevision) {
  const current = await readGame(id)
  if (!current) return
  if (current.game.revision !== expectedRevision) throw Object.assign(new Error('نسخهٔ بازی قدیمی است.'),{status:409})
  await del(pathFor(id),{...options,ifMatch:current.etag})
}
