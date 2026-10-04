"use client";

import {
  ArrowUpRight,
  CalendarCheck2,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Flag,
  Gauge,
  Link2,
  Milestone,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Target,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type GoalHorizon = "30 Tage" | "90 Tage" | "6 Monate" | "1 Jahr" | "5 Jahre";
type GoalStatus = "aktiv" | "wartet" | "erreicht";
type GoalArea = "Leben" | "Gesundheit" | "Finanzen" | "KISS" | "Projekte";

type GoalItem = {
  id: string;
  title: string;
  horizon: GoalHorizon;
  targetDate: string;
  result: string;
  progress: number;
  nextStep: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt?: string;
  lastReviewedAt?: string;
  parentGoalId?: string;
  area?: GoalArea;
};

const STORAGE_KEY = "jan-os-goals-v2";
const LEGACY_KEY = "jan-os-goals-v1";

const horizonOrder: GoalHorizon[] = ["30 Tage", "90 Tage", "6 Monate", "1 Jahr", "5 Jahre"];
const areaOptions: GoalArea[] = ["Leben", "Gesundheit", "Finanzen", "KISS", "Projekte"];

const horizonCopy: Record<GoalHorizon, string> = {
  "30 Tage": "Jetzt konkret werden",
  "90 Tage": "Quartalsfokus",
  "6 Monate": "Halbjahresziel",
  "1 Jahr": "Jahresergebnis",
  "5 Jahre": "Strategische Richtung"
};

const reviewCadence: Record<GoalHorizon, number> = {
  "30 Tage": 7,
  "90 Tage": 14,
  "6 Monate": 30,
  "1 Jahr": 45,
  "5 Jahre": 90
};

function makeId() {
  return "goal-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  if (!value) return "ohne Termin";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function parseDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function daysUntil(value: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const target = parseDate(value);
  const today = parseDate(todayKey());
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function daysSince(value: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const start = parseDate(value);
  const today = parseDate(todayKey());
  return Math.floor((today.getTime() - start.getTime()) / 86400000);
}

function horizonRank(horizon: GoalHorizon) {
  return horizonOrder.indexOf(horizon);
}

function defaultTargetDate(horizon: GoalHorizon) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  if (horizon === "30 Tage") date.setDate(date.getDate() + 30);
  if (horizon === "90 Tage") date.setDate(date.getDate() + 90);
  if (horizon === "6 Monate") date.setMonth(date.getMonth() + 6);
  if (horizon === "1 Jahr") date.setFullYear(date.getFullYear() + 1);
  if (horizon === "5 Jahre") date.setFullYear(date.getFullYear() + 5);
  return date.toISOString().slice(0, 10);
}

function normalizeGoal(raw: Partial<GoalItem>): GoalItem {
  return {
    id: raw.id ?? makeId(),
    title: raw.title ?? "",
    horizon: raw.horizon ?? "90 Tage",
    targetDate: raw.targetDate ?? defaultTargetDate(raw.horizon ?? "90 Tage"),
    result: raw.result ?? "",
    progress: Number(raw.progress) || 0,
    nextStep: raw.nextStep ?? "",
    status: raw.status ?? "aktiv",
    createdAt: raw.createdAt ?? todayKey(),
    updatedAt: raw.updatedAt,
    lastReviewedAt: raw.lastReviewedAt,
    parentGoalId: raw.parentGoalId,
    area: raw.area ?? "Leben"
  };
}

function goalHealth(goal: GoalItem) {
  if (goal.status === "erreicht") return { key: "done", label: "Erreicht" };
  if (goal.status === "wartet") return { key: "waiting", label: "Wartet" };

  const days = daysUntil(goal.targetDate);
  if (days < 0) return { key: "late", label: "Überfällig" };
  if (days <= 14 && goal.progress < 80) return { key: "attention", label: "Aufmerksamkeit" };
  return { key: "ontrack", label: "Im Plan" };
}

function reviewDue(goal: GoalItem) {
  if (goal.status !== "aktiv") return false;
  const base = goal.lastReviewedAt ?? goal.createdAt;
  return daysSince(base) >= reviewCadence[goal.horizon];
}

export function GoalsContent() {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GoalItem | null>(null);
  const [activeHorizon, setActiveHorizon] = useState<GoalHorizon | "Alle">("Alle");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const migrated = parsed.map(item => normalizeGoal(item));
          setGoals(migrated);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  function persist(next: GoalItem[]) {
    setGoals(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function saveGoal(goal: GoalItem) {
    const normalized = { ...goal, updatedAt: todayKey() };
    persist([...goals.filter(item => item.id !== goal.id), normalized]);
    setEditing(null);
    setShowForm(false);
  }

  function removeGoal(id: string) {
    persist(goals
      .filter(goal => goal.id !== id)
      .map(goal => goal.parentGoalId === id ? { ...goal, parentGoalId: undefined } : goal)
    );
  }

  function markReviewed(id: string) {
    persist(goals.map(goal => goal.id === id
      ? { ...goal, lastReviewedAt: todayKey(), updatedAt: todayKey() }
      : goal
    ));
  }

  function openNew(horizon?: GoalHorizon) {
    setEditing(null);
    if (horizon) setActiveHorizon(horizon);
    setShowForm(true);
  }

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) =>
      (a.targetDate || "9999-12-31").localeCompare(b.targetDate || "9999-12-31")
    ),
    [goals]
  );

  const goalMap = useMemo(
    () => new Map(goals.map(goal => [goal.id, goal])),
    [goals]
  );

  const filteredGoals = useMemo(
    () => activeHorizon === "Alle" ? sortedGoals : sortedGoals.filter(goal => goal.horizon === activeHorizon),
    [sortedGoals, activeHorizon]
  );

  const grouped = useMemo(
    () => horizonOrder.map(horizon => ({
      horizon,
      goals: filteredGoals.filter(goal => goal.horizon === horizon)
    })).filter(group => group.goals.length || activeHorizon === group.horizon),
    [filteredGoals, activeHorizon]
  );

  const stats = useMemo(() => {
    const active = goals.filter(goal => goal.status === "aktiv");
    const achieved = goals.filter(goal => goal.status === "erreicht").length;
    const attention = active.filter(goal => ["attention", "late"].includes(goalHealth(goal).key)).length;
    const next = sortedGoals.find(goal => goal.status === "aktiv" && goal.targetDate);
    const shortActive = active.filter(goal => goal.horizon !== "5 Jahre");
    const aligned = shortActive.filter(goal => goal.parentGoalId).length;
    const alignment = shortActive.length ? Math.round(aligned / shortActive.length * 100) : 0;
    const dueReview = active.filter(reviewDue).length;
    return { active: active.length, achieved, attention, next, alignment, dueReview };
  }, [goals, sortedGoals]);

  const fiveYearGoals = useMemo(
    () => sortedGoals.filter(goal => goal.horizon === "5 Jahre" && goal.status !== "erreicht"),
    [sortedGoals]
  );

  const strategicChains = useMemo(
    () => fiveYearGoals.map(root => ({
      root,
      children: horizonOrder
        .filter(horizon => horizon !== "5 Jahre")
        .map(horizon => ({
          horizon,
          goals: goals.filter(goal => goal.horizon === horizon && goal.parentGoalId === root.id && goal.status !== "erreicht")
        }))
        .filter(group => group.goals.length)
    })),
    [fiveYearGoals, goals]
  );

  const reviewQueue = useMemo(
    () => sortedGoals.filter(reviewDue).slice(0, 5),
    [sortedGoals]
  );

  return (
    <>
      <section className="goals-hero">
        <div>
          <p className="eyebrow">RICHTUNG · ZEITHORIZONTE · UMSETZUNG</p>
          <h1>Ziele</h1>
          <p>
            Vom 5-Jahres-Plan bis zum nächsten konkreten Schritt. Langfristige Richtung,
            messbare Etappen und regelmäßige Reviews bleiben miteinander verknüpft.
          </p>
        </div>
        <div className="goals-hero-actions">
          <span><ShieldCheck size={14} /> lokal gespeichert</span>
          <button type="button" onClick={() => openNew()}>
            <Plus size={15} /> Ziel hinzufügen
          </button>
        </div>
      </section>

      <section className="goals-kpis professional">
        <article><Target size={18} /><div><strong>{stats.active}</strong><span>aktive Ziele</span></div></article>
        <article><Link2 size={18} /><div><strong>{stats.alignment}%</strong><span>strategisch verknüpft</span></div></article>
        <article><RefreshCw size={18} /><div><strong>{stats.dueReview}</strong><span>Review fällig</span></div></article>
        <article className="next">
          <CalendarRange size={18} />
          <div>
            <strong>{stats.next ? formatDate(stats.next.targetDate) : "–"}</strong>
            <span>{stats.next ? stats.next.title : "nächstes Zieldatum"}</span>
          </div>
        </article>
      </section>

      <section className="goals-horizon-panel">
        <div className="goals-panel-head">
          <div>
            <span className="section-kicker">ZEITHORIZONTE</span>
            <h2>Vom nächsten Monat bis zu fünf Jahren</h2>
          </div>
          <button
            type="button"
            className={activeHorizon === "Alle" ? "active" : ""}
            onClick={() => setActiveHorizon("Alle")}
          >
            Alle Ziele
          </button>
        </div>

        <div className="goals-horizon-grid">
          {horizonOrder.map(horizon => {
            const count = goals.filter(goal => goal.horizon === horizon && goal.status !== "erreicht").length;
            return (
              <button
                type="button"
                key={horizon}
                className={activeHorizon === horizon ? "goals-horizon-card active" : "goals-horizon-card"}
                onClick={() => setActiveHorizon(horizon)}
              >
                <span>{horizonCopy[horizon]}</span>
                <strong>{horizon}</strong>
                <small>{count} offene{count === 1 ? "s Ziel" : " Ziele"}</small>
                <ChevronRight size={15} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="goals-layout professional">
        <div className="goals-main">
          <div className="goals-panel-head">
            <div>
              <span className="section-kicker">ZIELARCHITEKTUR</span>
              <h2>{activeHorizon === "Alle" ? "Alle Zeithorizonte" : activeHorizon}</h2>
            </div>
            <span>{filteredGoals.length} Ziele</span>
          </div>

          {filteredGoals.length ? (
            <div className="goals-groups">
              {grouped.map(group => (
                <section className="goals-group" key={group.horizon}>
                  <div className="goals-group-head">
                    <div><Milestone size={15} /><strong>{group.horizon}</strong><span>{horizonCopy[group.horizon]}</span></div>
                    <button type="button" onClick={() => openNew(group.horizon)}><Plus size={13} /> Ziel</button>
                  </div>

                  {group.goals.length ? (
                    <div className="goal-card-list">
                      {group.goals.map(goal => {
                        const health = goalHealth(goal);
                        const parent = goal.parentGoalId ? goalMap.get(goal.parentGoalId) : undefined;
                        const due = reviewDue(goal);
                        return (
                          <article className="goal-card professional" key={goal.id}>
                            <div className="goal-card-top">
                              <div>
                                <div className="goal-card-title">
                                  <strong>{goal.title}</strong>
                                  <span className={"goal-health " + health.key}>{health.label}</span>
                                  {due ? <span className="goal-review-due">Review</span> : null}
                                </div>
                                <small>{goal.area ?? "Leben"} · Zieltermin {formatDate(goal.targetDate)}</small>
                              </div>
                              <div className="goal-card-actions">
                                <button type="button" onClick={() => markReviewed(goal.id)} aria-label={goal.title + " als geprüft markieren"}><CalendarCheck2 size={13} /></button>
                                <button type="button" onClick={() => { setEditing(goal); setShowForm(true); }} aria-label={goal.title + " bearbeiten"}><Pencil size={13} /></button>
                                <button type="button" className="danger" onClick={() => removeGoal(goal.id)} aria-label={goal.title + " löschen"}><Trash2 size={13} /></button>
                              </div>
                            </div>

                            <div className={parent || goal.horizon === "5 Jahre" ? "goal-alignment linked" : "goal-alignment"}>
                              <Link2 size={13} />
                              <span>
                                {goal.horizon === "5 Jahre"
                                  ? "Strategische Richtung"
                                  : parent
                                    ? "Zahlt ein auf: " + parent.title
                                    : "Eigenständiges Ziel · noch keiner längeren Richtung zugeordnet"}
                              </span>
                            </div>

                            <div className="goal-card-result">
                              <span>MESSBARES ERGEBNIS</span>
                              <strong>{goal.result || "Noch nicht definiert"}</strong>
                            </div>

                            <div className="goal-progress-row">
                              <div className="goal-progress-track"><i style={{ width: Math.max(0, Math.min(100, goal.progress)) + "%" }} /></div>
                              <strong>{goal.progress}%</strong>
                            </div>

                            <div className="goal-next-step">
                              <Flag size={15} />
                              <div>
                                <span>NÄCHSTER SCHRITT</span>
                                <strong>{goal.nextStep || "Noch festlegen"}</strong>
                              </div>
                            </div>

                            <div className="goal-review-meta">
                              <span>Review alle {reviewCadence[goal.horizon]} Tage</span>
                              <small>zuletzt: {goal.lastReviewedAt ? formatDate(goal.lastReviewedAt) : "noch nicht geprüft"}</small>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <button type="button" className="goal-empty-group" onClick={() => openNew(group.horizon)}>
                      <Plus size={16} />
                      <span>Erstes Ziel für {group.horizon} anlegen</span>
                    </button>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <div className="goals-empty">
              <Target size={25} />
              <strong>Noch keine Ziele hinterlegt</strong>
              <span>Definiere zuerst die strategische Richtung oder beginne mit einem konkreten 30-Tage-Ziel.</span>
              <div>
                <button type="button" onClick={() => openNew("5 Jahre")}>5-Jahres-Ziel</button>
                <button type="button" onClick={() => openNew("30 Tage")}>30-Tage-Ziel</button>
              </div>
            </div>
          )}
        </div>

        <aside className="goals-side">
          <article className="goals-five-year professional">
            <span className="section-kicker">STRATEGISCHE LANDKARTE</span>
            <h2>5 Jahre → heute</h2>
            <p>
              Kürzere Ziele sollten – wenn sinnvoll – auf eine längere Richtung einzahlen.
              Eigenständige operative Ziele bleiben ausdrücklich möglich.
            </p>

            {strategicChains.length ? (
              <div className="goal-chain-list">
                {strategicChains.map(chain => (
                  <div className="goal-chain" key={chain.root.id}>
                    <button type="button" className="goal-chain-root" onClick={() => { setEditing(chain.root); setShowForm(true); }}>
                      <span>5J</span>
                      <div><strong>{chain.root.title}</strong><small>{chain.root.progress}% · bis {formatDate(chain.root.targetDate)}</small></div>
                      <ChevronRight size={14} />
                    </button>
                    {chain.children.length ? (
                      <div className="goal-chain-children">
                        {chain.children.map(group => (
                          <div key={group.horizon}>
                            <span>{group.horizon}</span>
                            <strong>{group.goals.length} verknüpft</strong>
                          </div>
                        ))}
                      </div>
                    ) : <small className="goal-chain-empty">Noch keine Etappe verknüpft</small>}
                  </div>
                ))}
              </div>
            ) : (
              <button type="button" className="goals-five-year-empty" onClick={() => openNew("5 Jahre")}>
                <Plus size={15} />
                <span>5-Jahres-Richtung definieren</span>
              </button>
            )}
          </article>

          <article className="goals-review-panel">
            <div className="goals-review-head">
              <div><span className="section-kicker">REVIEW</span><h2>Regelmäßig nachsteuern</h2></div>
              <RefreshCw size={17} />
            </div>
            {reviewQueue.length ? (
              <div className="goals-review-list">
                {reviewQueue.map(goal => (
                  <button type="button" key={goal.id} onClick={() => markReviewed(goal.id)}>
                    <div><strong>{goal.title}</strong><small>{goal.horizon} · {goal.progress}%</small></div>
                    <span>Heute prüfen</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="goals-review-empty"><CheckCircle2 size={17} /><span>Kein Review fällig</span></div>
            )}
          </article>

          <article className="goals-rule professional">
            <span className="section-kicker">JAN-OS-REGEL</span>
            <h2>Richtung ohne Handlung ist Strategiepapier. Handlung ohne Richtung ist Beschäftigung.</h2>
            <p>
              JAN OS verbindet deshalb langfristige Ziele, messbare Etappen, konkrete nächste Schritte
              und regelmäßige Reviews.
            </p>
          </article>
        </aside>
      </section>

      {showForm ? (
        <GoalForm
          initial={editing}
          goals={goals}
          preferredHorizon={editing?.horizon ?? (activeHorizon === "Alle" ? undefined : activeHorizon)}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={saveGoal}
        />
      ) : null}

      {!ready ? <span className="sr-only">Ziele werden geladen</span> : null}
    </>
  );
}

function GoalForm({
  initial,
  goals,
  preferredHorizon,
  onClose,
  onSave
}: {
  initial: GoalItem | null;
  goals: GoalItem[];
  preferredHorizon?: GoalHorizon;
  onClose: () => void;
  onSave: (goal: GoalItem) => void;
}) {
  const initialHorizon = initial?.horizon ?? preferredHorizon ?? "90 Tage";
  const [title, setTitle] = useState(initial?.title ?? "");
  const [horizon, setHorizon] = useState<GoalHorizon>(initialHorizon);
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? defaultTargetDate(initialHorizon));
  const [result, setResult] = useState(initial?.result ?? "");
  const [progress, setProgress] = useState(String(initial?.progress ?? 0));
  const [nextStep, setNextStep] = useState(initial?.nextStep ?? "");
  const [status, setStatus] = useState<GoalStatus>(initial?.status ?? "aktiv");
  const [parentGoalId, setParentGoalId] = useState(initial?.parentGoalId ?? "");
  const [area, setArea] = useState<GoalArea>(initial?.area ?? "Leben");

  const parentCandidates = useMemo(
    () => goals.filter(goal =>
      goal.id !== initial?.id
      && goal.status !== "erreicht"
      && horizonRank(goal.horizon) > horizonRank(horizon)
    ),
    [goals, horizon, initial?.id]
  );

  function changeHorizon(next: GoalHorizon) {
    setHorizon(next);
    if (!initial) setTargetDate(defaultTargetDate(next));
    if (next === "5 Jahre") setParentGoalId("");
    else if (parentGoalId && !goals.some(goal => goal.id === parentGoalId && horizonRank(goal.horizon) > horizonRank(next))) {
      setParentGoalId("");
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !targetDate || !result.trim() || !nextStep.trim()) return;

    onSave({
      id: initial?.id ?? makeId(),
      title: title.trim(),
      horizon,
      targetDate,
      result: result.trim(),
      progress: Math.max(0, Math.min(100, Number(progress) || 0)),
      nextStep: nextStep.trim(),
      status,
      createdAt: initial?.createdAt ?? todayKey(),
      updatedAt: todayKey(),
      lastReviewedAt: initial?.lastReviewedAt,
      parentGoalId: horizon === "5 Jahre" ? undefined : parentGoalId || undefined,
      area
    });
  }

  return (
    <div className="calendar-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="calendar-modal goal-modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
        <div className="calendar-modal-head">
          <div>
            <span className="section-kicker">ZIELPLANUNG</span>
            <h2>{initial ? "Ziel bearbeiten" : "Ziel anlegen"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
        </div>

        <div className="goal-form-grid">
          <label className="wide"><span>Ziel</span><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Was soll konkret erreicht werden?" /></label>
          <label>
            <span>Zeithorizont</span>
            <select value={horizon} onChange={event => changeHorizon(event.target.value as GoalHorizon)}>
              {horizonOrder.map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Lebensbereich</span>
            <select value={area} onChange={event => setArea(event.target.value as GoalArea)}>
              {areaOptions.map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label><span>Zieldatum</span><input type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)} /></label>
          <label>
            <span>Strategische Verbindung</span>
            <select value={parentGoalId} onChange={event => setParentGoalId(event.target.value)} disabled={horizon === "5 Jahre"}>
              <option value="">{horizon === "5 Jahre" ? "Strategische Richtung" : "Eigenständiges Ziel"}</option>
              {parentCandidates.map(goal => <option value={goal.id} key={goal.id}>{goal.horizon} · {goal.title}</option>)}
            </select>
          </label>
          <label className="wide"><span>Messbares Ergebnis</span><input value={result} onChange={event => setResult(event.target.value)} placeholder="Woran erkennst du eindeutig, dass das Ziel erreicht ist?" /></label>
          <label className="wide"><span>Nächster konkreter Schritt</span><input value={nextStep} onChange={event => setNextStep(event.target.value)} placeholder="Was ist die nächste Handlung?" /></label>
          <label><span>Fortschritt %</span><input type="number" min="0" max="100" value={progress} onChange={event => setProgress(event.target.value)} /></label>
          <label>
            <span>Status</span>
            <select value={status} onChange={event => setStatus(event.target.value as GoalStatus)}>
              <option value="aktiv">Aktiv</option>
              <option value="wartet">Wartet</option>
              <option value="erreicht">Erreicht</option>
            </select>
          </label>
        </div>

        <div className="goal-form-guidance">
          <ArrowUpRight size={15} />
          <span>
            {horizon === "5 Jahre"
              ? "Dieses Ziel definiert eine strategische Richtung. Kürzere Ziele können später darauf verlinkt werden."
              : parentCandidates.length
                ? "Verknüpfe das Ziel mit einer längeren Richtung, wenn ein echter strategischer Zusammenhang besteht."
                : "Noch keine längere Richtung vorhanden. Das Ziel kann zunächst eigenständig bleiben."}
          </span>
        </div>

        <div className="calendar-modal-actions">
          <button type="button" onClick={onClose}>Abbrechen</button>
          <button type="submit"><CheckCircle2 size={14} /> Speichern</button>
        </div>
      </form>
    </div>
  );
}
