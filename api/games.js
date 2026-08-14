import { requireAuth } from './_lib/auth.js'
import { createGame, deleteGame, listGames, readGame, saveGame } from './_lib/storage.js'
import { resolveNight, undoLatest, validateNight } from '../src/domain/engine.js'
import { validateSetup } from '../src/domain/model.js'

export default async function handler(request,response) {
  if (!requireAuth(request,response)) return
  try {
    if (request.method === 'GET' && !request.query.id) return response.json({games:await listGames()})
    if (request.method === 'GET') {
      const found=await readGame(request.query.id)
      return found?response.json(found.game):response.status(404).json({error:'بازی پیدا نشد.'})
    }
    if (request.method === 'POST') {
      const game=request.body?.game
      if (!game?.id) return response.status(400).json({error:'سند بازی معتبر نیست.'})
      return response.status(201).json(await createGame(game))
    }
    if (request.method === 'DELETE') {
      await deleteGame(request.query.id,Number(request.query.revision)); return response.status(204).end()
    }
    if (request.method !== 'PUT') return response.status(405).json({error:'روش درخواست پشتیبانی نمی‌شود.'})
    const current=await readGame(request.query.id)
    if(!current)return response.status(404).json({error:'بازی پیدا نشد.'})
    const expected=Number(request.body?.revision), action=request.body?.action
    let game=current.game
    if(action==='saveSetup') game={...request.body.game,id:game.id,revision:game.revision,nights:game.nights||[]}
    else if(action==='launch') {
      game={...request.body.game,id:game.id,revision:game.revision,nights:game.nights||[]}
      const errors=validateSetup(game)
      if(errors.length)return response.status(422).json({error:errors.join('\n'),errors})
      game.status='active'
    }
    else if(action==='validateNight') return response.json({warnings:validateNight(game,request.body.night)})
    else if(action==='resolveNight') { const result=resolveNight(game,request.body.night); if(!result.ok)return response.status(422).json(result); game=result.game }
    else if(action==='undo') game=undoLatest(game)
    else if(action==='archive') game.archived=Boolean(request.body.archived)
    else return response.status(400).json({error:'عملیات ناشناخته است.'})
    return response.json(await saveGame(game,expected))
  } catch(error) {
    console.error(error)
    return response.status(error.status||500).json({error:error.message||'خطای داخلی سرور.'})
  }
}
