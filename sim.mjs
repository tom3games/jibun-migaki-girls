// 遊び方ごとの分布。node sim.mjs  （ブラウザを開かない）
import { createRequire } from 'node:module'
globalThis.window = globalThis
const require = createRequire(import.meta.url)
await import('./data.js')
const Sim = require('./sim.js'), { P, choice, FB } = require('./plans.js')
const D = globalThis.D
export function run(plan, seed, pick, ch) {
  const S = Sim.create(D, seed)
  let guard = 0
  while (!S.done && guard++ < 200) {
    if (S.choice) { Sim.choose(D, S, ch ? ch(S.choice) : choice(plan, S.choice)); continue }
    let a = pick ? pick(S) : P[plan](S)
    let o = Sim.act(D, S, a)
    if (!o.ok) o = Sim.act(D, S, FB[plan] || 'sleep')
  }
  return { S, who: Sim.judge(D, S) }
}
// 猫・おばあちゃんは、その回にその客が来る種を選ぶ
export function seedFor(plan, base) {
  for (let s = base; s < base + 500; s++) { const S = Sim.create(D, s); if (plan === 'cat' && S.threads.cat && !S.threads.granny) return s; if (plan === 'granny' && S.threads.granny && !S.threads.cat) return s; if (plan !== 'cat' && plan !== 'granny' && !S.threads.cat && !S.threads.granny) return s }
  return base
}
if (import.meta.url === 'file://' + process.argv[1]) {
  let bad = 0
  for (const plan of Object.keys(P)) {
    const c = {}; let ex = null
    for (let i = 0; i < 12; i++) { const { who, S } = run(plan, seedFor(plan, 1000 + i * 37)); c[who] = (c[who] || 0) + 1; ex = S }
    if ((c[plan] || 0) < 12) bad++
    console.log(plan.padEnd(8), (c[plan] || 0) + '/12', JSON.stringify(c), `素地${ex.soji} 中身${ex.naka} 丸max${ex.maxChain} 会う${ex.dates.join(',')} ${ex.money}円`)
  }
  // 適当に押す人（ランダム）
  const rnd = {}, keys = Object.keys(D.ACT)
  for (let i = 0; i < 300; i++) { let r = i * 7 + 1; const pick = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return keys[r % keys.length] }; const { who } = run('x', 5000 + i, pick, () => (r & 1)); rnd[who] = (rnd[who] || 0) + 1 }
  console.log('random  ', JSON.stringify(rnd))
  // すぐ効く方だけ（楽な方を毎日ランダム）と、しんどい方だけ（ランダム）
  const fastK = ['beauty', 'selfie', 'oshi'], slowK = ['run', 'sleep', 'study']
  for (const [nm, ks] of [['fastOnly', fastK], ['slowOnly', slowK]]) {
    const c = {}; let so = 0, na = 0
    for (let i = 0; i < 300; i++) { let r = i * 13 + 5; const pick = S => { r = (r * 1103515245 + 12345) & 0x7fffffff; let a = ks[r % ks.length]; if (S.hp < 25) a = nm === 'slowOnly' ? 'sleep' : 'oshi'; if (Sim.cost(D, S, a) + S.money < 0) a = nm === 'slowOnly' ? 'study' : 'selfie'; return a }; const { who, S } = run('x', 7000 + i, pick, () => 1); c[who] = (c[who] || 0) + 1; so += S.soji; na += S.naka }
    console.log(nm.padEnd(8), JSON.stringify(c), `平均 素地${(so / 300).toFixed(0)} 中身${(na / 300).toFixed(0)}`)
  }
  console.log(bad ? `NG ${bad}` : 'ALL 12/12')
}
