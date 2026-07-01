import puppeteer from 'puppeteer-core'

// Resolucion del navegador de forma multiplataforma (sin rutas fijas):
// 1) Variable de entorno PUPPETEER_EXECUTABLE_PATH o CHROME_PATH, si existe.
// 2) En su defecto, se usa el canal "chrome" para detectar el Chrome instalado
//    en Windows, macOS o Linux automaticamente.
const EXECUTABLE_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || ''
const URL = process.env.E2E_URL || 'http://localhost:5173/'

const launchOptions = {
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1400,900'],
  defaultViewport: { width: 1400, height: 900 },
}
if (EXECUTABLE_PATH) launchOptions.executablePath = EXECUTABLE_PATH
else launchOptions.channel = 'chrome'

const errors = []
const browser = await puppeteer.launch(launchOptions)
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

function log(...a) { console.log(...a) }

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 3000))

// 1) Click a hospital marker (pink circle). CircleMarkers are SVG paths inside leaflet-overlay.
const paths = await page.$$('path.leaflet-interactive')
log('interactive paths:', paths.length)

// Click several until the panel opens.
let opened = false
for (let i = 0; i < paths.length && !opened; i++) {
  try {
    await paths[i].click()
    await new Promise((r) => setTimeout(r, 400))
    opened = await page.$('.panel') != null
  } catch {}
}
log('panel opened by clicking a shape:', opened)
await page.screenshot({ path: 'test-panel.png' })

// 2) Open the submission form
if (opened) {
  const btns = await page.$$('.panel button')
  for (const b of btns) {
    const t = await page.evaluate((el) => el.textContent, b)
    if (t && t.includes('Enviar una actualizacion')) { await b.click(); break }
  }
  await new Promise((r) => setTimeout(r, 600))
  const hasForm = await page.$('.panel form') != null
  log('submission form visible:', hasForm)
  await page.screenshot({ path: 'test-form.png' })

  // Fill + submit
  if (hasForm) {
    await page.type('.panel textarea', 'Prueba automatizada: edificio afectado, se requieren brigadas.')
    const submit = await page.$$('.panel button[type=submit]')
    if (submit[0]) { await submit[0].click() }
    await new Promise((r) => setTimeout(r, 800))
    const okNotice = await page.$('.notice--ok') != null
    log('submission success notice:', okNotice)
    await page.screenshot({ path: 'test-form-sent.png' })
  }
}

// 3) Admin login
await page.reload({ waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1500))
const headerBtns = await page.$$('.header__btn')
for (const b of headerBtns) {
  const t = await page.evaluate((el) => el.textContent, b)
  if (t && t.includes('Admin')) { await b.click(); break }
}
await new Promise((r) => setTimeout(r, 500))
const loginVisible = await page.$('.modal') != null
log('login modal visible:', loginVisible)
await page.type('.modal input[type=password]', 'admin123')
await page.click('.modal button.btn--primary')
await new Promise((r) => setTimeout(r, 1200))
const queueVisible = await page.$('.modal') != null
log('admin queue visible after login:', queueVisible)
const queueText = await page.evaluate(() => document.querySelector('.modal__body')?.innerText?.slice(0, 120))
log('queue body text:', JSON.stringify(queueText))
await page.screenshot({ path: 'test-admin-queue.png' })

log('=== JS ERRORS (' + errors.length + ') ===')
errors.forEach((e) => log(e))

await browser.close()
