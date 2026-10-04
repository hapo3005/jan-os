import Link from "next/link";
import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FolderKanban,
  Heart,
  Home,
  LayoutGrid,
  Mail,
  Menu,
  NotebookText,
  Search,
  Sparkles,
  Target,
  WalletCards
} from "lucide-react";
import { LiveClock } from "@/components/LiveClock";
import { attentionItems, projects } from "@/data/dashboard";

const nav = [
  { label: "Home", href: "/", icon: Home, active: true },
  { label: "Leben", href: "/leben", icon: Heart },
  { label: "Gesundheit & Fitness", href: "/gesundheit", icon: Activity },
  { label: "Finanzen", href: "/finanzen", icon: CircleDollarSign },
  { label: "KISS", href: "/kiss", icon: LayoutGrid },
  { label: "Projekte", href: "/projekte", icon: FolderKanban },
  { label: "Ziele", href: "/ziele", icon: Target }
];

const utilityNav = [
  { label: "Kalender", href: "/kalender", icon: CalendarDays },
  { label: "Notizen", href: "/notizen", icon: NotebookText },
  { label: "Wissen", href: "/wissen", icon: Sparkles },
  { label: "Tools", href: "/tools", icon: WalletCards }
];

export default function HomePage() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">JAN OS</div>

        <nav className="nav-list" aria-label="Hauptnavigation">
          {nav.map(({ label, href, icon: Icon, active }) => (
            <Link
              key={label}
              href={href}
              className={active ? "nav-item active" : "nav-item"}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-divider" />

        <nav className="nav-list utility" aria-label="Werkzeuge">
          {utilityNav.map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className="nav-item">
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="profile">
          <div className="avatar">J</div>
          <div>
            <strong>Jan</strong>
            <span>Fokus. Fortschritt. Überblick.</span>
          </div>
        </div>
      </aside>

      <section className="content" id="top">
        <header className="topbar">
          <div className="mobile-brand">JAN OS</div>
          <div className="clock"><LiveClock /></div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Suchen"><Search size={18} /></button>
            <button className="icon-button notification" aria-label="Benachrichtigungen">
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
            <button className="icon-button mobile-menu" aria-label="Menü"><Menu size={19} /></button>
          </div>
        </header>

        <section className="hero">
          <div className="hero-glow" />
          <p className="eyebrow">DEIN LEBEN. DEINE PROJEKTE. EIN SYSTEM.</p>
          <h1>Guten Morgen, Jan.</h1>
          <p className="hero-copy">
            Alles Wichtige an einem Ort – fokussiert auf das, was als Nächstes zählt.
          </p>

          <Link href="/tag" className="hero-day-button">
            <span className="hero-day-icon"><CalendarDays size={19} /></span>
            <span>
              <strong>Mein Tag</strong>
              <small>Termine, Aufgaben, Menschen & Hinweise für heute</small>
            </span>
            <ChevronRight size={18} />
          </Link>

          <div className="hero-meta">
            <span className="status-chip"><span /> System im Aufbau</span>
            <span className="status-chip muted">Demo-Daten aktiv</span>
          </div>
        </section>

        <section className="attention-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Fokus</span>
              <h2>3 Dinge brauchen deine Aufmerksamkeit</h2>
            </div>
            <button className="text-button">Alle ansehen <ChevronRight size={17} /></button>
          </div>

          <div className="attention-grid">
            {attentionItems.map((item) => (
              <article className="attention-card" key={item.title}>
                <span className={`status-dot ${item.tone}`} />
                <div className="attention-icon">
                  <CheckCircle2 size={19} strokeWidth={1.8} />
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </div>
                <ChevronRight className="card-chevron" size={17} />
              </article>
            ))}
          </div>
        </section>

        <section className="summary-grid">
          <article className="panel today-panel">
            <div className="panel-head">
              <div>
                <span className="section-kicker">Tagesfokus</span>
                <h3>Heute</h3>
              </div>
              <span className="panel-meta">Live</span>
            </div>

            <div className="today-layout">
              <div className="metric-list">
                <div className="metric-row">
                  <CheckCircle2 size={18} />
                  <span>3 Aufgaben</span>
                  <div className="mini-progress"><i style={{ width: "34%" }} /></div>
                  <strong>1/3</strong>
                </div>
                <div className="metric-row">
                  <CalendarDays size={18} />
                  <span>1 Fokusblock</span>
                  <small>geplant</small>
                </div>
                <div className="metric-row">
                  <Mail size={18} />
                  <span>2 offene Entscheidungen</span>
                  <ChevronRight size={16} />
                </div>
              </div>

              <div className="day-score" aria-label="Tagesfortschritt 67 Prozent">
                <div className="score-ring"><strong>67%</strong><span>Tagesziel</span></div>
              </div>
            </div>
          </article>

          <article className="panel week-panel">
            <div className="panel-head">
              <div>
                <span className="section-kicker">Überblick</span>
                <h3>Diese Woche</h3>
              </div>
              <span className="panel-meta">KW</span>
            </div>

            <div className="week-layout">
              <div className="week-metrics">
                <div><span>Deadlines</span><i><b style={{ width: "40%" }} /></i><strong>2/5</strong></div>
                <div><span>Termine</span><i><b style={{ width: "50%" }} /></i><strong>3/6</strong></div>
                <div><span>Meilensteine</span><i><b style={{ width: "25%" }} /></i><strong>1/4</strong></div>
              </div>

              <div className="week-chart" aria-label="Wochenaktivität">
                {[34, 49, 58, 42, 66, 88, 53].map((height, index) => (
                  <div className="bar-wrap" key={index}>
                    <i className={index === 5 ? "bar active" : "bar"} style={{ height: `${height}%` }} />
                    <span>{["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][index]}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>

        <section className="module-strip" id="modules">
          {nav.slice(1).map(({ label, href, icon: Icon }) => (
            <Link href={href} key={label}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </section>

        <section className="projects-section" id="projects">
          <div className="section-heading compact">
            <div>
              <span className="section-kicker">Projektzentrale</span>
              <h2>Aktive Bereiche</h2>
            </div>
            <Link className="text-button" href="/projekte">Projektübersicht <ChevronRight size={17} /></Link>
          </div>

          <div className="projects-grid">
            {projects.map((project, index) => (
              <article className="project-card" key={project.title}>
                <div className="project-top">
                  <div className={`project-mark mark-${index + 1}`}>
                    <FolderKanban size={20} />
                  </div>
                  <span>{project.status}</span>
                  <ChevronRight size={17} />
                </div>
                <h3>{project.title}</h3>
                <p>{project.subtitle}</p>
                <div className="project-progress">
                  <i><b style={{ width: `${project.progress}%` }} /></i>
                  <strong>{project.progress}%</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="next-action">
          <div>
            <span className="section-kicker">JAN OS entscheidet nicht für dich – es sortiert vor.</span>
            <h2>Was machen wir jetzt?</h2>
            <p>Prioritäten werden später aus Aufgaben, Terminen, Zielen und Projektstatus abgeleitet.</p>
          </div>
          <button className="primary-button">Nächsten Fokus anzeigen <ChevronRight size={18} /></button>
        </section>

        <footer>
          <span>JAN OS · Foundation 0.1</span>
          <span>Code + Demo-Daten · keine persönlichen Live-Daten</span>
        </footer>
      </section>
    </main>
  );
}
