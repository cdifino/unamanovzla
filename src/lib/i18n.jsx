import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const LS_LANG = 'mapa_ayuda_lang'

// Diccionario de traducciones para las superficies publicas de la app.
// Las claves faltantes en un idioma caen al texto en espanol.
const DICT = {
  es: {
    'nav.map': 'Mapa',
    'nav.directory': 'Puntos de ayuda',
    'nav.donate': 'Donar',
    'nav.updates': 'Actualizaciones',
    'nav.report': 'Agregar un nuevo punto',
    'nav.about': '¿Qué es Una Mano?',
    'nav.subtitle': 'Coordinando la ayuda en Venezuela',
    'nav.review': 'Revisar',
    'nav.team': 'Equipo',
    'nav.signout': 'Salir',
    'nav.admin': 'Admin',
    'nav.reviewReports': 'Revisar reportes',
    'nav.admins': 'Administradores',
    'nav.home': 'Inicio',
    'nav.openMenu': 'Abrir menú',
    'nav.closeMenu': 'Cerrar menú',
    'nav.mainNav': 'Navegación principal',

    'hero.title': 'Conectando a Venezuela cuando más lo necesita',
    'hero.subtitle': 'Conectando necesidades, recursos y apoyo con la información más actualizada posible.',
    'hero.explore': 'Explorar el mapa',
    'hero.report': 'Reportar un punto',
    'hero.note': 'El mapa se actualiza con la información que reporta y verifica la comunidad. Ayúdanos a mantenerlo al día.',
    'hero.stat.points': 'Puntos registrados',
    'hero.stat.verified': 'Puntos verificados',
    'hero.stat.recent': 'Actualizaciones recientes',
    'hero.stat.active': 'Centros activos',

    'dir.title': 'Puntos de ayuda',
    'dir.lead': 'Directorio de hospitales, refugios y centros de acopio registrados en el mapa.',
    'dir.search': 'Buscar por nombre, estado o municipio…',
    'dir.allKinds': 'Todos los tipos',
    'dir.allStates': 'Todos los estados',
    'dir.count': 'puntos',
    'dir.empty': 'No se encontraron puntos con esos filtros.',

    'about.title': '¿Qué es Una Mano?',
    'about.subtitle': 'Conectamos las donaciones con los lugares que más las necesitan durante emergencias en Venezuela.',
    'about.p1': 'Una Mano existe para una sola cosa: que tu donación llegue al lugar donde más hace falta. Conectamos a donantes con hospitales, refugios y centros de acopio según lo que cada lugar necesita en este momento.',
    'about.p2': 'Aquí puedes encontrar hospitales, centros de acopio, refugios y otros puntos de apoyo que necesitan recursos o están brindando ayuda.',
    'about.p3': 'Nuestro objetivo es que la información llegue más rápido, que las donaciones lleguen al lugar correcto y que las comunidades puedan coordinarse de forma más efectiva cuando más lo necesitan.',
    'about.p4': 'La información publicada es revisada por administradores y actualizada por la comunidad para mantener el mapa lo más útil y confiable posible.',
    'about.how': '¿Cómo funciona?',
    'about.how1': 'Organizaciones y ciudadanos reportan información.',
    'about.how2': 'Los administradores verifican los datos.',
    'about.how3': 'Los puntos aprobados aparecen en el mapa.',
    'about.how4': 'Los centros de ayuda pueden actualizar sus necesidades y recursos disponibles.',
    'about.how5': 'Donantes y voluntarios pueden identificar dónde apoyar.',
    'about.types': 'Tipos de puntos',
    'about.help': '¿Quieres ayudar?',
    'about.help1': 'Reporta información',
    'about.help2': 'Actualiza un punto existente',
    'about.help3': 'Dona recursos',
    'about.help4': 'Comparte el mapa',
    'about.help5': 'Únete como voluntario',
    'about.reportCta': 'Reportar un punto',

    'wa.title': 'Reporta por WhatsApp',
    'wa.desc': 'Pronto podrás enviar reportes y actualizaciones directamente por WhatsApp. Por ahora, usa el botón Reportar del mapa.',
    'wa.button': 'Escribir por WhatsApp',
    'wa.alt': 'Prefiero usar el formulario',
    'wa.soon': 'Integración de WhatsApp próximamente',

    'legend.title': 'Nivel de gravedad',
    'legend.toggle': 'Leyenda',
    'legend.kindTitle': 'Tipo de punto',
    'legend.parroquia': 'Parroquia',
    'legend.hospital': 'Hospital',
    'legend.otro': 'Otro punto',

    'intro.text': 'En respuesta a los terremotos del 24 de junio de 2026, Una Mano coordina ayuda en Venezuela. La información es reportada por la comunidad y revisada por administradores.',
    'intro.dismiss': 'Cerrar',
    'quake.badge': 'Terremotos · 24 jun 2026',
    'quake.context': 'Esta plataforma se creó en respuesta a los terremotos del 24 de junio de 2026 en Venezuela, para coordinar ayuda en las zonas afectadas.',

    'mstat.points': 'puntos',
    'mstat.verified': 'verificados',
    'mstat.updates': 'actualizaciones',
    'mstat.active': 'centros activos',
    'map.info': 'Aviso sobre la información',
    'map.report': 'Reportar un punto',

    'donate.title': 'Donar',
    'donate.mode1': 'Tengo algo para donar',
    'donate.mode2': 'Quiero ayudar a un lugar',
    'donate.haveLabel': '¿Qué puedes donar?',
    'donate.otherPlaceholder': 'Especifica qué más puedes donar',
    'donate.emptyHave': 'Selecciona lo que puedes donar para ver lugares que lo necesitan.',
    'donate.noMatches': 'No encontramos lugares que hayan registrado necesidad de eso por ahora.',
    'donate.resultsCount': 'lugares necesitan lo que puedes donar',
    'donate.resultsCount1': 'lugar necesita lo que puedes donar',
    'donate.youCanFill': 'Puedes cubrir:',
    'donate.otherNeeds': 'También necesita:',
    'donate.howToDonate': 'Cómo donar',
    'donate.donateHere': 'Donar a este lugar',
    'donate.searchLabel': 'Busca o explora puntos de ayuda',
    'donate.searchPlaceholder': 'Buscar por nombre, estado o municipio…',
    'donate.browseEmpty': 'No se encontraron puntos con esa búsqueda.',
    'donate.viewMap': 'Ver en el mapa',
    'donate.distance': 'a {d} km',
    'donate.useLocation': 'Usar mi ubicación para ordenar por cercanía',
    'donate.back': 'Volver a la lista',
    'donate.noContact': 'Aún no hay información de contacto. Confirma antes de movilizar la donación.',

    'disclaimer.text': 'Información colaborativa, aportada por la comunidad y revisada por administradores. Puede no estar verificada en tiempo real: confirma con el contacto del lugar antes de movilizar recursos o donaciones.',
    'disclaimer.close': 'Cerrar aviso',

    'common.close': 'Cerrar',
    'common.back': 'Volver',
    'common.loading': 'Cargando…',

    'verif.verificado': 'Verificado',
    'verif.pendiente': 'Pendiente de verificar',
    'verif.sin_actualizar': 'Sin actualizar',

    'profile.timeline': 'Bitácora de actualizaciones',
    'profile.noUpdates': 'Aún no hay actualizaciones publicadas para este punto.',
    'profile.contact': 'Contacto',
    'profile.phone': 'Teléfono',
    'profile.whatsapp': 'WhatsApp',
    'profile.email': 'Correo',
    'profile.website': 'Sitio web',
    'profile.address': 'Dirección',
    'profile.needs': 'Necesidades',
    'profile.resources': 'Recursos disponibles',
    'profile.donations': '¿Dónde enviar donaciones?',
    'profile.noDonationPoc': 'Aún no se ha registrado un punto de entrega para esta ubicación.',
    'profile.situation': 'Situación',
    'profile.supplies': 'Suministros necesarios',
    'profile.sendUpdate': 'Enviar una actualización',
    'profile.adminEdit': 'Editar y publicar (admin)',
    'profile.adminNotice': 'Edición directa de administrador. Los cambios se publican de inmediato.',
    'profile.postUpdate': 'Publicar actualización',
    'profile.updateBody': 'Escribe la actualización…',
    'profile.publish': 'Publicar',
    'profile.publishChanges': 'Publicar cambios',
    'profile.delete': 'Eliminar',
    'profile.cancel': 'Cancelar',
    'profile.updatedAt': 'Actualizado',
    'profile.noInfo': 'Sin información aún',
    'profile.severity': 'Nivel de gravedad',
    'profile.verification': 'Estado de verificación',
    'profile.rescue': 'Equipos de rescate / quién ayuda',
    'profile.buildings': 'Edificaciones en búsqueda de personas',
    'profile.peopleAided': 'Personas atendidas por el desastre',
    'profile.bloodNeeded': 'Se necesitan donaciones de sangre',
    'profile.bloodTypes': 'Tipos de sangre necesarios',
    'profile.donationPoc': 'Punto de entrega de donaciones',
  },
  en: {
    'nav.map': 'Map',
    'nav.directory': 'Help points',
    'nav.donate': 'Donate',
    'nav.updates': 'Updates',
    'nav.report': 'Add a new point',
    'nav.about': 'What is Una Mano?',
    'nav.subtitle': 'Coordinating aid in Venezuela',
    'nav.review': 'Review',
    'nav.team': 'Team',
    'nav.signout': 'Sign out',
    'nav.admin': 'Admin',
    'nav.reviewReports': 'Review reports',
    'nav.admins': 'Administrators',
    'nav.home': 'Home',
    'nav.openMenu': 'Open menu',
    'nav.closeMenu': 'Close menu',
    'nav.mainNav': 'Main navigation',

    'hero.title': 'Connecting Venezuela when it matters most',
    'hero.subtitle': 'Connecting needs, resources and support with the most up-to-date information possible.',
    'hero.explore': 'Explore the map',
    'hero.report': 'Report a point',
    'hero.note': 'The map is updated with information reported and verified by the community. Help us keep it current.',
    'hero.stat.points': 'Registered points',
    'hero.stat.verified': 'Verified points',
    'hero.stat.recent': 'Recent updates',
    'hero.stat.active': 'Active centers',

    'dir.title': 'Help points',
    'dir.lead': 'Directory of hospitals, shelters and collection centers registered on the map.',
    'dir.search': 'Search by name, state or municipality…',
    'dir.allKinds': 'All types',
    'dir.allStates': 'All states',
    'dir.count': 'points',
    'dir.empty': 'No points found with those filters.',

    'about.title': 'What is Una Mano?',
    'about.subtitle': 'We route donations to the places that need them most during emergencies in Venezuela.',
    'about.p1': 'Una Mano exists for one thing: to get your donation to the place where it is needed most. We connect donors with hospitals, shelters and collection centers based on what each place needs right now.',
    'about.p2': 'Here you can find hospitals, collection centers, shelters and other support points that need resources or are providing aid.',
    'about.p3': 'Our goal is for information to arrive faster, for donations to reach the right place, and for communities to coordinate more effectively when they need it most.',
    'about.p4': 'Published information is reviewed by administrators and updated by the community to keep the map as useful and reliable as possible.',
    'about.how': 'How does it work?',
    'about.how1': 'Organizations and citizens report information.',
    'about.how2': 'Administrators verify the data.',
    'about.how3': 'Approved points appear on the map.',
    'about.how4': 'Help centers can update their needs and available resources.',
    'about.how5': 'Donors and volunteers can identify where to help.',
    'about.types': 'Point types',
    'about.help': 'Want to help?',
    'about.help1': 'Report information',
    'about.help2': 'Update an existing point',
    'about.help3': 'Donate resources',
    'about.help4': 'Share the map',
    'about.help5': 'Join as a volunteer',
    'about.reportCta': 'Report a point',

    'wa.title': 'Report via WhatsApp',
    'wa.desc': 'Soon you will be able to send reports and updates directly via WhatsApp. For now, use the Report button on the map.',
    'wa.button': 'Message on WhatsApp',
    'wa.alt': 'I prefer to use the form',
    'wa.soon': 'WhatsApp integration coming soon',

    'legend.title': 'Severity level',
    'legend.toggle': 'Legend',
    'legend.kindTitle': 'Point type',
    'legend.parroquia': 'Parish',
    'legend.hospital': 'Hospital',
    'legend.otro': 'Other point',

    'intro.text': 'In response to the earthquakes of 24 June 2026, Una Mano coordinates aid in Venezuela. Information is reported by the community and reviewed by administrators.',
    'intro.dismiss': 'Close',
    'quake.badge': 'Earthquakes · 24 Jun 2026',
    'quake.context': 'This platform was created in response to the earthquakes of 24 June 2026 in Venezuela, to coordinate aid in the affected areas.',

    'mstat.points': 'points',
    'mstat.verified': 'verified',
    'mstat.updates': 'updates',
    'mstat.active': 'active centers',
    'map.info': 'Information notice',
    'map.report': 'Report a point',

    'donate.title': 'Donate',
    'donate.mode1': 'I have something to donate',
    'donate.mode2': 'I want to help a place',
    'donate.haveLabel': 'What can you donate?',
    'donate.otherPlaceholder': 'Specify what else you can donate',
    'donate.emptyHave': 'Select what you can donate to see places that need it.',
    'donate.noMatches': 'We could not find any place that has registered a need for that yet.',
    'donate.resultsCount': 'places need what you can donate',
    'donate.resultsCount1': 'place needs what you can donate',
    'donate.youCanFill': 'You can fill:',
    'donate.otherNeeds': 'Also needs:',
    'donate.howToDonate': 'How to donate',
    'donate.donateHere': 'Donate to this place',
    'donate.searchLabel': 'Search or browse help points',
    'donate.searchPlaceholder': 'Search by name, state or municipality…',
    'donate.browseEmpty': 'No points found with that search.',
    'donate.viewMap': 'View on map',
    'donate.distance': '{d} km away',
    'donate.useLocation': 'Use my location to sort by proximity',
    'donate.back': 'Back to list',
    'donate.noContact': 'No contact information yet. Confirm before mobilizing the donation.',

    'disclaimer.text': 'Collaborative information, contributed by the community and reviewed by administrators. It may not be verified in real time: confirm with the location contact before mobilizing resources or donations.',
    'disclaimer.close': 'Dismiss notice',

    'common.close': 'Close',
    'common.back': 'Back',
    'common.loading': 'Loading…',

    'verif.verificado': 'Verified',
    'verif.pendiente': 'Pending verification',
    'verif.sin_actualizar': 'Not updated',

    'profile.timeline': 'Updates timeline',
    'profile.noUpdates': 'No updates have been published for this point yet.',
    'profile.contact': 'Contact',
    'profile.phone': 'Phone',
    'profile.whatsapp': 'WhatsApp',
    'profile.email': 'Email',
    'profile.website': 'Website',
    'profile.address': 'Address',
    'profile.needs': 'Needs',
    'profile.resources': 'Available resources',
    'profile.donations': 'Where to send donations?',
    'profile.noDonationPoc': 'No drop-off point has been registered for this location yet.',
    'profile.situation': 'Situation',
    'profile.supplies': 'Supplies needed',
    'profile.sendUpdate': 'Send an update',
    'profile.adminEdit': 'Edit and publish (admin)',
    'profile.adminNotice': 'Direct admin editing. Changes are published immediately.',
    'profile.postUpdate': 'Post update',
    'profile.updateBody': 'Write the update…',
    'profile.publish': 'Publish',
    'profile.publishChanges': 'Publish changes',
    'profile.delete': 'Delete',
    'profile.cancel': 'Cancel',
    'profile.updatedAt': 'Updated',
    'profile.noInfo': 'No information yet',
    'profile.severity': 'Severity level',
    'profile.verification': 'Verification status',
    'profile.rescue': 'Rescue teams / who is helping',
    'profile.buildings': 'Buildings being searched',
    'profile.peopleAided': 'People being treated',
    'profile.bloodNeeded': 'Blood donations needed',
    'profile.bloodTypes': 'Blood types needed',
    'profile.donationPoc': 'Donation drop-off point',
  },
}

const I18nContext = createContext({ lang: 'es', t: (k) => k, toggle: () => {}, setLang: () => {} })

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('es')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_LANG)
      if (saved === 'es' || saved === 'en') setLang(saved)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LS_LANG, lang)
    } catch {}
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  const t = useCallback(
    (key) => (DICT[lang] && DICT[lang][key]) ?? DICT.es[key] ?? key,
    [lang],
  )
  const toggle = useCallback(() => setLang((l) => (l === 'es' ? 'en' : 'es')), [])

  return (
    <I18nContext.Provider value={{ lang, t, toggle, setLang }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
