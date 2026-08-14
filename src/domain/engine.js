import { SPELL_BY_ID, SPELLS, TARGET, UNKNOWN_NAME } from './rules.js'
import { allWizards, getCircleForWizard, getWizard, recalculateLevels } from './model.js'

const clone = (value) => structuredClone(value)
const face = (game, id) => getWizard(game, id)?.face || 'نامشخص'
const circle = (game, id) => getCircleForWizard(game, id)

function resolveNamedTarget(game, action) {
  if (!action.spokenName) return null
  return allWizards(game).find((w) => w.trueName === action.spokenName)?.id || null
}

function candidatesForRandom(game, action, spell, actor, target) {
  if (spell.random === 'livingName') return allWizards(game).filter(w => w.alive).map(w => w.id)
  if (spell.random === 'circleLivingName') return target ? circle(game, target.id).wizards.filter(w => w.alive).map(w => w.id) : []
  if (spell.random === 'unknownAtLevel') return SPELLS.filter(s => s.level === actor.level).map(s => s.id)
  if (spell.random === 'unknownLevelOne') return SPELLS.filter(s => s.level === 1).map(s => s.id)
  if (spell.random === 'targetKnownSpell') return SPELLS.map(s => s.id)
  if (spell.random === 'existingLink') return target?.links || []
  return []
}

export function validateNight(game, night) {
  const warnings = []
  const actions = new Map(night.actions.map(a => [a.wizardId, a]))
  for (const action of night.actions) {
    const actor = getWizard(game, action.wizardId)
    const spell = SPELL_BY_ID[action.spellId]
    if (!actor || !actor.alive) { warnings.push({wizardId: action.wizardId, message:'جادوگر زنده نیست.'}); continue }
    if (!spell) continue
    if (spell.level > actor.level) warnings.push({wizardId:actor.id,message:'سطح جادوگر برای این طلسم کافی نیست.'})
    if (spell.target === TARGET.FACE && !getWizard(game, action.targetWizardId)) warnings.push({wizardId:actor.id,message:'چهرهٔ هدف معتبر نیست.'})
    if (spell.target === TARGET.NAME && !action.spokenName.trim()) warnings.push({wizardId:actor.id,message:'نام حقیقی هدف وارد نشده است.'})
    if (spell.id === 'study' && !(actor.lastSummon?.night === game.nightNumber - 1 && actor.lastSummon.rolled && !actor.lastSummon.success)) warnings.push({wizardId:actor.id,message:'شرط مطالعه برقرار نیست.'})
    if (spell.id === 'repeat' && actions.get(action.targetWizardId)?.spellId !== getWizard(game, action.targetWizardId)?.lastSpellId) warnings.push({wizardId:actor.id,message:'هدف طلسم شب قبلش را تکرار نکرده است؛ تکرار اثری نخواهد داشت.'})
    if (spell.compareFace && !getWizard(game, action.compareWizardId)) warnings.push({wizardId:actor.id,message:'چهرهٔ مقایسه انتخاب نشده است.'})
    if (spell.secondFace && !getWizard(game, action.secondWizardId)) warnings.push({wizardId:actor.id,message:'چهرهٔ دوم انتخاب نشده است.'})
    if (spell.threeNames && action.extraNames.filter(Boolean).length !== 3) warnings.push({wizardId:actor.id,message:'سه نام باید وارد شود.'})
    if (spell.fakeName && [...action.fakeName.trim()].length !== 6) warnings.push({wizardId:actor.id,message:'نام دروغین باید شش حرف داشته باشد.'})
    if (spell.dice && action.dice.length !== actor.level) warnings.push({wizardId:actor.id,message:`باید ${actor.level} نتیجهٔ تاس وارد شود.`})
    const targetId = spell.target === TARGET.NAME ? resolveNamedTarget(game, action) : action.targetWizardId
    const choices = candidatesForRandom(game, action, spell, actor, getWizard(game,targetId))
    const randomRequired = spell.random && !(spell.id === 'summon' && Math.max(0,...action.dice) !== 6) && choices.length > 0
    if (randomRequired && !choices.includes(action.randomChoice)) warnings.push({wizardId:actor.id,message:'انتخاب دستی تصادفی از گزینه‌های مجاز انجام نشده است.'})
  }
  for (const guess of night.knowledgeGuesses.filter(g => g.submitted)) {
    const c = game.circles.find(x => x.id === guess.circleId)
    if (c?.knowledgeCooldown > 0) warnings.push({circleId:c.id,message:`محفل ${c.name} هنوز ${c.knowledgeCooldown} شب محروم است.`})
  }
  return warnings
}

export function resolveNight(sourceGame, inputNight) {
  const game = clone(sourceGame)
  const preState = clone(sourceGame)
  const warnings = validateNight(game, inputNight)
  const forced = new Set(inputNight.actions.filter(a => a.force).map(a => a.wizardId))
  const blockingWarnings = warnings.filter(w => w.wizardId && !forced.has(w.wizardId))
  if (blockingWarnings.length) return { ok:false, warnings, error:'برای هشدارهای باقی‌مانده گزینهٔ اجرای اجباری را فعال کنید.' }
  const reports = Object.fromEntries(game.circles.map(c => [c.id, []]))
  const publicReport = []
  const trace = []
  const runtime = { effects:new Map(), targeted:[], actionResults:new Map(), deaths:new Set(), absolute:new Set(), shields:new Set(), nameWards:new Set(), veils:new Set(), thorns:new Set(), mirrors:new Map(), detours:new Map(), echoes:new Set(), fortresses:new Set(), substitutes:new Map(), falseNames:new Map(), falseTraces:new Map(), thirdEars:new Map(), sanctities:new Map(), paperDeaths:new Set() }
  const effect = id => { if (!runtime.effects.has(id)) runtime.effects.set(id,{}); return runtime.effects.get(id) }
  const addReport = (wizardId,text) => reports[circle(game,wizardId).id].push(`• ${face(game,wizardId)}: ${text}`)
  const actions = inputNight.actions.map((a,index) => ({...a,index,spell:SPELL_BY_ID[a.spellId]})).filter(a => a.spell)
    .sort((a,b) => a.spell.order - b.spell.order || a.index - b.index)
  const originalActions = new Map(inputNight.actions.map(a => [a.wizardId,a]))
  const targetedTonight = new Set(inputNight.actions.filter(a => {
    const s=SPELL_BY_ID[a.spellId]
    const id=s?.target===TARGET.NAME?resolveNamedTarget(game,a):a.targetWizardId
    return id && id!==a.wizardId
  }).map(a => SPELL_BY_ID[a.spellId]?.target===TARGET.NAME?resolveNamedTarget(game,a):a.targetWizardId))

  const kill = (targetId, sourceId, absolute = false) => {
    const target = getWizard(game,targetId)
    if (!target?.alive) return false
    if (!absolute && runtime.fortresses.has(targetId)) return false
    if (!absolute && runtime.substitutes.has(targetId)) {
      const substitute = runtime.substitutes.get(targetId); runtime.substitutes.delete(targetId)
      return kill(substitute,sourceId,false)
    }
    target.alive = false; runtime.deaths.add(targetId); trace.push(`${target.face} مرد.`); return true
  }

  for (const wiz of allWizards(game).filter(w => w.alive && w.delayedDeathNight === game.nightNumber)) kill(wiz.id,wiz.id,false)
  for (const action of actions) {
    const actor = getWizard(game,action.wizardId), spell = action.spell
    if (!actor?.alive) { runtime.actionResults.set(actor?.id,false); continue }
    let targetId = spell.target === TARGET.NAME ? resolveNamedTarget(game,action) : action.targetWizardId
    if (spell.target === TARGET.NAME && targetId) { const target = getWizard(game,targetId); if (target && !target.links.includes(actor.id)) target.links.push(actor.id) }
    if (targetId && runtime.detours.has(targetId)) { targetId = runtime.detours.get(targetId); runtime.detours.delete(action.targetWizardId) }
    if (targetId && spell.target === TARGET.FACE && runtime.mirrors.has(targetId)) { targetId = runtime.mirrors.get(targetId); runtime.mirrors.delete(action.targetWizardId) }
    const target = getWizard(game,targetId)
    const unstoppable = actor.unstoppableNext && spell.id !== 'noReturn'
    if (unstoppable) actor.unstoppableNext = false
    let failed = !targetId && spell.target !== TARGET.NONE
    const actorFx = effect(actor.id)
    if (!unstoppable) {
      if (runtime.absolute.has(actor.id) || actorFx.locked || (actorFx.silenced && spell.target === TARGET.NAME) || (actorFx.masked && spell.target === TARGET.FACE) || (actorFx.noRepeat && actor.lastSpellId === spell.id)) failed = true
      if (spell.id === 'summon' && targetedTonight.has(actor.id)) failed = true
      if (targetId && runtime.absolute.has(targetId)) failed = true
      if (targetId && spell.target === TARGET.NAME && runtime.veils.has(targetId)) failed = true
      if (targetId && spell.target === TARGET.NAME && runtime.thorns.has(targetId) && action.spokenName === target?.trueName) failed = true
      if (targetId && runtime.nameWards.has(targetId) && spell.target === TARGET.NAME) { failed=true; runtime.nameWards.delete(targetId) }
      if (targetId && runtime.shields.has(targetId)) { failed=true; runtime.shields.delete(targetId) }
      const sanctity = runtime.sanctities.get(actor.id)
      if (sanctity && targetId && circle(game,targetId).id === sanctity) failed = true
    }
    if (targetId) runtime.targeted.push({actorId:actor.id,targetId,type:spell.target,order:spell.order})
    runtime.actionResults.set(actor.id,!failed)
    trace.push(`${spell.order.toString().padStart(3,'۰')} — ${actor.face}: ${spell.name}${failed?' (ناموفق)':''}`)
    if (failed) continue
    if (targetId && runtime.echoes.has(targetId)) trace.push(`طنین ${spell.name} را به ${actor.face} بازگرداند.`)
    const chosen = action.randomChoice
    switch (spell.id) {
      case 'noReturn': actor.unstoppableNext=true; break
      case 'thorn': runtime.thorns.add(actor.id); break
      case 'echo': runtime.echoes.add(actor.id); break
      case 'ambush': break
      case 'absoluteCircle': runtime.absolute.add(targetId); effect(targetId).locked=true; break
      case 'shield': runtime.shields.add(targetId); break
      case 'nameWard': runtime.nameWards.add(targetId); break
      case 'veil': runtime.veils.add(targetId); break
      case 'silence': effect(targetId).silenced=true; break
      case 'sanctity': runtime.sanctities.set(targetId,circle(game,actor.id).id); break
      case 'repeat': effect(targetId).noRepeat=true; break
      case 'mask': effect(targetId).masked=true; break
      case 'mirror': runtime.mirrors.set(targetId,actor.id); break
      case 'detour': runtime.detours.set(targetId,action.secondWizardId); break
      case 'noviceHunt': if ((effect(targetId).level ?? target.level) === 1) kill(targetId,actor.id); break
      case 'namePunish': if (originalActions.get(targetId)?.spokenName) kill(targetId,actor.id); break
      case 'finalWord': kill(targetId,actor.id); break
      case 'ashGamble': if (!kill(targetId,actor.id)) kill(actor.id,actor.id); break
      case 'lock': effect(targetId).locked=true; break
      case 'reduce': effect(targetId).level=Math.max(1,(effect(targetId).level ?? target.level)-1); break
      case 'eclipse': effect(targetId).level=1; break
      case 'fortress': runtime.fortresses.add(targetId); break
      case 'lifeSwap': runtime.substitutes.set(targetId,actor.id); break
      case 'tomorrowCurse': target.delayedDeathNight=game.nightNumber+1; break
      case 'oblivion': kill(targetId,actor.id,true); break
      case 'falseName': runtime.falseNames.set(targetId,action.fakeName); break
      case 'falseTrace': runtime.falseTraces.set(targetId,action.secondWizardId); break
      case 'thirdEar': runtime.thirdEars.set(targetId,actor.id); break
      case 'paperDeath': runtime.paperDeaths.add(targetId); break
      case 'secondKnot': target.links.push(actor.id); break
      case 'sever': if (chosen) target.links.splice(target.links.indexOf(chosen),1); break
      case 'trueExchange': { const n=actor.trueName; actor.trueName=target.trueName; target.trueName=n; break }
      case 'revelation': if (chosen) addReport(actor.id,`نام «${runtime.falseNames.get(chosen)||getWizard(game,chosen).trueName}» را مکاشفه کرد.`); break
      case 'study': case 'focus': case 'spellTheft': { const knowledge=circle(game,actor.id).knownSpells; if (chosen && !knowledge.includes(chosen)) { knowledge.push(chosen); addReport(actor.id,`محفل شما طلسم «${SPELL_BY_ID[chosen].name}» را آموخت — ${SPELL_BY_ID[chosen].description}`) } break }
      case 'summon': { const best=Math.max(...action.dice),knowledge=circle(game,actor.id).knownSpells; actor.lastSummon={night:game.nightNumber,rolled:true,success:best===6}; addReport(actor.id,`تاس‌های فراخوانی: ${action.dice.join('، ')}؛ نتیجه ${best}.`); if(best===6&&chosen&&!knowledge.includes(chosen)){knowledge.push(chosen);addReport(actor.id,`محفل شما طلسم «${SPELL_BY_ID[chosen].name}» را آموخت — ${SPELL_BY_ID[chosen].description}`)} break }
      case 'unmask': addReport(actor.id,`صاحب نام، ${target.face} است.`); break
      case 'relation': addReport(actor.id,circle(game,targetId).id===circle(game,action.compareWizardId)?.id?'دو انتخاب هم‌محفل‌اند.':'دو انتخاب هم‌محفل نیستند.'); break
      case 'test': addReport(actor.id,targetId===action.compareWizardId?'نام و چهره متعلق به یک جادوگرند.':'نام و چهره متعلق به یک جادوگر نیستند.'); break
      case 'nameTaking': if(chosen)addReport(actor.id,`نام «${runtime.falseNames.get(chosen)||getWizard(game,chosen).trueName}» را آموخت.`); break
      case 'threeNames': addReport(actor.id,action.extraNames.includes(target.trueName)?'نام هدف میان سه نام بود.':'نام هدف میان سه نام نبود.'); break
      case 'count': addReport(actor.id,`${runtime.targeted.filter(x=>x.targetId===targetId&&x.order<spell.order).length} طلسم پیش‌تر هدف را نشانه گرفته بود.`); break
      case 'track': { const t=originalActions.get(targetId)?.targetWizardId; if(t)addReport(actor.id,`هدفِ ${target.face}: ${face(game,runtime.falseTraces.get(targetId)||t)}.`); break }
      case 'listen': { const n=originalActions.get(targetId)?.spokenName; if(n)addReport(actor.id,`نام استفاده‌شده: ${n===UNKNOWN_NAME?'نام ناشناخته یا نادرست':n}.`); break }
      case 'detect': { const s=SPELL_BY_ID[originalActions.get(targetId)?.spellId]; if(s)addReport(actor.id,`نوع طلسم هدف: ${s.target==='name'?'نام':s.target==='face'?'چهره':'بی‌هدف'}.`); break }
      case 'circleTrace': { const cs=[...new Set(runtime.targeted.filter(x=>x.targetId===targetId&&x.order<spell.order).map(x=>circle(game,x.actorId).name))]; addReport(actor.id,`محفل‌های هدف‌گیرنده: ${cs.join('، ')||'هیچ‌کدام'}.`); break }
      case 'assess': addReport(actor.id,runtime.actionResults.get(targetId)?'طلسم هدف موفق شد.':'طلسم هدف شکست خورد.'); break
      case 'nameTrace': { const fs=runtime.targeted.filter(x=>x.targetId===targetId&&x.type==='name').map(x=>face(game,x.actorId)); addReport(actor.id,`هدف‌گیرندگان نامی: ${fs.join('، ')||'هیچ‌کس'}.`); break }
      case 'rank': addReport(actor.id,`سطح مؤثر هدف ${effect(targetId).level??target.level} است.`); break
      case 'census': { const prev=game.nights.at(-1)?.inputs.actions.filter(a=>a.spellId==='summon')||[]; const groups=prev.map(a=>circle(game,a.wizardId)?.name); addReport(actor.id,`فراخوانی شب قبل: ${groups.join('، ')||'هیچ‌کدام'}.`); break }
    }
  }

  for (const action of actions.filter(a=>a.spell.id==='ambush'&&runtime.actionResults.get(a.wizardId))) addReport(action.wizardId,`هدف‌گیرندگان شما: ${runtime.targeted.filter(x=>x.targetId===action.wizardId&&x.actorId!==action.wizardId).map(x=>face(game,x.actorId)).join('، ')||'هیچ‌کس'}.`)
  for (const action of actions.filter(a=>a.spell.id==='lastName'&&runtime.actionResults.get(a.wizardId))) if(runtime.deaths.has(action.targetWizardId)) addReport(action.wizardId,`نام واپسین ${face(game,action.targetWizardId)}: ${getWizard(game,action.targetWizardId).trueName}.`)
  for (const id of runtime.deaths) publicReport.push(`${face(game,id)} مرده است.`)
  for (const id of runtime.paperDeaths) publicReport.push(`${face(game,id)} مرده است.`)

  for (const [victim,thief] of runtime.thirdEars) { const victimCircle=circle(game,victim).id, thiefCircle=circle(game,thief).id; reports[thiefCircle].push(...reports[victimCircle]); reports[victimCircle]=[] }
  recalculateLevels(game)
  const livingNames = allWizards(game).filter(w=>w.alive).map(w=>w.trueName).sort()
  const knowledgeWinners=[]
  for (const c of game.circles) {
    if(c.knowledgeCooldown>0)c.knowledgeCooldown--
    const guess=inputNight.knowledgeGuesses.find(g=>g.circleId===c.id&&g.submitted)
    if(!guess)continue
    const submitted=[...guess.names].sort(), wrong=Math.max(livingNames.filter((n,i)=>n!==submitted[i]).length,Math.abs(livingNames.length-submitted.length))
    if(wrong===0)knowledgeWinners.push(c.id); else {c.knowledgeCooldown=wrong;reports[c.id].push(`• حدس دانش ${wrong} نام نادرست داشت؛ ${wrong} شب محرومیت.`)}
  }
  const powerCandidates=allWizards(game).filter(w=>w.alive&&w.level===4), maxLinks=Math.max(0,...allWizards(game).map(w=>w.links.length))
  const power=powerCandidates.filter(w=>w.links.length===maxLinks)
  const uniquePower=power.length===1?power[0]:null
  const successfulSummons=actions.filter(a=>a.spell.id==='summon'&&runtime.actionResults.get(a.wizardId)&&Math.max(...a.dice)===6)
  const attemptedSummons=actions.filter(a=>a.spell.id==='summon'&&runtime.actionResults.get(a.wizardId))
  let winner=null
  if(uniquePower) winner={type:'power',circleIds:[circle(game,uniquePower.id).id],text:`${uniquePower.face} جادوگر اعظم جدید شد.`}
  else if(knowledgeWinners.length) winner={type:'knowledge',circleIds:knowledgeWinners,text:'حدس کامل نام‌های حقیقی درست بود.'}
  else if(attemptedSummons.length&&successfulSummons.length===attemptedSummons.length){const counts={};for(const a of attemptedSummons){const id=circle(game,a.wizardId).id;counts[id]=(counts[id]||0)+1}const max=Math.max(...Object.values(counts));winner={type:'return',circleIds:Object.keys(counts).filter(id=>counts[id]===max),text:'جادوگر اعظم بازگشت.'}}
  if(winner){game.winner=winner;game.status='completed';publicReport.push(winner.text)}
  for(const action of inputNight.actions){const w=getWizard(game,action.wizardId);if(w)w.lastSpellId=action.spellId||null}
  const record={number:game.nightNumber,inputs:clone(inputNight),warnings,trace,publicReport,reports,preState,committedAt:new Date().toISOString()}
  game.nights.push(record); game.nightNumber++; game.pendingNight=null; game.updatedAt=new Date().toISOString()
  return {ok:true,warnings,trace,publicReport,reports,winner,game,record}
}

export function undoLatest(game) {
  const last=game.nights.at(-1)
  return last ? {...clone(last.preState), revision:game.revision, updatedAt:new Date().toISOString()} : game
}
