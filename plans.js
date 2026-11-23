// 恋人ごとの遊び方（検証用の bot）。sim.mjs と verify.mjs が使う。S を見て次の行動を返す
;(function (root) {
  const P = {}
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
    return (o.money && S.money < o.money && S.hp >= 45) ? 'work' : 'study'
  }
  P.kujo = S => grind(S)
  // 25〜27日目だけ休む（丸が切れて、最後の節目の分が消える）
  P.saeki = S => (S.day >= 25 && S.day <= 27) ? 'skin' : bal(S)
  P.jibun = S => (S.money < 105000 && S.hp >= 45 && S.day % 2 === 0) ? 'work' : bal(S, { money: 115000 })
  P.riku = S => S.hp < 40 ? 'sleep' : S.sore ? 'cook' : 'run'
  P.minato = S => S.hp < 30 ? 'sleep' : 'cook'
  P.shikaku = S => S.hp < 35 ? 'sleep' : S.day % 2 ? 'study' : 'work'
  P.tanaka = S => S.hp < 35 ? 'sleep' : S.day % 4 === 0 && S.money >= 3000 ? 'skin' : ['run', 'study', 'cook'][S.day % 3] === 'run' && S.sore ? 'cook' : ['run', 'study', 'cook'][S.day % 3]
  // いろいろ少しずつ（しんどい方と楽な方を交互）
  P.takeshi = S => ['makeup', 'run', 'oshi', 'sleep', 'skin', 'cook', 'selfie', 'study'][S.day % 8] === 'oshi' && S.money < 7000 ? 'work' : ['makeup', 'run', 'oshi', 'sleep', 'skin', 'cook', 'selfie', 'study'][S.day % 8]
  P.doctor = S => S.day <= 5 ? 'fast' : grind(S)
  P.ren = S => S.hp < 20 ? 'sleep' : 'makeup'
  P.kakou = S => S.hp < 20 ? 'sleep' : S.day % 2 ? 'selfie' : 'makeup'
  P.host = S => S.n.oshi < 5 ? (S.money >= 7000 ? 'oshi' : 'work') : S.spent < 40000 ? (S.money >= 9000 ? 'salon' : 'work') : S.hp < 30 ? 'sleep' : 'makeup'
  P.oshi = S => S.money >= 7000 ? 'oshi' : S.hp < 30 ? 'sleep' : 'work'
  P.tomo = S => S.money >= 9000 && S.n.salon < 2 ? 'salon' : S.money >= 3000 ? 'skin' : S.hp < 30 ? 'sleep' : 'work'
  P.kuma = () => 'sleep'
  P.sagi = S => 'salon'
  P.cat = S => P.tanaka(S)
  P.granny = S => P.tanaka(S)
  // 断れなかった時の代わり（お金が足りない時）
  const FB = { sagi: 'makeup' }
  // できごとの2択（猫の bot は猫にエサ、おばあちゃんの bot は手伝う。ほかは誘惑を断る＝2つ目）
  const CH = { cat: { cat: 0 }, granny: { granny: 0 } }
  function choice(plan, ev) { return (CH[plan] && CH[plan][ev] != null) ? CH[plan][ev] : 1 }
  const api = { P, choice, FB }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  root.Plans = api
})(typeof window !== 'undefined' ? window : globalThis)
