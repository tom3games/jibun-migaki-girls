import './mute-auto.mjs'
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const PORT = 5493, sv = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname, env: { ...process.env, PORT: String(PORT) } }); await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(); const errs = []
for (const [w, h, loc] of [[360, 640, 'ja-JP'], [390, 844, 'ja-JP'], [430, 932, 'en-US']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, locale: loc }), p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message))
  await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__jmgReady); await p.tap('#bStart'); await p.waitForTimeout(600); await p.screenshot({ path: `shots/two-${w}-a.png` })
  const seen = []; let bad = 0
  await p.evaluate(() => jmg.fast(0.05))
  for (let i = 0; i < 120; i++) {
    const st = await p.evaluate(() => ({ ...jmg.state(), off: jmg.offers(), vis: [...document.querySelectorAll('#floor .obj')].filter(e => !e.hidden).map(e => e.dataset.a), dt: jmg.dateOpen() }))
    if (st.done) break
    if (st.dt) { await p.tap('#bDate'); await p.waitForTimeout(150); continue }
    if (st.choice) { await p.waitForSelector('#memo:not([hidden])'); await p.tap('#bC1'); await p.waitForTimeout(200); continue }
    if (st.vis.length !== 2) bad++
    seen.push(st.off.join('/')); await p.locator(`.obj[data-a="${st.off[i % 3 ? 0 : 1]}"]`).tap({ force: true }); if (i === 4) await p.screenshot({ path: `shots/two-${w}-b.png` }); await p.waitForFunction(() => jmg.dateOpen() || !jmg.busy())
    if (i === 9) { await p.waitForTimeout(400); await p.screenshot({ path: `shots/two-${w}-c.png` }) }
  }
  await p.waitForTimeout(300); console.log(w, 'days', seen.length, 'bad', bad, (await p.evaluate(() => jmg.state().done)), new Set(seen).size, '種類の組')
}
console.log('errs', errs.join('|') || 'none'); await b.close(); sv.kill()
