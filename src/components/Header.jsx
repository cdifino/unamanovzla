import { IS_DEMO } from '../lib/repository'

export default function Header({ session, onAdminClick, onSignOut, onManageAdmins, onNewPoint, onDonate, onToggleFeed, feedOpen }) {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo" aria-hidden>🤝</span>
        <div>
          <div className="header__title">Mapa de ayuda</div>
          <div className="header__subtitle">Respuesta al terremoto en Venezuela del 24 de junio · Miranda · Distrito Capital · La Guaira</div>
        </div>
      </div>
      <div className="header__spacer" />
      <button className={'header__btn' + (feedOpen ? ' header__btn--active' : '')} onClick={onToggleFeed}>🕒 Actualizaciones</button>
      <button className="header__btn" onClick={onDonate}>🎁 Quiero donar</button>
      <button className="header__btn" onClick={onNewPoint}>➕ Reportar punto</button>
      {IS_DEMO && <span className="badge-demo" title="Sin backend configurado: los datos viven en este navegador.">MODO DEMO</span>}
      {session?.isAdmin ? (
        <>
          <button className="header__btn" onClick={onAdminClick}>Revisar reportes</button>
          {session.isSuper && <button className="header__btn" onClick={onManageAdmins}>Administradores</button>}
          <button className="header__btn" onClick={onSignOut}>Salir</button>
        </>
      ) : (
        <button className="header__btn" onClick={onAdminClick}>Admin</button>
      )}
    </header>
  )
}
