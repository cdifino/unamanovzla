import { useState } from 'react'
import { repo, IS_DEMO } from '../lib/repository'

export default function AdminLogin({ onClose, onLoggedIn }) {
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
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

  async function sendReset(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    const res = await repo.resetPassword(email.trim())
    setBusy(false)
    if (res.ok) setInfo('Si el correo existe, te enviamos un enlace para restablecer tu clave. Revisa tu bandeja (y spam).')
    else setError(res.error || 'No se pudo enviar el correo.')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>{mode === 'forgot' ? 'Recuperar clave' : 'Acceso de administrador'}</h2>
          <button className="panel__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          {mode === 'login' && (
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
              {!IS_DEMO && (
                <button
                  type="button"
                  className="linkbtn"
                  style={{ display: 'block', margin: '12px auto 0' }}
                  onClick={() => { setMode('forgot'); setError(''); setInfo('') }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </form>
          )}

          {mode === 'forgot' && (
            <form className="form" onSubmit={sendReset}>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                Escribe tu correo de administrador y te enviaremos un enlace para crear una nueva clave.
              </p>
              <label>Correo</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {info && <div className="notice notice--ok">{info}</div>}
              {error && <div className="notice notice--err">{error}</div>}
              <button className="btn btn--primary btn--block" style={{ marginTop: 14 }} disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </button>
              <button
                type="button"
                className="linkbtn"
                style={{ display: 'block', margin: '12px auto 0' }}
                onClick={() => { setMode('login'); setError(''); setInfo('') }}
              >
                ← Volver al inicio de sesión
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
