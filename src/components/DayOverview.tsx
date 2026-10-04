"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
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
  birthday?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  preferredContact?: string;
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

type RoutineBlock = {
  id: string;
  title: string;
  start: string;
  end: string;
  detail: string;
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

function fromDateKey(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  next.setHours(12, 0, 0, 0);
  return next;
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

function contactState(contact: SocialContact, referenceDate: Date) {
  if (contact.birthday) {
    const birthday = fromDateKey(contact.birthday);
    if (birthday.getDate() === referenceDate.getDate() && birthday.getMonth() === referenceDate.getMonth()) {
      return { key: "birthday", label: "Geburtstag", days: 0 };
    }
  }

  const cadence = cadenceDays[contact.frequency];
  if (!cadence || !contact.lastContact) return null;
  const last = new Date(contact.lastContact + "T12:00:00");
  const ref = new Date(referenceDate);
  ref.setHours(12, 0, 0, 0);
  const days = Math.floor((ref.getTime() - last.getTime()) / 86400000);
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

function routineForDate(date: Date): RoutineBlock[] {
  const day = date.getDay();

  if (day >= 1 && day <= 4) {
    return [{
      id: "routine-work-study",
      title: "Arbeit / Lernen",
      start: "08:00",
      end: "16:00",
      detail: "Fester Strukturblock · Montag bis Donnerstag"
    }];
  }

  if (day === 5) {
    return [{
      id: "routine-work-study",
      title: "Arbeit / Lernen",
      start: "08:00",
      end: "14:00",
      detail: "Fester Strukturblock · Freitag"
    }];
  }

  return [];
}

export function DayOverview() {
  const initialDate = new Date();
  initialDate.setHours(12, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [planning, setPlanning] = useState<PlanningItem[]>([]);
  const [manualEvents, setManualEvents] = useState<ManualCalendarEvent[]>([]);
  const [contacts, setContacts] = useState<SocialContact[]>([]);
  const [finance, setFinance] = useState<FinanceData>({});
  const [ready, setReady] = useState(false);

  const realNow = new Date();
  const realTodayKey = dateKey(realNow);
  const selectedKey = dateKey(selectedDate);
  const isToday = selectedKey === realTodayKey;
  const nextDate = addDays(selectedDate, 1);
  const nextKey = dateKey(nextDate);
  const selectedRoutine = useMemo(() => routineForDate(selectedDate), [selectedKey]);
  const nextRoutine = useMemo(() => routineForDate(nextDate), [nextKey]);

  const dayStrip = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index - 3)),
    [selectedKey]
  );

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

  const linkedEvents = useMemo<DayEvent[]>(() =>
    planning.filter(item => occursOn(item, selectedKey)).map(item => ({
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
    })), [planning, selectedKey]);

  const manualSelected = useMemo<DayEvent[]>(() =>
    manualEvents.filter(item => item.date === selectedKey).map(item => ({
      id: item.id,
      title: item.title,
      start: item.start,
      end: item.end,
      source: item.category,
      sourceLabel: "Kalender",
      kind: item.category
    })), [manualEvents, selectedKey]);

  const events = useMemo(
    () => [...linkedEvents, ...manualSelected].sort((a, b) => (a.start || "99:99").localeCompare(b.start || "99:99")),
    [linkedEvents, manualSelected]
  );

  const daySchedule = useMemo(
    () => [
      ...selectedRoutine.map(block => ({
        id: block.id + "-" + selectedKey,
        title: block.title,
        start: block.start,
        end: block.end,
        source: "Routine",
        sourceLabel: block.detail,
        kind: "Routine" as const,
        routine: true as const
      })),
      ...events.map(event => ({ ...event, routine: false as const }))
    ].sort((a, b) => (a.start || "99:99").localeCompare(b.start || "99:99")),
    [selectedRoutine, events, selectedKey]
  );

  const tasks = useMemo<DayTask[]>(() => {
    const result: DayTask[] = [];

    planning.forEach(item => {
      if ((item.kind === "Deadline" || item.kind === "Fokus") && item.date <= selectedKey) {
        result.push({
          id: "plan-" + item.id,
          title: item.title,
          detail: item.sourceLabel,
          source: item.source,
          dueDate: item.date,
          overdue: item.date < selectedKey
        });
      }

      if (item.source === "Gesundheit" && item.intelligence?.timeline) {
        item.intelligence.timeline
          .filter(entry => entry.status !== "done" && entry.dueDate && entry.dueDate <= selectedKey)
          .forEach(entry => result.push({
            id: item.id + "-" + entry.id,
            title: entry.label,
            detail: entry.detail,
            source: "Gesundheit",
            dueDate: entry.dueDate,
            overdue: Boolean(entry.dueDate && entry.dueDate < selectedKey)
          }));
      }

      if (item.eventBriefing?.checklist && occursOn(item, selectedKey)) {
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
  }, [planning, selectedKey]);

  const socialFocus = useMemo(
    () => contacts
      .map(contact => ({ contact, state: contactState(contact, selectedDate) }))
      .filter((item): item is { contact: SocialContact; state: { key: string; label: string; days: number } } => Boolean(item.state))
      .sort((a, b) => {
        const rank = (key: string) => key === "birthday" ? 0 : key === "due" ? 1 : 2;
        return rank(a.state.key) - rank(b.state.key) || b.state.days - a.state.days;
      })
      .slice(0, 4),
    [contacts, selectedKey]
  );

  const dayPayments = useMemo(
    () => (finance.recurring ?? []).filter(item => item.dueDay === selectedDate.getDate()),
    [finance, selectedKey]
  );

  const nextDayEvents = useMemo(() => {
    const routine = nextRoutine.map(item => ({
      title: item.title,
      start: item.start,
      source: item.detail
    }));
    const linked = planning.filter(item => occursOn(item, nextKey)).map(item => ({
      title: item.title,
      start: item.start,
      source: item.sourceLabel
    }));
    const manual = manualEvents.filter(item => item.date === nextKey).map(item => ({
      title: item.title,
      start: item.start,
      source: item.category
    }));
    return [...routine, ...linked, ...manual]
      .sort((a, b) => (a.start || "99:99").localeCompare(b.start || "99:99"))
      .slice(0, 4);
  }, [planning, manualEvents, nextKey, nextRoutine]);

  const nextEvent = useMemo(() => {
    if (!daySchedule.length) return null;
    if (!isToday) return daySchedule[0];

    const time = `${String(realNow.getHours()).padStart(2, "0")}:${String(realNow.getMinutes()).padStart(2, "0")}`;
    return daySchedule.find(event => event.start && event.start >= time) ?? daySchedule.find(event => !event.start) ?? null;
  }, [daySchedule, isToday]);

  const summary = useMemo(() => {
    if (!daySchedule.length && !tasks.length && !socialFocus.length && !dayPayments.length) {
      return isToday
        ? "Heute ist in JAN OS noch nichts Dringendes hinterlegt. Der Tag ist frei planbar."
        : "Für diesen Tag ist in JAN OS noch nichts Dringendes hinterlegt.";
    }

    const bits = [];
    if (selectedRoutine.length) bits.push("feste Tagesstruktur");
    if (events.length) bits.push(`${events.length} Termin${events.length === 1 ? "" : "e"}`);
    if (tasks.length) bits.push(`${tasks.length} offene${tasks.length === 1 ? "r Punkt" : " Punkte"}`);
    if (socialFocus.length) bits.push(`${socialFocus.length} Kontakt${socialFocus.length === 1 ? "" : "e"} im Blick`);
    if (dayPayments.length) bits.push(`${dayPayments.length} Belastung${dayPayments.length === 1 ? "" : "en"}`);
    return (isToday ? "Heute: " : "An diesem Tag: ") + bits.join(", ") + ".";
  }, [daySchedule, selectedRoutine, events, tasks, socialFocus, dayPayments, isToday]);

  function goToToday() {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    setSelectedDate(today);
  }

  return (
    <>
      <section className="day-hero">
        <div>
          <p className="eyebrow">MEIN TAG · LIVE AUS JAN OS</p>
          <h1>{selectedDate.toLocaleDateString("de-DE", { weekday: "long" })}</h1>
          <p>{selectedDate.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
        <div className="day-hero-summary">
          <Sparkles size={18} />
          <div>
            <span>{isToday ? "TAGESBRIEFING" : "TAGESVORSCHAU"}</span>
            <strong>{ready ? summary : "Tagesdaten werden geladen…"}</strong>
          </div>
        </div>
      </section>

      <section className="day-browser" aria-label="Tage durchsuchen">
        <button type="button" className="day-browser-arrow" onClick={() => setSelectedDate(addDays(selectedDate, -1))} aria-label="Vorheriger Tag">
          <ChevronLeft size={18} />
        </button>

        <div className="day-browser-strip">
          {dayStrip.map(date => {
            const key = dateKey(date);
            const selected = key === selectedKey;
            const today = key === realTodayKey;
            return (
              <button
                type="button"
                key={key}
                className={`day-browser-day ${selected ? "selected" : ""} ${today ? "today" : ""}`}
                onClick={() => setSelectedDate(date)}
              >
                <span>{date.toLocaleDateString("de-DE", { weekday: "short" })}</span>
                <strong>{date.getDate()}</strong>
                <small>{date.toLocaleDateString("de-DE", { month: "short" })}</small>
              </button>
            );
          })}
        </div>

        <button type="button" className="day-browser-arrow" onClick={() => setSelectedDate(addDays(selectedDate, 1))} aria-label="Nächster Tag">
          <ChevronRight size={18} />
        </button>

        <button type="button" className="day-browser-today" onClick={goToToday} disabled={isToday}>
          Heute
        </button>
      </section>

      <section className="day-priority-grid">
        <article className="day-priority-card main">
          <span className="section-kicker">{isToday ? "ALS NÄCHSTES" : "ERSTER PUNKT"}</span>
          {nextEvent ? (
            <>
              <h2>{nextEvent.title}</h2>
              <p>
                {nextEvent.start ? nextEvent.start + (nextEvent.end ? "–" + nextEvent.end : "") + " Uhr" : "ganztägig"}
                {" · "}{nextEvent.sourceLabel}
              </p>
              {"location" in nextEvent && nextEvent.location ? <span className="day-location">{nextEvent.location}</span> : null}
              {nextEvent.source !== "Routine" ? (
                <Link href={sourceHref(nextEvent.source)}>Details öffnen <ArrowRight size={14} /></Link>
              ) : (
                <span className="day-routine-label">Fester Tagesblock</span>
              )}
            </>
          ) : tasks[0] ? (
            <>
              <h2>{tasks[0].title}</h2>
              <p>{tasks[0].detail || tasks[0].source}</p>
              <Link href={sourceHref(tasks[0].source)}>Zum Bereich <ArrowRight size={14} /></Link>
            </>
          ) : (
            <>
              <h2>Kein fester Punkt</h2>
              <p>Dieser Tag ist aktuell frei planbar.</p>
            </>
          )}
        </article>

        <article className="day-stat-card"><CalendarDays size={18} /><strong>{events.length}</strong><span>Termine</span></article>
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
            {daySchedule.length ? (
              <div className="day-timeline">
                {daySchedule.map(event => (
                  <div className={`day-timeline-row ${event.routine ? "routine" : ""}`} key={event.id}>
                    <time>{event.start || "Tag"}</time>
                    <span className={"day-timeline-dot " + event.source.toLowerCase()} />
                    <div>
                      <div className="day-timeline-title">
                        <strong>{event.title}</strong>
                        {"status" in event && event.status === "option" ? <span>Option</span> : null}
                        {event.routine ? <span className="routine-badge">Struktur</span> : null}
                      </div>
                      <small>
                        {event.sourceLabel}
                        {"location" in event && event.location ? " · " + event.location : ""}
                      </small>
                      {"briefing" in event && event.briefing?.recommendation ? (
                        <p><Sparkles size={12} /> {event.briefing.recommendation}</p>
                      ) : null}
                    </div>
                    {event.routine ? <span className="day-routine-lock">fix</span> : (
                      <Link href={sourceHref(event.source)} aria-label={event.title + " öffnen"}><ChevronRight size={16} /></Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="day-empty"><CalendarDays size={20} /><strong>Keine feste Tagesstruktur</strong><span>Für diesen Wochentag ist noch kein Grundablauf definiert.</span></div>
            )}
          </article>

          <article className="day-panel">
            <div className="day-panel-head">
              <div><span className="section-kicker">HANDLUNG</span><h2>{isToday ? "Heute erledigen" : "An diesem Tag"}</h2></div>
              <CheckCircle2 size={17} />
            </div>
            {tasks.length ? (
              <div className="day-task-list">
                {tasks.map(task => (
                  <Link href={sourceHref(task.source)} key={task.id} className={task.overdue ? "overdue" : ""}>
                    <span className="day-task-check" />
                    <div><strong>{task.title}</strong><small>{task.detail || task.source}</small></div>
                    {task.overdue ? <b>bis dahin offen</b> : task.dueDate ? <time>fällig</time> : null}
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
                    <div>
                      <strong>{contact.name}</strong>
                      <small>
                        {contact.relationJan || contact.circle}
                        {contact.preferredContact ? " · " + contact.preferredContact : ""}
                      </small>
                    </div>
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
              <div><span className="section-kicker">FINANZEN</span><h2>{isToday ? "Heute fällig" : "An diesem Tag fällig"}</h2></div>
              <CircleDollarSign size={17} />
            </div>
            {dayPayments.length ? (
              <div className="day-payment-list">
                {dayPayments.map(payment => (
                  <Link href="/finanzen" key={payment.id}>
                    <div><strong>{payment.name}</strong><small>{payment.category || "Wiederkehrend"}</small></div>
                    <b>{euro(payment.amount)}</b>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="day-empty compact"><CircleDollarSign size={19} /><strong>Keine Belastung</strong></div>
            )}
          </article>

          <article className="day-panel">
            <div className="day-panel-head">
              <div><span className="section-kicker">FOLGETAG</span><h2>{nextDate.toLocaleDateString("de-DE", { weekday: "long" })}</h2></div>
              <Clock3 size={17} />
            </div>
            {nextDayEvents.length ? (
              <div className="day-tomorrow-list">
                {nextDayEvents.map((event, index) => (
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
          <span className="section-kicker">TAG FÜR TAG</span>
          <h2>Jeder Tag ist direkt durchblätterbar.</h2>
          <p>Routine, Kalender, Projekte, Gesundheit, Leben und Finanzen werden für das gewählte Datum zusammengeführt.</p>
        </div>
        <Link href="/kalender">Im Kalender planen <ExternalLink size={14} /></Link>
      </section>
    </>
  );
}
