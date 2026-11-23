import './mute-auto.mjs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
// 自分磨き30日 女の子編の検証。node verify.mjs
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const ROOT = import.meta.dirname
mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = +(process.env.VPORT || 5483)
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const URL0 = `http://localhost:${PORT}/`
let pass = 0, fail = 0
const results = []
async function t(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error('false'); pass++; results.push(`ok   ${name}${r && r !== true ? '  ' + JSON.stringify(r) : ''}`) }
  catch (e) { fail++; results.push(`FAIL ${name}  ${e.message.split('\n')[0]}`) }
}
const expect = (c, msg) => { if (!c) throw new Error(msg) }
async function open(browser, opts = {}, keep) {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, ...opts })
  await muteContext(ctx)
  if (!keep) await ctx.addInitScript(() => { try { localStorage.clear() } catch (e) {} })
  const p = await ctx.newPage(); p.errs = []
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()) })
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) p.errs.push('reqfail ' + r.url()) })
  await p.goto(URL0); await p.waitForFunction(() => window.__jmgReady, null, { timeout: 15000 })
  return p
}
const overflow = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = []
  for (const el of document.querySelectorAll('main:not([hidden]) *, .ovl:not([hidden]) *, #chat:not([hidden]) *')) {
    if (el.closest('[hidden]') || el.classList.contains('float') || el.closest('#door') || (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true }))) continue
    const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.id || el.className || el.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right))
  }
  return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) }
})
// 一画面に収まる: ボタン・ラベル・カードが画面の中
const fit = q => q.evaluate(() => {
  const H = innerHeight, de = document.documentElement, over = []
  if (de.scrollHeight > H + 1) over.push('page:' + de.scrollHeight)
  for (const el of document.querySelectorAll('main:not([hidden]) button, main:not([hidden]) .lab, main:not([hidden]) canvas, .ovl:not([hidden]) button, .ovl:not([hidden]) .cell, #tmSupport, #stage, #epi, #chat:not([hidden]) button, #chat:not([hidden]) .chFoot, #affBox:not([hidden]) a, #affBox:not([hidden]) small')) {
    if (!el.offsetParent && el.id !== 'tmSupport') continue; if (el.closest('[hidden]')) continue
    const r = el.getBoundingClientRect(); if (!r.height) continue
    if (r.bottom > H + 1 || r.top < -1) over.push((el.id || el.className || el.textContent.slice(0, 6)) + ':' + Math.round(r.top) + '-' + Math.round(r.bottom))
  }
  return { H, over: over.slice(0, 6) }
})
const tapXY = async (p, a, touch) => { const xy = await p.evaluate(a => jmg.itemXY(a), a); if (touch) await p.touchscreen.tap(xy.x, xy.y); else await p.mouse.click(xy.x, xy.y); return xy }
// bot の計画どおりに、本物のタップで30日を進める
// 30日後のドアは自分で開ける（2026-11-12）。tap = ノブを2回押す / drag = ノブから左へなぞる / none = 開けない
async function drag(p, x, y, dx, { touch, release = true, steps = 12 } = {}) {
  if (touch) {
    const c = await p.context().newCDPSession(p)
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= steps; i++) await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / steps, y }] })
    if (release) await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    return c
  }
  await p.mouse.move(x, y); await p.mouse.down()
  for (let i = 1; i <= steps; i++) await p.mouse.move(x + dx * i / steps, y)
  if (release) await p.mouse.up()
}
const doorReady = p => p.waitForFunction(() => jmg.door() && jmg.door().ready && !jmg.door().anim, null, { timeout: 20000 })
async function openDoor(p, how = 'tap', touch) {
  await doorReady(p)
  const xy = await p.evaluate(() => jmg.doorXY())
  if (how === 'tap') for (let i = 0; i < 2; i++) { if (touch) await p.touchscreen.tap(xy.knob.x, xy.knob.y); else await p.mouse.click(xy.knob.x, xy.knob.y); await p.waitForFunction(() => !jmg.door().anim) }
  else if (how === 'drag') await drag(p, xy.knob.x, xy.knob.y, -xy.stage.w * 0.75, { touch })
  if (how !== 'none') await p.waitForSelector('#bNext:not([hidden])', { timeout: 20000 })
}
async function playPlan(p, plan, { seed, touch, shots, cont, open = 'tap' } = {}) {
  if (seed == null) seed = await p.evaluate(pl => { for (let s = 1000; s < 3000; s++) { const S = Sim.create(D, s); if (pl === 'cat' ? S.threads.cat && !S.threads.granny : pl === 'granny' ? S.threads.granny && !S.threads.cat : !S.threads.cat && !S.threads.granny) return s } }, plan)
  await p.evaluate(s => { jmg.setSeed(s); jmg.fast(0.02) }, seed)
  const b = await p.$('#bStart:visible') ? '#bStart' : '#bAgain'
  if (!cont) { if (touch) await p.tap(b); else await p.click(b) }
  await p.waitForFunction(() => !document.querySelector('#vPlay').hidden)
  let taps = 0
  for (let i = 0; i < 80; i++) {
    const st = await p.evaluate(() => jmg.state()); if (st.done) break
    if (st.choice) { const c = await p.evaluate(([pl, ev]) => Plans.choice(pl, ev), [plan, st.choice]); await tapXY(p, 'c' + c, touch) }
    else {
      const a = await p.evaluate(pl => Plans.P[pl](jmg.raw()), plan); await tapXY(p, a, touch)
      // お金が足りず日が進まなかったら、sim.mjs と同じ代わりの行動
      const s2 = await p.evaluate(() => ({ day: jmg.state().day, busy: jmg.busy(), ch: jmg.state().choice }))
      if (s2.day === st.day && !s2.busy && !s2.ch) { taps++; await tapXY(p, await p.evaluate(pl => Plans.FB[pl] || 'sleep', plan), touch) }
    }
    taps++
    await p.waitForFunction(() => jmg.dateOpen() || (!jmg.busy() && (jmg.state().done || !document.querySelector('#vPlay').hidden)))
    if (await p.evaluate(() => jmg.dateOpen())) { if (shots && shots.date) await p.screenshot({ path: shots.date }); await tapXY(p, 'c0', touch); await p.waitForFunction(() => !jmg.dateOpen() && !jmg.busy() && (jmg.state().done || !document.querySelector('#vPlay').hidden)) }
    if (shots && i === shots.at) await p.screenshot({ path: shots.path })
  }
  await openDoor(p, open, touch && open === 'tap')
  return { seed, taps, who: await p.evaluate(() => jmg.state().who) }
}

const browser = await chromium.launch(MUTE_LAUNCH)
const p = await open(browser)
await t('起動時にエラーが出ない', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await t('ブラウザの拡大が起きない', async () => {
  const r = await p.evaluate(() => {
    const vp = document.querySelector('meta[name=viewport]').content
    const g = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(g)
    const w = new WheelEvent('wheel', { ctrlKey: true, deltaY: -10, bubbles: true, cancelable: true }); window.dispatchEvent(w)
    const k = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true }); window.dispatchEvent(k)
    return { vp, gesture: g.defaultPrevented, wheel: w.defaultPrevented, key: k.defaultPrevented, ta: getComputedStyle(document.documentElement).touchAction, us: getComputedStyle(document.body).userSelect }
  })
  expect(/user-scalable=no/.test(r.vp) && r.gesture && r.wheel && r.key && r.ta === 'manipulation' && r.us === 'none', JSON.stringify(r))
})
await t('OGP 一式がある', async () => {
  const r = await p.evaluate(() => ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].map(k => !!document.querySelector(`meta[property="${k}"]`)).concat(!!document.querySelector('meta[name="twitter:card"]')))
  expect(r.every(Boolean), JSON.stringify(r))
})
await t('画面に「AI」「画像生成」の字が無い（全文言・日英）', async () => {
  const r = await p.evaluate(() => { const all = JSON.stringify(D) + JSON.stringify(CHATS) + document.body.innerText; return [/画像生成/.test(all), /\bAI\b/.test(all)] })
  expect(!r[0] && !r[1], JSON.stringify(r))
})

// ---- 17人全員に、本物のタップでたどり着く
const plans = await p.evaluate(() => D.P.map(x => x.id))
const reach = {}
for (const plan of plans) {
  await t(`恋人「${plan}」に bot の遊び方で届く（実タップ）`, async () => {
    const r = await playPlan(p, plan, { open: plans.indexOf(plan) % 2 ? 'drag' : 'tap', shots: plan === 'kujo' ? { at: 12, path: ROOT + '/shots/v-play12.png', date: ROOT + '/shots/v-date.png' } : plan === 'ren' ? { at: 9, path: ROOT + '/shots/v-play-ren.png', date: ROOT + '/shots/v-date-fail.png' } : null })
    reach[plan] = r.who
    expect(r.who === plan, JSON.stringify(r))
    await p.screenshot({ path: `${ROOT}/shots/v-reveal-${plan}.png` })
    await p.click('#bNext'); await p.waitForFunction(() => window.__jmgCardDone)
    return { seed: r.seed, taps: r.taps }
  })
}
await t('図鑑が17人で埋まる', async () => { const n = await p.evaluate(() => jmg.book().length); expect(n === 17, n); return n })
// ---- 図鑑のトーク: 17人全員を本物のタップで開いて、8件以上・戻る
const AFF = await p.evaluate(() => window.AFF_URL)
await t('結果画面に PR は出ない（AFF_URL は空。女の子向けの行き先は未定）', async () => {
  const r = await p.evaluate(() => ({ url: window.AFF_URL, hidden: document.querySelector('#affBox').hidden, vis: [...document.querySelectorAll('a[rel*=sponsored]')].filter(a => a.getBoundingClientRect().height > 0).length }))
  expect(r.url === '' && r.hidden && r.vis === 0, JSON.stringify(r))
})
await p.click('#bBook2'); await p.waitForSelector('#book:not([hidden])')
const chatShots = ['tomo', 'kujo', 'oshi', 'sagi']
for (const id of plans) {
  await t(`トーク「${id}」: タップで開く・8件以上・戻る`, async () => {
    const xy = await p.evaluate(i => jmg.cellXY(i), id); await p.mouse.click(xy.x, xy.y)
    await p.waitForSelector('#chat:not([hidden])'); await p.waitForFunction(() => window.__chatDone, null, { timeout: 15000 })
    const r = await p.evaluate(() => ({ n: document.querySelectorAll('#chLog .m').length, y: document.querySelectorAll('#chLog .m.y').length, p: document.querySelectorAll('#chLog .m.p').length, read: document.querySelectorAll('#chLog .m.y .meta').length, img: [...document.querySelectorAll('#chLog img')].every(i => i.complete && i.naturalWidth > 0), aff: !!document.querySelector('#chat a[rel*=sponsored]'), name: document.querySelector('#chName').textContent }))
    if (chatShots.includes(id)) { await p.waitForTimeout(400); await p.evaluate(() => { document.querySelector('#chLog').scrollTop = 0 }); await p.screenshot({ path: `${ROOT}/shots/v-chat-${id}.png` }); await p.evaluate(() => { const l = document.querySelector('#chLog'); l.scrollTop = l.scrollHeight }); await p.screenshot({ path: `${ROOT}/shots/v-chat-${id}-end.png` }) }
    expect(r.n >= 8 && r.y >= 1 && r.p >= 1 && r.read === r.y && r.img && !r.aff, JSON.stringify(r))
    const b = await p.evaluate(() => { const r = document.querySelector('#chBack').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }); await p.mouse.click(b.x, b.y)
    const back = await p.evaluate(() => document.querySelector('#chat').hidden && !document.querySelector('#book').hidden); expect(back, 'back failed')
    return r.n
  })
}
await t('トークの中だけスクロールし、ページはスクロールしない', async () => {
  const xy = await p.evaluate(() => jmg.cellXY('granny')); await p.mouse.click(xy.x, xy.y); await p.waitForFunction(() => window.__chatDone)
  const r = await p.evaluate(() => { const l = document.querySelector('#chLog'); return { page: document.documentElement.scrollHeight <= innerHeight, ov: getComputedStyle(l).overflowY } })
  await p.click('#chBack'); expect(r.page && r.ov === 'auto', JSON.stringify(r))
})
// ---- 2026-11-11 図鑑のトークの最後に、自分の一文を1回だけ送れる（返信なし・ずっと未読・端末の中だけ）
await t('トーク: 流れ終わるまで入力欄は押せない→最後に1回だけ送れる・未読・返信なし・入力欄が消える', async () => {
  const xy = await p.evaluate(() => jmg.cellXY('takeshi')); await p.mouse.click(xy.x, xy.y)
  await p.waitForSelector('#chat:not([hidden])')
  const early = await p.evaluate(() => ({ dis: document.querySelector('#chText').disabled, done: window.__chatDone }))
  await p.waitForFunction(() => window.__chatDone, null, { timeout: 15000 })
  const n0 = await p.evaluate(() => document.querySelectorAll('#chLog .m').length)
  await p.click('#chText'); await p.keyboard.type('来週ひま？<b>x</b>'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500)
  const r = await p.evaluate(() => { const m = [...document.querySelectorAll('#chLog .m.mine')]; return { n: document.querySelectorAll('#chLog .m').length, mine: m.length, txt: m[0] && m[0].querySelector('.bb').textContent, tag: !!document.querySelector('#chLog .mine b'), meta: m[0] && m[0].querySelector('.meta').textContent, foot: document.querySelector('#chFoot').hidden, last: document.querySelector('#chLog').lastElementChild.classList.contains('mine'), ls: JSON.parse(localStorage.getItem('jmg_myline') || '{}') } })
  await p.screenshot({ path: `${ROOT}/shots/v-chat-mine.png` })
  expect(early.dis && !early.done && r.mine === 1 && r.n === n0 + 1 && r.txt === '来週ひま？<b>x</b>' && !r.tag && /未読/.test(r.meta) && !/既読/.test(r.meta) && r.foot && r.last && r.ls.takeshi && r.ls.takeshi.t === r.txt, JSON.stringify({ early, n0, r }))
  await p.click('#chBack')
  return { meta: r.meta }
})
await t('トーク: 開き直しても自分の一文と「未読」が残り、入力欄は出ない。ほかの子はまだ送れる・空白だけは送れない', async () => {
  let xy = await p.evaluate(() => jmg.cellXY('takeshi')); await p.mouse.click(xy.x, xy.y); await p.waitForFunction(() => window.__chatDone, null, { timeout: 15000 })
  const a = await p.evaluate(() => ({ mine: document.querySelectorAll('#chLog .m.mine').length, unread: !!document.querySelector('#chLog .mine .unread'), foot: document.querySelector('#chFoot').hidden }))
  await p.click('#chBack')
  xy = await p.evaluate(() => jmg.cellXY('granny')); await p.mouse.click(xy.x, xy.y); await p.waitForFunction(() => window.__chatDone, null, { timeout: 15000 })
  const b = await p.evaluate(() => ({ mine: document.querySelectorAll('#chLog .m.mine').length, foot: document.querySelector('#chFoot').hidden, dis: document.querySelector('#chText').disabled, send: document.querySelector('#chSend').disabled }))
  await p.click('#chText'); await p.keyboard.type('   '); await p.keyboard.press('Enter'); await p.waitForTimeout(200)
  const c = await p.evaluate(() => ({ mine: document.querySelectorAll('#chLog .m.mine').length, send: document.querySelector('#chSend').disabled }))
  await p.evaluate(() => { document.querySelector('#chText').value = '' })
  await p.click('#chBack')
  expect(a.mine === 1 && a.unread && a.foot && b.mine === 0 && !b.foot && !b.dis && b.send && c.mine === 0 && c.send, JSON.stringify({ a, b, c }))
})
await t('トーク: 送信ボタンでも送れる（言語を切り替えても残る・英語は Unread）', async () => {
  const xy = await p.evaluate(() => jmg.cellXY('granny')); await p.mouse.click(xy.x, xy.y); await p.waitForFunction(() => window.__chatDone, null, { timeout: 15000 })
  await p.click('#chText'); await p.keyboard.type('お茶おいしかったです'); await p.click('#chSend'); await p.waitForTimeout(300)
  await p.evaluate(() => jmg.setLang('en')); await p.waitForFunction(() => window.__chatDone, null, { timeout: 15000 })
  const r = await p.evaluate(() => ({ mine: document.querySelectorAll('#chLog .m.mine').length, meta: (document.querySelector('#chLog .mine .meta') || {}).textContent, foot: document.querySelector('#chFoot').hidden }))
  await p.evaluate(() => jmg.setLang('ja')); await p.waitForTimeout(300); await p.click('#chBack')
  expect(r.mine === 1 && /Unread/.test(r.meta) && r.foot, JSON.stringify(r))
})
await p.click('#bookClose')
await t('図鑑の並びがランク順（S→A→B→C→D→E→番外）で、札が全員に付いている', async () => {
  const r = await p.evaluate(() => { const order = ['S', 'A', 'B', 'C', 'D', 'E', 'EX'], rk = D.P.map(x => x.rank); return { sorted: rk.every((v, i) => !i || order.indexOf(v) >= order.indexOf(rk[i - 1])), badges: document.querySelectorAll('#grid .cell .rk').length, n: D.P.length, top: D.P[0].id } })
  expect(r.sorted && r.badges === r.n && r.top === 'kujo', JSON.stringify(r)); return r
})
await t('結果の招待状が描けている（輝度の散らばり）', async () => {
  const v = await p.evaluate(() => { const c = document.querySelector('#card'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 97) { const v = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += v; s2 += v * v; n++ } return Math.round(s2 / n - (s / n) ** 2) })
  expect(v > 100, v); return v
})
await t('Xでポスト: 本文に恋人と称号・URL', async () => {
  await p.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u) } })
  await p.click('#bPost'); const u = await p.evaluate(() => window.__opened[0])
  expect(/x\.com\/intent\/post/.test(u) && /jibun-migaki/.test(decodeURIComponent(u)) && /%E7%A7%B0%E5%8F%B7/.test(u), u)
})
await t('画像を保存: png が落ちてくる', async () => {
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bSave')]); expect(/\.png$/.test(dl.suggestedFilename()), dl.suggestedFilename())
})
await t('支援リンク（スムージー）が結果画面にある', async () => { const s = await p.textContent('#tmSupport'); expect(/スムージー/.test(s), s) })
await t('音: 行動ごとに録音を鳴らす呼び出しがある・実際は無音', async () => {
  const r = await p.evaluate(() => ({ c: window.__sfxCalls, ok: window.__muteOk() }))
  expect(r.ok && r.c.run > 0 && r.c.cook > 0 && r.c.makeup > 0 && r.c.mile > 0 && r.c.date > 0 && r.c.drum > 0 && r.c.tear > 0 && r.c.win > 0 && r.c.lose > 0 && r.c.knock > 0 && r.c.bell > 0 && r.c.dopen > 0 && r.c.creak > 0, JSON.stringify(r)); return r.c
})
await p.close()

// ---- 仕組みの境界（本物のタップで）
const q = await open(browser)
const clean = () => q.evaluate(() => { const S = jmg.raw(); S.events = []; S.deals = S.deals.map(() => -1); S.forced = 0 })
const tapDay = async a => { await tapXY(q, a); await q.waitForFunction(() => jmg.dateOpen() || !jmg.busy()); if (await q.evaluate(() => jmg.dateOpen())) { await tapXY(q, 'c0'); await q.waitForFunction(() => !jmg.busy()) } if (await q.evaluate(() => jmg.state().choice)) { await q.waitForSelector('#memo:not([hidden])'); await tapXY(q, 'c1'); await q.waitForFunction(() => !jmg.busy()) } }
await t('お金が足りないと押しても日が減らない', async () => {
  await q.evaluate(() => { jmg.setSeed(77); jmg.fast(0.02) }); await q.click('#bStart'); await clean()
  await q.evaluate(() => { jmg.raw().money = 500 })
  const d0 = await q.evaluate(() => jmg.state().day); await tapXY(q, 'salon'); await q.waitForTimeout(100)
  const r = await q.evaluate(() => ({ day: jmg.state().day, b: document.querySelector('#bubble').textContent, nm: jmg.state().noMoney }))
  expect(r.day === d0 && /足りない/.test(r.b) && r.nm === 1, JSON.stringify(r))
})
await t('遅れて効く: 走っても4日は何も変わらず（「何も変わらない……」）、丸が5個目でまとめて効く', async () => {
  await q.evaluate(() => { jmg.setSeed(78); jmg.fast(0.02); jmg.start() }); await clean()
  const s0 = await q.evaluate(() => jmg.state().soji), seq = []
  for (const a of ['run', 'cook', 'study', 'cook']) { await q.evaluate(() => { jmg.raw().hp = 100 }); await tapDay(a); seq.push(await q.evaluate(() => ({ soji: jmg.state().soji, chain: jmg.state().chain, b: document.querySelector('#bubble').textContent, dots: document.querySelectorAll('#dots i.on').length }))) }
  await q.evaluate(() => { jmg.raw().hp = 100 }); await tapDay('run')
  const m = await q.evaluate(() => ({ soji: jmg.state().soji, chain: jmg.state().chain, b: document.querySelector('#bubble').textContent, miles: window.__miles }))
  await q.screenshot({ path: ROOT + '/shots/v-mile5.png' })
  expect(seq.every(x => x.soji === s0 && /何も変わらない/.test(x.b)) && seq.map(x => x.chain).join() === '1,2,3,4' && seq[3].dots === 4 && m.chain === 5 && m.soji >= s0 + 10 && /丸が5個/.test(m.b) && m.miles === 1, JSON.stringify({ s0, seq, m })); return { s0, after: m.soji }
})
await t('1日休むと、丸は切れずに「ためた分」が少し減るだけ', async () => {
  await clean(); await q.evaluate(() => { jmg.raw().hp = 100 }); await tapDay('cook'); await tapDay('study')
  const a = await q.evaluate(() => ({ ...jmg.state().pend, chain: jmg.state().chain }))
  await tapDay('makeup')
  const b = await q.evaluate(() => ({ ...jmg.state().pend, chain: jmg.state().chain, gap: jmg.state().gap, t: document.querySelector('#hTxt').textContent }))
  expect(b.chain === a.chain && b.gap === 1 && b.soji < a.soji && b.soji > a.soji * 0.8 && /休んだ/.test(b.t), JSON.stringify({ a, b })); return b.t
})
await t('3日空くと丸が全部消えて、ためた分もゼロ（やり直し）', async () => {
  await tapDay('skin'); const w = await q.evaluate(() => ({ t: document.querySelector('#hTxt').textContent, warn: document.querySelector('#habit').classList.contains('warn') }))
  await q.evaluate(() => { jmg.raw().money = 50000 }); await tapDay('salon')
  const r = await q.evaluate(() => ({ chain: jmg.state().chain, pend: jmg.state().pend, b: document.querySelector('#bubble').textContent }))
  expect(/最初から/.test(w.t) && w.warn && r.chain === 0 && r.pend.soji === 0 && r.pend.naka === 0 && /全部消えた/.test(r.b), JSON.stringify({ w, r })); return w.t
})
await t('すぐ効く: メイクはその日に盛りが上がり、寝ると落ちる', async () => {
  await clean(); await q.evaluate(() => { const S = jmg.raw(); S.mori = 0; S.salonDays = 0; jmg.fast(1) }); await q.waitForTimeout(50)
  const m0 = await q.evaluate(() => jmg.raw().mori)
  await tapXY(q, 'makeup'); await q.waitForTimeout(120)
  const up = await q.evaluate(() => ({ tag: +document.querySelector('#gMori').textContent.replace(/\D/g, ''), eve: jmg.eve(), me: jmg.meSrc() }))
  await q.waitForFunction(() => !jmg.busy()); await q.waitForTimeout(100)
  const night = await q.evaluate(() => ({ tag: +document.querySelector('#gMori').textContent.replace(/\D/g, ''), eve: jmg.eve() }))
  await q.evaluate(() => jmg.fast(0.02))
  expect(m0 === 0 && up.eve && up.tag >= 14 && !night.eve && night.tag < up.tag * 0.6, JSON.stringify({ m0, up, night })); return { m0, up: up.tag, night: night.tag }
})
await t('断食の罠: 2日で鏡が細くなる→5日目に倒れて病院（2日とぶ）→前より素地が下がる', async () => {
  await q.evaluate(() => { jmg.setSeed(79); jmg.fast(0.02); jmg.start() })
  await clean(); const s0 = await q.evaluate(() => jmg.state().soji), seq = []
  for (let i = 0; i < 4; i++) { await q.evaluate(() => { jmg.raw().hp = 100 }); await tapDay('fast'); seq.push(await q.evaluate(() => ({ vis: jmg.state().soji + jmg.state().temp, me: jmg.mirror(), tag: document.querySelector('#gSoji').textContent }))) }
  const d0 = await q.evaluate(() => jmg.state().day)
  await q.evaluate(() => { jmg.raw().hp = 100 }); await tapDay('fast')
  const r = await q.evaluate(() => ({ day: jmg.state().day, hosp: jmg.state().hosp, soji: jmg.state().soji, temp: jmg.state().temp, me: jmg.mirror(), b: document.querySelector('#bubble').textContent }))
  await q.screenshot({ path: ROOT + '/shots/v-fast-hosp.png' })
  expect(seq[0].vis > s0 && seq[1].me === 'me_fast' && seq[3].vis >= s0 + 40 && r.hosp === 1 && r.day === d0 + 3 && r.soji < s0 && r.temp === 0 && r.me === 'me_hosp', JSON.stringify({ s0, seq, d0, r })); return { s0, peak: seq[3].vis, after: r.soji }
})
await t('断食を3日でやめても、3日後にリバウンドして前より下がる（得をしない）', async () => {
  const r = await q.evaluate(() => { const S = Sim.create(D, 81); S.events = []; S.soji = 40; const a = []; for (const x of ['fast', 'fast', 'fast', 'sleep', 'sleep', 'sleep']) { const o = Sim.act(D, S, x); a.push([S.soji + S.temp, !!o.rebound]) } return a })
  expect(r[2][0] === 70 && r[5][1] && r[5][0] < 40, JSON.stringify(r)); return r
})
await t('極端な食事制限は得にならない（断食を混ぜた遊び方は、混ぜない遊び方より素地が低い）', async () => {
  const r = await q.evaluate(() => { const run = withFast => { let tot = 0; for (let k = 0; k < 20; k++) { const S = Sim.create(D, 500 + k); while (!S.done) { if (S.choice) { Sim.choose(D, S, 1); continue } let a = Plans.P.kujo(S); if (withFast && S.day % 6 < 3) a = 'fast'; if (!Sim.act(D, S, a).ok) Sim.act(D, S, 'sleep') } tot += S.soji } return tot / 20 }; return [run(false), run(true)] })
  expect(r[1] < r[0] - 10, JSON.stringify(r)); return r
})
await t('会う日（10日目）: 盛りと加工が素地より高すぎると「写真と違う」で帰られる', async () => {
  await q.evaluate(() => { jmg.setSeed(82); jmg.fast(0.02); jmg.start() })
  await clean(); await q.evaluate(() => { const S = jmg.raw(); S.day = 10; S.soji = 20; S.kakou = 30; S.mori = 10 })
  await tapXY(q, 'makeup'); await q.waitForFunction(() => jmg.dateOpen())
  const r = await q.evaluate(() => ({ txt: document.querySelector('#memoTxt').textContent, head: document.querySelector('#memoHead').textContent, one: document.querySelector('#bC1').hidden, day: jmg.state().day }))
  await q.screenshot({ path: ROOT + '/shots/v-date-fail-real.png' })
  await tapXY(q, 'c0'); await q.waitForFunction(() => !jmg.busy())
  const after = await q.evaluate(() => ({ day: jmg.state().day, dates: jmg.state().dates, memo: document.querySelector('#memo').hidden }))
  expect(/写真と違う/.test(r.txt) && /会う日/.test(r.head) && r.one && after.dates[0] === 'fail' && after.day === 11 && after.memo, JSON.stringify({ r, after }))
})
await t('会う日（20日目）: 素地が高いと「写真より実物がいい」', async () => {
  await q.evaluate(() => { const S = jmg.raw(); S.day = 20; S.soji = 60; S.kakou = 0; S.mori = 0; S.hp = 100; S.choice = null; S.forced = 0 })
  await tapXY(q, 'run'); await q.waitForFunction(() => jmg.dateOpen())
  const txt = await q.textContent('#memoTxt'); await tapXY(q, 'c0'); await q.waitForFunction(() => !jmg.busy())
  const st = await q.evaluate(() => jmg.state().dates)
  expect(/実物のほうがいい/.test(txt) && st.at(-1) === 'great', JSON.stringify({ txt, st }))
})
await t('「やめたい」: 走って3回目に誘惑が出る（やめると丸が1日ぶん切れる）', async () => {
  const r = await q.evaluate(() => { const S = Sim.create(D, 90); S.events = []; let ev = null; for (let i = 0; i < 3; i++) { S.hp = 100; S.sore = false; const o = Sim.act(D, S, 'run'); if (o.ev) ev = o.ev } const g0 = S.gap; Sim.choose(D, S, 0); return { ev, g0, gap: S.gap, chain: S.chain } })
  expect(r.ev === 'quit' && r.g0 === 0, JSON.stringify(r)); return r
})
await t('毎回違う: 種が違うとおすすめ・できごとが違う', async () => {
  const r = await q.evaluate(() => { const a = Sim.create(D, 11), b = Sim.create(D, 12); return [a.deals.join() !== b.deals.join(), a.events.join() !== b.events.join()] })
  expect(r[0] && r[1], r)
})
await t('同じ種・同じ操作なら同じ結果（運でなく選び方で決まる）', async () => {
  const r = await q.evaluate(() => { const run = s => { const S = Sim.create(D, s); while (!S.done) { if (S.choice) { Sim.choose(D, S, 1); continue } const o = Sim.act(D, S, Plans.P.saeki(S)); if (!o.ok) Sim.act(D, S, 'sleep') } return [Sim.judge(D, S), S.soji, S.naka, S.money, S.dates.join()].join('|') }; return [run(5), run(5), run(6)] })
  expect(r[0] === r[1], r); return r[0]
})
await t('すぐ効く方は序盤が気持ちいい（5日目までの見た目の伸び）が、30日後は続けた方が上のランク', async () => {
  const r = await q.evaluate(() => {
    const ORD = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, EX: 4 }, RK = Object.fromEntries(D.P.map(p => [p.id, ORD[p.rank]]))
    const play = (pick) => { let early = 0, rank = 0; for (let k = 0; k < 30; k++) { const S = Sim.create(D, 700 + k); while (!S.done) { if (S.choice) { Sim.choose(D, S, 1); continue } const a = pick(S); const o = Sim.act(D, S, a); if (!o.ok) Sim.act(D, S, 'sleep'); if (S.day === 5 && !S.done) early += S.soji + S.temp + S.mori - D.START.soji } rank += RK[Sim.judge(D, S)] } return { early: early / 30, rank: rank / 30 } }
    const fast = play(S => S.money >= 9000 && S.day % 3 === 0 ? 'salon' : S.day % 2 ? 'makeup' : 'skin')
    const slow = play(S => Plans.P.kujo(S))
    return { fast, slow }
  })
  expect(r.fast.early > r.slow.early && r.slow.rank > r.fast.rank + 1.5, JSON.stringify(r)); return r
})
await t('遊びの画面で同時に出る文字は2つまで（吹き出し・案内）', async () => {
  const n = await q.evaluate(() => ['#bubble', '#tip', '#memo'].filter(s => { const e = document.querySelector(s); return e && !e.hidden && e.textContent.trim() }).length)
  expect(n <= 2, n); return n
})
await t('決め事: 整形は行動に無い・体重の数字を出さない', async () => {
  const r = await q.evaluate(() => { const acts = JSON.stringify(D.ACT) + JSON.stringify(D.UI); const all = JSON.stringify(D) + JSON.stringify(CHATS); return { seikei: /整形/.test(acts), kg: /\d+\s?(kg|キロ)/i.test(all), weight: /体重/.test(all) } })
  expect(!r.seikei && !r.kg && !r.weight, JSON.stringify(r))
})
await q.close()

// ---- localStorage が使えない（保存が例外を投げる）時も、送れてその場では残る・エラーなし
{
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 } }); await muteContext(ctx)
  await ctx.addInitScript(() => { try { localStorage.clear() } catch (e) {} Storage.prototype.setItem = function () { throw new Error('quota') } })
  const z = await ctx.newPage(); z.errs = []; z.on('pageerror', e => z.errs.push(e.message))
  await z.goto(URL0); await z.waitForFunction(() => window.__jmgReady)
  await t('トーク: 保存できない端末でも送れる（例外で止まらない）', async () => {
    await z.evaluate(() => { jmg.setBook(['takeshi']); document.querySelector('#bBook').click() })
    const xy = await z.evaluate(() => jmg.cellXY('takeshi')); await z.mouse.click(xy.x, xy.y); await z.waitForFunction(() => window.__chatDone, null, { timeout: 15000 })
    await z.click('#chText'); await z.keyboard.type('元気？'); await z.keyboard.press('Enter'); await z.waitForTimeout(200)
    await z.click('#chBack'); await z.mouse.click(xy.x, xy.y); await z.waitForFunction(() => window.__chatDone, null, { timeout: 15000 })
    const r = await z.evaluate(() => ({ mine: document.querySelectorAll('#chLog .m.mine').length, foot: document.querySelector('#chFoot').hidden }))
    expect(r.mine === 1 && r.foot && !z.errs.length, JSON.stringify(r) + z.errs.join('|'))
  })
  await ctx.close()
}
// ---- 最初の説明（4つ）は読める長さで自動で進み、押さなくても消える
{
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 } }); await muteContext(ctx)
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('__k')) { localStorage.clear(); sessionStorage.setItem('__k', '1') } } catch (e) {} })
  const z = await ctx.newPage(); z.errs = []; z.on('pageerror', e => z.errs.push(e.message))
  await z.goto(URL0); await z.waitForFunction(() => window.__jmgReady)
  await t('最初の説明: 押さなくても1つ1.8〜2.8秒で次へ進み、4つで消える（前は押すまで出っぱなし）', async () => {
    await z.click('#bStart'); const t0 = Date.now()
    await z.waitForFunction(() => document.querySelector('#tip').hidden && document.querySelector('#hand').hidden, null, { timeout: 20000 })
    const sec = (Date.now() - t0) / 1000, log = await z.evaluate(() => jmg.tipLog())
    expect(log.length === 4 && log.every(v => v >= 1700 && v <= 2900) && sec < 12 && !z.errs.length, JSON.stringify({ sec, log }) + z.errs.join('|'))
    return { sec: +sec.toFixed(1), log }
  })
  await t('最初の説明: 物を押すと、すぐ次の説明へ（待たない）', async () => {
    await z.evaluate(() => localStorage.removeItem('jmg_tut')); await z.reload(); await z.waitForFunction(() => window.__jmgReady)
    await z.click('#bStart'); await z.waitForTimeout(500)
    const xy = await z.evaluate(() => jmg.itemXY('study')); await z.mouse.click(xy.x, xy.y); await z.waitForTimeout(100)
    const r = await z.evaluate(() => ({ step: jmg.tutStep(), log: jmg.tipLog(), tip: document.querySelector('#tip').textContent }))
    expect(r.step === 1 && r.log.length === 1 && r.log[0] < 900, JSON.stringify(r)); return r
  })
  await ctx.close()
}
// ---- 値の上限・鏡の自分
await t('素地・中身・盛りは100で止まる', async () => {
  const z = await open(browser)
  const c = await z.evaluate(() => { const M = {}; for (const pl of Object.keys(Plans.P)) for (let i = 0; i < 4; i++) { const S = Sim.create(D, 300 + i); while (!S.done) { if (S.choice) { Sim.choose(D, S, Plans.choice(pl, S.choice)); continue } if (!Sim.act(D, S, Plans.P[pl](S)).ok) Sim.act(D, S, Plans.FB[pl] || 'sleep'); for (const k of ['soji', 'naka', 'mori']) M[k] = Math.max(M[k] || 0, S[k]) } } return M })
  await z.close()
  expect(c.soji === 100 && c.naka === 100 && c.mori <= 100, JSON.stringify(c)); return c
})
await t('鏡の自分15通りが、どれも bot の遊び方で出る', async () => {
  const p0 = await open(browser); const r = await p0.evaluate(() => { const seen = {}; for (const pl of Object.keys(Plans.P)) for (let i = 0; i < 6; i++) { const S = Sim.create(D, 1000 + i * 37); while (!S.done) { if (S.choice) { Sim.choose(D, S, Plans.choice(pl, S.choice)); continue } if (!Sim.act(D, S, Plans.P[pl](S)).ok) Sim.act(D, S, Plans.FB[pl] || 'sleep'); for (const m of [Sim.mirror(D, S), Sim.mirror(D, S, true)]) seen[m] = seen[m] || pl } } return { miss: Sim.MIRRORS.filter(m => !seen[m]), n: Sim.MIRRORS.length, seen } })
  await p0.close(); expect(r.n === 15 && !r.miss.length, JSON.stringify(r)); return r.seen
})
await t('鏡の自分が本物のタップの遊びで変わっていく（走ってばかり→走る人→顔色→光りだす）', async () => {
  const z = await open(browser)
  await z.evaluate(() => { jmg.setSeed(1001); jmg.fast(0.02) }); await z.click('#bStart')
  const seq = []
  for (let i = 0; i < 70; i++) {
    const st = await z.evaluate(() => jmg.state()); if (st.done) break
    if (st.choice) await tapXY(z, 'c1'); else await tapXY(z, await z.evaluate(() => Plans.P.riku(jmg.raw())))
    await z.waitForFunction(() => jmg.dateOpen() || (!jmg.busy() && (jmg.state().done || !document.querySelector('#vPlay').hidden)))
    if (await z.evaluate(() => jmg.dateOpen())) { await tapXY(z, 'c0'); await z.waitForFunction(() => !jmg.busy()) }
    const src = await z.evaluate(() => jmg.meSrc()); const nm = src.replace(/^img\/|\.webp.*$/g, '')
    if (seq.at(-1) !== nm) { seq.push(nm); if (['me_run', 'me_soji1', 'me_soji2'].includes(nm)) { await z.waitForTimeout(200); await z.locator('#mirror').screenshot({ path: `${ROOT}/shots/v-mirror-${nm}.png` }) } }
  }
  const ch = await z.evaluate(() => window.__meChanges); await z.close()
  expect(seq.includes('me_run') && seq.includes('me_soji1') && seq.includes('me_soji2') && ch >= 3, JSON.stringify({ seq, ch })); return seq.join('>')
})
await t('鏡の絵15枚が全部読める・値どおりに出る', async () => {
  const z = await open(browser)
  await z.evaluate(() => { jmg.setSeed(9); jmg.fast(0.02) }); await z.click('#bStart')
  const SET = { me0: {}, me_soji1: { soji: 45 }, me_soji2: { soji: 70 }, me_mori1: { mori: 35 }, me_mori2: { mori: 60 }, me_naka1: { naka: 50 }, me_naka2: { naka: 70, soji: 45 }, me_allhigh: { soji: 80, naka: 70 }, me_run: { log: ['run', 'cook', 'run', 'run'] }, me_cook: { log: ['cook', 'cook', 'cook'] }, me_tired: { hp: 5 }, me_fast: { temp: 20, fastRun: 2 }, me_hosp: { lastHosp: 1 }, me_oshi: { log: ['oshi', 'oshi'] }, me_selfie: { log: ['selfie', 'selfie'] } }
  const bad = []
  for (const [nm, st] of Object.entries(SET)) {
    const got = await z.evaluate(st => { const S = jmg.raw(); Object.assign(S, { soji: 20, naka: 20, mori: 0, temp: 0, fastRun: 0, hp: 80, lastHosp: -99, log: [], day: 3 }, st); return Sim.mirror(D, S) }, st)
    const ok = await z.evaluate(async nm => { const i = new Image(); i.src = `img/${nm}.webp?v=1`; try { await i.decode(); return i.naturalWidth >= 200 } catch (e) { return false } }, nm)
    if (got !== nm || !ok) bad.push(nm + ':' + got + ':' + ok)
  }
  await z.close(); expect(!bad.length && Object.keys(SET).length === 15, bad.join(','))
})

// ---- 30日後のドア（2026-11-12 本人「扉を自分の手で開くみたいな感じに」）。勝手に開かない・ドラッグ・途中で離す・タップ・のぞき穴・判定は変わらない
const hidden = p => p.evaluate(() => {
  const pt = document.querySelector('#portrait'), f = getComputedStyle(pt).filter
  return { veil: pt.classList.contains('veil') && /blur/.test(f) && /brightness\(0\.[0-3]/.test(f), tag: document.querySelector('#nameTag').classList.contains('in'), say: document.querySelector('#say').classList.contains('in'), epi: document.querySelector('#epi').textContent, next: !document.querySelector('#bNext').hidden, opened: window.__doorOpened }
})
const unseen = h => h.veil && !h.tag && !h.say && !h.epi && !h.next && !h.opened
{
  const d = await open(browser)
  // 人の速さ（FAST=1）で先まで進めて、見た目を撮る
  await t('ドア: 待っても勝手に開かない・ノックが繰り返される・恋人はぼかしたまま', async () => {
    await playPlan(d, 'kujo', { open: 'none' })
    const a = await hidden(d)
    await d.waitForFunction(() => jmg.door().knocks >= 3, null, { timeout: 10000 })
    await d.waitForTimeout(300)
    const b = await hidden(d), st = await d.evaluate(() => ({ door: jmg.door(), txt: document.querySelector('#rvText').textContent, hand: document.querySelector('#rvHand').className }))
    expect(unseen(a) && unseen(b) && st.door.p === 0 && !st.door.opened && st.txt === 'ドアを開ける' && st.hand === 'pull', JSON.stringify({ a, b, st }))
    return { knocks: st.door.knocks }
  })
  await t('ドア: のぞき穴を押すとぼやけた影だけ（開かない・恋人は見えない）', async () => {
    await d.evaluate(() => jmg.fast(1))
    const xy = await d.evaluate(() => jmg.doorXY()); await d.mouse.click(xy.eye.x, xy.eye.y); await d.waitForTimeout(450)
    const r = await d.evaluate(() => { const pi = document.querySelector('#peepImg'); return { peep: document.querySelector('#peep').classList.contains('in'), n: window.__peeps, blur: /blur/.test(getComputedStyle(pi).filter), p: jmg.door().p } })
    await d.screenshot({ path: ROOT + '/shots/v-door-peep.png' })
    const h = await hidden(d)
    await d.waitForFunction(() => !document.querySelector('#peep').classList.contains('in'), null, { timeout: 5000 })
    expect(r.peep && r.n === 1 && r.blur && r.p === 0 && unseen(h), JSON.stringify({ r, h })); return r
  })
  await t('ドア: 途中まで引いて離すと閉じ戻る（すき間で一言が聞こえる・恋人は見えない）', async () => {
    await d.waitForFunction(() => !jmg.door().peeping && !jmg.door().anim)
    const xy = await d.evaluate(() => jmg.doorXY())
    await drag(d, xy.knob.x, xy.knob.y, -xy.stage.w * 0.3, { release: false })
    await d.waitForTimeout(250)
    const mid = await d.evaluate(() => ({ p: jmg.door().p, said: window.__peekSaid, txt: document.querySelector('#peekSay').textContent, vis: document.querySelector('#peekSay').classList.contains('in') }))
    const h = await hidden(d)
    await d.screenshot({ path: ROOT + '/shots/v-door-half.png' })
    await d.mouse.up(); await d.waitForTimeout(1200)
    const back = await d.evaluate(() => ({ p: jmg.door().p, opened: jmg.door().opened, said: document.querySelector('#peekSay').classList.contains('in') }))
    expect(mid.p > 0.25 && mid.p < 0.5 && mid.said === 1 && mid.vis && mid.txt === '保護犬の散歩の途中で寄りました' && unseen(h) && back.p === 0 && !back.opened && !back.said, JSON.stringify({ mid, h, back }))
    return { mid: +mid.p.toFixed(2) }
  })
  await t('ドア: 1回押すと少し開いて止まり、2回目で開く（タップだけでも開けられる）', async () => {
    const xy = await d.evaluate(() => jmg.doorXY())
    await d.mouse.click(xy.knob.x, xy.knob.y); await d.waitForTimeout(900)
    const a = await d.evaluate(() => ({ p: jmg.door().p, opened: jmg.door().opened, hand: document.querySelector('#rvHand').className }))
    const h = await hidden(d)
    await d.screenshot({ path: ROOT + '/shots/v-door-ajar.png' })
    await d.mouse.click(xy.knob.x, xy.knob.y); await d.waitForTimeout(300)
    await d.screenshot({ path: ROOT + '/shots/v-door-opening.png' })
    await d.waitForSelector('#bNext:not([hidden])', { timeout: 8000 }); await d.waitForTimeout(400)
    const b = await hidden(d), who = await d.evaluate(() => ({ who: jmg.state().who, src: document.querySelector('#portrait').getAttribute('src') }))
    await d.screenshot({ path: ROOT + '/shots/v-door-open.png' })
    expect(a.p > 0.2 && a.p < 0.45 && !a.opened && a.hand === 'tap' && unseen(h) && !b.veil && b.tag && b.say && b.next && b.opened && who.who === 'kujo' && /p_kujo/.test(who.src), JSON.stringify({ a, h, b, who }))
  })
  await d.close()
}
await t('ドア: ドラッグで開く（なぞった分だけ開き、半分を越えて離すと一気に開く）', async () => {
  const z = await open(browser)
  await playPlan(z, 'tanaka', { open: 'none' })
  const xy = await z.evaluate(() => jmg.doorXY()), ps = []
  await z.mouse.move(xy.knob.x, xy.knob.y); await z.mouse.down()
  for (let i = 1; i <= 10; i++) { await z.mouse.move(xy.knob.x - xy.stage.w * 0.065 * i, xy.knob.y); ps.push(+(await z.evaluate(() => jmg.door().p)).toFixed(2)) }
  const h = await hidden(z)
  await z.mouse.up(); await z.waitForSelector('#bNext:not([hidden])', { timeout: 8000 })
  const r = await z.evaluate(() => ({ who: jmg.state().who, d: jmg.door() }))
  await z.close()
  const mono = ps.every((v, i) => !i || v >= ps[i - 1])
  expect(mono && ps[2] > 0 && ps[2] < 0.5 && ps.at(-1) > 0.5 && unseen(h) && r.d.opened && r.d.p === 1 && r.who === 'tanaka', JSON.stringify({ ps, h, r })); return ps.join(',')
})
await t('ドア: 指（タッチ）のドラッグでも開く・途中で離すと戻る', async () => {
  const z = await open(browser, { hasTouch: true, isMobile: true })
  await playPlan(z, 'takeshi', { open: 'none', touch: true })
  let xy = await z.evaluate(() => jmg.doorXY())
  await drag(z, xy.knob.x, xy.knob.y, -xy.stage.w * 0.25, { touch: true }); await z.waitForTimeout(800)
  const a = await z.evaluate(() => jmg.door())
  xy = await z.evaluate(() => jmg.doorXY())
  await drag(z, xy.knob.x, xy.knob.y, -xy.stage.w * 0.8, { touch: true }); await z.waitForSelector('#bNext:not([hidden])', { timeout: 8000 })
  const b = await z.evaluate(() => ({ who: jmg.state().who, d: jmg.door(), errs: 0 }))
  const errs = z.errs.slice(); await z.close()
  expect(a.p === 0 && !a.opened && b.d.opened && b.who === 'takeshi' && !errs.length, JSON.stringify({ a, b, errs }))
})
await t('ドア: Enter キーでも開く（PC）', async () => {
  const z = await open(browser)
  await playPlan(z, 'kuma', { open: 'none' })
  await z.focus('#door'); await z.keyboard.press('Enter'); await z.waitForFunction(() => !jmg.door().anim); await z.keyboard.press('Enter')
  await z.waitForSelector('#bNext:not([hidden])', { timeout: 8000 })
  const who = await z.evaluate(() => jmg.state().who); await z.close(); expect(who === 'kuma', who)
})
await t('ドア: 判定は開け方で変わらない（同じ種・同じ遊び方なら、タップでもドラッグでも同じ恋人）', async () => {
  const z = await open(browser), out = []
  for (const [plan, seed] of [['tanaka', 4242], ['host', 777], ['oshi', 1001]]) {
    const exp = await z.evaluate(([pl, sd]) => { const S = Sim.create(D, sd); while (!S.done) { if (S.choice) { Sim.choose(D, S, Plans.choice(pl, S.choice)); continue } if (!Sim.act(D, S, Plans.P[pl](S)).ok) Sim.act(D, S, Plans.FB[pl] || 'sleep') } return Sim.judge(D, S) }, [plan, seed])
    const a = await playPlan(z, plan, { seed, open: 'tap' }); await z.click('#bNext'); await z.waitForFunction(() => window.__jmgCardDone)
    const b = await playPlan(z, plan, { seed, open: 'drag' }); await z.click('#bNext'); await z.waitForFunction(() => window.__jmgCardDone)
    out.push([plan, exp, a.who, b.who])
  }
  await z.close()
  expect(out.every(([, e, a, b]) => e && e === a && a === b), JSON.stringify(out)); return out.map(o => o[2]).join(',')
})

// ---- 英語
const e = await open(browser)
await t('英語に切り替えると日本語が消える（タイトル・部屋）', async () => {
  await e.click('#bLang'); await e.evaluate(() => { jmg.setSeed(3); jmg.fast(0.02) }); await e.click('#bStart')
  const t1 = await e.evaluate(() => document.querySelector('#vPlay').innerText)
  expect(!/[ぁ-んァ-ヶ一-龠]/.test(t1), t1.slice(0, 80))
  await e.screenshot({ path: ROOT + '/shots/v-en-play.png' })
})
await t('英語で最後まで遊べて招待状も英語', async () => {
  await e.evaluate(() => jmg.fast(0.02))
  for (let i = 0; i < 70; i++) { const st = await e.evaluate(() => jmg.state()); if (st.done) break; if (st.choice) await tapXY(e, 'c1'); else await tapXY(e, st.hp < 30 ? 'sleep' : ['run', 'study', 'work', 'makeup'][i % 4]); await e.waitForFunction(() => jmg.dateOpen() || !jmg.busy()); if (await e.evaluate(() => jmg.dateOpen())) { const dt = await e.textContent('#memoCard'); if (/[ぁ-んァ-ヶ一-龠]/.test(dt)) throw new Error('date ja: ' + dt); await tapXY(e, 'c0'); await e.waitForFunction(() => !jmg.busy()) } }
  await doorReady(e); const xy = await e.evaluate(() => jmg.doorXY()); await e.mouse.click(xy.knob.x, xy.knob.y); await e.waitForFunction(() => !jmg.door().anim)
  const ajar = await e.evaluate(() => ({ t: document.querySelector('#rvText').textContent, s: document.querySelector('#peekSay').textContent, k: document.querySelector('#knockFx').textContent, al: document.querySelector('#door').getAttribute('aria-label') }))
  expect(ajar.t === 'Open the door' && ajar.k === 'Knock knock' && ajar.al === 'Open the door' && ajar.s && !/[ぁ-んァ-ヶ一-龠]/.test(ajar.s), JSON.stringify(ajar))
  await e.screenshot({ path: ROOT + '/shots/v-en-ajar.png' })
  await e.mouse.click(xy.knob.x, xy.knob.y)
  await e.waitForSelector('#bNext:not([hidden])'); const rv = await e.evaluate(() => document.querySelector('#vReveal').innerText)
  expect(!/[ぁ-んァ-ヶ一-龠]/.test(rv), rv)
  await e.click('#bNext'); await e.waitForFunction(() => window.__jmgCardDone); await e.screenshot({ path: ROOT + '/shots/v-en-end.png' })
  expect(e.errs.length === 0, e.errs.join('|'))
})
await t('英語: トークも英語（PR は出ない）', async () => {
  const pr = ''
  const who = await e.evaluate(() => jmg.state().who)
  await e.click('#bBook2'); const xy = await e.evaluate(i => jmg.cellXY(i), who); await e.mouse.click(xy.x, xy.y); await e.waitForFunction(() => window.__chatDone)
  const ch = await e.evaluate(() => document.querySelector('#chat').innerText); await e.screenshot({ path: ROOT + '/shots/v-en-chat.png' })
  expect(!/[ぁ-んァ-ヶ一-龠]/.test(ch) && /Read/.test(ch), ch.slice(0, 120))
  await e.click('#chBack'); await e.click('#bookClose')
})
await e.close()

// ---- 3サイズ × 全画面で一画面に収まる
for (const [w, h, name] of [[360, 640, 'small'], [390, 844, 'phone'], [430, 932, 'max']]) {
  const s = await open(browser, { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  const views = {}
  views.title = await fit(s); await s.screenshot({ path: `${ROOT}/shots/fit-${name}-title.png` })
  await s.tap('#bHow'); views.how = await fit(s); await s.screenshot({ path: `${ROOT}/shots/fit-${name}-how.png` }); await s.tap('#howClose')
  await s.tap('#bBook'); views.book0 = await fit(s); await s.tap('#bookClose')
  await s.evaluate(() => { jmg.setSeed(1); jmg.fast(0.02) }); await s.tap('#bStart'); await s.waitForTimeout(150)
  views.play = await fit(s); await s.screenshot({ path: `${ROOT}/shots/fit-${name}-play.png` })
  // できごとの2択
  await s.evaluate(() => { const S = jmg.raw(); S.events[S.day] = 'cat' }); await tapXY(s, 'sleep', true); await s.waitForSelector('#memo:not([hidden])')
  views.memo = await fit(s); await s.screenshot({ path: `${ROOT}/shots/fit-${name}-memo.png` }); await tapXY(s, 'c0', true); await s.waitForFunction(() => !jmg.busy())
  const r = await playPlan(s, 'takeshi', { touch: true, seed: 5, cont: true, open: 'none' })
  await s.evaluate(() => jmg.fast(1)); await s.waitForTimeout(500)
  views.door = await fit(s); await s.screenshot({ path: `${ROOT}/shots/fit-${name}-door.png` })
  { const xy = await s.evaluate(() => jmg.doorXY()); await s.touchscreen.tap(xy.knob.x, xy.knob.y); await s.waitForTimeout(1200)
    views.ajar = await fit(s); await s.screenshot({ path: `${ROOT}/shots/fit-${name}-ajar.png` })
    const o = await overflow(s); if (o.sw > o.W || o.bad.length) views.ajar.over.push('xover:' + JSON.stringify(o))
    await s.touchscreen.tap(xy.knob.x, xy.knob.y); await s.waitForSelector('#bNext:not([hidden])', { timeout: 10000 }); await s.evaluate(() => jmg.fast(0.02)) }
  await s.waitForTimeout(400); views.reveal = await fit(s); await s.screenshot({ path: `${ROOT}/shots/fit-${name}-reveal.png` })
  await s.tap('#bNext'); await s.waitForFunction(() => window.__jmgCardDone); await s.waitForTimeout(300)
  views.end = await fit(s); await s.screenshot({ path: `${ROOT}/shots/fit-${name}-end.png` })
  await s.tap('#bBook2'); views.book = await fit(s); await s.screenshot({ path: `${ROOT}/shots/fit-${name}-book.png` })
  { const xy = await s.evaluate(() => jmg.cellXY('takeshi')); await s.touchscreen.tap(xy.x, xy.y); await s.waitForFunction(() => window.__chatDone, null, { timeout: 15000 })
    views.chat = await fit(s); await s.screenshot({ path: `${ROOT}/shots/fit-${name}-chat.png` })
    const o = await overflow(s); if (o.sw > o.W || o.bad.length) views.chat.over.push('xover:' + JSON.stringify(o))
    const b = await s.evaluate(() => { const r = document.querySelector('#chBack').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }); await s.touchscreen.tap(b.x, b.y); await s.waitForSelector('#chat', { state: 'hidden' }) }
  for (const [v, rr] of Object.entries(views)) await t(`一画面に収まる ${name} ${w}x${h} ${v}`, async () => { expect(!rr.over.length, JSON.stringify(rr)) })
  await t(`${name}: はみ出し・エラーなし（${r.who}）`, async () => { const o = await overflow(s); expect(o.sw <= o.W && !o.bad.length && !s.errs.length, JSON.stringify(o) + s.errs.join('|')) })
  await t(`${name}: 部屋の11の物が全部画面内で押せる大きさ`, async () => {
    await s.tap('#bookClose'); await s.tap('#bAgain'); await s.waitForTimeout(150)
    const r2 = await s.evaluate(() => Object.keys(D.ACT).map(a => { const x = jmg.itemXY(a); return [a, Math.round(x.w), Math.round(x.h), x.y < innerHeight && x.y > 0] }))
    expect(r2.length === 11 && r2.every(([, w, h, inn]) => w >= 44 && h >= 44 && inn), JSON.stringify(r2))
  })
  await s.close()
}
await browser.close()

// ---- WebKit（iPhone 相当）で指のタップの通し
const wb = await webkit.launch(), wp = await open(wb, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
await t('WebKit: 2本指の touchmove を止める', async () => {
  const r = await wp.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e); return e.defaultPrevented })
  expect(r, r)
})
await t('WebKit: タップだけで30日→ドアの前（ずっと寝る→ぬいぐるみ）', async () => {
  const r = await playPlan(wp, 'kuma', { touch: true }); expect(r.who === 'kuma', JSON.stringify(r))
  await wp.screenshot({ path: ROOT + '/shots/v-webkit-reveal.png' })
  await wp.tap('#bNext'); await wp.waitForFunction(() => window.__jmgCardDone); await wp.screenshot({ path: ROOT + '/shots/v-webkit-end.png' })
  return r
})
await t('WebKit: タップだけで「ハイスペすぎる人」', async () => { const r = await playPlan(wp, 'kujo', { touch: true }); expect(r.who === 'kujo', JSON.stringify(r)) })
await t('WebKit: ドアをドラッグで開ける（途中の見た目も撮る）', async () => {
  await wp.tap('#bNext'); await wp.waitForFunction(() => window.__jmgCardDone)
  await playPlan(wp, 'riku', { open: 'none' }); await wp.evaluate(() => jmg.fast(1))
  const xy = await wp.evaluate(() => jmg.doorXY()); await drag(wp, xy.knob.x, xy.knob.y, -xy.stage.w * 0.35, { release: false }); await wp.waitForTimeout(300)
  const mid = await wp.evaluate(() => jmg.door().p); await wp.screenshot({ path: ROOT + '/shots/v-webkit-door-half.png' })
  await wp.mouse.move(xy.knob.x - xy.stage.w * 0.8, xy.knob.y, { steps: 6 }); await wp.mouse.up(); await wp.waitForSelector('#bNext:not([hidden])', { timeout: 10000 }); await wp.evaluate(() => jmg.fast(0.02))
  const who = await wp.evaluate(() => jmg.state().who); expect(mid > 0.3 && mid < 0.5 && who === 'riku', JSON.stringify({ mid, who }))
})
await t('WebKit: 実際には無音（始めた後・音を鳴らした後）', async () => {
  const r = await wp.evaluate(() => ({ ok: window.__muteOk(), calls: Object.keys(window.__sfxCalls).length }))
  expect(r.ok && r.calls > 3, JSON.stringify(r)); return r
})
await t('WebKit: トークの入力欄は16px以上（iOS の自動拡大なし）・キーボードで見える高さが縮んでも入力欄と送った一文が見える', async () => {
  await wp.evaluate(() => { jmg.setBook(['takeshi', 'kuma']); localStorage.removeItem('jmg_myline'); document.querySelectorAll('main.view').forEach(v => v.hidden = v.id !== 'vTitle'); document.querySelector('#bBook').click() })
  const xy = await wp.evaluate(() => jmg.cellXY('kuma')); await wp.touchscreen.tap(xy.x, xy.y); await wp.waitForFunction(() => window.__chatDone, null, { timeout: 15000 })
  const fs = await wp.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#chText')).fontSize))
  await wp.tap('#chText'); await wp.setViewportSize({ width: 390, height: 500 }); await wp.waitForTimeout(500)
  const a = await wp.evaluate(() => { const r = document.querySelector('#chText').getBoundingClientRect(); return { bottom: Math.round(r.bottom), top: Math.round(r.top), H: visualViewport.height, focus: document.activeElement.id } })
  await wp.keyboard.type('起きてる？'); await wp.keyboard.press('Enter'); await wp.waitForTimeout(400)
  const b = await wp.evaluate(() => { const m = document.querySelector('#chLog .mine'); const r = m.getBoundingClientRect(), L = document.querySelector('#chLog').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), lb: Math.round(L.bottom), H: visualViewport.height } })
  await wp.screenshot({ path: ROOT + '/shots/v-webkit-chat-kb.png' })
  await wp.setViewportSize({ width: 390, height: 844 }); await wp.waitForTimeout(300); await wp.screenshot({ path: ROOT + '/shots/v-webkit-chat-sent.png' })
  await wp.tap('#chBack'); await wp.tap('#bookClose')
  expect(fs >= 16 && a.focus === 'chText' && a.top >= 0 && a.bottom <= a.H && b.bottom <= b.lb + 1 && b.top >= 0, JSON.stringify({ fs, a, b }))
  return { fs, a, b }
})
await awayTest(wp, { fb: 'snd/bgm.mp3' })
await t('WebKit: エラーなし', async () => { expect(wp.errs.length === 0, wp.errs.join('|')) })
await awayNavTest(wp)
await wb.close()
server.kill()
console.log(results.join('\n'))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

// ---- ページを離れたら音を止める（WebKit。裏に回る→戻る（bfcache の pageshow）で鳴らない、触ると戻る（resume を呼ぶ）。音は出さない。mute.mjs が resume を数えるだけにしているので state は見ない）
async function awayTest(pg, o = {}) {
  await t('WebKit: 裏に回ると BGM と環境音が止まり suspend。戻っても触るまで鳴らない（bfcache の pageshow でも）', async () => {
    const r = await pg.evaluate(async (fb) => {
      const sl = ms => new Promise(r => setTimeout(r, ms))
      if (!Snd.ctx) Snd.init()
      await sl(900); let fbUsed = false
      if (!Snd.playing().length && fb) { fbUsed = true; Snd.loop('__bed', fb, 0.2); for (let i = 0; i < 40 && !Snd.playing().length; i++) await sl(100) }
      const before = Snd.playing().length
      const c = Snd.ctx; let sus = 0; const os = c.suspend.bind(c); c.suspend = () => { sus++; return os() }
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange'))
      const hid = { away: Snd.away, playing: Snd.playing().length, sus, gain: Snd.master.gain.value }
      const nm = Object.keys(Snd.files)[0], src = nm ? Snd.play(nm) : null; Snd.loop('__q', fb || Object.values(Snd.files)[0][0], 0.2)   // 裏にいる間の音は鳴らさない
      await sl(400); const quiet = Snd.playing().length
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
      await sl(400); const back = { away: Snd.away, playing: Snd.playing().length, gain: Snd.master.gain.value }
      Snd.loop('__q', null)
      return { before, fbUsed, hid, src: !!src, quiet, back, calls0: window.__soundCalls || 0 }
    }, o.fb || null)
    const xy = o.tap ? await pg.evaluate(o.tap) : await pg.evaluate(() => ({ x: 8, y: innerHeight * 0.5 }))
    await pg.touchscreen.tap(xy.x, xy.y); await pg.waitForTimeout(800)
    const after = await pg.evaluate(() => ({ away: Snd.away, playing: Snd.playing().length, wake: Snd.life.wake, calls: window.__soundCalls || 0, mute: window.__muteOk() }))
    if (r.fbUsed) await pg.evaluate(() => Snd.loop('__bed', null))
    expect(r.before >= 1 && r.hid.away && r.hid.playing === 0 && r.hid.sus === 1 && r.hid.gain === 0 && !r.src && r.quiet === 0 && r.back.away && r.back.playing === 0 && r.back.gain === 0 && !after.away && after.playing >= r.before && after.wake === 1 && after.calls > r.calls0 && after.mute, JSON.stringify({ r, after }))
    return { before: r.before, after: after.playing, fb: r.fbUsed }
  })
}
async function awayNavTest(pg, o = {}) {
  await t('WebKit: 別のページへ移る（pagehide）と止まり、戻るで戻っても鳴っていない', async () => {
    await pg.evaluate(() => { if (!Snd.ctx) Snd.init(); addEventListener('pagehide', () => { try { sessionStorage.setItem('__awayHide', JSON.stringify({ away: Snd.away, playing: Snd.playing().length, hide: Snd.life.hide })) } catch (e) {} }) })
    const e0 = pg.errs.length
    await pg.goto(o.to || URL0 + 'privacy.html'); await pg.waitForTimeout(300)
    await pg.goBack({ waitUntil: 'commit' }).catch(() => {}); await pg.waitForFunction(() => document.readyState === 'complete' && typeof Snd === 'object', null, { timeout: 15000 }); await pg.waitForTimeout(1000)
    const back = await pg.evaluate(() => ({ playing: Snd.playing().length, ctx: !!Snd.ctx, away: Snd.away, h: JSON.parse(sessionStorage.getItem('__awayHide') || '{}') }))
    expect(back.h.away && back.h.playing === 0 && back.playing === 0 && pg.errs.length === e0, JSON.stringify(back) + pg.errs.slice(e0).join('|')); return back
  })
}
