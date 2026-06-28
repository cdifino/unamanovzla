import { supabase, IS_DEMO } from './supabaseClient'
import parroquias from '../data/parroquias_points.json'
import hospitales from '../data/hospitales.json'
import { emptyStatus } from '../data/constants'

// ---------------------------------------------------------------------------
// Catalogo base de ubicaciones (geografia + nombre). El estado dinamico
// (suministros, rescate, etc.) se guarda en Supabase o, en modo demo, en
// localStorage.
// ---------------------------------------------------------------------------
const BASE = [...parroquias, ...hospitales].map((l) => ({
  ...l,
  municipio: l.municipio || null,
}))

const STATUS_FIELDS = [
  'status_level',
  'summary',
  'supplies_needed',
  'donation_poc',
  'rescue_teams',
  'buildings_searched',
  'people_aided',
  'blood_needed',
  'blood_types',
  'updated_at',
  'updated_by',
]

function mergeStatus(base, status) {
  return { ...base, ...emptyStatus(), ...(status || {}) }
}

// Caja geografica de Miranda / Distrito Capital / La Guaira. Sirve de red de
// seguridad para que ubicaciones erroneas (datos malos de OSM fuera de
// Venezuela) nunca aparezcan en el mapa, aunque sigan en la base de datos.
function inRegion(l) {
  const lat = Number(l.lat), lng = Number(l.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= 9.5 && lat <= 11.2 && lng >= -67.6 && lng <= -65.5
}

// ===========================================================================
// MODO DEMO (sin backend) — datos en el navegador
// ===========================================================================
const LS_STATUS = 'mapa_ayuda_status_v1'
const LS_SUBS = 'mapa_ayuda_subs_v1'
const LS_ADMIN = 'mapa_ayuda_admin_v1'
const LS_NEWLOC = 'mapa_ayuda_newloc_v1'
const LS_ADMINREQ = 'mapa_ayuda_adminreq_v1'
// Solo para previsualizar el flujo de admin en modo demo. NO es seguridad real.
const DEMO_ADMIN_PASS = 'admin123'

function lsRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function lsWrite(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}
function uid() {
  return 'sub_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function slugify(s) {
  return (s || 'punto')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'punto'
}

// Construye un objeto de ubicacion a partir de una propuesta de nuevo punto.
function locationFromProposal(proposed, patch, existingIds) {
  let base = slugify((proposed.name || 'punto') + '-' + (proposed.state || ''))
  let id = base
  let n = 2
  while (existingIds.has(id)) id = base + '-' + n++
  return {
    id,
    name: proposed.name,
    kind: proposed.kind || 'otro',
    state: proposed.state || '',
    municipio: proposed.municipio || null,
    lat: Number(proposed.lat),
    lng: Number(proposed.lng),
    ...emptyStatus(),
    ...(patch || {}),
    updated_at: new Date().toISOString(),
  }
}

const demoRepo = {
  async getLocations() {
    const overrides = lsRead(LS_STATUS, {})
    const extra = lsRead(LS_NEWLOC, [])
    const all = [...BASE, ...extra]
    return all.map((b) => mergeStatus(b, overrides[b.id]))
  },
  async createLocation(loc) {
    const extra = lsRead(LS_NEWLOC, [])
    extra.push(loc)
    lsWrite(LS_NEWLOC, extra)
    // Guardamos tambien el estado para que se refleje de inmediato.
    const overrides = lsRead(LS_STATUS, {})
    overrides[loc.id] = loc
    lsWrite(LS_STATUS, overrides)
    return loc
  },
  async updateLocationStatus(id, patch) {
    const overrides = lsRead(LS_STATUS, {})
    const next = { ...(overrides[id] || {}), ...patch, updated_at: new Date().toISOString() }
    overrides[id] = next
    lsWrite(LS_STATUS, overrides)
    return next
  },
  async createSubmission(payload) {
    const subs = lsRead(LS_SUBS, [])
    const sub = {
      id: uid(),
      status: 'pending',
      created_at: new Date().toISOString(),
      ...payload,
    }
    subs.unshift(sub)
    lsWrite(LS_SUBS, subs)
    return sub
  },
  async getSubmissions(status = 'pending') {
    const subs = lsRead(LS_SUBS, [])
    return status ? subs.filter((s) => s.status === status) : subs
  },
  async reviewSubmission(id, action, appliedPatch) {
    const subs = lsRead(LS_SUBS, [])
    const idx = subs.findIndex((s) => s.id === id)
    if (idx >= 0) {
      const sub = subs[idx]
      subs[idx] = { ...sub, status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() }
      lsWrite(LS_SUBS, subs)
      if (action === 'approve') {
        if (sub.new_location && sub.proposed) {
          const ids = new Set([...BASE, ...lsRead(LS_NEWLOC, [])].map((l) => l.id))
          await this.createLocation(locationFromProposal(sub.proposed, appliedPatch, ids))
        } else if (appliedPatch && sub.location_id) {
          await this.updateLocationStatus(sub.location_id, appliedPatch)
        }
      }
    }
    return true
  },
  // --- auth demo ---
  async getSession() {
    const isAdmin = lsRead(LS_ADMIN, false) === true
    // En demo, el admin logueado tambien es super para poder previsualizar
    // el panel de gestion de administradores.
    return { isAdmin, isSuper: isAdmin, pending: false, email: 'admin (demo)' }
  },
  async signIn(_email, password) {
    if (password === DEMO_ADMIN_PASS) {
      lsWrite(LS_ADMIN, true)
      return { ok: true }
    }
    return { ok: false, error: 'Clave incorrecta. En modo demo la clave es: admin123' }
  },
  async signOut() {
    lsWrite(LS_ADMIN, false)
  },
  async requestAccess({ email, full_name, assigned_label } = {}) {
    const reqs = lsRead(LS_ADMINREQ, [])
    reqs.push({
      user_id: uid(),
      email: email || '',
      full_name: full_name || '',
      assigned_label: assigned_label || '',
      assigned_location_id: null,
      status: 'pending',
      is_super: false,
      requested_at: new Date().toISOString(),
    })
    lsWrite(LS_ADMINREQ, reqs)
    return { ok: true, pending: true }
  },
  async listAdminRequests() {
    return lsRead(LS_ADMINREQ, [])
  },
  async reviewAdmin(userId, action, opts = {}) {
    const reqs = lsRead(LS_ADMINREQ, [])
    const idx = reqs.findIndex((r) => r.user_id === userId)
    if (idx >= 0) {
      reqs[idx] = {
        ...reqs[idx],
        status: action === 'approve' ? 'approved' : 'rejected',
        assigned_location_id: opts.assigned_location_id ?? reqs[idx].assigned_location_id,
        assigned_label: opts.assigned_label ?? reqs[idx].assigned_label,
        reviewed_at: new Date().toISOString(),
      }
      lsWrite(LS_ADMINREQ, reqs)
    }
    return { ok: true }
  },
  async resetPassword() {
    return { ok: false, error: 'En modo demo no hay recuperacion de clave. La clave es admin123.' }
  },
  async updatePassword() {
    return { ok: false, error: 'No disponible en modo demo.' }
  },
  onAuthEvent() {
    return () => {}
  },
}

// ===========================================================================
// MODO SUPABASE (backend real)
// ===========================================================================
const supaRepo = {
  async getLocations() {
    const { data, error } = await supabase.from('locations').select('*')
    if (error) throw error
    const rows = data || []
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
    const baseIds = new Set(BASE.map((b) => b.id))
    // El catalogo base define que se muestra; el estado viene de la BD.
    const baseLocs = BASE.map((b) => mergeStatus(b, byId[b.id]))
    // Ubicaciones nuevas creadas en la BD (no presentes en el catalogo base).
    const extraLocs = rows
      .filter((r) => !baseIds.has(r.id))
      .filter(inRegion)
      .map((r) => mergeStatus(r, r))
    return [...baseLocs, ...extraLocs]
  },
  async createLocation(loc) {
    const payload = {
      id: loc.id,
      name: loc.name,
      kind: loc.kind,
      state: loc.state,
      municipio: loc.municipio,
      lat: loc.lat,
      lng: loc.lng,
    }
    for (const k of STATUS_FIELDS) if (k in loc) payload[k] = loc[k]
    const { data, error } = await supabase.from('locations').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async updateLocationStatus(id, patch) {
    const payload = {}
    for (const k of STATUS_FIELDS) if (k in patch) payload[k] = patch[k]
    payload.updated_at = new Date().toISOString()
    const { error } = await supabase.from('locations').update(payload).eq('id', id)
    if (error) throw error
    return payload
  },
  async createSubmission(payload) {
    const { data, error } = await supabase
      .from('submissions')
      .insert({ ...payload, status: 'pending' })
      .select()
      .single()
    if (error) throw error
    return data
  },
  async getSubmissions(status = 'pending') {
    let q = supabase.from('submissions').select('*').order('created_at', { ascending: false })
    if (status) q = q.eq('status', status)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async reviewSubmission(id, action, appliedPatch) {
    const { data: sub, error: e1 } = await supabase
      .from('submissions')
      .update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (e1) throw e1
    if (action === 'approve') {
      if (sub?.new_location && sub?.proposed) {
        const { data: existing } = await supabase.from('locations').select('id')
        const ids = new Set((existing || []).map((r) => r.id).concat(BASE.map((b) => b.id)))
        await this.createLocation(locationFromProposal(sub.proposed, appliedPatch, ids))
      } else if (appliedPatch && sub?.location_id) {
        await this.updateLocationStatus(sub.location_id, appliedPatch)
      }
    }
    return true
  },
  async getSession() {
    const { data } = await supabase.auth.getUser()
    const user = data?.user
    if (!user) return { isAdmin: false, isSuper: false, pending: false, email: null }
    const { data: admin } = await supabase
      .from('admins')
      .select('user_id,status,is_super,assigned_label,assigned_location_id')
      .eq('user_id', user.id)
      .maybeSingle()
    return {
      isAdmin: admin?.status === 'approved',
      isSuper: admin?.status === 'approved' && !!admin?.is_super,
      pending: admin?.status === 'pending',
      rejected: admin?.status === 'rejected',
      assignedLabel: admin?.assigned_label || null,
      assignedLocationId: admin?.assigned_location_id || null,
      email: user.email,
      userId: user.id,
    }
  },
  // Crea la fila de solicitud (pending) si el usuario autenticado pidio acceso
  // al registrarse (marcado en user_metadata) y aun no existe su fila.
  async _ensurePendingRow() {
    const { data } = await supabase.auth.getUser()
    const user = data?.user
    if (!user) return
    const meta = user.user_metadata || {}
    if (!meta.admin_request) return
    const { data: existing } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (existing) return
    await supabase.from('admins').insert({
      user_id: user.id,
      email: user.email,
      full_name: meta.full_name || null,
      assigned_label: meta.assigned_label || null,
      status: 'pending',
      is_super: false,
    })
  },
  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: 'Credenciales incorrectas.' }
    await this._ensurePendingRow()
    const session = await this.getSession()
    if (session.isAdmin) return { ok: true, session }
    if (session.pending) {
      await supabase.auth.signOut()
      return { ok: false, pending: true, error: 'Tu solicitud de acceso esta pendiente de aprobacion por un administrador.' }
    }
    if (session.rejected) {
      await supabase.auth.signOut()
      return { ok: false, error: 'Tu solicitud de acceso fue rechazada.' }
    }
    await supabase.auth.signOut()
    return { ok: false, error: 'Esta cuenta no tiene permisos de administrador.' }
  },
  async signOut() {
    await supabase.auth.signOut()
  },
  // Registro self-service: crea la cuenta y la solicitud de admin (pending).
  async requestAccess({ email, password, full_name, assigned_label }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { admin_request: true, full_name: full_name || '', assigned_label: assigned_label || '' } },
    })
    if (error) return { ok: false, error: error.message || 'No se pudo crear la cuenta.' }
    // Si hay sesion inmediata (sin confirmacion de correo), creamos la fila ya.
    if (data?.session) {
      await this._ensurePendingRow()
      return { ok: true, pending: true }
    }
    // Requiere confirmar el correo antes de poder iniciar sesion.
    return { ok: true, needsConfirm: true }
  },
  // Lista todas las solicitudes/administradores (solo super-admin via RLS).
  async listAdminRequests() {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .order('requested_at', { ascending: true })
    if (error) throw error
    return data || []
  },
  // Aprueba/rechaza una solicitud y asigna (informativo) su centro.
  async reviewAdmin(userId, action, { assigned_location_id, assigned_label } = {}) {
    const patch = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
    }
    if (assigned_location_id !== undefined) patch.assigned_location_id = assigned_location_id
    if (assigned_label !== undefined) patch.assigned_label = assigned_label
    const { error } = await supabase.from('admins').update(patch).eq('user_id', userId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  },
  async resetPassword(email) {
    const redirectTo =
      typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) return { ok: false, error: 'No se pudo enviar el correo. Verifica la direccion.' }
    return { ok: true }
  },
  async updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { ok: false, error: error.message || 'No se pudo actualizar la clave.' }
    return { ok: true }
  },
  // Notifica eventos de auth (p.ej. PASSWORD_RECOVERY al volver del correo).
  onAuthEvent(cb) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session))
    return () => data.subscription.unsubscribe()
  },
}

export const repo = IS_DEMO ? demoRepo : supaRepo
export { IS_DEMO }
