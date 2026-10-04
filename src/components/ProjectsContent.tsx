"use client";

import {
  CalendarCheck2,
  CalendarClock,
  ChevronRight,
  Clock3,
  Focus,
  FolderKanban,
  Layers3,
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

type ProjectBucket = "Jetzt" | "Als Nächstes" | "Später";

type ProjectGroup = {
  name: string;
  items: PlanningItem[];
  next: PlanningItem;
  deadlineCount: number;
  focusCount: number;
  bucket: ProjectBucket;
};

function makeId() {
  return "plan-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(value: string) {
  const parts = value.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  });
}

function daysUntil(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function bucketFor(item: PlanningItem): ProjectBucket {
  const days = daysUntil(item.date);
  if (days <= 7) return "Jetzt";
  if (days <= 30) return "Als Nächstes";
  return "Später";
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

  const groups = useMemo<ProjectGroup[]>(() => {
    const byProject = new Map<string, PlanningItem[]>();

    items.forEach(item => {
      const name = item.sourceLabel.trim() || "Ohne Projekt";
      const list = byProject.get(name) ?? [];
      list.push(item);
      byProject.set(name, list);
    });

    return Array.from(byProject.entries())
      .map(([name, projectItems]) => {
        const sorted = [...projectItems].sort((a, b) =>
          (a.date + "T" + a.start).localeCompare(b.date + "T" + b.start)
        );
        const next = sorted.find(item => item.date >= dateKey(new Date())) ?? sorted[sorted.length - 1];

        return {
          name,
          items: sorted,
          next,
          deadlineCount: sorted.filter(item => item.kind === "Deadline").length,
          focusCount: sorted.filter(item => item.kind === "Fokus").length,
          bucket: bucketFor(next)
        };
      })
      .sort((a, b) =>
        (a.next.date + "T" + a.next.start).localeCompare(b.next.date + "T" + b.next.start)
      );
  }, [items]);

  const grouped = useMemo(() => ({
    "Jetzt": groups.filter(group => group.bucket === "Jetzt"),
    "Als Nächstes": groups.filter(group => group.bucket === "Als Nächstes"),
    "Später": groups.filter(group => group.bucket === "Später")
  }), [groups]);

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
          <p className="eyebrow">PROJEKTZENTRALE · PORTFOLIO</p>
          <h1>Projekte</h1>
          <p>
            Projekte werden zuerst als Vorhaben geordnet. Termine, Deadlines und Fokusblöcke
            hängen darunter und erscheinen automatisch im JAN-OS-Kalender.
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
        <div><strong>{groups.length}</strong><span>Projekte</span></div>
        <div><strong>{deadlineCount}</strong><span>Deadlines</span></div>
        <div><strong>{focusCount}</strong><span>Fokusblöcke</span></div>
      </section>

      <section className="project-portfolio">
        <div className="project-planner-head">
          <div>
            <span className="section-kicker">AUTOMATISCH GEORDNET</span>
            <h2>Projektübersicht</h2>
          </div>
          <span><Layers3 size={15} /> nach nächstem relevanten Termin</span>
        </div>

        {groups.length ? (
          <div className="project-buckets">
            {(["Jetzt", "Als Nächstes", "Später"] as ProjectBucket[]).map(bucket => {
              const bucketGroups = grouped[bucket];
              if (!bucketGroups.length) return null;

              return (
                <section className="project-bucket" key={bucket}>
                  <div className="project-bucket-head">
                    <div>
                      <span>{bucket}</span>
                      <strong>{bucketGroups.length}</strong>
                    </div>
                    <small>
                      {bucket === "Jetzt"
                        ? "in den nächsten 7 Tagen"
                        : bucket === "Als Nächstes"
                          ? "innerhalb der nächsten 30 Tage"
                          : "später geplant"}
                    </small>
                  </div>

                  <div className="project-group-list">
                    {bucketGroups.map(group => (
                      <article className="project-group-card" key={group.name}>
                        <div className="project-group-top">
                          <span className="project-group-icon"><FolderKanban size={18} /></span>
                          <div>
                            <strong>{group.name}</strong>
                            <span>{group.items.length} Planung{group.items.length === 1 ? "" : "en"} verknüpft</span>
                          </div>
                          <ChevronRight size={17} />
                        </div>

                        <div className="project-group-next">
                          <span>NÄCHSTER PUNKT</span>
                          <strong>{group.next.title}</strong>
                          <small>{formatDate(group.next.date)}{group.next.start ? " · " + group.next.start : ""}</small>
                        </div>

                        <div className="project-group-meta">
                          <span>{group.deadlineCount} Deadline{group.deadlineCount === 1 ? "" : "s"}</span>
                          <span>{group.focusCount} Fokus</span>
                          <span>{group.items.length} Kalender-Link{group.items.length === 1 ? "" : "s"}</span>
                        </div>

                        <div className="project-group-items">
                          {group.items.map(item => {
                            const Icon = item.kind === "Deadline" ? CalendarClock : item.kind === "Fokus" ? Focus : Clock3;
                            return (
                              <div className="project-group-item" key={item.id}>
                                <span className={"project-plan-icon " + item.kind.toLowerCase()}><Icon size={15} /></span>
                                <div>
                                  <strong>{item.title}</strong>
                                  <span>{item.kind}</span>
                                </div>
                                <div>
                                  <strong>{formatDate(item.date)}</strong>
                                  <span>{item.start || "ganztägig"}{item.end ? "–" + item.end : ""}</span>
                                </div>
                                <button type="button" onClick={() => removeItem(item.id)} aria-label={item.title + " löschen"}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="project-planner-empty">
            <FolderKanban size={22} />
            <strong>Noch keine Projekte mit Planung</strong>
            <span>Sobald du eine Projektplanung anlegst, wird sie automatisch als Projekt gruppiert.</span>
          </div>
        )}
      </section>

      <section className="project-planner-rule">
        <Focus size={18} />
        <div>
          <strong>Projekt zuerst, Termin danach.</strong>
          <span>
            JAN OS gruppiert alle Einträge automatisch nach Projekt. Innerhalb eines Projekts
            bleiben Termine, Deadlines und Fokusblöcke chronologisch geordnet.
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
