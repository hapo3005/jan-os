"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Focus,
  Plus,
  RotateCcw,
  ShieldCheck,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  PlanningItem,
  PLANNING_EVENT,
  PLANNING_STORAGE_KEY,
  readPlanningItems
} from "@/lib/planning";

type CalendarView = "month" | "week";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  category: "Privat" | "KISS" | "Gesundheit" | "Projekt" | "Deadline" | "Fokus";
  origin?: "manual" | "linked";
  sourceLabel?: string;
};

const STORAGE_KEY = "jan-os-calendar-events-v1";
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];
const CATEGORIES: CalendarEvent["category"][] = [
  "Privat", "KISS", "Gesundheit", "Projekt", "Deadline", "Fokus"
];

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateKey(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function sameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

function formatDay(date: Date) {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function planningToCalendar(item: PlanningItem): CalendarEvent {
  return {
    id: "linked-" + item.id,
    title: item.title,
    date: item.date,
    start: item.start,
    end: item.end,
    category: item.kind === "Termin" ? "Projekt" : item.kind,
    origin: "linked",
    sourceLabel: item.sourceLabel
  };
}

export function CalendarContent() {
  const [view, setView] = useState<CalendarView>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [linkedItems, setLinkedItems] = useState<PlanningItem[]>([]);
  const [ready, setReady] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    function refreshLinked() {
      setLinkedItems(readPlanningItems());
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setEvents(parsed);
      }
      refreshLinked();
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }

    window.addEventListener(PLANNING_EVENT, refreshLinked);
    const storageListener = (event: StorageEvent) => {
      if (event.key === PLANNING_STORAGE_KEY) refreshLinked();
    };
    window.addEventListener("storage", storageListener);

    return () => {
      window.removeEventListener(PLANNING_EVENT, refreshLinked);
      window.removeEventListener("storage", storageListener);
    };
  }, []);

  function persist(next: CalendarEvent[]) {
    setEvents(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function addEvent(event: CalendarEvent) {
    persist([...events, event].sort((a, b) =>
      `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`)
    ));
    setShowForm(false);
  }

  function deleteEvent(id: string) {
    persist(events.filter(item => item.id !== id));
  }

  function shift(direction: number) {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(next.getMonth() + direction);
    else next.setDate(next.getDate() + direction * 7);
    setCursor(next);
  }

  const linkedEvents = useMemo(() => linkedItems.map(planningToCalendar), [linkedItems]);
  const allEvents = useMemo(
    () => [...events.map(item => ({ ...item, origin: item.origin ?? "manual" as const })), ...linkedEvents]
      .sort((a, b) => (a.date + "T" + a.start).localeCompare(b.date + "T" + b.start)),
    [events, linkedEvents]
  );

  const today = new Date();
  const weekStart = startOfWeek(cursor);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart.getTime()]
  );

  const monthCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [cursor.getFullYear(), cursor.getMonth()]);

  const upcoming = useMemo(() => {
    const nowKey = dateKey(today);
    return allEvents
      .filter(item => item.date >= nowKey)
      .slice(0, 6);
  }, [allEvents, today.getDate(), today.getMonth(), today.getFullYear()]);

  const todayEvents = allEvents.filter(item => item.date === dateKey(today));
  const weekEventCount = allEvents.filter(item =>
    weekDays.some(day => dateKey(day) === item.date)
  ).length;

  const title = view === "month"
    ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    : `${formatDay(weekDays[0])} – ${formatDay(weekDays[6])}`;

  return (
    <>
      <section className="calendar-hero">
        <div>
          <p className="eyebrow">ZEIT · FOKUS · TERMINE</p>
          <h1>Kalender</h1>
          <p>
            Deine Zeitplanung als eigener Arbeitsbereich. Heute lokal nutzbar,
            später direkt mit dem neuen Google-Kalender verbunden.
          </p>
        </div>
        <div className="calendar-hero-actions">
          <span><ShieldCheck size={14} /> aktuell lokal gespeichert</span>
          <button type="button" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Termin hinzufügen
          </button>
        </div>
      </section>

      <section className="calendar-toolbar">
        <div className="calendar-nav">
          <button type="button" aria-label="Zurück" onClick={() => shift(-1)}><ChevronLeft size={17} /></button>
          <button type="button" className="calendar-today-button" onClick={() => setCursor(new Date())}>Heute</button>
          <button type="button" aria-label="Weiter" onClick={() => shift(1)}><ChevronRight size={17} /></button>
          <h2>{title}</h2>
        </div>
        <div className="calendar-view-switch" aria-label="Kalenderansicht">
          <button type="button" className={view === "week" ? "active" : ""} onClick={() => setView("week")}>Woche</button>
          <button type="button" className={view === "month" ? "active" : ""} onClick={() => setView("month")}>Monat</button>
        </div>
      </section>

      <section className="calendar-layout">
        <div className="calendar-main">
          {view === "week" ? (
            <div className="calendar-week">
              {weekDays.map(day => {
                const items = allEvents.filter(event => event.date === dateKey(day));
                return (
                  <div className={sameDay(day, today) ? "calendar-day today" : "calendar-day"} key={dateKey(day)}>
                    <div className="calendar-day-head">
                      <span>{WEEKDAYS[(day.getDay() + 6) % 7]}</span>
                      <strong>{day.getDate()}</strong>
                    </div>
                    <div className="calendar-day-body">
                      {items.length ? items.map(item => (
                        <button
                          type="button"
                          className={`calendar-event ${item.category.toLowerCase()}`}
                          key={item.id}
                          onDoubleClick={() => item.origin !== "linked" && deleteEvent(item.id)}
                          title={item.origin === "linked" ? "Automatisch aus JAN OS verknüpft" : "Doppelklick zum Löschen"}
                        >
                          <small>{item.start || "ganztägig"}</small>
                          <strong>{item.title}</strong>
                          <span>{item.sourceLabel ? item.sourceLabel + " · " : ""}{item.category}{item.origin === "linked" ? " · verknüpft" : ""}</span>
                        </button>
                      )) : (
                        <span className="calendar-free">frei</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="calendar-month">
              <div className="calendar-month-weekdays">
                {WEEKDAYS.map(day => <span key={day}>{day}</span>)}
              </div>
              <div className="calendar-month-grid">
                {monthCells.map(day => {
                  const items = allEvents.filter(event => event.date === dateKey(day));
                  const muted = day.getMonth() !== cursor.getMonth();
                  return (
                    <div
                      className={[
                        "calendar-month-cell",
                        muted ? "muted" : "",
                        sameDay(day, today) ? "today" : ""
                      ].filter(Boolean).join(" ")}
                      key={dateKey(day)}
                    >
                      <strong>{day.getDate()}</strong>
                      <div>
                        {items.slice(0, 3).map(item => (
                          <span className={`calendar-month-event ${item.category.toLowerCase()}`} key={item.id}>
                            {item.start ? `${item.start} · ` : ""}{item.title}{item.origin === "linked" ? " ↗" : ""}
                          </span>
                        ))}
                        {items.length > 3 ? <small>+{items.length - 3} weitere</small> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="calendar-side">
          <div className="calendar-stats">
            <div><strong>{todayEvents.length}</strong><span>heute</span></div>
            <div><strong>{weekEventCount}</strong><span>diese Woche</span></div>
            <div><strong>{linkedItems.length}</strong><span>automatisch verknüpft</span></div>
          </div>

          <div className="calendar-upcoming">
            <div className="calendar-side-head">
              <div>
                <span className="section-kicker">ALS NÄCHSTES</span>
                <h3>Agenda</h3>
              </div>
              <Clock3 size={17} />
            </div>

            {ready && upcoming.length ? (
              <div className="calendar-upcoming-list">
                {upcoming.map(item => (
                  <div className="calendar-upcoming-row" key={item.id}>
                    <span className={`calendar-category-dot ${item.category.toLowerCase()}`} />
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {fromDateKey(item.date).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
                        {item.start ? ` · ${item.start}` : ""}
                      </span>
                    </div>
                    <small>{item.sourceLabel || item.category}</small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="calendar-empty">
                <CalendarDays size={20} />
                <strong>Noch nichts geplant</strong>
                <span>Lege deinen ersten Termin oder Fokusblock an.</span>
              </div>
            )}
          </div>

          <div className="calendar-principle">
            <Focus size={18} />
            <div>
              <strong>Zeit ist mehr als Termine.</strong>
              <span>Fokusblöcke, Deadlines und Projekttermine laufen automatisch in diese Ansicht.</span>
            </div>
          </div>

          <div className="calendar-linked-info">
            <CalendarDays size={17} />
            <div>
              <strong>{linkedItems.length} aus JAN OS verknüpft</strong>
              <span>Projektplanung erscheint hier automatisch und bleibt an der Quelle bearbeitbar.</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="calendar-integration">
        <div>
          <span className="section-kicker">JAN OS ZEIT-ENGINE</span>
          <h2>Einmal planen, automatisch überall sichtbar.</h2>
          <p>
            Projekttermine, Deadlines und Fokusblöcke werden bereits automatisch übernommen.
            Google Calendar wird später nur noch die externe Synchronisationsschicht darüber.
          </p>
        </div>
        <span className="calendar-integration-status"><CheckCircle2 size={14} /> intern verknüpft</span>
      </section>

      {showForm ? (
        <EventForm
          initialDate={dateKey(cursor)}
          onClose={() => setShowForm(false)}
          onSave={addEvent}
        />
      ) : null}
    </>
  );
}

function EventForm({
  initialDate,
  onClose,
  onSave
}: {
  initialDate: string;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initialDate);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [category, setCategory] = useState<CalendarEvent["category"]>("Privat");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !date) return;
    onSave({
      id: makeId(),
      title: title.trim(),
      date,
      start,
      end,
      category
    });
  }

  return (
    <div className="calendar-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="calendar-modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
        <div className="calendar-modal-head">
          <div>
            <span className="section-kicker">NEUER EINTRAG</span>
            <h2>Zeit reservieren</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
        </div>

        <label>
          <span>Titel</span>
          <input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="z. B. Fokusblock Website" />
        </label>

        <div className="calendar-form-grid">
          <label>
            <span>Datum</span>
            <input type="date" value={date} onChange={event => setDate(event.target.value)} />
          </label>
          <label>
            <span>Kategorie</span>
            <select value={category} onChange={event => setCategory(event.target.value as CalendarEvent["category"])}>
              {CATEGORIES.map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Von</span>
            <input type="time" value={start} onChange={event => setStart(event.target.value)} />
          </label>
          <label>
            <span>Bis</span>
            <input type="time" value={end} onChange={event => setEnd(event.target.value)} />
          </label>
        </div>

        <div className="calendar-modal-actions">
          <button type="button" onClick={onClose}><RotateCcw size={14} /> Abbrechen</button>
          <button type="submit"><Plus size={14} /> Eintragen</button>
        </div>
      </form>
    </div>
  );
}
