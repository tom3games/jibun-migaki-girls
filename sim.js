// 30日の仕組み（画面に依存しない）。ブラウザでは window.Sim、node では require/import で使う
// 女の子版（2026-11-23）: すぐ効く努力（その日に盛りが上がる・落ちる・お金が減る・会うとばれる）と
// 遅れて効く努力（その日は何も変わらない。続けた日数の節目 5・10・20・30 で、ためた分がまとめて効く。3日空くとやり直し）
;(function (root) {
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 } }
  let MAX = 100
  const clamp = v => Math.max(0, Math.min(MAX, Math.round(v)))
  const SLOW = { run: 1, cook: 1, study: 1, work: 1, sleep: 1 }
  const isSlow = a => !!SLOW[a]

  function create(D, seed) {
    const r = rng(seed); MAX = D.MAX || 100
    const S = {
      seed, day: 1, done: false, soji: D.START.soji, naka: D.START.naka, mori: D.START.mori, money: D.START.money, hp: D.START.hp,
      temp: 0, fastRun: 0, fastOff: 0, fastTotal: 0, hosp: 0, lastHosp: -99,
      chain: 0, maxChain: 0, gap: 0, pend: { soji: 0, naka: 0 }, miles: [], skill: 0, salonDays: 0, kakou: 0, likes: 0, spent: 0, noMoney: 0,
      dates: [], dateGreat: 0, dateFail: 0, sore: false, oshiYes: 0, lastOshi: -99,
      n: {}, sleeps: 0, cat: 0, granny: 0, forced: 0, forcedWhy: '', choice: null, log: [], deals: [], events: [], final: null,
    }
    for (const k in D.ACT) S.n[k] = 0
    // その日のおすすめ（3割）。会う日には出さない
    for (let d = 1; d <= D.DAYS; d++) S.deals[d] = (!D.DATES.includes(d) && r() < 0.3) ? Math.floor(r() * D.DEALS.length) : -1
    // できごと: 猫とおばあちゃんは半分の回で4回ずつ来る。それ以外の日は3割で何か起きる。会う日には起きない
    const free = []; for (let d = 2; d <= D.DAYS - 1; d++) if (!D.DATES.includes(d)) free.push(d)
    const take = () => free.splice(Math.floor(r() * free.length), 1)[0]
    S.threads = { cat: r() < 0.5, granny: r() < 0.5 }
    for (const th of ['cat', 'granny']) if (S.threads[th]) for (let i = 0; i < 4; i++) S.events[take()] = th
    // 推しのできごと: 毎回5日（どれが来るかはくじ）
    for (let i = 0; i < 5; i++) S.events[take()] = 'oshi' + (1 + Math.floor(r() * 3))
    const W = D.POOL.reduce((a, b) => a + b[1], 0)
    for (const d of free) if (r() < 0.3) { let x = r() * W; for (const [k, w] of D.POOL) { if ((x -= w) < 0) { S.events[d] = k; break } } }
    S.r = r
    return S
  }

  const deal = (D, S) => S.deals[S.day] >= 0 ? D.DEALS[S.deals[S.day]] : null
  const cost = (D, S, a) => { const A = D.ACT[a], dl = deal(D, S); let c = A.money || 0; if (c < 0 && dl && dl.act === a) c = Math.round(c / 2); return c }
  const next5 = (D, S) => D.MILES.find(m => m > S.chain) || null

  // 遅れて効く努力をしなかった日。1〜2日なら、ためた分が少し減るだけ。3日空くと丸が全部切れて、ためた分も消える
  function slip(D, S, out) {
    S.gap++
    if (!S.chain && !S.pend.soji && !S.pend.naka) return
    if (S.gap >= 3) { S.chain = 0; S.pend = { soji: 0, naka: 0 }; if (out) out.msgs.push('reset') }
    else { S.pend.soji *= D.SLIP; S.pend.naka *= D.SLIP; if (out) out.msgs.push('slip') }
  }
  // 節目に届いたら、ためた分をまとめて効かせる
  function release(D, S, mult) {
    const g = { soji: Math.round(S.pend.soji * mult), naka: Math.round(S.pend.naka * mult) }
    S.soji += g.soji; S.naka += g.naka; S.pend = { soji: 0, naka: 0 }
    return g
  }
  // 断食のリバウンド。細くなった分は消えて、前より下がる
  function rebound(D, S, big) {
    S.soji -= (big ? D.FAST.hospLoss : D.FAST.loss)
    S.temp = 0; S.fastRun = 0; S.fastOff = 0
  }

  // 1日を使う。返り値: { ok, msgs:[], d:{soji,naka,mori,money,hp}, ev, mile, gain, date }
  function act(D, S, a) {
    if (S.done || S.choice) return { ok: false, why: 'busy' }
    const dl = deal(D, S), x2 = !!(dl && dl.act === a), c = cost(D, S, a)
    if (S.money + c < 0) { S.noMoney++; return { ok: false, why: 'money' } }
    const before = snap(S)
    const out = { ok: true, a, msgs: [], x2, line: Math.floor(S.r() * 3) }
    S.n[a]++
    // 前の日に走ると、今日は筋肉痛（寝る以外は体力が多めに減る）
    if (S.sore && a !== 'sleep' && a !== 'run') { S.hp -= D.SORE; out.msgs.push('sore') }
    if (S.sore && a === 'run') { S.hp -= D.SORE; out.msgs.push('sore') }
    S.sore = false
    if (c < 0) { S.money += c; S.spent -= c }
    if (a === 'run') { S.hp -= 25; S.pend.soji += D.PEND.run; S.sore = true }
    else if (a === 'cook') { S.money += 1500 * (x2 ? 2 : 1); S.hp -= 5; S.pend.soji += D.PEND.cook }
    else if (a === 'sleep') { S.hp += 45; S.pend.soji += D.PEND.sleep; S.sleeps++ }
    else if (a === 'study') { if (S.hp < 15) { S.pend.naka += 1; out.msgs.push('nap') } else { S.hp -= 15; S.pend.naka += D.PEND.study } }
    else if (a === 'work') { S.money += 8000 * (x2 ? 2 : 1); S.hp -= 25; S.naka += 1; S.pend.naka += D.PEND.work }
    // メイクはその日だけ大きく上がり、寝ると落ちる（回数で少し上手くなる）
    else if (a === 'makeup') { S.mori += 14 + Math.min(S.skill, 10); S.skill++; S.likes += 20 + S.mori * 2 }
    // スキンケアは少しずつ。素地もほんの少し本当に上がる
    else if (a === 'skin') { S.mori += 6 * (x2 ? 2 : 1); S.soji += 1; S.hp += 5 }
    else if (a === 'selfie') { S.kakou += 8; S.likes += 40 + S.mori * 3 + S.kakou * 2; S.hp += 5 }
    else if (a === 'fast') {
      S.money += 1000; S.hp -= 15; S.fastRun++; S.fastTotal++; S.fastOff = 0; S.temp += D.FAST.gain
      if (S.fastRun >= D.FAST.limit) { rebound(D, S, true); S.hosp++; S.lastHosp = S.day; S.forced = 2; S.forcedWhy = 'hosp'; out.msgs.push('hosp') }
      else if (S.fastRun === 2) out.msgs.push('slim')
    }
    // 遅れて効く努力: その日は何も変わらない。丸がつながり、節目でまとめて効く
    if (isSlow(a)) {
      S.gap = 0; S.chain++; S.maxChain = Math.max(S.maxChain, S.chain)
      const i = D.MILES.indexOf(S.chain)
      if (i >= 0) { out.mile = S.chain; out.gain = release(D, S, D.MULT[i]); S.miles.push(S.day) }
      else out.msgs.push('nothing')
    } else slip(D, S, out)
    if (S.hp <= 0 && !S.forced) { S.forced = 1; S.forcedWhy = 'faint'; out.msgs.push('faint') }
    fix(S)
    // マッチングアプリで会う日（10日目・20日目）。病院・寝込みの日は会えない
    if (D.DATES.includes(S.day) && !S.forced) out.date = meet(D, S)
    // できごと（倒れた日・会う日は起きない）
    const ev = S.events[S.day]
    if (ev && !S.forced && !out.date) { const E = D.EVENTS[ev]; out.ev = ev; if (E.c) S.choice = ev; else applyFx(D, S, E, out) }
    // 走って3回目と7回目は「やめたい」
    if (!S.choice && !S.forced && !out.date && a === 'run' && (S.n.run === 3 || S.n.run === 7)) { S.choice = 'quit'; out.ev = 'quit' }
    out.d = diff(before, S)
    S.log.push(a)
    if (!S.choice) next(D, S, out)
    return out
  }
  // 会ってみた結果。写真（盛り＋加工）が素地より高すぎると帰られる。素地が高いと「写真より実物がいい」
  function meet(D, S) {
    let res
    if (S.temp > 0) res = 'pale'
    else if (S.mori + S.kakou - S.soji > D.DATE_GAP) res = 'fail'
    else if (S.soji >= D.DATE_GOOD) res = 'great'
    else res = 'ok'
    if (res === 'great') { S.dateGreat++; S.naka += 4 }
    if (res === 'fail' || res === 'pale') { S.dateFail++; S.hp -= 10 }
    fix(S); S.dates.push(res)
    return res
  }
  function choose(D, S, i) {
    if (!S.choice) return null
    const E = D.EVENTS[S.choice], c = E.c[i], before = snap(S)
    const o = { msgs: [] }
    if ((c.money || 0) < 0 && S.money + c.money < 0) { S.choice = null; S.noMoney++; o.broke = true; next(D, S, o); return o }
    applyFx(D, S, c, o); S.choice = null
    o.d = diff(before, S); o.res = c.res
    next(D, S, o); return o
  }
  // できごとの効き目。gap があると、その日は遅れて効く努力を1日休んだ扱い（丸が1日ぶん切れる）
  function applyFx(D, S, E, out) {
    for (const k of ['soji', 'naka', 'mori', 'hp', 'money']) if (E[k]) S[k] += E[k]
    if (E.money < 0) S.spent -= E.money
    if (E.cat) S.cat += E.cat; if (E.granny) S.granny += E.granny
    if (E.oshi) { S.oshiYes += E.oshi; S.lastOshi = S.day }
    if (E.kakou) S.kakou += E.kakou
    if (E.gap) slip(D, S, out)
    fix(S)
  }
  function fix(S) { for (const k of ['soji', 'naka', 'mori']) S[k] = clamp(S[k]); S.hp = Math.max(0, Math.min(100, Math.round(S.hp))); S.money = Math.max(0, S.money); S.kakou = Math.max(0, S.kakou) }
  const snap = S => ({ soji: S.soji + S.temp, naka: S.naka, mori: S.mori, money: S.money, hp: S.hp })
  const diff = (b, S) => { const a = snap(S); return { soji: a.soji - b.soji, naka: a.naka - b.naka, mori: a.mori - b.mori, money: a.money - b.money, hp: a.hp - b.hp } }
  // 夜。メイクは落ちる（サロンの数日はある程度もつ）。断食をやめて3日たつとリバウンド
  function night(D, S, out, fasted) {
    const m0 = S.mori; if (out.moriEve == null) out.moriEve = m0; S.moriEve = m0
    S.mori = Math.round(S.mori * D.DECAY); if (S.salonDays > 0) { S.mori = Math.max(S.mori, Math.min(m0, D.SALON_KEEP)); S.salonDays-- }
    out.moriLost = (out.moriLost || 0) + (m0 - S.mori)
    if (S.temp > 0 && !fasted) { S.fastOff++; if (S.fastOff >= 3) { rebound(D, S, false); out.rebound = true } }
  }
  // 日を進める。病院・寝込みの日は自動で過ぎる（その日も遅れて効く努力はしていない扱い）
  function next(D, S, out) {
    night(D, S, out, S.log[S.log.length - 1] === 'fast')
    S.day++
    out.skipped = 0
    while (S.forced > 0 && S.day <= D.DAYS) {
      S.forced--; S.hp = Math.min(100, S.hp + 30)
      if (D.DATES.includes(S.day)) { S.dates.push('miss'); S.dateFail++; out.missed = true }
      slip(D, S, null); night(D, S, out, false); S.day++; out.skipped++
    }
    S.forced = 0; fix(S)
    if (S.day > D.DAYS) { S.done = true; S.day = D.DAYS; finish(D, S, out) }
  }
  // 30日目の夜。ためたまま節目に届かなかった分は少しだけ効く。断食の途中ならリバウンド
  function finish(D, S, out) {
    const f = { gain: release(D, S, D.END_MULT), rebound: false }
    if (S.temp > 0) { rebound(D, S, false); f.rebound = true }
    fix(S); S.final = f; out.final = f
  }

  // 恋人を決める（上から順に）
  function judge(D, S) {
    const H = D.H, so = S.soji, na = S.naka
    if (S.sleeps >= 16) return 'kuma'
    // 猫とトメさんは隠し。出来事4回を全部選び、しかも一番上に届かなかった時だけ
    const top = so >= D.HH && na >= D.HH
    if (!top && S.cat >= 4) return 'cat'
    if (!top && S.granny >= 4) return 'granny'
    if (S.hosp >= 1) return 'doctor'
    if (S.noMoney >= 4) return 'sagi'
    // 自分: 素地も中身も高く、美容も楽しんで、お金も残した
    if (so >= H && na >= H && S.n.makeup + S.n.skin >= 4 && S.money >= D.JIBUN_MONEY) return 'jibun'
    if (top && S.maxChain >= 20 && S.dateGreat >= 1) return 'kujo'
    if (so >= H && na >= H) return 'saeki'
    if (S.oshiYes >= 4) return 'oshi'
    if (S.oshiYes >= 2 && S.spent >= 30000) return 'host'
    // 近道ばかりの型。素地も育てていれば、こちらには来ない
    if (S.n.makeup + S.n.skin >= 12 && S.n.skin >= 4 && so < 50) return 'tomo'
    if (S.n.selfie >= 6 && so < 50) return 'kakou'
    if (S.n.makeup >= 7 && so < 50) return 'ren'
    // 勉強と仕事ばかり（中身は高い・素地は低い）
    if (na >= H && so < 50 && S.n.study + S.n.work >= 14) return 'shikaku'
    if (S.n.run >= 10 && so >= H - 10) return 'riku'
    if (S.n.cook >= 9 && so >= H - 15) return 'minato'
    if (so >= 50 || na >= 50) return 'tanaka'
    return 'takeshi'
  }
  function title(D, S) {
    let best = 'sleep', m = -1
    for (const k in S.n) if (S.n[k] > m) { m = S.n[k]; best = k }
    return best
  }
  // 鏡に映る自分（絵の名前 = img/<名前>.webp）。病院・断食・疲れ・最近の過ごし方が先、つぎに値の段階
  // eve = その日の夜（寝る前）の姿。メイクはまだ落ちていない
  function mirror(D, S, eve) {
    if (S.lastHosp >= 0 && S.day - S.lastHosp <= 4) return 'me_hosp'
    if (S.temp > 0 && S.fastRun >= 2) return 'me_fast'
    if (S.hp < 15) return 'me_tired'
    const so = S.soji + S.temp, na = S.naka, mo = eve && S.moriEve != null ? S.moriEve : S.mori, H = D.H
    if (so >= H + 10 && na >= H) return 'me_allhigh'
    const last = S.log.slice(-4), cnt = a => last.filter(x => x === a).length
    if (S.lastOshi >= 0 && S.day - S.lastOshi <= 1) return 'me_oshi'
    if (cnt('selfie') >= 2) return 'me_selfie'
    // メイクは1回目から鏡に出る（素地がずっと高い時は、素地の方が勝つ）
    if (mo >= 14 && mo >= so - 10) return mo >= 40 ? 'me_mori2' : 'me_mori1'
    if (cnt('run') >= 2 && so < H) return 'me_run'
    if (cnt('cook') >= 3 && so < H) return 'me_cook'
    if (na >= H && so >= D.L) return 'me_naka2'
    if (so >= H) return 'me_soji2'
    if (na >= 45 && na > so) return 'me_naka1'
    if (so >= 40) return 'me_soji1'
    return 'me0'
  }
  const MIRRORS = ['me0', 'me_soji1', 'me_soji2', 'me_mori1', 'me_mori2', 'me_naka1', 'me_naka2', 'me_allhigh', 'me_run', 'me_cook', 'me_tired', 'me_fast', 'me_hosp', 'me_oshi', 'me_selfie']
  const api = { create, act, choose, judge, title, deal, cost, mirror, MIRRORS, isSlow, next5 }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  root.Sim = api
})(typeof window !== 'undefined' ? window : globalThis)
