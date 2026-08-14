import { describe, expect, test } from 'vitest'
import { blankNight, createDraftGame, quickSetupGame, validateSetup } from './model.js'
import { levelForLinks, SPELLS, UNKNOWN_NAME } from './rules.js'
import { resolveNight, undoLatest, validateNight } from './engine.js'

function gameReady() {
  const game=createDraftGame('آزمون',4); game.grandWizardName='اعظم'; game.status='active'
  game.circles.forEach((c,ci)=>c.wizards.forEach((w,wi)=>{w.face=`چهره-${ci}-${wi}`;w.trueName=`نام-${ci}-${wi}`;w.initialSpells=['shield','lock']}))
  return game
}

describe('setup and levels',()=>{
  test('validates a complete four-circle setup',()=>expect(validateSetup(gameReady())).toEqual([]))
  test('uses thresholds for every circle count',()=>{
    expect([levelForLinks(4,2),levelForLinks(4,3),levelForLinks(4,4),levelForLinks(4,6)]).toEqual([1,2,3,4])
    expect([levelForLinks(5,3),levelForLinks(5,5),levelForLinks(5,7)]).toEqual([2,3,4])
    expect([levelForLinks(6,3),levelForLinks(6,5),levelForLinks(6,8)]).toEqual([2,3,4])
  })
  test('contains every spell described by the rules table',()=>expect(SPELLS.length).toBe(53))
  test('quick setup creates a valid, unique, editable six-circle roster',()=>{
    const game=quickSetupGame(createDraftGame('سریع',6)),wizards=game.circles.flatMap(c=>c.wizards)
    expect(validateSetup(game)).toEqual([])
    expect(new Set(wizards.map(w=>w.face)).size).toBe(24)
    expect(new Set(wizards.map(w=>w.trueName)).size).toBe(24)
    expect(new Set(wizards.map(w=>w.avatarIndex)).size).toBe(24)
    expect(wizards.every(w=>w.initialSpells.length===2&&new Set(w.initialSpells).size===2)).toBe(true)
  })
})

describe('night engine',()=>{
  test('allows a wizard to take no action',()=>{
    const game=gameReady(), night=blankNight(game)
    expect(validateNight(game,night)).toEqual([])
    expect(resolveNight(game,night).ok).toBe(true)
  })
  test('creates a persistent link when a true name is spoken',()=>{
    const game=gameReady(),night=blankNight(game),actor=game.circles[0].wizards[0],target=game.circles[1].wizards[0]
    Object.assign(night.actions[0],{spellId:'whisper',spokenName:target.trueName})
    const result=resolveNight(game,night)
    expect(result.game.circles[1].wizards[0].links).toContain(actor.id)
  })
  test('an explicitly unknown name never resolves or creates a link',()=>{
    const game=gameReady(),night=blankNight(game),actor=game.circles[0].wizards[0]
    Object.assign(night.actions[0],{spellId:'whisper',spokenName:UNKNOWN_NAME,force:true})
    const result=resolveNight(game,night)
    expect(result.ok).toBe(true)
    expect(result.game.circles.flatMap(c=>c.wizards).every(w=>!w.links.includes(actor.id))).toBe(true)
  })
  test('shield blocks the later killing spell',()=>{
    const game=gameReady(),night=blankNight(game),protector=game.circles[0].wizards[0],killer=game.circles[0].wizards[1],target=game.circles[1].wizards[0]
    killer.level=3
    Object.assign(night.actions.find(a=>a.wizardId===protector.id),{spellId:'shield',targetWizardId:target.id})
    Object.assign(night.actions.find(a=>a.wizardId===killer.id),{spellId:'finalWord',spokenName:target.trueName})
    const result=resolveNight(game,night)
    expect(result.ok).toBe(true);expect(result.game.circles[1].wizards[0].alive).toBe(true)
  })
  test('undo restores the exact state before the latest night',()=>{
    const game=gameReady(),result=resolveNight(game,blankNight(game)),undone=undoLatest(result.game)
    expect(undone.nightNumber).toBe(1);expect(undone.nights).toHaveLength(0)
  })
  test('reports remain scoped by circle',()=>{
    const game=gameReady(),night=blankNight(game),actor=game.circles[0].wizards[0]
    Object.assign(night.actions.find(a=>a.wizardId===actor.id),{spellId:'revelation',randomChoice:game.circles[1].wizards[0].id})
    const result=resolveNight(game,night)
    expect(result.reports[game.circles[0].id].join(' ')).toContain('مکاشفه')
    expect(result.reports[game.circles[1].id]).toEqual([])
  })
})
