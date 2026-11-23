// 恋人ごとの遊び方（検証用の bot）。sim.mjs と verify.mjs が使う。S を見て次の行動を返す
;(function (root) {
  const P = {}
  // 素地と中身の低い方を、しんどい方で上げる（ためている分も見込む）。走った次の日は勉強か早寝
  function bal(S, o = {}) {
    if (S.hp < 35) return 'sleep'
    const so = S.soji + S.pend.soji * 2, na = S.naka + S.pend.naka * 2
    if ((o.money && S.money < o.money) || so > na || S.sore) return 'study'
    return 'run'
  }
  P.kujo = S => bal(S)
  P.saeki = S => (S.day >= 25 && S.day <= 27) ? 'selfie' : bal(S)
  P.jibun = S => S.day % 6 === 0 && S.money >= 2500 ? 'beauty' : bal(S)
  P.riku = S => S.hp < 40 ? 'sleep' : 'run'
  P.shikaku = S => S.hp < 35 ? 'sleep' : 'study'
  P.tanaka = S => S.hp < 35 ? 'sleep' : S.day % 4 === 0 && S.money >= 2500 ? 'beauty' : S.day % 3 === 0 ? 'run' : 'study'
  P.takeshi = S => { const a = ['beauty', 'run', 'selfie', 'sleep', 'study', 'fast'][S.day % 6]; return a === 'beauty' && S.money < 2500 ? 'study' : a }
  P.doctor = S => S.day <= 5 ? 'fast' : bal(S)
  P.ren = S => S.n.beauty < 9 && S.money >= 2500 ? 'beauty' : S.hp < 35 ? 'sleep' : 'study'
  P.kakou = S => S.hp < 20 ? 'sleep' : S.day % 2 ? 'selfie' : (S.money >= 2500 && S.n.beauty < 6 ? 'beauty' : 'selfie')
  P.host = S => S.n.oshi < 5 ? (S.money >= 7000 ? 'oshi' : 'study') : S.spent < 40000 ? (S.money >= 2500 ? 'beauty' : 'study') : S.hp < 30 ? 'sleep' : 'selfie'
  P.oshi = S => S.money >= 7000 ? 'oshi' : S.hp < 30 ? 'sleep' : 'study'
  P.tomo = S => S.money >= 2500 ? 'beauty' : S.hp < 30 ? 'sleep' : 'study'
  P.kuma = () => 'sleep'
  P.sagi = S => 'oshi'
  P.cat = S => P.tanaka(S)
  P.granny = S => P.tanaka(S)
  // 断れなかった時の代わり（お金が足りない時）
  const FB = { sagi: 'selfie' }
  // できごとの2択（猫の bot は猫にエサ、おばあちゃんの bot は手伝う。ほかは誘惑を断る＝2つ目）
  const CH = { cat: { cat: 0 }, granny: { granny: 0 } }
  function choice(plan, ev) { return (CH[plan] && CH[plan][ev] != null) ? CH[plan][ev] : 1 }
  const api = { P, choice, FB }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  root.Plans = api
})(typeof window !== 'undefined' ? window : globalThis)
