"use client";

import {
  CalendarRange,
  CheckCircle2,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  PlanningItem,
  PLANNING_EVENT,
  PLANNING_STORAGE_KEY,
  readPlanningItems,
  writePlanningItems
} from "@/lib/planning";

function makeId() {
  return "health-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

export function HealthContent() {
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanningItem | null>(null);
  const [message, setMessage] = useState("");

  function refresh() {
    setItems(readPlanningItems().filter(item => item.source === "Gesundheit"));
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

  const periods = useMemo(
    () => [...items].sort((a, b) => a.date.localeCompare(b.date)),
    [items]
  );

  function saveItem(item: PlanningItem) {
    const all = readPlanningItems();
    const next = [...all.filter(existing => existing.id !== item.id), item];
    writePlanningItems(next);
    refresh();
    setShowForm(false);
    setEditingItem(null);
  }

  function editItem(item: PlanningItem) {
    setEditingItem(item);
    setShowForm(true);
  }

  function deleteItem(id: string) {
    writePlanningItems(readPlanningItems().filter(item => item.id !== id));
    refresh();
    if (editingItem?.id === id) {
      setEditingItem(null);
      setShowForm(false);
    }
  }

  async function importPrivate(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const incoming: PlanningItem[] = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(incoming) || !incoming.length) throw new Error("empty");

      const safeIncoming = incoming.filter(item => item.source === "Gesundheit");
      const map = new Map(readPlanningItems().map(item => [item.id, item]));
      safeIncoming.forEach(item => map.set(item.id, item));
      writePlanningItems(Array.from(map.values()));
      refresh();
      setMessage(safeIncoming.length + " private Gesundheitsplanung geladen");
    } catch {
      setMessage("Die private Planungsdatei konnte nicht gelesen werden.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <>
      <section className="health-hero">
        <div>
          <p className="eyebrow">GESUNDHEIT · ZEITRÄUME · TERMINE</p>
          <h1>Gesundheit & Fitness</h1>
          <p>
            Gesundheitsbezogene Zeiträume werden hier gepflegt und automatisch im Kalender sichtbar.
            Private Inhalte bleiben lokal auf deinem Gerät.
          </p>
        </div>
        <div className="health-actions">
          <span><ShieldCheck size={14} /> private Daten lokal</span>
          <label>
            <Upload size={15} /> Private Planung laden
            <input type="file" accept=".json,application/json" onChange={importPrivate} />
          </label>
          <button type="button" onClick={() => { setEditingItem(null); setShowForm(true); }}>
            <Plus size={15} /> Zeitraum hinzufügen
          </button>
        </div>
      </section>

      <section className="health-periods">
        <div className="health-periods-head">
          <div>
            <span className="section-kicker">MIT DEM KALENDER VERKNÜPFT</span>
            <h2>Gesundheitszeiträume</h2>
          </div>
          <span><CalendarRange size={15} /> automatisch im Kalender</span>
        </div>

        {periods.length ? (
          <div className="health-period-list">
            {periods.map(item => (
              <article className="health-period-card" key={item.id}>
                <span className="health-period-icon"><CalendarRange size={19} /></span>
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {formatDate(item.date)}
                    {item.endDate ? " – " + formatDate(item.endDate) : ""}
                  </span>
                </div>
                <div>
                  <strong>{item.sourceLabel}</strong>
                  {item.location ? <span><MapPin size={12} /> {item.location}</span> : null}
                </div>
                <div className="health-period-actions">
                  <button type="button" onClick={() => editItem(item)}>
                    <Pencil size={13} /> Bearbeiten
                  </button>
                  <button type="button" className="danger" onClick={() => deleteItem(item.id)} aria-label={item.title + " löschen"}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <span className="health-period-status"><CheckCircle2 size={14} /> Kalender</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="health-period-empty">
            <CalendarRange size={24} />
            <strong>Noch kein Gesundheitszeitraum eingetragen</strong>
            <span>Über „Private Planung laden“ kannst du vorbereitete sensible Daten lokal einspielen.</span>
          </div>
        )}

        {message ? <p className="health-import-message">{message}</p> : null}
      </section>

      {showForm ? (
        <HealthPeriodForm
          initialItem={editingItem}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSave={saveItem}
        />
      ) : null}
    </>
  );
}

function HealthPeriodForm({
  initialItem,
  onClose,
  onSave
}: {
  initialItem: PlanningItem | null;
  onClose: () => void;
  onSave: (item: PlanningItem) => void;
}) {
  const [title, setTitle] = useState(initialItem?.title ?? "");
  const [sourceLabel, setSourceLabel] = useState(initialItem?.sourceLabel ?? "");
  const [location, setLocation] = useState(initialItem?.location ?? "");
  const [date, setDate] = useState(initialItem?.date ?? "");
  const [endDate, setEndDate] = useState(initialItem?.endDate ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !date || !endDate) return;

    onSave({
      id: initialItem?.id ?? makeId(),
      title: title.trim(),
      date,
      endDate,
      start: "",
      end: "",
      kind: "Zeitraum",
      source: "Gesundheit",
      sourceLabel: sourceLabel.trim() || "Gesundheit",
      location: location.trim() || undefined
    });
  }

  return (
    <div className="calendar-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="calendar-modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
        <div className="calendar-modal-head">
          <div>
            <span className="section-kicker">GESUNDHEIT → KALENDER</span>
            <h2>{initialItem ? "Zeitraum bearbeiten" : "Zeitraum eintragen"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
        </div>

        <div className="project-plan-form-fields">
          <label>
            <span>Titel</span>
            <input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="z. B. Reha" />
          </label>
          <label>
            <span>Einrichtung / Kontext</span>
            <input value={sourceLabel} onChange={event => setSourceLabel(event.target.value)} placeholder="z. B. Klinik" />
          </label>
          <label>
            <span>Ort</span>
            <input value={location} onChange={event => setLocation(event.target.value)} placeholder="Ort" />
          </label>
        </div>

        <div className="calendar-form-grid">
          <label>
            <span>Von</span>
            <input type="date" value={date} onChange={event => setDate(event.target.value)} />
          </label>
          <label>
            <span>Bis</span>
            <input type="date" min={date} value={endDate} onChange={event => setEndDate(event.target.value)} />
          </label>
        </div>

        <div className="calendar-modal-actions">
          <button type="button" onClick={onClose}>Abbrechen</button>
          <button type="submit">{initialItem ? <CheckCircle2 size={14} /> : <Plus size={14} />} {initialItem ? "Änderungen speichern" : "Eintragen"}</button>
        </div>
      </form>
    </div>
  );
}
