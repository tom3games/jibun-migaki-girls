import './mute-auto.mjs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
// 公開URLの確認。node live.mjs（ログインしていないブラウザで見る）。SKIPGH=1 で GitHub ページの確認を省く
// 自分磨き30日 女の子編。「遊びの通し」は D.P[0]（九条さん）の bot を本物のタップで
import { chromium, webkit } from 'playwright'
import { execSync } from 'node:child_process'
// 個人のアカウント名は公開リポジトリに書かない。実行時に gh から取る（2026-11-02 live.mjs に名前が文字で入ったまま5本公開していた）
const OWNER = (() => { try { return execSync('gh api user -q .login', { encoding: 'utf8' }).trim().toLowerCase() } catch { return '' } })()
const URL0 = 'https://tom3games.github.io/jibun-migaki-girls/'
const out = []
for (const [name, bt, opts] of [['chromium', chromium, {}], ['webkit', webkit, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const b = await bt.launch(bt === chromium ? MUTE_LAUNCH : {}), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, ...opts })
  await muteContext(ctx)
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('requestfailed', r => errs.push('fail ' + r.url()))
  // github.io は横丁へ転送される。ここでは github.io に出した物そのものを見るので、転送の1行だけ外す
  await p.route(u => u.href.startsWith(URL0) && u.pathname === '/jibun-migaki-girls/', async r => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace(/<script id="ghMove">[^<]*<\/script>/, '') }) })
  await p.goto(URL0 + '?t=' + Date.now(), { waitUntil: 'networkidle' })
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} })
  await p.waitForFunction(() => window.__jmgReady, null, { timeout: 15000 })
  // ---- 遊びの通し: 本物のタップで30日（bot の計画）→ 招待状まで ----
  const touch = !!opts.hasTouch
  const tapXY = async a => { const xy = await p.evaluate(k => jmg.itemXY(k), a); if (touch) await p.touchscreen.tap(xy.x, xy.y); else await p.mouse.click(xy.x, xy.y) }
  const plan = await p.evaluate(() => D.P[0].id)
  await p.evaluate(() => jmg.fast(0.02))
  if (touch) await p.tap('#bStart'); else await p.click('#bStart')
  await p.waitForFunction(() => !document.querySelector('#vPlay').hidden)
  for (let i = 0; i < 80; i++) {
    const st = await p.evaluate(() => jmg.state()); if (st.done) break
    if (st.choice) { const c = await p.evaluate(([pl, ev]) => Plans.choice(pl, ev), [plan, st.choice]); await tapXY('c' + c) }
    else { const a = await p.evaluate(pl => Plans.P[pl](jmg.raw()), plan); await tapXY(a) }
    await p.waitForFunction(() => jmg.dateOpen() || (!jmg.busy() && (jmg.state().done || !document.querySelector('#vPlay').hidden)))
    if (await p.evaluate(() => jmg.dateOpen())) { await tapXY('c0'); await p.waitForFunction(() => !jmg.busy()) }
  }
  // 30日後のドアは自分で開ける: ノブを1回押すと少し開き、2回目で開く
  await p.waitForFunction(() => jmg.door() && jmg.door().ready && !jmg.door().anim, null, { timeout: 20000 })
  for (let i = 0; i < 2; i++) { const xy = await p.evaluate(() => jmg.doorXY().knob); if (touch) await p.touchscreen.tap(xy.x, xy.y); else await p.mouse.click(xy.x, xy.y); await p.waitForFunction(() => !jmg.door().anim) }
  await p.waitForSelector('#bNext:not([hidden])', { timeout: 20000 })
  const who = await p.evaluate(() => jmg.state().who), mute = await p.evaluate(() => window.__muteOk ? window.__muteOk() : null)
  out.push(`${name}: plan=${plan} who=${who} mute=${mute} game.js=${await p.evaluate(() => document.querySelector('script[src^="game.js"]').getAttribute('src'))}`)
  await p.screenshot({ path: `shots/live-${name}.png` })
  // og:image は横丁（別のドメイン）を指すので、ページの中からでなく Node で取る
  const ogUrl = await p.evaluate(() => document.querySelector('meta[property="og:image"]').content)
  const og = await Promise.all([ogUrl, URL0 + 'og.png'].map(async u => { const r = await fetch(u); return u.replace(/^https:\/\//, '') + ' ' + r.status + ' ' + r.headers.get('content-type') })).then(a => a.join(' / '))
  out.push(`${name}: og=${og} errors=${errs.length ? errs.join(' | ') : 'none'}`)
  await b.close()
}
if (process.env.SKIPGH) { console.log(out.join('\n')); process.exit(0) }
// ログアウト状態でリポジトリ・更新履歴に個人のIDが出ていないか
const b = await chromium.launch(MUTE_LAUNCH), p = await b.newPage()
for (const u of ['https://github.com/tom3games/jibun-migaki-girls', 'https://github.com/tom3games/jibun-migaki-girls/commits/main']) {
  const res = await p.goto(u, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500)
  out.push(`${u} status=${res.status()} owner=${OWNER && (await p.content()).toLowerCase().includes(OWNER) ? 'FOUND' : 'none'}`)
}
await b.close()
console.log(out.join('\n'))
