"use client";

import {
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  MapPin,
  Package,
  Pencil,
  Plus,
  ShieldCheck,
  Train,
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

function checklistProgress(items: { status: string }[] = []) {
  const done = items.filter(item => item.status === "done").length;
  return { done, total: items.length };
}

export function HealthContent() {
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanningItem | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function refresh() {
    const next = readPlanningItems().filter(item => item.source === "Gesundheit");
    setItems(next);
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

  const smartItem = useMemo(
    () => periods.find(item => item.id === selectedId && item.intelligence)
      ?? periods.find(item => item.intelligence),
    [periods, selectedId]
  );

  function saveItem(item: PlanningItem) {
    const all = readPlanningItems();
    const next = [...all.filter(existing => existing.id !== item.id), item];
    writePlanningItems(next);
    refresh();
    setShowForm(false);
    setEditingItem(null);
  }

  function updateSmartItem(updated: PlanningItem) {
    const all = readPlanningItems();
    writePlanningItems(all.map(item => item.id === updated.id ? updated : item));
    refresh();
  }

  function toggleChecklist(item: PlanningItem, group: "documents" | "packing", id: string) {
    if (!item.intelligence) return;
    const list = item.intelligence[group] ?? [];
    const nextList = list.map(entry =>
      entry.id === id
        ? { ...entry, status: entry.status === "done" ? "open" as const : "done" as const }
        : entry
    );

    updateSmartItem({
      ...item,
      intelligence: { ...item.intelligence, [group]: nextList }
    });
  }

  function toggleTimeline(item: PlanningItem, id: string) {
    if (!item.intelligence) return;
    const nextTimeline = (item.intelligence.timeline ?? []).map(entry =>
      entry.id === id
        ? { ...entry, status: entry.status === "done" ? "open" as const : "done" as const }
        : entry
    );

    updateSmartItem({
      ...item,
      intelligence: { ...item.intelligence, timeline: nextTimeline }
    });
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
      setSelectedId(safeIncoming[0]?.id ?? null);
      setMessage(safeIncoming.length + " private Gesundheitsplanung geladen");
    } catch {
      setMessage("Die private Planungsdatei konnte nicht gelesen werden.");
    } finally {
      event.target.value = "";
    }
  }

  const docProgress = checklistProgress(smartItem?.intelligence?.documents);
  const packProgress = checklistProgress(smartItem?.intelligence?.packing);
  const timelineProgress = checklistProgress(smartItem?.intelligence?.timeline);
  const nextTimeline = smartItem?.intelligence?.timeline
    ?.filter(item => item.status !== "done")
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))[0];

  return (
    <>
      <section className="health-hero">
        <div>
          <p className="eyebrow">GESUNDHEIT · ZEITRÄUME · TERMINE</p>
          <h1>Gesundheit & Fitness</h1>
          <p>
            Gesundheitsbezogene Zeiträume werden hier gepflegt, vorbereitet und automatisch im Kalender sichtbar.
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
                  {item.intelligence ? (
                    <button type="button" onClick={() => setSelectedId(item.id)}>
                      Vorbereitung <ChevronRight size={13} />
                    </button>
                  ) : null}
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

      {smartItem?.intelligence ? (
        <section className="health-smart">
          <div className="health-smart-head">
            <div>
              <span className="section-kicker">INTELLIGENTE VORBEREITUNG</span>
              <h2>{smartItem.title}: alles im Blick</h2>
              <p>
                JAN OS verbindet Unterlagen, Anreise, Packliste und Klinik-Informationen zu einem einzigen Vorgang.
              </p>
            </div>
            <div className="health-smart-next">
              <Clock3 size={17} />
              <div>
                <span>NÄCHSTER SINNVOLLER SCHRITT</span>
                <strong>{nextTimeline?.label ?? "Vorbereitung vollständig"}</strong>
                {nextTimeline?.dueDate ? <small>bis {formatDate(nextTimeline.dueDate)}</small> : null}
              </div>
            </div>
          </div>

          <div className="health-smart-kpis">
            <div><strong>{docProgress.done}/{docProgress.total}</strong><span>Unterlagen</span></div>
            <div><strong>{packProgress.done}/{packProgress.total}</strong><span>Packliste</span></div>
            <div><strong>{timelineProgress.done}/{timelineProgress.total}</strong><span>Vorbereitung</span></div>
            <div className={smartItem.intelligence.travel?.status === "ready" ? "ready" : "check"}>
              <strong>{smartItem.intelligence.travel?.status === "ready" ? "✓" : "!"}</strong>
              <span>Anreise</span>
            </div>
          </div>

          <div className="health-smart-grid">
            <article className="health-smart-card">
              <div className="health-smart-card-head">
                <span><FileText size={18} /></span>
                <div>
                  <span className="section-kicker">UNTERLAGEN</span>
                  <h3>Was muss mit?</h3>
                </div>
              </div>
              <div className="health-check-list">
                {(smartItem.intelligence.documents ?? []).map(entry => (
                  <button type="button" key={entry.id} onClick={() => toggleChecklist(smartItem, "documents", entry.id)}>
                    <span className={entry.status === "done" ? "health-check done" : "health-check"}>
                      {entry.status === "done" ? <CheckCircle2 size={15} /> : null}
                    </span>
                    <span>
                      <strong>{entry.label}</strong>
                      {entry.detail ? <small>{entry.detail}</small> : null}
                    </span>
                  </button>
                ))}
              </div>
            </article>

            <article className="health-smart-card">
              <div className="health-smart-card-head">
                <span><Package size={18} /></span>
                <div>
                  <span className="section-kicker">PACKLISTE</span>
                  <h3>Was gehört in den Koffer?</h3>
                </div>
              </div>
              <div className="health-check-list">
                {(smartItem.intelligence.packing ?? []).map(entry => (
                  <button type="button" key={entry.id} onClick={() => toggleChecklist(smartItem, "packing", entry.id)}>
                    <span className={entry.status === "done" ? "health-check done" : "health-check"}>
                      {entry.status === "done" ? <CheckCircle2 size={15} /> : null}
                    </span>
                    <span>
                      <strong>{entry.label}</strong>
                      {entry.detail ? <small>{entry.detail}</small> : null}
                    </span>
                  </button>
                ))}
              </div>
            </article>

            <article className="health-smart-card travel">
              <div className="health-smart-card-head">
                <span><Train size={18} /></span>
                <div>
                  <span className="section-kicker">ANREISE</span>
                  <h3>Ohne Stress zur Klinik</h3>
                </div>
              </div>
              {smartItem.intelligence.travel ? (
                <div className="health-travel">
                  <div>
                    <span>Start</span>
                    <strong>{smartItem.intelligence.travel.origin}</strong>
                  </div>
                  <div>
                    <span>Ziel</span>
                    <strong>{smartItem.intelligence.travel.destination}</strong>
                  </div>
                  {smartItem.intelligence.travel.clinicArrivalWindow ? (
                    <div>
                      <span>Aufnahme</span>
                      <strong>{smartItem.intelligence.travel.clinicArrivalWindow}</strong>
                    </div>
                  ) : null}
                  {smartItem.intelligence.travel.targetArrival ? (
                    <div>
                      <span>Zielankunft Bahnhof</span>
                      <strong>{smartItem.intelligence.travel.targetArrival}</strong>
                    </div>
                  ) : null}
                  {smartItem.intelligence.travel.routeHint ? <p>{smartItem.intelligence.travel.routeHint}</p> : null}
                  {smartItem.intelligence.travel.note ? <p className="health-travel-note">{smartItem.intelligence.travel.note}</p> : null}
                  <div className="health-travel-actions">
                    {smartItem.intelligence.travel.searchUrl ? (
                      <a href={smartItem.intelligence.travel.searchUrl} target="_blank" rel="noreferrer">
                        Bahn prüfen <ExternalLink size={13} />
                      </a>
                    ) : null}
                    {smartItem.intelligence.travel.clinicTravelUrl ? (
                      <a href={smartItem.intelligence.travel.clinicTravelUrl} target="_blank" rel="noreferrer">
                        Klinik-Anreise <ExternalLink size={13} />
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>

            <article className="health-smart-card">
              <div className="health-smart-card-head">
                <span><MapPin size={18} /></span>
                <div>
                  <span className="section-kicker">VOR ORT</span>
                  <h3>Wichtige Klinik-Infos</h3>
                </div>
              </div>
              <div className="health-facts">
                {(smartItem.intelligence.facts ?? []).map(fact => (
                  <div key={fact.label}>
                    <span>{fact.label}</span>
                    <strong>{fact.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <article className="health-timeline">
            <div className="health-smart-card-head">
              <span><Clock3 size={18} /></span>
              <div>
                <span className="section-kicker">VORBEREITUNGSPLAN</span>
                <h3>Was wann erledigt werden sollte</h3>
              </div>
            </div>
            <div className="health-timeline-list">
              {(smartItem.intelligence.timeline ?? []).map(entry => (
                <button type="button" key={entry.id} onClick={() => toggleTimeline(smartItem, entry.id)}>
                  <span className={entry.status === "done" ? "health-check done" : "health-check"}>
                    {entry.status === "done" ? <CheckCircle2 size={15} /> : null}
                  </span>
                  <span>
                    <strong>{entry.label}</strong>
                    {entry.detail ? <small>{entry.detail}</small> : null}
                  </span>
                  <time>{entry.dueDate ? formatDate(entry.dueDate) : "offen"}</time>
                </button>
              ))}
            </div>
          </article>

          {smartItem.intelligence.sources?.length ? (
            <div className="health-smart-sources">
              <span>Recherche-Stand: {smartItem.intelligence.generatedAt ? formatDate(smartItem.intelligence.generatedAt) : "aktuell"}</span>
              <div>
                {smartItem.intelligence.sources.map(source => (
                  <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                    {source.label} <ExternalLink size={11} />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : periods.length ? (
        <section className="health-smart-placeholder">
          <ShieldCheck size={20} />
          <div>
            <strong>Dieser Zeitraum hat noch keine intelligente Vorbereitung.</strong>
            <span>JAN OS kann dafür Unterlagen, Packliste, Anreise und Klinik-Infos zusammenführen.</span>
          </div>
        </section>
      ) : null}

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
      location: location.trim() || undefined,
      intelligence: initialItem?.intelligence
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
