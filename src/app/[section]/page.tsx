import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  FolderKanban,
  Heart,
  Home,
  LayoutGrid,
  Menu,
  NotebookText,
  Search,
  Sparkles,
  Target,
  WalletCards
} from "lucide-react";
import { LiveClock } from "@/components/LiveClock";
import { LifeContent } from "@/components/LifeContent";
import { CalendarContent } from "@/components/CalendarContent";
import { ProjectsContent } from "@/components/ProjectsContent";

const nav = [
  { label: "Home", href: "/", icon: Home },
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

const sections = {
  leben: {
    eyebrow: "PERSÖNLICHE ZENTRALE",
    title: "Leben",
    description: "Alltag, Familie, Organisation und persönliche Vorhaben – ohne dass wichtige Dinge zwischen Projekten verschwinden.",
    status: "Grundstruktur",
    cards: [
      ["Heute", "Was heute privat wirklich wichtig ist.", "Tagesfokus"],
      ["Organisation", "Offene Vorgänge, Dokumente und wiederkehrende Aufgaben.", "Überblick"],
      ["Gemeinsam", "Termine und Vorhaben, die mehrere Lebensbereiche verbinden.", "Privat"]
    ],
    focus: ["Tagesplanung", "Offene Vorgänge", "Gemeinsame Termine", "Routinen"]
  },
  gesundheit: {
    eyebrow: "GESUNDHEIT & FITNESS",
    title: "Körper & Energie",
    description: "Training, Routinen und Fortschritt in einer eigenen geschützten Struktur. Echte Daten kommen erst später über private Datenquellen.",
    status: "Privatdaten folgen",
    cards: [
      ["Training", "Pläne, Einheiten und der nächste sinnvolle Trainingsreiz.", "Fitness"],
      ["Routinen", "Regelmäßige Aufgaben und Gewohnheiten verlässlich verfolgen.", "Routine"],
      ["Fortschritt", "Entwicklung sichtbar machen, ohne die Startseite zu überladen.", "Trend"]
    ],
    focus: ["Training", "Regeneration", "Routinen", "Fortschritt"]
  },
  finanzen: {
    eyebrow: "FINANZZENTRALE",
    title: "Finanzen",
    description: "Cashflow, Fixkosten, Rücklagen und größere Entscheidungen mit einem klaren Blick auf das Wesentliche.",
    status: "Datenmodell",
    cards: [
      ["Überblick", "Einnahmen, Ausgaben und verfügbare Mittel auf einen Blick.", "Cashflow"],
      ["Fixkosten", "Verträge und wiederkehrende Belastungen mit Fälligkeiten.", "Planbar"],
      ["Ziele", "Rücklagen, Investitionen und größere Anschaffungen im Kontext.", "Planung"]
    ],
    focus: ["Monatsübersicht", "Fixkosten", "Rücklagen", "Entscheidungen"]
  },
  kiss: {
    eyebrow: "BUSINESS",
    title: "KISS",
    description: "Leads, Kunden, Angebote, Projekte und Umsatz als eigenständiges Business-Cockpit innerhalb von JAN OS.",
    status: "Business-Modul",
    cards: [
      ["Pipeline", "Interessenten, Chancen und die nächsten sinnvollen Schritte.", "Vertrieb"],
      ["Kunden", "Aktive Kunden und der Status laufender Zusammenarbeit.", "CRM"],
      ["Delivery", "Was gerade gebaut, geliefert oder freigegeben werden muss.", "Produktion"]
    ],
    focus: ["Leads", "Angebote", "Kundenprojekte", "Umsatz"]
  },
  projekte: {
    eyebrow: "PROJEKTZENTRALE",
    title: "Projekte",
    description: "Alle Vorhaben mit Status, nächstem Meilenstein, Entscheidungen und offenen Punkten – projektübergreifend vergleichbar.",
    status: "Kernmodul",
    cards: [
      ["Aktiv", "Laufende Projekte nach Aufmerksamkeit und nächstem Schritt.", "Jetzt"],
      ["Planung", "Vorhaben, die vorbereitet werden, aber noch nicht im Fokus stehen.", "Danach"],
      ["Archiv", "Abgeschlossene Projekte und wichtige Entscheidungen nachvollziehbar halten.", "Historie"]
    ],
    focus: ["Status", "Meilensteine", "Entscheidungen", "Nächste Schritte"]
  },
  ziele: {
    eyebrow: "RICHTUNG",
    title: "Ziele",
    description: "Langfristige Ziele werden in messbare Etappen, Projekte und konkrete nächste Schritte übersetzt.",
    status: "Strategie",
    cards: [
      ["Jahr", "Die Ergebnisse, die dieses Jahr wirklich zählen.", "Jahresziele"],
      ["Quartal", "Der aktuelle Fokus mit realistisch erreichbaren Zwischenschritten.", "90 Tage"],
      ["Review", "Was vorankommt, stagniert oder neu priorisiert werden sollte.", "Fortschritt"]
    ],
    focus: ["Jahresziele", "Quartalsfokus", "Messbare Schritte", "Review"]
  },
  kalender: {
    eyebrow: "ZEIT",
    title: "Kalender",
    description: "Termine, Fokusblöcke und Deadlines. Der neue Google-Kalender wird hier ganz am Schluss angebunden.",
    status: "Integration vorbereitet",
    cards: [
      ["Heute", "Termine später direkt mit Aufgaben und Projekten verbinden.", "Tag"],
      ["Woche", "Arbeitslast, wichtige Termine und freie Zeit auf einen Blick.", "7 Tage"],
      ["Planung", "Zeit bewusst für Projekte und persönliche Prioritäten reservieren.", "Fokus"]
    ],
    focus: ["Termine", "Deadlines", "Fokusblöcke", "Verfügbarkeit"]
  },
  notizen: {
    eyebrow: "CAPTURE",
    title: "Notizen",
    description: "Gedanken schnell erfassen und anschließend zuverlässig dem richtigen Projekt, Ziel oder Bereich zuordnen.",
    status: "Grundstruktur",
    cards: [
      ["Inbox", "Ein Gedanke rein, ohne zuerst die perfekte Kategorie wählen zu müssen.", "Schnellnotiz"],
      ["Angeheftet", "Wichtige Informationen bleiben sichtbar, bis sie verarbeitet sind.", "Pinned"],
      ["Verknüpft", "Notizen später direkt an Projekte, Ziele und Aufgaben hängen.", "Kontext"]
    ],
    focus: ["Inbox", "Angeheftet", "Projektwissen", "Entscheidungen"]
  },
  wissen: {
    eyebrow: "KNOWLEDGE BASE",
    title: "Wissen",
    description: "Recherche, Entscheidungen und Referenzen langfristig auffindbar machen, statt Informationen mehrfach zu erarbeiten.",
    status: "Wissensbasis",
    cards: [
      ["Sammlung", "Wichtige Inhalte aus Projekten und Recherchen zentral sammeln.", "Bibliothek"],
      ["Entscheidungen", "Nicht nur was entschieden wurde, sondern auch warum.", "Kontext"],
      ["Suche", "Projektübergreifend Informationen zuverlässig wiederfinden.", "Findbar"]
    ],
    focus: ["Recherche", "Entscheidungen", "Referenzen", "Suche"]
  },
  tools: {
    eyebrow: "WERKZEUGE",
    title: "Tools",
    description: "Integrationen, kleine Rechner und Automationen, die JAN OS im Alltag und in Projekten stärker machen.",
    status: "Erweiterbar",
    cards: [
      ["Integrationen", "Google, Supabase und weitere Datenquellen zentral verwalten.", "Connect"],
      ["Rechner", "Wiederkehrende Berechnungen als eigene kleine Werkzeuge.", "Utilities"],
      ["Automationen", "Regeln und Abläufe später sichtbar und kontrollierbar machen.", "Automation"]
    ],
    focus: ["Integrationen", "Rechner", "Automationen", "Systemstatus"]
  }
} as const;

type SectionKey = keyof typeof sections;

export function generateStaticParams() {
  return Object.keys(sections).map(section => ({ section }));
}

export default async function SectionPage({
  params
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!(section in sections)) notFound();

  const key = section as SectionKey;
  const data = sections[key];
  const activeHref = `/${section}`;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">JAN OS</Link>

        <nav className="nav-list" aria-label="Hauptnavigation">
          {nav.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className={href === activeHref ? "nav-item active" : "nav-item"}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-divider" />

        <nav className="nav-list utility" aria-label="Werkzeuge">
          {utilityNav.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className={href === activeHref ? "nav-item active" : "nav-item"}>
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

      <section className="content">
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

        {key === "leben" ? (
          <LifeContent />
        ) : key === "kalender" ? (
          <CalendarContent />
        ) : key === "projekte" ? (
          <ProjectsContent />
        ) : (
          <>
            <section className="module-hero">
              <div>
                <p className="eyebrow">{data.eyebrow}</p>
                <h1>{data.title}</h1>
                <p>{data.description}</p>
              </div>
              <span className="module-status">{data.status}</span>
            </section>

            <section className="module-page-grid">
              {data.cards.map(([title, description, meta], index) => (
                <article className="module-feature-card" key={title}>
                  <div className="module-card-index">0{index + 1}</div>
                  <span className="section-kicker">{meta}</span>
                  <h2>{title}</h2>
                  <p>{description}</p>
                  <button type="button">Öffnen <ChevronRight size={15} /></button>
                </article>
              ))}
            </section>

            <section className="module-focus-panel">
              <div>
                <span className="section-kicker">DIESER BEREICH WIRD EIGENSTÄNDIG</span>
                <h2>Eigene Funktionen statt einer überladenen Startseite.</h2>
                <p>Die Grundnavigation steht jetzt. Die nächsten Entwicklungsschritte bauen die jeweilige Fachlogik direkt auf dieser Seite aus.</p>
              </div>
              <div className="module-focus-list">
                {data.focus.map(item => <span key={item}>{item}</span>)}
              </div>
            </section>
          </>
        )}

        <footer>
          <span>JAN OS · Bereich {data.title}</span>
          <Link href="/">Zurück zum Dashboard</Link>
        </footer>
      </section>
    </main>
  );
}
