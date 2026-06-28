import { useState } from 'react'
import { repo, IS_DEMO } from '../lib/repository'

export default function AdminLogin({ onClose, onLoggedIn }) {
  const [mode, setMode] = useState('login') // 'login' | 'forgot' | 'request'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [center, setCenter] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  function go(next) {
    setMode(next)
    setError('')
    setInfo('')
  }

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

  async function sendRequest(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    const res = await repo.requestAccess({
      email: email.trim(),
      password,
      full_name: name.trim(),
      assigned_label: center.trim(),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error || 'No se pudo enviar la solicitud.')
      return
    }
    if (res.needsConfirm) {
      setInfo('¡Solicitud creada! Primero confirma tu correo con el enlace que te enviamos y luego inicia sesión. Un administrador revisará tu acceso.')
    } else {
      setInfo('¡Solicitud enviada! Un administrador la revisará y aprobará tu acceso. Te avisaremos por correo.')
    }
  }

  const title =
    mode === 'forgot' ? 'Recuperar clave' :
    mode === 'request' ? 'Solicitar acceso de administrador' :
    'Acceso de administrador'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>{title}</h2>
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
              {info && <div className="notice notice--ok">{info}</div>}
              {error && <div className="notice notice--err">{error}</div>}
              <button className="btn btn--primary btn--block" style={{ marginTop: 14 }} disabled={busy}>
                {busy ? 'Entrando…' : 'Entrar'}
              </button>
              {!IS_DEMO && (
                <>
                  <button type="button" className="linkbtn" style={{ display: 'block', margin: '12px auto 0' }} onClick={() => go('forgot')}>
                    ¿Olvidaste tu contraseña?
                  </button>
                  <button type="button" className="linkbtn" style={{ display: 'block', margin: '8px auto 0' }} onClick={() => go('request')}>
                    ¿Coordinas un centro u hospital? Solicita acceso
                  </button>
                </>
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
              <button type="button" className="linkbtn" style={{ display: 'block', margin: '12px auto 0' }} onClick={() => go('login')}>
                ← Volver al inicio de sesión
              </button>
            </form>
          )}

          {mode === 'request' && (
            <form className="form" onSubmit={sendRequest}>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                Crea tu cuenta para ayudar a mantener la información actualizada. Tu acceso queda
                pendiente hasta que un administrador lo apruebe.
              </p>
              <label>Nombre y apellido</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              <label>Centro u hospital que coordinas</label>
              <input
                type="text"
                value={center}
                onChange={(e) => setCenter(e.target.value)}
                placeholder="Ej.: Hospital Pérez Carreño / Parroquia Sucre"
                required
              />
              <label>Correo</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <label>Crea una clave</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              {info && <div className="notice notice--ok">{info}</div>}
              {error && <div className="notice notice--err">{error}</div>}
              <button className="btn btn--primary btn--block" style={{ marginTop: 14 }} disabled={busy}>
                {busy ? 'Enviando…' : 'Solicitar acceso'}
              </button>
              <button type="button" className="linkbtn" style={{ display: 'block', margin: '12px auto 0' }} onClick={() => go('login')}>
                ← Ya tengo cuenta, iniciar sesión
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
