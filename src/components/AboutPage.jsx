import Icon from './Icons'
import WhatsAppCta from './WhatsAppCta'
import { useI18n } from '../lib/i18n'

const POINT_TYPES = [
  { icon: 'hospital', es: 'Hospitales', en: 'Hospitals' },
  { icon: 'box', es: 'Centros de acopio', en: 'Collection centers' },
  { icon: 'home', es: 'Refugios', en: 'Shelters' },
  { icon: 'users', es: 'Organizaciones comunitarias', en: 'Community organizations' },
  { icon: 'shield', es: 'Equipos de rescate', en: 'Rescue teams' },
  { icon: 'plus', es: 'Centros médicos', en: 'Medical centers' },
  { icon: 'pin', es: 'Otros puntos de apoyo', en: 'Other support points' },
]

const HELP_ICONS = ['edit', 'clock', 'gift', 'globe', 'users']

export default function AboutPage({ onReport }) {
  const { t, lang } = useI18n()
  const steps = [t('about.how1'), t('about.how2'), t('about.how3'), t('about.how4'), t('about.how5')]
  const helpItems = [t('about.help1'), t('about.help2'), t('about.help3'), t('about.help4'), t('about.help5')]

  return (
    <div className="page page--about">
      <div className="about">
        <header className="about__hero">
          <span className="about__badge">
            <span className="about__badge-dot" aria-hidden />
            {t('quake.badge')}
          </span>
          <h1 className="about__title">{t('about.title')}</h1>
          <span className="about__underline" aria-hidden />
          <p className="about__subtitle">{t('about.subtitle')}</p>
          <p className="about__quake">
            <Icon name="alert" size={18} />
            <span>{t('quake.context')}</span>
          </p>
        </header>

        <section className="about__body">
          <p>{t('about.p1')}</p>
          <p>{t('about.p2')}</p>
          <p>{t('about.p3')}</p>
          <p>{t('about.p4')}</p>
        </section>

        <section className="about__section">
          <h2 className="about__h2">{t('about.how')}</h2>
          <ol className="about__steps">
            {steps.map((step, i) => (
              <li key={i} className="about__step">
                <span className="about__step-num">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="about__section">
          <h2 className="about__h2">{t('about.types')}</h2>
          <div className="about__types">
            {POINT_TYPES.map((pt) => (
              <div key={pt.icon} className="about__type">
                <span className="about__type-icon"><Icon name={pt.icon} size={20} /></span>
                <span>{lang === 'en' ? pt.en : pt.es}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about__section">
          <h2 className="about__h2">{t('about.help')}</h2>
          <div className="about__types">
            {helpItems.map((item, i) => (
              <div key={i} className="about__type">
                <span className="about__type-icon"><Icon name={HELP_ICONS[i]} size={20} /></span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <WhatsAppCta onReport={onReport} />
      </div>
    </div>
  )
}
