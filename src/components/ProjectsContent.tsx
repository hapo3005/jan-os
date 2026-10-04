"use client";

import {
  CalendarCheck2,
  CalendarClock,
  Clock3,
  Focus,
  Plus,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  PlanningItem,
  PlanningKind,
  PLANNING_EVENT,
  PLANNING_STORAGE_KEY,
  readPlanningItems,
  removePlanningItem,
  writePlanningItems
} from "@/lib/planning";

function makeId() {
  return "plan-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function formatDate(value: string) {
  const parts = value.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  });
}

export function ProjectsContent() {
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [showForm, setShowForm] = useState(false);

  function refresh() {
    setItems(readPlanningItems().filter(item => item.source === "Projekt"));
  }

  useEffect(() => {
    refresh();
    window.addEventListener(PLANNING_EVENT, refresh);
    const storageListener = (event: StorageEvent) => {
      if (event.key === PLANNING_STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", storageListener);

    return () => {
      window.removeEventListener(PLANNING_EVENT, refresh);
      window.removeEventListener("storage", storageListener);
    };
  }, []);

  const upcoming = useMemo(
    () => [...items].sort((a, b) =>
      (a.date + "T" + a.start).localeCompare(b.date + "T" + b.start)
    ),
    [items]
  );

  function addItem(item: PlanningItem) {
    writePlanningItems([...readPlanningItems(), item]);
    refresh();
    setShowForm(false);
  }

  function removeItem(id: string) {
    removePlanningItem(id);
    refresh();
  }

  const deadlineCount = items.filter(item => item.kind === "Deadline").length;
  const focusCount = items.filter(item => item.kind === "Fokus").length;

  return (
    <>
      <section className="project-planner-hero">
        <div>
          <p className="eyebrow">PROJEKTZENTRALE · ZEITPLANUNG</p>
          <h1>Projekte</h1>
          <p>
            Projekttermine, Deadlines und Fokusblöcke werden einmal hier geplant
            und erscheinen automatisch im JAN-OS-Kalender.
          </p>
        </div>
        <div className="project-planner-actions">
          <span><ShieldCheck size={14} /> lokal gespeichert</span>
          <button type="button" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Planung hinzufügen
          </button>
        </div>
      </section>

      <section className="project-planner-stats">
        <div><strong>{items.length}</strong><span>Kalender-Verknüpfungen</span></div>
        <div><strong>{deadlineCount}</strong><span>Deadlines</span></div>
        <div><strong>{focusCount}</strong><span>Fokusblöcke</span></div>
      </section>

      <section className="project-planner-board">
        <div className="project-planner-head">
          <div>
            <span className="section-kicker">AUTOMATISCH IM KALENDER</span>
            <h2>Projektplanung</h2>
          </div>
          <span><CalendarCheck2 size={15} /> synchron innerhalb von JAN OS</span>
        </div>

        {upcoming.length ? (
          <div className="project-planner-list">
            {upcoming.map(item => {
              const Icon = item.kind === "Deadline" ? CalendarClock : item.kind === "Fokus" ? Focus : Clock3;
              return (
                <article className="project-planner-row" key={item.id}>
                  <span className={"project-plan-icon " + item.kind.toLowerCase()}><Icon size={17} /></span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.sourceLabel} · {item.kind}</span>
                  </div>
                  <div>
                    <strong>{formatDate(item.date)}</strong>
                    <span>{item.start || "ganztägig"}{item.end ? "–" + item.end : ""}</span>
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} aria-label={item.title + " löschen"}>
                    <Trash2 size={14} />
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="project-planner-empty">
            <CalendarCheck2 size={22} />
            <strong>Noch keine Projekttermine verknüpft</strong>
            <span>Die erste Planung erscheint danach automatisch im Kalender.</span>
          </div>
        )}
      </section>

      <section className="project-planner-rule">
        <Focus size={18} />
        <div>
          <strong>Eine Quelle, zwei Ansichten.</strong>
          <span>
            Projekt bleibt für Inhalt und Fortschritt zuständig. Der Kalender zeigt nur,
            wann etwas stattfinden oder fertig sein soll.
          </span>
        </div>
      </section>

      {showForm ? <ProjectPlanningForm onSave={addItem} onClose={() => setShowForm(false)} /> : null}
    </>
  );
}

function ProjectPlanningForm({
  onSave,
  onClose
}: {
  onSave: (item: PlanningItem) => void;
  onClose: () => void;
}) {
  const [project, setProject] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<PlanningKind>("Termin");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!project.trim() || !title.trim() || !date) return;

    onSave({
      id: makeId(),
      title: title.trim(),
      date,
      start: kind === "Deadline" ? "" : start,
      end: kind === "Deadline" ? "" : end,
      kind,
      source: "Projekt",
      sourceLabel: project.trim()
    });
  }

  return (
    <div className="calendar-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="calendar-modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
        <div className="calendar-modal-head">
          <div>
            <span className="section-kicker">PROJEKT → KALENDER</span>
            <h2>Zeitplanung verknüpfen</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
        </div>

        <div className="project-plan-form-fields">
          <label>
            <span>Projekt</span>
            <input autoFocus value={project} onChange={event => setProject(event.target.value)} placeholder="z. B. JAN OS" />
          </label>
          <label>
            <span>Eintrag</span>
            <input value={title} onChange={event => setTitle(event.target.value)} placeholder="z. B. Kalenderlogik abschließen" />
          </label>
        </div>

        <div className="calendar-form-grid">
          <label>
            <span>Art</span>
            <select value={kind} onChange={event => setKind(event.target.value as PlanningKind)}>
              <option>Termin</option>
              <option>Deadline</option>
              <option>Fokus</option>
            </select>
          </label>
          <label>
            <span>Datum</span>
            <input type="date" value={date} onChange={event => setDate(event.target.value)} />
          </label>
          {kind !== "Deadline" ? (
            <>
              <label>
                <span>Von</span>
                <input type="time" value={start} onChange={event => setStart(event.target.value)} />
              </label>
              <label>
                <span>Bis</span>
                <input type="time" value={end} onChange={event => setEnd(event.target.value)} />
              </label>
            </>
          ) : null}
        </div>

        <div className="calendar-modal-actions">
          <button type="button" onClick={onClose}>Abbrechen</button>
          <button type="submit"><Plus size={14} /> Verknüpfen</button>
        </div>
      </form>
    </div>
  );
}
