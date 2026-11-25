// 毎日の2択だけで遊んだ時の分布。node offer.mjs（ブラウザを開かない）
import { createRequire } from 'node:module'
globalThis.window = globalThis
const require = createRequire(import.meta.url)
await import('./data.js')
const Sim = require('./sim.js'), D = globalThis.D, { choice } = require('./plans.js')
export function play(seed, pick, ch) {
  const S = Sim.create(D, seed); let g = 0, bad = 0
  while (!S.done && g++ < 200) {
    if (S.choice) { Sim.choose(D, S, ch(S.choice, S)); continue }
    const [a, b] = S.offer
    if (!Sim.isSlow(a) || Sim.isSlow(b)) bad++
    const o = Sim.act(D, S, pick(S, a, b)); if (!o.ok) { bad++; Sim.act(D, S, a) }
  }
  return { S, who: Sim.judge(D, S), bad }
}
const R = k => { let r = k * 7 + 1; return () => (r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff }
const not = () => 1, N = 400
// 欲しい物が出たらそれ、無ければしんどい方／楽な方
const want = (ks, other) => (S, a, b) => ks.includes(a) ? a : ks.includes(b) ? b : other ? b : a
const PL = {
  'いつもしんどい方': [(S, a) => a], 'いつも楽な方': [(S, a, b) => b], '適当': null, '何も考えず左右交互': [(S, a, b) => S.day % 2 ? a : b],
  '7割しんどい方': 0.7, '3割しんどい方': 0.3,
  運動狙い: [(S, a, b) => a === 'run' || a === 'sleep' && S.hp < 45 || S.gap >= 2 ? a : b], 自炊狙い: [(S, a, b) => a === 'cook' || S.gap >= 2 ? a : b], 体づくり: [(S, a, b) => ['run', 'cook', 'sleep'].includes(a) || S.gap >= 2 ? a : b],
  勉強仕事狙い: [(S, a, b) => ['study', 'work'].includes(a) || S.hp < 45 || S.gap >= 2 ? a : b], 早寝狙い: [want(['sleep'], 1)], しんどいけど断食は避ける: [(S, a, b) => b === 'fast' ? a : b],
  メイク狙い: [want(['makeup'], 0)], 'メイク・他も楽': [want(['makeup'], 1)], 加工狙い: [(S, a, b) => b === 'selfie' ? b : a], 'スキンケア狙い': [(S, a, b) => b === 'skin' || b === 'makeup' ? b : a], 断食狙い: [want(['fast'], 0)],
  自分狙い: [(S, a, b) => (b === 'makeup' || b === 'skin') && S.n.makeup + S.n.skin < 4 && S.gap === 0 ? b : a],
  猫にやさしく: [(S, a, b) => S.day % 3 ? a : b, e => e === 'cat' ? 0 : 1], トメさんを手伝う: [(S, a, b) => S.day % 3 ? a : b, e => e === 'granny' ? 0 : 1],
  推しに全部乗る: [(S, a, b) => S.money < 12000 ? a : b, e => /^oshi/.test(e) ? 0 : 1], 推しに2回と浪費: [(S, a, b) => b === 'skin' ? b : a, (e, S) => /^oshi/.test(e) && S.oshiYes < 3 ? 0 : e === 'sale' || e === 'supp' ? 0 : 1],
  浪費: [(S, a, b) => b, e => 0],
}
const all = {}
for (const [nm, v] of Object.entries(PL)) {
  const c = {}; let so = 0, na = 0, bad = 0
  for (let i = 0; i < N; i++) { const r = R(i + 3), p = v === null ? 0.5 : v; const pk = Array.isArray(v) ? v[0] : (S, a, b) => r() < p ? a : b; const x = play((i * 2654435761 + 12345) >>> 0 || 1, pk, (Array.isArray(v) && v[1]) || (v === null ? () => r() < .5 ? 0 : 1 : not)); c[x.who] = (c[x.who] || 0) + 1; so += x.S.soji; na += x.S.naka; bad += x.bad }
  for (const k in c) all[k] = Math.max(all[k] || 0, c[k] / N)
  console.log(nm.padEnd(10), Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + Math.round(n / N * 100) + '%').join(' '), `素地${(so / N).toFixed(0)} 中身${(na / N).toFixed(0)}`, bad ? 'BAD ' + bad : '')
}
console.log('結末ごとの最大の出やすさ', D.P.map(p => p.id + ' ' + Math.round((all[p.id] || 0) * 100) + '%').join(' '))
const miss = D.P.filter(p => (all[p.id] || 0) < 0.1).map(p => p.id)
console.log(miss.length ? 'NG 10%未満: ' + miss.join(' ') : 'OK 全部10%以上')
