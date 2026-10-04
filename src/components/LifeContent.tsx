import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  Home,
  Lightbulb,
  Plane,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Users,
  Wrench
} from "lucide-react";
import { SocialCircle } from "./SocialCircle";

const overview = [
  { value: "4", label: "offene private Dinge" },
  { value: "2", label: "gemeinsame Themen" },
  { value: "1", label: "wartet auf Antwort" },
  { value: "1", label: "nächster wichtiger Termin" }
];

const todayItems = [
  { title: "Private Priorität festlegen", meta: "Heute", tone: "blue" },
  { title: "Offenen Rückruf erledigen", meta: "Offen", tone: "amber" },
  { title: "Gemeinsamen Punkt abstimmen", meta: "Gemeinsam", tone: "green" }
];

const lifeAreas = [
  {
    title: "Gemeinsam & Familie",
    description: "Gemeinsame Vorhaben, wichtige Anlässe, Familienkontakte und Dinge, die ihr zusammen erledigen wollt.",
    meta: "2 aktive Themen",
    icon: Users
  },
  {
    title: "Wohnen & Haushalt",
    description: "Anschaffungen, Reparaturen, Einrichtung und alles, was zuhause organisiert werden muss.",
    meta: "3 offene Punkte",
    icon: Home
  },
  {
    title: "Organisation & Papierkram",
    description: "Behörden, Versicherungen, Verträge, Fristen, Dokumente und Vorgänge, bei denen noch etwas fehlt.",
    meta: "1 wartet auf Antwort",
    icon: FileText
  },
  {
    title: "Mobilität & Reisen",
    description: "Auto-Themen, Werkstatt, Buchungen, Reisevorbereitung und private Mobilität im Überblick.",
    meta: "Planung",
    icon: Plane
  },
  {
    title: "Wiederkehrendes",
    description: "Regelmäßige Aufgaben und jährliche Dinge, die rechtzeitig auftauchen sollen – ohne Dauer-To-do-Liste.",
    meta: "Automatisierbar",
    icon: RefreshCw
  },
  {
    title: "Merkliste & kleine Vorhaben",
    description: "Ideen, Wünsche und Dinge, die noch kein eigenes Projekt brauchen, aber nicht verloren gehen dürfen.",
    meta: "Inbox",
    icon: Lightbulb
  }
];

const upcoming = [
  { title: "Private Frist", when: "in 4 Tagen", icon: CalendarClock },
  { title: "Gemeinsame Planung", when: "diese Woche", icon: Users },
  { title: "Besorgung / Anschaffung", when: "bei Gelegenheit", icon: ShoppingBag }
];



export function LifeContent() {
  return (
    <>
      <section className="life-hero">
        <div className="life-hero-copy">
          <p className="eyebrow">PERSÖNLICHE ALLTAGSZENTRALE</p>
          <h1>Leben</h1>
          <p>
            Was privat gerade läuft, was nicht untergehen darf und was als Nächstes
            Aufmerksamkeit braucht – ohne Gesundheit, Finanzen oder Projekte doppelt abzubilden.
          </p>
        </div>

        <div className="life-overview" aria-label="Privater Überblick">
          {overview.map(item => (
            <div className="life-overview-item" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="life-main-grid">
        <article className="life-today-card">
          <div className="life-card-head">
            <div>
              <span className="section-kicker">HEUTE PRIVAT</span>
              <h2>Was heute zählt</h2>
            </div>
            <span className="life-live-dot"><i /> live</span>
          </div>

          <div className="life-today-list">
            {todayItems.map((item, index) => (
              <button className="life-today-row" type="button" key={item.title}>
                <span className={`life-task-dot ${item.tone}`} />
                <span className="life-task-index">0{index + 1}</span>
                <span className="life-task-copy">
                  <strong>{item.title}</strong>
                  <small>{item.meta}</small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>

          <div className="life-today-footer">
            <CheckCircle2 size={16} />
            <span>Nur private Punkte – Fachthemen bleiben in ihren eigenen Bereichen.</span>
          </div>
        </article>

        <article className="life-upcoming-card">
          <div className="life-card-head">
            <div>
              <span className="section-kicker">KOMMT DEMNÄCHST</span>
              <h2>Nicht vergessen</h2>
            </div>
            <Clock3 size={18} />
          </div>

          <div className="life-upcoming-list">
            {upcoming.map(({ title, when, icon: Icon }) => (
              <div className="life-upcoming-row" key={title}>
                <span className="life-upcoming-icon"><Icon size={16} /></span>
                <div>
                  <strong>{title}</strong>
                  <span>{when}</span>
                </div>
                <ArrowUpRight size={15} />
              </div>
            ))}
          </div>
        </article>
      </section>
      <SocialCircle />

      <section className="life-area-section">
        <div className="life-section-title">
          <div>
            <span className="section-kicker">DEINE PRIVATEN BEREICHE</span>
            <h2>Alles, was zum Alltag gehört</h2>
          </div>
          <p>
            Größere Vorhaben wechseln automatisch in „Projekte“. Hier bleibt der private Alltag ruhig und übersichtlich.
          </p>
        </div>

        <div className="life-area-grid">
          {lifeAreas.map(({ title, description, meta, icon: Icon }) => (
            <button className="life-area-card" type="button" key={title}>
              <span className="life-area-icon"><Icon size={20} strokeWidth={1.7} /></span>
              <span className="life-area-meta">{meta}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="life-area-link">Öffnen <ChevronRight size={14} /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="life-system-strip">
        <div>
          <Sparkles size={18} />
          <span>
            <strong>JAN OS Regel:</strong> Leben ist die private Ebene – keine zweite Startseite und kein Sammelbecken für alles.
          </span>
        </div>
        <button type="button">Regeln ansehen <ChevronRight size={14} /></button>
      </section>
    </>
  );
}
