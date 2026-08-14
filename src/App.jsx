import { useEffect, useMemo, useState } from 'react'
import { api } from './api.js'
import { blankNight, createDraftGame, getWizard, quickSetupGame, validateSetup } from './domain/model.js'
import { resolveNight, validateNight } from './domain/engine.js'
import { LEVEL_ONE_SPELLS, SPELL_BY_ID, SPELLS, TARGET, targetLabel } from './domain/rules.js'

const fa = new Intl.NumberFormat('fa-IR')
const date = value => new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))

function Button({children,variant='primary',className='',...props}) {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>
}
function Alert({children,type='error'}) { return <div className={`alert alert-${type}`}>{children}</div> }
function Field({label,children,hint}) { return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label> }
function Empty({title,text}) { return <div className="empty"><span>✦</span><h3>{title}</h3><p>{text}</p></div> }

function Login({onLogin}) {
  const [password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{await api.login(password);onLogin()}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <main className="login-shell"><section className="login-card">
    <div className="sigil">و</div><p className="eyebrow">دستیار بازی‌گردان</p><h1>جادوگران</h1>
    <p className="muted">دروازهٔ برج فقط برای بازی‌گردان باز می‌شود.</p>
    <form onSubmit={submit}><Field label="رمز ورود"><input autoFocus type="password" value={password} onChange={e=>setPassword(e.target.value)} /></Field>
      {error&&<Alert>{error}</Alert>}<Button disabled={busy||!password}>{busy?'در حال ورود…':'ورود به برج'}</Button></form>
  </section></main>
}

function GameList({games,onOpen,onCreate,onRefresh,onLogout,busy}) {
  const active=games.filter(g=>!g.archived), archived=games.filter(g=>g.archived)
  return <><Header title="بازی‌ها" subtitle="دفتر بازی‌های برج" onLogout={onLogout}/><main className="container page">
    <div className="page-head"><div><p className="eyebrow">میز بازی‌گردان</p><h2>بازی‌های جادوگران</h2><p>راه‌اندازی، ادارهٔ شب و گزارش محرمانهٔ محفل‌ها.</p></div><Button onClick={onCreate}>＋ بازی جدید</Button></div>
    {busy?<Empty title="در حال خواندن دفتر…" text="چند لحظه صبر کنید."/>:active.length?<div className="game-grid">{active.map(game=><GameCard key={game.id} game={game} onClick={()=>onOpen(game.id)}/>)}</div>:<Empty title="هنوز بازی‌ای نیست" text="نخستین بازی را بسازید و محفل‌ها را گرد هم بیاورید."/>}
    {archived.length>0&&<section className="section"><h3>بایگانی</h3><div className="game-grid compact">{archived.map(game=><GameCard key={game.id} game={game} onClick={()=>onOpen(game.id)}/>)}</div></section>}
    <button className="text-button" onClick={onRefresh}>تازه‌سازی دفتر</button>
  </main></>
}
function GameCard({game,onClick}) { const status=game.status==='setup'?'آماده‌سازی':game.status==='active'?'در جریان':'پایان‌یافته'; return <button className="game-card" onClick={onClick}><div className={`status status-${game.status}`}>{status}</div><h3>{game.title}</h3><p>شب {fa.format(game.nightNumber)} · ویرایش {fa.format(game.revision)}</p><small>{date(game.updatedAt)}</small><span className="arrow">←</span></button> }

function Header({title,subtitle,onBack,onLogout,actions}) { return <header className="topbar"><div className="brand">{onBack&&<button onClick={onBack} aria-label="بازگشت">→</button>}<div className="mini-sigil">و</div><div><strong>{title}</strong><small>{subtitle}</small></div></div><div className="header-actions">{actions}<button className="icon-btn" onClick={onLogout}>خروج</button></div></header> }

function Setup({game,setGame,onSave,onLaunch,onBack,onLogout,busy}) {
  const errors=validateSetup(game), updateCircle=(ci,key,value)=>setGame({...game,circles:game.circles.map((c,i)=>i===ci?{...c,[key]:value}:c)})
  const updateWizard=(ci,wi,key,value)=>setGame({...game,circles:game.circles.map((c,i)=>i===ci?{...c,wizards:c.wizards.map((w,j)=>j===wi?{...w,[key]:value}:w)}:c)})
  const changeCount=count=>{const base=createDraftGame(game.title,count);setGame({...game,circles:count>game.circles.length?[...game.circles,...base.circles.slice(game.circles.length)]:game.circles.slice(0,count)})}
  const quickSetup=()=>{if(confirm('نام‌ها و طلسم‌های فعلی با یک چیدمان تصادفی جایگزین شوند؟'))setGame(quickSetupGame(game))}
  return <><Header title={game.title} subtitle="آماده‌سازی بازی" onBack={onBack} onLogout={onLogout}/><main className="container page">
    <div className="page-head"><div><p className="eyebrow">پیش از شب نخست</p><h2>چیدمان محفل‌ها</h2><p>چیدمان سریع بسازید یا همهٔ فیلدها را دستی وارد و ویرایش کنید.</p></div><div className="actions"><Button variant="ghost" onClick={quickSetup} disabled={busy}>✦ چیدمان سریع</Button><Button variant="ghost" onClick={onSave} disabled={busy}>ذخیرهٔ پیش‌نویس</Button><Button onClick={onLaunch} disabled={busy||errors.length>0}>آغاز بازی</Button></div></div>
    {errors.length>0&&<details className="alert alert-warn"><summary>{fa.format(errors.length)} مورد تا آغاز بازی باقی مانده</summary><ul>{errors.map((e,i)=><li key={i}>{e}</li>)}</ul></details>}
    <section className="panel setup-basics"><Field label="عنوان بازی"><input value={game.title} onChange={e=>setGame({...game,title:e.target.value})}/></Field><Field label="نام حقیقی جادوگر اعظم"><input value={game.grandWizardName} onChange={e=>setGame({...game,grandWizardName:e.target.value})}/></Field><Field label="تعداد محفل"><select value={game.circles.length} onChange={e=>changeCount(Number(e.target.value))}>{[4,5,6].map(n=><option key={n} value={n}>{fa.format(n)} محفل</option>)}</select></Field></section>
    <div className="circles">{game.circles.map((circle,ci)=><section className="circle-panel" key={circle.id} style={{'--circle':circle.color}}><div className="circle-title"><input type="color" value={circle.color} onChange={e=>updateCircle(ci,'color',e.target.value)}/><input value={circle.name} onChange={e=>updateCircle(ci,'name',e.target.value)}/></div>
      <div className="wizard-grid">{circle.wizards.map((wizard,wi)=><article className="wizard-setup" key={wizard.id}><span className="wizard-number">{fa.format(wi+1)}</span><Field label="چهره"><input value={wizard.face} onChange={e=>updateWizard(ci,wi,'face',e.target.value)}/></Field><Field label="نام حقیقی"><input value={wizard.trueName} onChange={e=>updateWizard(ci,wi,'trueName',e.target.value)}/></Field><Field label="دو طلسم اولیه"><select multiple value={wizard.initialSpells} onChange={e=>updateWizard(ci,wi,'initialSpells',[...e.target.selectedOptions].map(o=>o.value))}>{LEVEL_ONE_SPELLS.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field></article>)}</div>
    </section>)}</div>
  </main></>
}

function Overview({game,onNight,onHistory,onUndo,onArchive,onDelete,onBack,onLogout}) {
  const living=game.circles.flatMap(c=>c.wizards).filter(w=>w.alive).length,total=game.circles.length*4
  return <><Header title={game.title} subtitle={game.status==='completed'?'بازی پایان یافته':`پیش از شب ${fa.format(game.nightNumber)}`} onBack={onBack} onLogout={onLogout} actions={<Button variant="small" onClick={onHistory}>تاریخچه</Button>}/><main className="container page">
    {game.winner&&<Alert type="success"><strong>بازی پایان یافت:</strong> {game.winner.text}</Alert>}
    <div className="dashboard-hero"><div><p className="eyebrow">وضعیت برج</p><h2>{game.status==='completed'?'سرنوشت برج روشن شد':`شب ${fa.format(game.nightNumber)} در پیش است`}</h2><p>{fa.format(living)} جادوگر از {fa.format(total)} جادوگر زنده‌اند.</p></div>{game.status==='active'&&<Button onClick={onNight}>ثبت اعمال شب ←</Button>}</div>
    <div className="stat-grid"><div><span>محفل‌ها</span><strong>{fa.format(game.circles.length)}</strong></div><div><span>شب‌های ثبت‌شده</span><strong>{fa.format(game.nights.length)}</strong></div><div><span>پیوندها</span><strong>{fa.format(game.circles.flatMap(c=>c.wizards).reduce((n,w)=>n+w.links.length,0))}</strong></div></div>
    <div className="circle-overview">{game.circles.map(c=><section key={c.id} className="overview-card" style={{'--circle':c.color}}><div><i></i><h3>{c.name}</h3>{c.knowledgeCooldown>0&&<span className="cooldown">دانش: {fa.format(c.knowledgeCooldown)} شب</span>}</div><p className="spell-help">دانش ثبت‌شدهٔ محفل: {fa.format(c.knownSpells.length)} ورد (محدودکنندهٔ اجرا نیست)</p>{c.wizards.map(w=><div className={`wizard-row ${!w.alive?'dead':''}`} key={w.id}><span>{w.face}<small>{w.trueName}</small></span><span>سطح {fa.format(w.level)}<small>{fa.format(w.links.length)} پیوند</small></span></div>)}</section>)}</div>
    <section className="danger-zone"><div><h3>مدیریت بازی</h3><p>بازگشت فقط برای آخرین شب ثبت‌شده ممکن است.</p></div><div className="actions">{game.nights.length>0&&<Button variant="ghost" onClick={onUndo}>لغو شب آخر</Button>}<Button variant="ghost" onClick={onArchive}>{game.archived?'خروج از بایگانی':'بایگانی'}</Button><Button variant="danger" onClick={onDelete}>حذف</Button></div></section>
  </main></>
}

function NightEditor({game,onCancel,onCommit,onLogout}) {
  const [night,setNight]=useState(()=>blankNight(game)),[preview,setPreview]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const warnings=useMemo(()=>validateNight(game,night),[game,night])
  const update=(id,key,value)=>setNight(n=>({...n,actions:n.actions.map(a=>a.wizardId===id?{...a,[key]:value}:a)}))
  const living=game.circles.flatMap(c=>c.wizards).filter(w=>w.alive)
  const showPreview=()=>{const result=resolveNight(game,night);if(!result.ok){setError(result.error);return}setError('');setPreview(result)}
  const commit=async()=>{setBusy(true);try{await onCommit(night)}catch(e){setError(e.message);setPreview(null)}finally{setBusy(false)}}
  if(preview)return <ResultPreview game={game} result={preview} onBack={()=>setPreview(null)} onCommit={commit} busy={busy} error={error} onLogout={onLogout}/>
  return <><Header title={game.title} subtitle={`ثبت اعمال شب ${fa.format(game.nightNumber)}`} onBack={onCancel} onLogout={onLogout}/><main className="container page">
    <div className="page-head"><div><p className="eyebrow">دفتر شب</p><h2>اعمال جادوگران</h2><p>همهٔ تاس‌ها و انتخاب‌های تصادفی را بازی‌گردان وارد می‌کند.</p></div><Button onClick={showPreview}>پیش‌نمایش نتیجه</Button></div>
    {error&&<Alert>{error}</Alert>}{warnings.length>0&&<Alert type="warn">{fa.format(warnings.length)} هشدار وجود دارد. برای موارد عمدی «اجرای اجباری» را فعال کنید.</Alert>}
    {game.circles.map(c=><section className="night-circle" key={c.id} style={{'--circle':c.color}}><h3>{c.name}</h3><div className="night-actions">{c.wizards.filter(w=>w.alive).map(w=><ActionCard key={w.id} game={game} wizard={w} action={night.actions.find(a=>a.wizardId===w.id)} update={update} warnings={warnings.filter(x=>x.wizardId===w.id)} living={living}/>)}</div><KnowledgeGuess circle={c} game={game} night={night} setNight={setNight}/></section>)}
    <div className="sticky-submit"><span>{fa.format(warnings.length)} هشدار</span><Button onClick={showPreview}>محاسبه و پیش‌نمایش</Button></div>
  </main></>
}

function randomOptions(game,action,spell,wizard,living) {
  const target=getWizard(game,spell?.target===TARGET.NAME?living.find(w=>w.trueName===action.spokenName)?.id:action.targetWizardId)
  if(['livingName'].includes(spell?.random))return living.map(w=>({id:w.id,label:w.trueName}))
  if(spell?.random==='circleLivingName')return target?game.circles.find(c=>c.wizards.some(w=>w.id===target.id)).wizards.filter(w=>w.alive).map(w=>({id:w.id,label:w.trueName})):[]
  if(spell?.random==='unknownAtLevel')return SPELLS.filter(s=>s.level===wizard.level).map(s=>({id:s.id,label:s.name}))
  if(spell?.random==='unknownLevelOne')return SPELLS.filter(s=>s.level===1).map(s=>({id:s.id,label:s.name}))
  if(spell?.random==='targetKnownSpell')return SPELLS.map(s=>({id:s.id,label:s.name}))
  if(spell?.random==='existingLink')return target?target.links.map(id=>({id,label:faceLabel(game,id)})):[]
  return []
}
const faceLabel=(game,id)=>getWizard(game,id)?.face||'نامشخص'
function ActionCard({game,wizard,action,update,warnings,living}) {
  const spell=SPELL_BY_ID[action.spellId], choices=randomOptions(game,action,spell,wizard,living)
  return <article className={`action-card ${warnings.length?'has-warning':''}`}><div className="action-title"><div><h4>{wizard.face}</h4><span>سطح {fa.format(wizard.level)} · {wizard.trueName}</span></div><label className="force"><input type="checkbox" checked={action.force} onChange={e=>update(wizard.id,'force',e.target.checked)}/> اجرای اجباری</label></div>
    <div className="action-fields"><Field label="طلسم"><select value={action.spellId} onChange={e=>update(wizard.id,'spellId',e.target.value)}><option value="">بدون عمل</option>{SPELLS.map(s=><option key={s.id} value={s.id}>{s.name} · سطح {fa.format(s.level)}</option>)}</select></Field>
    {spell?.target===TARGET.FACE&&<WizardSelect label="چهرهٔ هدف" value={action.targetWizardId} onChange={v=>update(wizard.id,'targetWizardId',v)} living={living}/>} {spell?.target===TARGET.NAME&&<Field label="نام حقیقی هدف"><input value={action.spokenName} onChange={e=>update(wizard.id,'spokenName',e.target.value)}/></Field>}
    {spell?.compareFace&&<WizardSelect label="چهرهٔ مقایسه" value={action.compareWizardId} onChange={v=>update(wizard.id,'compareWizardId',v)} living={living}/>} {spell?.secondFace&&<WizardSelect label="چهرهٔ دوم" value={action.secondWizardId} onChange={v=>update(wizard.id,'secondWizardId',v)} living={living}/>} 
    {spell?.threeNames&&<Field label="سه نام حقیقی"><input value={action.extraNames.join('،')} onChange={e=>update(wizard.id,'extraNames',e.target.value.split(/[،,]/).map(x=>x.trim()).slice(0,3))}/></Field>}
    {spell?.fakeName&&<Field label="نام دروغین شش‌حرفی"><input value={action.fakeName} onChange={e=>update(wizard.id,'fakeName',e.target.value)}/></Field>}
    {spell?.dice&&<Field label={`${fa.format(wizard.level)} تاس`}><div className="dice">{Array.from({length:wizard.level},(_,i)=><input key={i} type="number" min="1" max="6" value={action.dice[i]||''} onChange={e=>{const dice=[...action.dice];dice[i]=Number(e.target.value);update(wizard.id,'dice',dice)}}/>)}</div></Field>}
    {choices.length>0&&<Field label="نتیجهٔ انتخاب دستی"><select value={action.randomChoice} onChange={e=>update(wizard.id,'randomChoice',e.target.value)}><option value="">انتخاب کنید…</option>{choices.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>}
    </div>{spell&&<p className="spell-help"><b>{targetLabel[spell.target]} · ترتیب {fa.format(spell.order)}</b> — {spell.description}</p>}{warnings.map((w,i)=><p className="warning" key={i}>⚠ {w.message}</p>)}</article>
}
function WizardSelect({label,value,onChange,living}) { return <Field label={label}><select value={value} onChange={e=>onChange(e.target.value)}><option value="">انتخاب کنید…</option>{living.map(w=><option key={w.id} value={w.id}>{w.face}</option>)}</select></Field> }
function KnowledgeGuess({circle,game,night,setNight}) { const guess=night.knowledgeGuesses.find(g=>g.circleId===circle.id),update=patch=>setNight(n=>({...n,knowledgeGuesses:n.knowledgeGuesses.map(g=>g.circleId===circle.id?{...g,...patch}:g)})); return <details className="knowledge"><summary>حدس دانش محفل {circle.knowledgeCooldown>0&&`(محروم: ${fa.format(circle.knowledgeCooldown)} شب)`}</summary><label><input type="checkbox" checked={guess.submitted} onChange={e=>update({submitted:e.target.checked})}/> این محفل حدس می‌فرستد</label>{guess.submitted&&<textarea placeholder="تمام نام‌های جادوگران زنده، هر نام در یک خط" value={guess.names.join('\n')} onChange={e=>update({names:e.target.value.split('\n').map(x=>x.trim()).filter(Boolean)})}/>}<small>اکنون {fa.format(game.circles.flatMap(c=>c.wizards).filter(w=>w.alive).length)} جادوگر زنده است.</small></details> }

function ResultPreview({game,result,onBack,onCommit,busy,error,onLogout}) { return <><Header title={game.title} subtitle={`پیش‌نمایش شب ${fa.format(game.nightNumber)}`} onBack={onBack} onLogout={onLogout}/><main className="container page reports"><div className="page-head"><div><p className="eyebrow">هنوز ذخیره نشده</p><h2>نتیجهٔ محاسبه‌شده</h2><p>گزارش‌ها را بررسی کنید؛ ثبت نهایی وضعیت بازی را تغییر می‌دهد.</p></div><Button disabled={busy} onClick={onCommit}>{busy?'در حال ثبت…':'تأیید و ثبت شب'}</Button></div>{error&&<Alert>{error}</Alert>}
    <Report title="اعلام عمومی" lines={result.publicReport} publicStyle/><section className="trace"><details><summary>رد اجرای موتور ({fa.format(result.trace.length)} گام)</summary><ol>{result.trace.map((x,i)=><li key={i}>{x}</li>)}</ol></details></section>
    <div className="report-grid">{game.circles.map(c=><Report key={c.id} title={`گزارش خصوصی ${c.name}`} lines={result.reports[c.id]} color={c.color}/>)}</div></main></> }
function Report({title,lines=[],color,publicStyle=false}) { const text=`${title}\n${lines.length?lines.join('\n'):'رویدادی برای گزارش نیست.'}`; return <article className={`report ${publicStyle?'public-report':''}`} style={{'--circle':color}}><div><h3>{title}</h3><Button variant="small" onClick={()=>navigator.clipboard.writeText(text)}>رونوشت</Button></div><pre>{lines.length?lines.join('\n'):'رویدادی برای گزارش نیست.'}</pre></article> }

function History({game,onBack,onLogout}) { const [open,setOpen]=useState(null); return <><Header title={game.title} subtitle="تاریخچهٔ شب‌ها" onBack={onBack} onLogout={onLogout}/><main className="container page"><div className="page-head"><div><p className="eyebrow">دفتر وقایع</p><h2>شب‌های ثبت‌شده</h2></div><Button variant="ghost" onClick={()=>window.print()}>چاپ</Button></div>{!game.nights.length?<Empty title="هنوز شبی ثبت نشده" text="پس از حل شب نخست، گزارش‌ها اینجا می‌مانند."/>:<div className="history-list">{[...game.nights].reverse().map(n=><article key={n.number}><button onClick={()=>setOpen(open===n.number?null:n.number)}><span><strong>شب {fa.format(n.number)}</strong><small>{date(n.committedAt)}</small></span><span>{fa.format(n.trace.length)} رویداد · {open===n.number?'⌃':'⌄'}</span></button>{open===n.number&&<div className="history-detail"><Report title="اعلام عمومی" lines={n.publicReport} publicStyle/><div className="report-grid">{game.circles.map(c=><Report key={c.id} title={c.name} lines={n.reports[c.id]} color={c.color}/>)}</div></div>}</article>)}</div>}</main></> }

export default function App() {
  const [auth,setAuth]=useState(null),[games,setGames]=useState([]),[game,setGame]=useState(null),[view,setView]=useState('list'),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const loadList=async()=>{setBusy(true);setError('');try{const data=await api.list();setGames(data.games)}catch(e){if(e.status===401)setAuth(false);else setError(e.message)}finally{setBusy(false)}}
  useEffect(()=>{api.auth().then(r=>{setAuth(r.authenticated);if(r.authenticated)loadList()}).catch(()=>setAuth(false))},[])
  const logout=async()=>{await api.logout();setAuth(false);setGame(null)}
  const create=async()=>{setBusy(true);try{const created=await api.create(createDraftGame());setGame(created);setView('setup')}catch(e){setError(e.message)}finally{setBusy(false)}}
  const open=async id=>{setBusy(true);try{const loaded=await api.get(id);setGame(loaded);setView(loaded.status==='setup'?'setup':'overview')}catch(e){setError(e.message)}finally{setBusy(false)}}
  const mutate=async(action,extra={})=>{const updated=await api.mutate(game,action,extra);setGame(updated);return updated}
  if(auth===null)return <main className="splash"><div className="sigil">و</div><p>گشودن دفتر برج…</p></main>
  if(!auth)return <Login onLogin={()=>{setAuth(true);loadList()}}/>
  const backList=()=>{setGame(null);setView('list');loadList()}
  if(!game)return <>{error&&<div className="toast">{error}</div>}<GameList games={games} onOpen={open} onCreate={create} onRefresh={loadList} onLogout={logout} busy={busy}/></>
  if(view==='setup')return <Setup game={game} setGame={setGame} onBack={backList} onLogout={logout} busy={busy} onSave={async()=>{setBusy(true);try{await mutate('saveSetup',{game})}catch(e){setError(e.message)}finally{setBusy(false)}}} onLaunch={async()=>{setBusy(true);try{const saved=await mutate('saveSetup',{game});const launched=await api.mutate(saved,'launch');setGame(launched);setView('overview')}catch(e){setError(e.message)}finally{setBusy(false)}}}/>
  if(view==='night')return <NightEditor game={game} onCancel={()=>setView('overview')} onLogout={logout} onCommit={async night=>{const updated=await mutate('resolveNight',{night});setGame(updated);setView('history')}}/>
  if(view==='history')return <History game={game} onBack={()=>setView('overview')} onLogout={logout}/>
  return <Overview game={game} onBack={backList} onLogout={logout} onNight={()=>setView('night')} onHistory={()=>setView('history')} onUndo={async()=>{if(confirm('آخرین شب و تمام نتایج آن لغو شود؟'))await mutate('undo')}} onArchive={async()=>{await mutate('archive',{archived:!game.archived})}} onDelete={async()=>{if(confirm('این بازی برای همیشه حذف شود؟')){await api.remove(game);backList()}}}/>
}
