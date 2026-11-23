// 恋人ごとの遊び方（検証用の bot）。sim.mjs と verify.mjs が使う。S を見て次の行動を返す
;(function (root) {
  const P = {}
  const afford = (S, c) => S.money >= c
  // しんどい方を毎日。体力が減ったら早寝、走った次の日は走らない
  function grind(S, o = {}) {
    if (S.hp < (o.rest || 35)) return 'sleep'
    const want = o.want || ['run', 'study', 'cook', 'study', 'run', 'cook']
    let a = want[S.day % want.length]
    if (a === 'run' && (S.sore || S.hp < 45)) a = 'cook'
    if (a === 'work' && S.hp < 45) a = 'cook'
    return a
  }
  // 素地と中身の低い方を、しんどい方で上げる（ためている分も見込む）
  function bal(S, o = {}) {
    if (S.hp < 35) return 'sleep'
    const so = S.soji + S.pend.soji * 2, na = S.naka + S.pend.naka * 2
    if (so <= na) return (S.sore || S.hp < 45) ? 'cook' : 'run'
    return o.money && S.money < o.money && S.hp >= 45 ? 'work' : 'study'
  }
  P.kujo = S => grind(S)
  P.saeki = S => S.day % 6 === 0 ? 'selfie' : bal(S)
  P.jibun = S => [6, 12, 29, 30].includes(S.day) ? 'makeup' : bal(S, { money: 38000 })
  P.riku = S => S.hp < 40 ? 'sleep' : S.sore ? 'cook' : 'run'
  P.minato = S => S.hp < 30 ? 'sleep' : 'cook'
  P.shikaku = S => S.hp < 35 ? 'sleep' : S.day % 2 ? 'study' : 'work'
  P.tanaka = S => { if (S.hp < 35) return 'sleep'; if (S.day % 2 === 0 && afford(S, 3000)) return 'skin'; const a = ['study', 'cook', 'run'][S.day % 3]; return a === 'run' && S.sore ? 'cook' : a }
  P.takeshi = S => { const a = ['makeup', 'run', 'selfie', 'sleep', 'skin', 'cook', 'fast', 'study'][S.day % 8]; return a === 'skin' && !afford(S, 3000) ? 'work' : a }
  P.doctor = S => S.hosp === 0 && S.day <= 14 ? (S.hp < 20 ? 'sleep' : 'fast') : grind(S)
  P.ren = S => S.hp < 20 ? 'sleep' : 'makeup'
  P.kakou = S => S.hp < 20 ? 'sleep' : S.day % 2 ? 'selfie' : 'makeup'
  P.host = S => S.spent < 30000 ? (afford(S, 11000) ? 'skin' : 'work') : S.hp < 30 ? 'sleep' : 'selfie'
  P.oshi = S => S.hp < 35 ? 'sleep' : S.money < 10000 ? 'work' : 'selfie'
  P.tomo = S => afford(S, 3000) && S.n.skin <= S.n.makeup ? 'skin' : 'makeup'
  P.kuma = () => 'sleep'
  P.sagi = S => 'skin'
  P.cat = S => P.tanaka(S)
  P.granny = S => P.tanaka(S)
  // 断れなかった時の代わり（お金が足りない時）
  const FB = { sagi: 'makeup' }
  // できごとの2択（猫の bot は猫にエサ、おばあちゃんの bot は手伝う。ほかは誘惑を断る＝2つ目）
  const CH = { cat: { cat: 0 }, granny: { granny: 0 } }
  // 推しのできごと: 推しの bot は全部乗る。ホストの bot は2回だけ乗る
  function choice(plan, ev, S) {
    if (/^oshi/.test(ev)) { if (plan === 'oshi') return 0; if (plan === 'host') return S && S.oshiYes >= 2 ? 1 : 0; return 1 }
    return (CH[plan] && CH[plan][ev] != null) ? CH[plan][ev] : 1
  }
  const api = { P, choice, FB }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  root.Plans = api
})(typeof window !== 'undefined' ? window : globalThis)
