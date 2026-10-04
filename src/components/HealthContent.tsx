"use client";

import {
  BriefcaseBusiness,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileText,
  Home,
  MapPin,
  Package,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Train,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  HealthIntelligence,
  PlanningItem,
  SmartChecklistItem,
  PLANNING_EVENT,
  PLANNING_STORAGE_KEY,
  readPlanningItems,
  writePlanningItems
} from "@/lib/planning";

type ChecklistGroup = "documents" | "packing" | "home" | "arrival" | "departure" | "questions";

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

function daysUntil(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

function checklistProgress(items: { status: string }[] = []) {
  const done = items.filter(item => item.status === "done").length;
  return { done, total: items.length };
}

function mergeChecklist(current: SmartChecklistItem[] = [], additions: SmartChecklistItem[]) {
  const byId = new Map(current.map(item => [item.id, item]));
  additions.forEach(item => {
    if (!byId.has(item.id)) byId.set(item.id, item);
  });
  return Array.from(byId.values());
}

function enrichRehaIntelligence(item: PlanningItem): PlanningItem {
  if (!item.intelligence) return item;
  const looksLikeReha = (item.title + " " + item.sourceLabel).toLowerCase().includes("reha")
    || item.sourceLabel.toLowerCase().includes("klinik");
  if (!looksLikeReha) return item;

  const intelligence: HealthIntelligence = {
    ...item.intelligence,
    documents: mergeChecklist(item.intelligence.documents, [
      { id: "doc-food-intolerance", label: "Unverträglichkeiten schriftlich festhalten", detail: "Falls relevant: Liste ins Handgepäck, damit sie bei der Aufnahme direkt vorliegt.", status: "check" },
      { id: "doc-aids", label: "Benötigte Hilfsmittel prüfen", detail: "Nur falls relevant: z. B. Einlagen, Bandagen, Messgeräte oder andere regelmäßig genutzte Hilfsmittel.", status: "check" }
    ]),
    home: mergeChecklist(item.intelligence.home, [
      { id: "home-key", label: "Hausschlüssel / Notfallzugang organisieren", detail: "Falls sinnvoll, Schlüssel bei einer vertrauten Person hinterlegen.", status: "open" },
      { id: "home-post", label: "Post und laufende Dinge zuhause klären", detail: "Post, Lieferungen und andere wiederkehrende Aufgaben für die Abwesenheit organisieren.", status: "open" },
      { id: "home-payments", label: "Fällige Zahlungen und Termine prüfen", detail: "Sicherstellen, dass während des Aufenthalts nichts unnötig liegen bleibt.", status: "open" },
      { id: "home-valuables", label: "Wertsachen bewusst zuhause lassen", detail: "Die Klinik empfiehlt, Schmuck und größere Bargeldbeträge nicht mitzunehmen.", status: "open" }
    ]),
    arrival: mergeChecklist(item.intelligence.arrival, [
      { id: "arrival-window", label: "Ankunft zwischen 08:00 und 11:00 einplanen", detail: "Späteste Ankunft laut Klinik: 11:00 Uhr.", status: "open" },
      { id: "arrival-handbag", label: "Wichtige Unterlagen ins Handgepäck", detail: "Versicherungskarte, Befunde und regelmäßig benötigte Medikamente nicht tief im Koffer verstauen.", status: "open" },
      { id: "arrival-travel-final", label: "Anreise kurz vorher final prüfen", detail: "Fahrplan, Baustellen, Anschlüsse und Puffer wenige Tage vor Abfahrt erneut kontrollieren.", status: "check" },
      { id: "arrival-taxi", label: "Taxi ab Bahnhof Bad Neuenahr einplanen", detail: "Fahrt dauert laut Klinik etwa fünf Minuten; Fahrgeld wird am Empfang erstattet.", status: "open" }
    ]),
    questions: mergeChecklist(item.intelligence.questions, [
      { id: "question-goals", label: "3 persönliche Reha-Ziele notieren", detail: "Damit du in der Aufnahmeuntersuchung klar sagen kannst, was du aus der Reha mitnehmen möchtest.", status: "open" },
      { id: "question-meds", label: "Fragen zu Medikamenten / Alltag notieren", detail: "Alles sammeln, was du mit dem ärztlichen Team konkret klären möchtest.", status: "open" },
      { id: "question-aftercare", label: "Nachsorge schon mitdenken", detail: "Fragen zu Nachsorge, weiterer Behandlung und Alltag nach der Reha notieren.", status: "open" }
    ]),
    departure: mergeChecklist(item.intelligence.departure, [
      { id: "departure-nursing", label: "Am Abreisetag 07:30–08:00 beim Pflegedienst melden", detail: "Dort werden Unterlagen, Schlüssel und Leihgegenstände abgegeben.", status: "open" },
      { id: "departure-docs", label: "Entlassungsunterlagen vollständig mitnehmen", detail: "Vor Heimreise prüfen, ob alle Unterlagen ausgehändigt wurden.", status: "open" },
      { id: "departure-station", label: "Bei Bedarf Bahnhofstransfer am Vortag anmelden", detail: "Laut Klinik spätestens am Vortag am Empfang Bescheid geben.", status: "check" }
    ])
  };

  return { ...item, intelligence };
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

export function HealthContent() {
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanningItem | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function syncAndRefresh() {
    const all = readPlanningItems();
    let changed = false;
    const upgraded = all.map(item => {
      if (item.source !== "Gesundheit") return item;
      const next = enrichRehaIntelligence(item);
      if (JSON.stringify(next) !== JSON.stringify(item)) changed = true;
      return next;
    });
    if (changed) {
      window.localStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(upgraded));
    }
    setItems(upgraded.filter(item => item.source === "Gesundheit"));
  }

  useEffect(() => {
    const imported = readPrivateImportFromHash();
    if (imported.length) {
      const map = new Map(readPlanningItems().map(item => [item.id, item]));
      imported
        .filter(item => item.source === "Gesundheit")
        .map(enrichRehaIntelligence)
        .forEach(item => map.set(item.id, item));
      writePlanningItems(Array.from(map.values()));
      setSelectedId(imported[0]?.id ?? null);
      setMessage("Private Gesundheitsplanung aktualisiert");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    syncAndRefresh();
    window.addEventListener(PLANNING_EVENT, syncAndRefresh);
    const storageListener = (event: StorageEvent) => {
      if (event.key === PLANNING_STORAGE_KEY) syncAndRefresh();
    };
    window.addEventListener("storage", storageListener);
    return () => {
      window.removeEventListener(PLANNING_EVENT, syncAndRefresh);
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
    const nextItem = enrichRehaIntelligence(item);
    writePlanningItems([...all.filter(existing => existing.id !== item.id), nextItem]);
    syncAndRefresh();
    setSelectedId(nextItem.id);
    setShowForm(false);
    setEditingItem(null);
  }

  function updateSmartItem(updated: PlanningItem) {
    const all = readPlanningItems();
    writePlanningItems(all.map(item => item.id === updated.id ? updated : item));
    syncAndRefresh();
  }

  function toggleChecklist(item: PlanningItem, group: ChecklistGroup, id: string) {
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
    updateSmartItem({ ...item, intelligence: { ...item.intelligence, timeline: nextTimeline } });
  }

  function editItem(item: PlanningItem) {
    setEditingItem(item);
    setShowForm(true);
  }

  function deleteItem(id: string) {
    writePlanningItems(readPlanningItems().filter(item => item.id !== id));
    syncAndRefresh();
  }

  async function importPrivate(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const incoming: PlanningItem[] = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(incoming) || !incoming.length) throw new Error("empty");
      const safeIncoming = incoming.filter(item => item.source === "Gesundheit").map(enrichRehaIntelligence);
      const map = new Map(readPlanningItems().map(item => [item.id, item]));
      safeIncoming.forEach(item => map.set(item.id, item));
      writePlanningItems(Array.from(map.values()));
      syncAndRefresh();
      setSelectedId(safeIncoming[0]?.id ?? null);
      setMessage(safeIncoming.length + " private Gesundheitsplanung geladen");
    } catch {
      setMessage("Die private Planungsdatei konnte nicht gelesen werden.");
    } finally {
      event.target.value = "";
    }
  }

  const intel = smartItem?.intelligence;
  const groups = useMemo(() => {
    if (!intel) return [];
    return [
      { key: "documents" as const, label: "Unterlagen", icon: FileText, items: intel.documents ?? [] },
      { key: "arrival" as const, label: "Anreise", icon: Train, items: intel.arrival ?? [] },
      { key: "packing" as const, label: "Koffer", icon: Package, items: intel.packing ?? [] },
      { key: "home" as const, label: "Zuhause", icon: Home, items: intel.home ?? [] },
      { key: "questions" as const, label: "Aufnahme", icon: ClipboardCheck, items: intel.questions ?? [] },
      { key: "departure" as const, label: "Abreise", icon: BriefcaseBusiness, items: intel.departure ?? [] }
    ];
  }, [intel]);

  const totalProgress = useMemo(() => {
    const all = groups.flatMap(group => group.items);
    return checklistProgress(all);
  }, [groups]);

  const readiness = totalProgress.total ? Math.round(totalProgress.done / totalProgress.total * 100) : 0;
  const nextTimeline = intel?.timeline
    ?.filter(item => item.status !== "done")
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))[0];
  const days = smartItem ? daysUntil(smartItem.date) : 0;

  return (
    <>
      <section className="health-hero">
        <div>
          <p className="eyebrow">GESUNDHEIT · VORBEREITUNG · TERMINE</p>
          <h1>Gesundheit & Fitness</h1>
          <p>Gesundheitszeiträume mit klarer Vorbereitung, nächsten Schritten und Kalender-Verknüpfung.</p>
        </div>
        <div className="health-actions">
          <span><ShieldCheck size={14} /> private Daten lokal</span>
          <label><Upload size={15} /> Planung laden<input type="file" accept=".json,application/json" onChange={importPrivate} /></label>
          <button type="button" onClick={() => { setEditingItem(null); setShowForm(true); }}><Plus size={15} /> Zeitraum hinzufügen</button>
        </div>
      </section>

      {periods.length ? (
        <section className="health-periods health-periods-compact">
          <div className="health-periods-head">
            <div><span className="section-kicker">AKTIVER GESUNDHEITSVORGANG</span><h2>Aufenthalt & Zeitraum</h2></div>
            <span><CalendarRange size={15} /> mit Kalender verknüpft</span>
          </div>
          <div className="health-period-list">
            {periods.map(item => (
              <article className={`health-period-card ${smartItem?.id === item.id ? "selected" : ""}`} key={item.id}>
                <span className="health-period-icon"><CalendarRange size={19} /></span>
                <button type="button" className="health-period-main" onClick={() => setSelectedId(item.id)}>
                  <strong>{item.title}</strong>
                  <span>{formatDate(item.date)}{item.endDate ? " – " + formatDate(item.endDate) : ""}</span>
                </button>
                <div><strong>{item.sourceLabel}</strong>{item.location ? <span><MapPin size={12} /> {item.location}</span> : null}</div>
                <div className="health-period-actions">
                  <button type="button" onClick={() => editItem(item)}><Pencil size={13} /> Bearbeiten</button>
                  <button type="button" className="danger" onClick={() => deleteItem(item.id)}><Trash2 size={13} /></button>
                </div>
              </article>
            ))}
          </div>
          {message ? <p className="health-import-message">{message}</p> : null}
        </section>
      ) : null}

      {smartItem && intel ? (
        <section className="health-smart health-smart-v2">
          <div className="health-command">
            <div className="health-command-main">
              <span className="section-kicker">REHA-VORBEREITUNG</span>
              <h2>{smartItem.title}</h2>
              <p>{smartItem.sourceLabel}{smartItem.location ? " · " + smartItem.location : ""} · {formatDate(smartItem.date)}–{smartItem.endDate ? formatDate(smartItem.endDate) : ""}</p>
              <div className="health-command-meta">
                <span><CalendarRange size={14} /> noch {days} Tage</span>
                <span><CheckCircle2 size={14} /> {totalProgress.done} von {totalProgress.total} Punkten erledigt</span>
              </div>
            </div>

            <div className="health-readiness">
              <strong>{readiness}%</strong>
              <span>vorbereitet</span>
              <div><i style={{ width: readiness + "%" }} /></div>
            </div>

            <div className="health-next-action">
              <Clock3 size={18} />
              <div>
                <span>NÄCHSTER SCHRITT</span>
                <strong>{nextTimeline?.label ?? "Vorbereitung vollständig"}</strong>
                {nextTimeline?.dueDate ? <small>bis {formatDate(nextTimeline.dueDate)}</small> : null}
              </div>
            </div>
          </div>

          <div className="health-overview-grid">
            {groups.map(group => {
              const progress = checklistProgress(group.items);
              const Icon = group.icon;
              return (
                <a href={"#" + group.key} className="health-overview-card" key={group.key}>
                  <span><Icon size={16} /></span>
                  <div><strong>{group.label}</strong><small>{progress.done}/{progress.total} erledigt</small></div>
                  <b>{progress.total ? Math.round(progress.done / progress.total * 100) : 0}%</b>
                </a>
              );
            })}
          </div>

          <div className="health-now">
            <div className="health-now-head">
              <div><span className="section-kicker">JETZT WICHTIG</span><h3>Die nächsten Punkte</h3></div>
              <Sparkles size={17} />
            </div>
            <div className="health-now-list">
              {(intel.timeline ?? []).filter(item => item.status !== "done").slice(0, 3).map(entry => (
                <button type="button" key={entry.id} onClick={() => toggleTimeline(smartItem, entry.id)}>
                  <span className="health-check" />
                  <div><strong>{entry.label}</strong>{entry.detail ? <small>{entry.detail}</small> : null}</div>
                  <time>{entry.dueDate ? formatDate(entry.dueDate) : "offen"}</time>
                </button>
              ))}
            </div>
          </div>

          <div className="health-detail-stack">
            {groups.map((group, index) => {
              const progress = checklistProgress(group.items);
              const Icon = group.icon;
              return (
                <details id={group.key} className="health-detail-section" key={group.key} open={index === 0}>
                  <summary>
                    <span className="health-detail-icon"><Icon size={17} /></span>
                    <div><strong>{group.label}</strong><span>{progress.done}/{progress.total} erledigt</span></div>
                    <ChevronRight size={16} />
                  </summary>
                  <div className="health-detail-body">
                    <div className="health-check-list compact">
                      {group.items.map(entry => (
                        <button type="button" key={entry.id} onClick={() => toggleChecklist(smartItem, group.key, entry.id)}>
                          <span className={entry.status === "done" ? "health-check done" : "health-check"}>
                            {entry.status === "done" ? <CheckCircle2 size={15} /> : null}
                          </span>
                          <span><strong>{entry.label}</strong>{entry.detail ? <small>{entry.detail}</small> : null}</span>
                        </button>
                      ))}
                    </div>

                    {group.key === "arrival" && intel.travel ? (
                      <div className="health-travel-compact">
                        <div><span>Aufnahme</span><strong>{intel.travel.clinicArrivalWindow ?? "prüfen"}</strong></div>
                        <div><span>Zielankunft</span><strong>{intel.travel.targetArrival ?? "prüfen"}</strong></div>
                        {intel.travel.routeHint ? <p>{intel.travel.routeHint}</p> : null}
                        <div className="health-travel-actions">
                          {intel.travel.searchUrl ? <a href={intel.travel.searchUrl} target="_blank" rel="noreferrer">Bahn prüfen <ExternalLink size={12} /></a> : null}
                          {intel.travel.clinicTravelUrl ? <a href={intel.travel.clinicTravelUrl} target="_blank" rel="noreferrer">Klinik-Anreise <ExternalLink size={12} /></a> : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>

          <div className="health-clinic-strip">
            <div><span>Aufnahme</span><strong>{intel.travel?.clinicArrivalWindow ?? "08:00–11:00"}</strong></div>
            {(intel.facts ?? []).slice(0, 4).map(fact => <div key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong></div>)}
          </div>

          {intel.sources?.length ? (
            <div className="health-smart-sources">
              <span>Recherche-Stand: {intel.generatedAt ? formatDate(intel.generatedAt) : "aktuell"}</span>
              <div>{intel.sources.map(source => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.label} <ExternalLink size={11} /></a>)}</div>
            </div>
          ) : null}
        </section>
      ) : periods.length ? (
        <section className="health-smart-placeholder">
          <ShieldCheck size={20} />
          <div><strong>Noch keine intelligente Vorbereitung.</strong><span>Für diesen Zeitraum können Unterlagen, Anreise, Packen und Organisation ergänzt werden.</span></div>
        </section>
      ) : (
        <section className="health-period-empty">
          <CalendarRange size={24} />
          <strong>Noch kein Gesundheitszeitraum eingetragen</strong>
          <span>Lege einen Zeitraum an oder lade eine private Planung.</span>
        </section>
      )}

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

function HealthPeriodForm({ initialItem, onClose, onSave }: {
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
          <div><span className="section-kicker">GESUNDHEIT → KALENDER</span><h2>{initialItem ? "Zeitraum bearbeiten" : "Zeitraum eintragen"}</h2></div>
          <button type="button" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
        </div>
        <div className="project-plan-form-fields">
          <label><span>Titel</span><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="z. B. Reha" /></label>
          <label><span>Einrichtung / Kontext</span><input value={sourceLabel} onChange={event => setSourceLabel(event.target.value)} placeholder="z. B. Klinik" /></label>
          <label><span>Ort</span><input value={location} onChange={event => setLocation(event.target.value)} placeholder="Ort" /></label>
        </div>
        <div className="calendar-form-grid">
          <label><span>Von</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
          <label><span>Bis</span><input type="date" min={date} value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
        </div>
        <div className="calendar-modal-actions">
          <button type="button" onClick={onClose}>Abbrechen</button>
          <button type="submit">{initialItem ? <CheckCircle2 size={14} /> : <Plus size={14} />} {initialItem ? "Änderungen speichern" : "Eintragen"}</button>
        </div>
      </form>
    </div>
  );
}
