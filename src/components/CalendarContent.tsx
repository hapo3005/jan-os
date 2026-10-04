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
  Sparkles,
  ExternalLink,
  MapPin,
  TicketCheck,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  PlanningItem,
  PLANNING_EVENT,
  PLANNING_STORAGE_KEY,
  readPlanningItems,
  writePlanningItems
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
  planningId?: string;
  hasBriefing?: boolean;
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

function datesBetween(start: string, end?: string) {
  const startDate = fromDateKey(start);
  const endDate = end ? fromDateKey(end) : startDate;
  const days: string[] = [];

  for (let date = new Date(startDate); date <= endDate; date = addDays(date, 1)) {
    days.push(dateKey(date));
  }

  return days;
}

function linkedCategory(item: PlanningItem): CalendarEvent["category"] {
  if (item.source === "Gesundheit") return "Gesundheit";
  if (item.source === "KISS") return "KISS";
  if (item.kind === "Deadline") return "Deadline";
  if (item.kind === "Fokus") return "Fokus";
  if (item.source === "Leben") return "Privat";
  return "Projekt";
}

function planningToCalendarEvents(item: PlanningItem): CalendarEvent[] {
  return datesBetween(item.date, item.endDate).map(day => ({
    id: "linked-" + item.id + "-" + day,
    title: item.title,
    date: day,
    start: item.start,
    end: item.end,
    category: linkedCategory(item),
    origin: "linked",
    sourceLabel: item.location ? item.sourceLabel + " · " + item.location : item.sourceLabel,
    planningId: item.id,
    hasBriefing: Boolean(item.eventBriefing)
  }));
}

function readPrivateImportFromHash(): PlanningItem[] {
  const prefix = "#jan-import=";
  if (!window.location.hash.startsWith(prefix)) return [];

  try {
    const encoded = window.location.hash.slice(prefix.length);
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(decoded);
    const items: PlanningItem[] = Array.isArray(parsed) ? parsed : parsed.items;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function CalendarContent() {
  const [view, setView] = useState<CalendarView>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [linkedItems, setLinkedItems] = useState<PlanningItem[]>([]);
  const [ready, setReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [importNotice, setImportNotice] = useState("");
  const [selectedBriefingId, setSelectedBriefingId] = useState<string | null>(null);

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

      const imported = readPrivateImportFromHash();
      if (imported.length) {
        const map = new Map(readPlanningItems().map(item => [item.id, item]));
        imported.forEach(item => map.set(item.id, item));
        const merged = Array.from(map.values());
        writePlanningItems(merged);
        setLinkedItems(merged);
        setImportNotice(imported.length === 1 ? "Privater Termin lokal eingetragen" : imported.length + " private Einträge lokal eingetragen");
        setSelectedBriefingId(imported.find(item => item.eventBriefing)?.id ?? null);
        setCursor(fromDateKey(imported[0].date));
        setView("month");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } else {
        refreshLinked();
      }
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

  const linkedEvents = useMemo(
    () => linkedItems.flatMap(planningToCalendarEvents),
    [linkedItems]
  );
  const allEvents = useMemo(
    () => [...events.map(item => ({ ...item, origin: item.origin ?? "manual" as const })), ...linkedEvents]
      .sort((a, b) => (a.date + "T" + a.start).localeCompare(b.date + "T" + b.start)),
    [events, linkedEvents]
  );

  const briefingItem = useMemo(
    () => linkedItems.find(item => item.id === selectedBriefingId && item.eventBriefing)
      ?? linkedItems
        .filter(item => item.eventBriefing && item.date >= dateKey(new Date()))
        .sort((a, b) => a.date.localeCompare(b.date))[0],
    [linkedItems, selectedBriefingId]
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

      {importNotice ? (
        <div className="calendar-import-notice">
          <CheckCircle2 size={16} />
          <span>{importNotice}</span>
        </div>
      ) : null}

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
                          onClick={() => item.planningId && item.hasBriefing ? setSelectedBriefingId(item.planningId) : undefined}
                          onDoubleClick={() => item.origin !== "linked" && deleteEvent(item.id)}
                          title={item.hasBriefing ? "Klicken für intelligentes Briefing" : item.origin === "linked" ? "Automatisch aus JAN OS verknüpft" : "Doppelklick zum Löschen"}
                        >
                          <small>{item.start || "ganztägig"}</small>
                          <strong>{item.title}</strong>
                          <span>{item.sourceLabel ? item.sourceLabel + " · " : ""}{item.category}{item.hasBriefing ? " · Briefing" : item.origin === "linked" ? " · verknüpft" : ""}</span>
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

      {briefingItem?.eventBriefing ? (
        <section className="event-briefing">
          <div className="event-briefing-head">
            <div>
              <span className="section-kicker">INTELLIGENTES EVENT-BRIEFING</span>
              <h2>{briefingItem.title}</h2>
              <p>{briefingItem.eventBriefing.headline ?? briefingItem.eventBriefing.summary}</p>
            </div>
            <span className="event-briefing-badge"><Sparkles size={14} /> recherchiert</span>
          </div>

          <div className="event-briefing-grid">
            <article className="event-briefing-card">
              <div className="event-briefing-card-head"><TicketCheck size={18} /><strong>Das Wichtigste</strong></div>
              <div className="event-briefing-facts">
                {(briefingItem.eventBriefing.facts ?? []).map(fact => (
                  <div key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong></div>
                ))}
              </div>
            </article>

            <article className="event-briefing-card recommendation">
              <div className="event-briefing-card-head"><Sparkles size={18} /><strong>Meine Empfehlung</strong></div>
              <p>{briefingItem.eventBriefing.recommendation}</p>
              {(briefingItem.eventBriefing.tips ?? []).length ? (
                <div className="event-briefing-tips">
                  {(briefingItem.eventBriefing.tips ?? []).map(tip => <span key={tip}>{tip}</span>)}
                </div>
              ) : null}
            </article>

            {briefingItem.eventBriefing.travel ? (
              <article className="event-briefing-card">
                <div className="event-briefing-card-head"><MapPin size={18} /><strong>Anreise</strong></div>
                <div className="event-briefing-travel">
                  <div><span>Start</span><strong>{briefingItem.eventBriefing.travel.origin}</strong></div>
                  <div><span>Ziel</span><strong>{briefingItem.eventBriefing.travel.destination}</strong></div>
                  {briefingItem.eventBriefing.travel.routeHint ? <p>{briefingItem.eventBriefing.travel.routeHint}</p> : null}
                  <div className="event-briefing-links">
                    {briefingItem.eventBriefing.travel.searchUrl ? <a href={briefingItem.eventBriefing.travel.searchUrl} target="_blank" rel="noreferrer">Route prüfen <ExternalLink size={12} /></a> : null}
                    {briefingItem.eventBriefing.travel.clinicTravelUrl ? <a href={briefingItem.eventBriefing.travel.clinicTravelUrl} target="_blank" rel="noreferrer">Veranstalter-Info <ExternalLink size={12} /></a> : null}
                  </div>
                </div>
              </article>
            ) : null}

            <article className="event-briefing-card">
              <div className="event-briefing-card-head"><CheckCircle2 size={18} /><strong>Vorher erledigen</strong></div>
              <div className="event-briefing-checks">
                {(briefingItem.eventBriefing.checklist ?? []).map(item => (
                  <div key={item.id}>
                    <span className={item.status === "done" ? "done" : ""}>{item.status === "done" ? "✓" : ""}</span>
                    <div><strong>{item.label}</strong>{item.detail ? <small>{item.detail}</small> : null}</div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="event-briefing-footer">
            <span>{briefingItem.eventBriefing.refreshNote ?? "Dynamische Infos werden vor dem Termin erneut geprüft."}</span>
            <div>
              {(briefingItem.eventBriefing.sources ?? []).map(source => (
                <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.label} <ExternalLink size={11} /></a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="calendar-integration">
        <div>
          <span className="section-kicker">JAN OS ZEIT-ENGINE</span>
          <h2>Einmal planen, automatisch überall sichtbar.</h2>
          <p>
            Projekttermine, Deadlines, Fokusblöcke und mehrtägige Zeiträume werden automatisch übernommen.
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
