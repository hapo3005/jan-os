"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Heart,
  ListChecks,
  Sparkles,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  PlanningItem,
  PLANNING_EVENT,
  PLANNING_STORAGE_KEY,
  readPlanningItems
} from "@/lib/planning";

type ManualCalendarEvent = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  category: string;
};

type SocialContact = {
  name: string;
  circle: string;
  relationJan: string;
  relationNadine: string;
  closeness: string;
  frequency: string;
  lastContact: string | null;
};

type FinanceRecurring = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
};

type FinanceData = {
  recurring?: FinanceRecurring[];
};

type DayEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  source: string;
  sourceLabel: string;
  location?: string;
  kind: string;
  status?: "fixed" | "option";
  briefing?: PlanningItem["eventBriefing"];
};

type DayTask = {
  id: string;
  title: string;
  detail?: string;
  source: string;
  dueDate?: string;
  overdue?: boolean;
};

const CALENDAR_KEY = "jan-os-calendar-events-v1";
const SOCIAL_KEY = "jan-os-social-contacts-v1";
const FINANCE_KEY = "jan-os-finance-v2";

const cadenceDays: Record<string, number | null> = {
  "mehrmals pro Woche": 3,
  "1× pro Woche": 7,
  "alle 1–2 Wochen": 10,
  "alle 3–4 Wochen": 24,
  "alle 1–2 Monate": 45,
  "anlassbezogen": null,
  "noch festlegen": null,
  "—": null
};

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function occursOn(item: PlanningItem, key: string) {
  if (item.dateOptions?.length) return item.dateOptions.includes(key);
  if (item.endDate) return item.date <= key && key <= item.endDate;
  return item.date === key;
}

function sourceHref(source: string) {
  if (source === "Gesundheit") return "/gesundheit";
  if (source === "Projekt") return "/projekte";
  if (source === "KISS") return "/kiss";
  if (source === "Leben") return "/leben";
  return "/kalender";
}

function contactState(contact: SocialContact) {
  const cadence = cadenceDays[contact.frequency];
  if (!cadence || !contact.lastContact) return null;
  const last = new Date(contact.lastContact + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const days = Math.floor((today.getTime() - last.getTime()) / 86400000);
  if (days >= cadence) return { key: "due", label: "Jetzt melden", days };
  if (days >= Math.floor(cadence * .75)) return { key: "soon", label: "Bald dran", days };
  return null;
}

function euro(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);
}

export function DayOverview() {
  const [planning, setPlanning] = useState<PlanningItem[]>([]);
  const [manualEvents, setManualEvents] = useState<ManualCalendarEvent[]>([]);
  const [contacts, setContacts] = useState<SocialContact[]>([]);
  const [finance, setFinance] = useState<FinanceData>({});
  const [ready, setReady] = useState(false);

  const now = new Date();
  const today = dateKey(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = dateKey(tomorrowDate);

  function refresh() {
    setPlanning(readPlanningItems());

    try {
      const calendarStored = window.localStorage.getItem(CALENDAR_KEY);
      setManualEvents(calendarStored ? JSON.parse(calendarStored) : []);
    } catch {
      setManualEvents([]);
    }

    try {
      const socialStored = window.localStorage.getItem(SOCIAL_KEY);
      const parsed = socialStored ? JSON.parse(socialStored) : null;
      setContacts(Array.isArray(parsed?.contacts) ? parsed.contacts : []);
    } catch {
      setContacts([]);
    }

    try {
      const financeStored = window.localStorage.getItem(FINANCE_KEY);
      setFinance(financeStored ? JSON.parse(financeStored) : {});
    } catch {
      setFinance({});
    }

    setReady(true);
  }

  useEffect(() => {
    refresh();
    window.addEventListener(PLANNING_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PLANNING_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const linkedToday = useMemo<DayEvent[]>(() =>
    planning.filter(item => occursOn(item, today)).map(item => ({
      id: item.id,
      title: item.title,
      start: item.start,
      end: item.end,
      source: item.source,
      sourceLabel: item.sourceLabel,
      location: item.location,
      kind: item.kind,
      status: item.status,
      briefing: item.eventBriefing
    })), [planning, today]);

  const manualToday = useMemo<DayEvent[]>(() =>
    manualEvents.filter(item => item.date === today).map(item => ({
      id: item.id,
      title: item.title,
      start: item.start,
      end: item.end,
      source: item.category,
      sourceLabel: "Kalender",
      kind: item.category
    })), [manualEvents, today]);

  const events = useMemo(
    () => [...linkedToday, ...manualToday].sort((a, b) => (a.start || "99:99").localeCompare(b.start || "99:99")),
    [linkedToday, manualToday]
  );

  const tasks = useMemo<DayTask[]>(() => {
    const result: DayTask[] = [];

    planning.forEach(item => {
      if ((item.kind === "Deadline" || item.kind === "Fokus") && item.date <= today) {
        result.push({
          id: "plan-" + item.id,
          title: item.title,
          detail: item.sourceLabel,
          source: item.source,
          dueDate: item.date,
          overdue: item.date < today
        });
      }

      if (item.source === "Gesundheit" && item.intelligence?.timeline) {
        item.intelligence.timeline
          .filter(entry => entry.status !== "done" && entry.dueDate && entry.dueDate <= today)
          .forEach(entry => result.push({
            id: item.id + "-" + entry.id,
            title: entry.label,
            detail: entry.detail,
            source: "Gesundheit",
            dueDate: entry.dueDate,
            overdue: Boolean(entry.dueDate && entry.dueDate < today)
          }));
      }

      if (item.eventBriefing?.checklist && occursOn(item, today)) {
        item.eventBriefing.checklist
          .filter(entry => entry.status !== "done")
          .slice(0, 3)
          .forEach(entry => result.push({
            id: item.id + "-brief-" + entry.id,
            title: entry.label,
            detail: entry.detail,
            source: item.source
          }));
      }
    });

    return result;
  }, [planning, today]);

  const socialFocus = useMemo(
    () => contacts
      .map(contact => ({ contact, state: contactState(contact) }))
      .filter((item): item is { contact: SocialContact; state: { key: string; label: string; days: number } } => Boolean(item.state))
      .sort((a, b) => (a.state.key === "due" ? 0 : 1) - (b.state.key === "due" ? 0 : 1) || b.state.days - a.state.days)
      .slice(0, 4),
    [contacts]
  );

  const todayPayments = useMemo(
    () => (finance.recurring ?? []).filter(item => item.dueDay === now.getDate()),
    [finance, now]
  );

  const tomorrowEvents = useMemo(() => {
    const linked = planning.filter(item => occursOn(item, tomorrow)).map(item => ({
      title: item.title,
      start: item.start,
      source: item.sourceLabel
    }));
    const manual = manualEvents.filter(item => item.date === tomorrow).map(item => ({
      title: item.title,
      start: item.start,
      source: item.category
    }));
    return [...linked, ...manual].sort((a, b) => (a.start || "99:99").localeCompare(b.start || "99:99")).slice(0, 4);
  }, [planning, manualEvents, tomorrow]);

  const nextEvent = useMemo(() => {
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return events.find(event => event.start && event.start >= time) ?? events.find(event => !event.start) ?? null;
  }, [events, now]);

  const summary = useMemo(() => {
    if (!events.length && !tasks.length && !socialFocus.length && !todayPayments.length) {
      return "Heute ist in JAN OS noch nichts Dringendes hinterlegt. Der Tag ist frei planbar.";
    }

    const bits = [];
    if (events.length) bits.push(`${events.length} Termin${events.length === 1 ? "" : "e"}`);
    if (tasks.length) bits.push(`${tasks.length} offene${tasks.length === 1 ? "r Punkt" : " Punkte"}`);
    if (socialFocus.length) bits.push(`${socialFocus.length} Kontakt${socialFocus.length === 1 ? "" : "e"} im Blick`);
    if (todayPayments.length) bits.push(`${todayPayments.length} Belastung${todayPayments.length === 1 ? "" : "en"}`);
    return "Heute: " + bits.join(", ") + ".";
  }, [events, tasks, socialFocus, todayPayments]);

  return (
    <>
      <section className="day-hero">
        <div>
          <p className="eyebrow">MEIN TAG · LIVE AUS JAN OS</p>
          <h1>{now.toLocaleDateString("de-DE", { weekday: "long" })}</h1>
          <p>{now.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
        <div className="day-hero-summary">
          <Sparkles size={18} />
          <div>
            <span>TAGESBRIEFING</span>
            <strong>{ready ? summary : "Tagesdaten werden geladen…"}</strong>
          </div>
        </div>
      </section>

      <section className="day-priority-grid">
        <article className="day-priority-card main">
          <span className="section-kicker">ALS NÄCHSTES</span>
          {nextEvent ? (
            <>
              <h2>{nextEvent.title}</h2>
              <p>
                {nextEvent.start ? nextEvent.start + (nextEvent.end ? "–" + nextEvent.end : "") + " Uhr" : "ganztägig"}
                {" · "}{nextEvent.sourceLabel}
              </p>
              {nextEvent.location ? <span className="day-location">{nextEvent.location}</span> : null}
              <Link href={sourceHref(nextEvent.source)}>Details öffnen <ArrowRight size={14} /></Link>
            </>
          ) : tasks[0] ? (
            <>
              <h2>{tasks[0].title}</h2>
              <p>{tasks[0].detail || tasks[0].source}</p>
              <Link href={sourceHref(tasks[0].source)}>Zum Bereich <ArrowRight size={14} /></Link>
            </>
          ) : (
            <>
              <h2>Kein fester nächster Punkt</h2>
              <p>Der restliche Tag ist aktuell frei.</p>
            </>
          )}
        </article>

        <article className="day-stat-card"><CalendarDays size={18} /><strong>{events.length}</strong><span>Termine heute</span></article>
        <article className="day-stat-card"><ListChecks size={18} /><strong>{tasks.length}</strong><span>offene Punkte</span></article>
        <article className="day-stat-card"><UsersRound size={18} /><strong>{socialFocus.length}</strong><span>Kontakte im Blick</span></article>
      </section>

      <section className="day-layout">
        <div className="day-main-column">
          <article className="day-panel">
            <div className="day-panel-head">
              <div><span className="section-kicker">ZEITLICH</span><h2>Dein Tagesablauf</h2></div>
              <Link href="/kalender">Kalender <ChevronRight size={14} /></Link>
            </div>
            {events.length ? (
              <div className="day-timeline">
                {events.map(event => (
                  <div className="day-timeline-row" key={event.id}>
                    <time>{event.start || "Tag"}</time>
                    <span className={"day-timeline-dot " + event.source.toLowerCase()} />
                    <div>
                      <div className="day-timeline-title">
                        <strong>{event.title}</strong>
                        {event.status === "option" ? <span>Option</span> : null}
                      </div>
                      <small>{event.sourceLabel}{event.location ? " · " + event.location : ""}</small>
                      {event.briefing?.recommendation ? (
                        <p><Sparkles size={12} /> {event.briefing.recommendation}</p>
                      ) : null}
                    </div>
                    <Link href={sourceHref(event.source)} aria-label={event.title + " öffnen"}><ChevronRight size={16} /></Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="day-empty"><CalendarDays size={20} /><strong>Keine Termine</strong><span>Heute ist zeitlich noch nichts fest eingeplant.</span></div>
            )}
          </article>

          <article className="day-panel">
            <div className="day-panel-head">
              <div><span className="section-kicker">HANDLUNG</span><h2>Heute erledigen</h2></div>
              <CheckCircle2 size={17} />
            </div>
            {tasks.length ? (
              <div className="day-task-list">
                {tasks.map(task => (
                  <Link href={sourceHref(task.source)} key={task.id} className={task.overdue ? "overdue" : ""}>
                    <span className="day-task-check" />
                    <div><strong>{task.title}</strong><small>{task.detail || task.source}</small></div>
                    {task.overdue ? <b>überfällig</b> : task.dueDate ? <time>heute</time> : null}
                    <ChevronRight size={14} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="day-empty compact"><CheckCircle2 size={19} /><strong>Keine offenen Tagespunkte</strong></div>
            )}
          </article>
        </div>

        <aside className="day-side-column">
          <article className="day-panel">
            <div className="day-panel-head">
              <div><span className="section-kicker">MENSCHEN</span><h2>Kontaktfokus</h2></div>
              <Heart size={17} />
            </div>
            {socialFocus.length ? (
              <div className="day-contact-list">
                {socialFocus.map(({ contact, state }) => (
                  <Link href="/leben/#menschen" key={contact.name}>
                    <span className="day-avatar">{contact.name.slice(0, 1).toUpperCase()}</span>
                    <div><strong>{contact.name}</strong><small>{contact.relationJan || contact.circle}</small></div>
                    <b className={state.key}>{state.label}</b>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="day-empty compact"><UsersRound size={19} /><strong>Kein Kontakt fällig</strong></div>
            )}
          </article>

          <article className="day-panel">
            <div className="day-panel-head">
              <div><span className="section-kicker">FINANZEN</span><h2>Heute fällig</h2></div>
              <CircleDollarSign size={17} />
            </div>
            {todayPayments.length ? (
              <div className="day-payment-list">
                {todayPayments.map(payment => (
                  <Link href="/finanzen" key={payment.id}>
                    <div><strong>{payment.name}</strong><small>{payment.category || "Wiederkehrend"}</small></div>
                    <b>{euro(payment.amount)}</b>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="day-empty compact"><CircleDollarSign size={19} /><strong>Keine Belastung heute</strong></div>
            )}
          </article>

          <article className="day-panel">
            <div className="day-panel-head">
              <div><span className="section-kicker">MORGEN</span><h2>Kurzer Vorausblick</h2></div>
              <Clock3 size={17} />
            </div>
            {tomorrowEvents.length ? (
              <div className="day-tomorrow-list">
                {tomorrowEvents.map((event, index) => (
                  <div key={event.title + index}><time>{event.start || "Tag"}</time><div><strong>{event.title}</strong><small>{event.source}</small></div></div>
                ))}
              </div>
            ) : (
              <div className="day-empty compact"><Activity size={19} /><strong>Noch nichts geplant</strong></div>
            )}
          </article>
        </aside>
      </section>

      <section className="day-footer-action">
        <div>
          <span className="section-kicker">EINE SICHT · ALLE QUELLEN</span>
          <h2>Mein Tag besitzt keine eigenen Daten.</h2>
          <p>Kalender, Projekte, Gesundheit, Leben und Finanzen bleiben die Quellen. Diese Ansicht sortiert sie nur für heute zusammen.</p>
        </div>
        <Link href="/kalender">Tag weiterplanen <ExternalLink size={14} /></Link>
      </section>
    </>
  );
}
