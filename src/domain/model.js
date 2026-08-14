import { SPELLS, levelForLinks } from './rules.js'

export const uid = (prefix = 'id') => `${prefix}_${crypto.randomUUID()}`

export function createDraftGame(title = 'بازی جدید', circleCount = 4) {
  const colors = ['#a78bfa','#22d3ee','#f59e0b','#fb7185','#34d399','#60a5fa']
  return {
    schemaVersion: 1,
    id: uid('game'),
    revision: 0,
    title,
    status: 'setup',
    archived: false,
    grandWizardName: '',
    circles: Array.from({ length: circleCount }, (_, ci) => ({
      id: uid('circle'), name: `محفل ${ci + 1}`, color: colors[ci], knowledgeCooldown: 0, knownSpells: [],
      wizards: Array.from({ length: 4 }, (_, wi) => ({
        id: uid('wizard'), face: `جادوگر ${ci * 4 + wi + 1}`, trueName: '', alive: true,
        initialSpells: [], links: [], level: 1, lastSpellId: null, lastSummon: null,
        delayedDeathNight: null, unstoppableNext: false,
      })),
    })),
    nightNumber: 1,
    nights: [],
    pendingNight: null,
    winner: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function allWizards(game) {
  return game.circles.flatMap((circle) => circle.wizards.map((wizard) => ({ ...wizard, circleId: circle.id, circleName: circle.name })))
}

export function getWizard(game, id) {
  for (const circle of game.circles) {
    const wizard = circle.wizards.find((item) => item.id === id)
    if (wizard) return wizard
  }
  return null
}

export function getCircleForWizard(game, id) {
  return game.circles.find((circle) => circle.wizards.some((wizard) => wizard.id === id)) || null
}

export function recalculateLevels(game) {
  for (const wizard of allWizards(game)) {
    const stored = getWizard(game, wizard.id)
    stored.level = levelForLinks(game.circles.length, stored.links.length)
  }
}

export function validateSetup(game) {
  const errors = []
  if (game.circles.length < 4 || game.circles.length > 6) errors.push('تعداد محفل‌ها باید بین ۴ و ۶ باشد.')
  if (!game.title.trim()) errors.push('نام بازی الزامی است.')
  if (!game.grandWizardName.trim()) errors.push('نام حقیقی جادوگر اعظم الزامی است.')
  const faces = new Set(), names = new Set()
  for (const circle of game.circles) {
    if (game.status === 'setup') circle.knownSpells = [...new Set(circle.wizards.flatMap(w=>w.initialSpells || []))]
    if (!circle.name.trim()) errors.push('نام همهٔ محفل‌ها الزامی است.')
    if (circle.wizards.length !== 4) errors.push(`محفل ${circle.name} باید دقیقاً چهار جادوگر داشته باشد.`)
    for (const wizard of circle.wizards) {
      if (!wizard.face.trim()) errors.push('چهرهٔ همهٔ جادوگران الزامی است.')
      else if (faces.has(wizard.face.trim())) errors.push(`چهرهٔ تکراری: ${wizard.face}`)
      else faces.add(wizard.face.trim())
      if (!wizard.trueName.trim()) errors.push(`نام حقیقی ${wizard.face} الزامی است.`)
      else if (names.has(wizard.trueName.trim())) errors.push(`نام حقیقی تکراری: ${wizard.trueName}`)
      else names.add(wizard.trueName.trim())
      if (wizard.initialSpells.length !== 2 || wizard.initialSpells.some((id) => !SPELLS.some((s) => s.id === id && s.level === 1))) {
        errors.push(`${wizard.face} باید دقیقاً دو طلسم سطح یک داشته باشد.`)
      }
    }
  }
  if (names.has(game.grandWizardName.trim())) errors.push('نام جادوگر اعظم نباید با نام جادوگری یکسان باشد.')
  return errors
}

const QUICK_CIRCLES = ['محفل سپیده','محفل سایه','محفل اخگر','محفل مهتاب','محفل زمرد','محفل نیلگون']
const QUICK_FACES = ['آذر','باران','پگاه','تندر','ثریا','جاوید','چکاوک','خورشید','دریا','رادین','روژان','ژاله','سایه','شهاب','طوفان','عقیق','فرزاد','ققنوس','کیان','گلنار','لاله','مهتاب','نیما','هیراد']
const QUICK_NAMES = ['آرمانا','بامداد','پرتوسا','تیرگان','ثریانا','جاودان','چمرانک','خزرانا','درفشان','رادمهر','روهینا','ژرفانا','سورینا','شبدیز','طلسما','عنبرین','فرهانا','قمرزاد','کارینا','گلپری','لالینا','مهرآوا','نوشینک','هورزاد']
const QUICK_GRAND_NAMES = ['اورمزد','زروان','اهورین','مهرگان','فرنام']

function randomIndex(length) {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0] % length
}

function shuffled(items) {
  const result=[...items]
  for(let i=result.length-1;i>0;i--){const j=randomIndex(i+1);[result[i],result[j]]=[result[j],result[i]]}
  return result
}

export function quickSetupGame(source) {
  const game=structuredClone(source), faces=shuffled(QUICK_FACES), names=shuffled(QUICK_NAMES)
  game.grandWizardName=QUICK_GRAND_NAMES[randomIndex(QUICK_GRAND_NAMES.length)]
  game.circles.forEach((circle,ci)=>{
    circle.name=QUICK_CIRCLES[ci]
    circle.wizards.forEach((wizard,wi)=>{
      const index=ci*4+wi, spells=shuffled(SPELLS.filter(s=>s.level===1)).slice(0,2)
      wizard.face=faces[index]; wizard.trueName=names[index]; wizard.initialSpells=spells.map(s=>s.id)
    })
    circle.knownSpells=[...new Set(circle.wizards.flatMap(w=>w.initialSpells))]
  })
  return game
}

export function normalizeGame(game) {
  for (const circle of game.circles || []) {
    const legacy = circle.wizards.flatMap(w => w.knownSpells || [])
    for (const wizard of circle.wizards) {
      wizard.initialSpells ||= wizard.knownSpells || []
      delete wizard.knownSpells
    }
    circle.knownSpells = [...new Set([...(circle.knownSpells || []),...legacy,...circle.wizards.flatMap(w=>w.initialSpells)])]
  }
  return game
}

export function blankNight(game) {
  return {
    number: game.nightNumber,
    actions: allWizards(game).filter((w) => w.alive).map((wizard) => ({
      wizardId: wizard.id, spellId: '', targetWizardId: '', spokenName: '', compareWizardId: '',
      secondWizardId: '', extraNames: ['', '', ''], fakeName: '', dice: [], randomChoice: '', force: false,
    })),
    knowledgeGuesses: game.circles.map((circle) => ({ circleId: circle.id, names: [], submitted: false })),
  }
}
