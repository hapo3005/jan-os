import Link from "next/link";
import {
  Activity,
  Bell,
  CalendarDays,
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
import { DayOverview } from "@/components/DayOverview";

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

export default function DayPage() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">JAN OS</Link>
        <nav className="nav-list" aria-label="Hauptnavigation">
          {nav.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className="nav-item">
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <nav className="nav-list utility" aria-label="Werkzeuge">
          {utilityNav.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className="nav-item">
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="profile">
          <div className="avatar">J</div>
          <div><strong>Jan</strong><span>Fokus. Fortschritt. Überblick.</span></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="mobile-brand">JAN OS</div>
          <div className="clock"><LiveClock /></div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Suchen"><Search size={18} /></button>
            <button className="icon-button notification" aria-label="Benachrichtigungen"><Bell size={18} /><span className="notification-dot" /></button>
            <button className="icon-button mobile-menu" aria-label="Menü"><Menu size={19} /></button>
          </div>
        </header>

        <DayOverview />

        <footer>
          <span>JAN OS · Mein Tag</span>
          <Link href="/">Zurück zum Dashboard</Link>
        </footer>
      </section>
    </main>
  );
}
