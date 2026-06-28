import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'docs', 'promo')
const URL = 'http://localhost:4174/'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const now = Date.now()
const iso = (minsAgo) => new Date(now - minsAgo * 60000).toISOString()

// Datos de muestra (modo demo, viven en localStorage del navegador).
const status = {
  'distrito-capital-hospital-jose-maria-vargas': {
    status_level: 'alto',
    summary: 'Servicio de emergencias operativo a full capacidad. Quirófanos funcionando con planta eléctrica.',
    people_aided: '120 pacientes atendidos por el terremoto',
    blood_needed: true,
    blood_types: 'O-, O+, A-',
    supplies_needed: 'Gasas, suero fisiológico, analgésicos, guantes quirúrgicos, combustible para planta.',
    donation_poc: 'Coord. María Pérez · 0414-1234567 · Entrada de Emergencias, planta baja',
    updated_by: 'Dirección del hospital',
    updated_at: iso(18),
  },
  'distrito-capital-hospital-universitario-de-caracas': {
    status_level: 'medio',
    summary: 'Recibiendo heridos de zonas aledañas. Requiere apoyo de insumos.',
    people_aided: '75 pacientes',
    blood_needed: true,
    blood_types: 'Todos los tipos',
    supplies_needed: 'Medicamentos, vendas, sillas de ruedas.',
    donation_poc: 'Lic. José Rodríguez · 0212-7654321',
    updated_by: 'Voluntariado HUC',
    updated_at: iso(95),
  },
  'distrito-capital-parroquia-el-valle': {
    status_level: 'alto',
    summary: 'Varias edificaciones colapsadas. Brigadas trabajando en remoción de escombros.',
    rescue_teams: 'Bomberos de Caracas, Protección Civil, brigadas vecinales y rescatistas caninos.',
    buildings_searched: 'Edificio Las Acacias (Av. Intercomunal), Residencias Coromoto, colegio San José.',
    supplies_needed: 'Agua potable, linternas, palas, guantes, alimentos no perecederos.',
    donation_poc: 'Centro de acopio Iglesia El Valle · Sr. Luis · 0416-5551122',
    updated_by: 'Consejo comunal El Valle',
    updated_at: iso(42),
  },
  'miranda-parroquia-petare': {
    status_level: 'medio',
    summary: 'Daños en viviendas de la parte alta. Acceso vehicular limitado.',
    rescue_teams: 'Protección Civil Sucre y voluntarios.',
    buildings_searched: 'Sector José Félix Ribas, escaleras de Maca.',
    supplies_needed: 'Carpas, colchonetas, pañales, agua.',
    donation_poc: 'Módulo Barrio Adentro Petare · 0424-9008877',
    updated_by: 'Brigada vecinal',
    updated_at: iso(150),
  },
  'la-guaira-parroquia-caraballeda': {
    status_level: 'alto',
    summary: 'Deslizamientos en la cota mil. Familias evacuadas a refugios.',
    rescue_teams: 'Guardacostas, Protección Civil La Guaira.',
    buildings_searched: 'Urbanización Caribe, sector Tanaguarena.',
    supplies_needed: 'Ropa seca, agua, kits de higiene, medicinas.',
    donation_poc: 'Refugio Escuela Caraballeda · 0412-3344556',
    updated_by: 'Coordinación de refugios',
    updated_at: iso(8),
  },
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const pg = await b.newPage()
await pg.setViewport({ width: 1366, height: 854, deviceScaleFactor: 1.5 })

// Primer load para tener origen y poder escribir localStorage.
await pg.goto(URL, { waitUntil: 'domcontentloaded' })
await pg.evaluate((s) => {
  localStorage.setItem('mapa_ayuda_status_v1', JSON.stringify(s))
  localStorage.setItem('mapa_ayuda_disclaimer_dismissed_v1', '0')
}, status)
await pg.goto(URL, { waitUntil: 'networkidle2' })
await pg.waitForSelector('.header__btn', { timeout: 20000 })
await new Promise((r) => setTimeout(r, 2500)) // dar tiempo a los tiles del mapa

const shot = async (name) => {
  await pg.screenshot({ path: join(OUT, name) })
  console.log('  ✓', name)
}

const clickHeader = async (text) => {
  const btns = await pg.$$('.header__btn')
  for (const btn of btns) {
    const t = await pg.evaluate((e) => e.textContent.trim(), btn)
    if (t.includes(text)) { await btn.click(); return true }
  }
  return false
}

const openPlace = async (q) => {
  const input = await pg.$('.search__input')
  await input.click({ clickCount: 3 })
  await input.type(q, { delay: 10 })
  await new Promise((r) => setTimeout(r, 500))
  const item = await pg.$('.search__item')
  if (item) await item.click()
  await pg.waitForSelector('.panel', { timeout: 5000 })
  await new Promise((r) => setTimeout(r, 600))
}

const closePanel = async () => {
  const c = await pg.$('.panel__close')
  if (c) await c.click()
  await new Promise((r) => setTimeout(r, 300))
}

// 1) Vista general
await shot('01-mapa-general.png')

// 2) Panel hospital
await openPlace('José María Vargas')
await shot('02-panel-hospital.png')

// 3) Formulario de actualización (desde el panel del hospital)
const reportBtn = await pg.$$('.panel .btn')
for (const btn of reportBtn) {
  const t = await pg.evaluate((e) => e.textContent, btn)
  if (t.includes('Enviar una actualiz')) { await btn.click(); break }
}
await new Promise((r) => setTimeout(r, 500))
await shot('05-reportar-actualizacion.png')
await closePanel()

// 4) Panel parroquia
await openPlace('El Valle')
await shot('03-panel-parroquia.png')
await closePanel()

// 5) Quiero donar
await clickHeader('Quiero donar')
await pg.waitForSelector('.donate__input', { timeout: 5000 })
await pg.type('.donate__input', 'agua, pañales, medicinas, sangre O-', { delay: 12 })
await new Promise((r) => setTimeout(r, 800))
await shot('04-quiero-donar.png')
const donateClose = await pg.$('.modal .panel__close')
if (donateClose) await donateClose.click()
await new Promise((r) => setTimeout(r, 400))

// 6) Feed de actualizaciones
await clickHeader('Actualizaciones')
await pg.waitForSelector('.feed', { timeout: 5000 })
await new Promise((r) => setTimeout(r, 700))
await shot('06-feed-actualizaciones.png')

// 7) Vista móvil
await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
await pg.goto(URL, { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 2500))
await shot('07-movil.png')

await b.close()
console.log('Listo. Capturas en docs/promo/')
