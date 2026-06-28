import { useState } from 'react'
import { repo } from '../lib/repository'

export default function ResetPassword({ onClose, onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('La clave debe tener al menos 6 caracteres.')
    if (password !== confirm) return setError('Las claves no coinciden.')
    setBusy(true)
    const res = await repo.updatePassword(password)
    setBusy(false)
    if (res.ok) {
      setOk(true)
      onDone && onDone()
    } else {
      setError(res.error || 'No se pudo actualizar la clave.')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>Crear nueva clave</h2>
          <button className="panel__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          {ok ? (
            <div className="form">
              <div className="notice notice--ok">✅ Tu clave fue actualizada. Ya puedes usarla para iniciar sesión.</div>
              <button className="btn btn--primary btn--block" onClick={onClose}>Listo</button>
            </div>
          ) : (
            <form className="form" onSubmit={submit}>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                Estás restableciendo tu clave de administrador. Escribe una nueva.
              </p>
              <label>Nueva clave</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <label>Confirmar nueva clave</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              {error && <div className="notice notice--err">{error}</div>}
              <button className="btn btn--primary btn--block" style={{ marginTop: 14 }} disabled={busy}>
                {busy ? 'Guardando…' : 'Guardar nueva clave'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
