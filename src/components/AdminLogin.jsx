import { useState } from 'react'
import { repo, IS_DEMO } from '../lib/repository'

export default function AdminLogin({ onClose, onLoggedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await repo.signIn(email.trim(), password)
    setBusy(false)
    if (res.ok) onLoggedIn()
    else setError(res.error || 'No se pudo iniciar sesion.')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>Acceso de administrador</h2>
          <button className="panel__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          <form className="form" onSubmit={submit}>
            {!IS_DEMO && (
              <>
                <label>Correo</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </>
            )}
            <label>Clave</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {IS_DEMO && <p className="hint">Modo demo: la clave es <strong>admin123</strong>.</p>}
            {error && <div className="notice notice--err">{error}</div>}
            <button className="btn btn--primary btn--block" style={{ marginTop: 14 }} disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
