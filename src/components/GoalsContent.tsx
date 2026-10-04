"use client";

import {
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Flag,
  Gauge,
  Milestone,
  Pencil,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type GoalHorizon = "30 Tage" | "90 Tage" | "6 Monate" | "1 Jahr" | "5 Jahre";
type GoalStatus = "aktiv" | "wartet" | "erreicht";

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
};

const STORAGE_KEY = "jan-os-goals-v1";

const horizonOrder: GoalHorizon[] = ["30 Tage", "90 Tage", "6 Monate", "1 Jahr", "5 Jahre"];

const horizonCopy: Record<GoalHorizon, string> = {
  "30 Tage": "Jetzt konkret werden",
  "90 Tage": "Quartalsfokus",
  "6 Monate": "Halbjahresziel",
  "1 Jahr": "Jahresergebnis",
  "5 Jahre": "Strategische Richtung"
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

function daysUntil(value: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const [y, m, d] = value.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function goalHealth(goal: GoalItem) {
  if (goal.status === "erreicht") return { key: "done", label: "Erreicht" };
  if (goal.status === "wartet") return { key: "waiting", label: "Wartet" };

  const days = daysUntil(goal.targetDate);
  if (days < 0) return { key: "late", label: "Überfällig" };
  if (days <= 14 && goal.progress < 80) return { key: "attention", label: "Aufmerksamkeit" };
  return { key: "ontrack", label: "Im Plan" };
}

export function GoalsContent() {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GoalItem | null>(null);
  const [activeHorizon, setActiveHorizon] = useState<GoalHorizon | "Alle">("Alle");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setGoals(parsed);
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
    persist([...goals.filter(item => item.id !== goal.id), goal]);
    setEditing(null);
    setShowForm(false);
  }

  function removeGoal(id: string) {
    persist(goals.filter(goal => goal.id !== id));
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
    const active = goals.filter(goal => goal.status === "aktiv").length;
    const achieved = goals.filter(goal => goal.status === "erreicht").length;
    const attention = goals.filter(goal => ["attention", "late"].includes(goalHealth(goal).key)).length;
    const next = sortedGoals.find(goal => goal.status === "aktiv" && goal.targetDate);
    return { active, achieved, attention, next };
  }, [goals, sortedGoals]);

  const fiveYearGoals = useMemo(
    () => sortedGoals.filter(goal => goal.horizon === "5 Jahre" && goal.status !== "erreicht"),
    [sortedGoals]
  );

  return (
    <>
      <section className="goals-hero">
        <div>
          <p className="eyebrow">RICHTUNG · ZEITHORIZONTE · UMSETZUNG</p>
          <h1>Ziele</h1>
          <p>
            Vom nächsten Monat bis zum 5-Jahres-Plan: jedes Ziel bekommt einen Termin,
            ein messbares Ergebnis und einen konkreten nächsten Schritt.
          </p>
        </div>
        <div className="goals-hero-actions">
          <span><ShieldCheck size={14} /> lokal gespeichert</span>
          <button type="button" onClick={() => openNew()}>
            <Plus size={15} /> Ziel hinzufügen
          </button>
        </div>
      </section>

      <section className="goals-kpis">
        <article><Target size={18} /><div><strong>{stats.active}</strong><span>aktive Ziele</span></div></article>
        <article><Gauge size={18} /><div><strong>{stats.attention}</strong><span>brauchen Aufmerksamkeit</span></div></article>
        <article><CheckCircle2 size={18} /><div><strong>{stats.achieved}</strong><span>erreicht</span></div></article>
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

      <section className="goals-layout">
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
                        return (
                          <article className="goal-card" key={goal.id}>
                            <div className="goal-card-top">
                              <div>
                                <div className="goal-card-title">
                                  <strong>{goal.title}</strong>
                                  <span className={"goal-health " + health.key}>{health.label}</span>
                                </div>
                                <small>Zieltermin {formatDate(goal.targetDate)}</small>
                              </div>
                              <div className="goal-card-actions">
                                <button type="button" onClick={() => { setEditing(goal); setShowForm(true); }} aria-label={goal.title + " bearbeiten"}><Pencil size={13} /></button>
                                <button type="button" className="danger" onClick={() => removeGoal(goal.id)} aria-label={goal.title + " löschen"}><Trash2 size={13} /></button>
                              </div>
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
              <span>Starte mit einem 30-Tage-Ziel oder definiere zuerst deine 5-Jahres-Richtung.</span>
              <div>
                <button type="button" onClick={() => openNew("30 Tage")}>30-Tage-Ziel</button>
                <button type="button" onClick={() => openNew("5 Jahre")}>5-Jahres-Ziel</button>
              </div>
            </div>
          )}
        </div>

        <aside className="goals-side">
          <article className="goals-five-year">
            <span className="section-kicker">5-JAHRES-PLAN</span>
            <h2>Wo soll das alles hinführen?</h2>
            <p>
              Langfristige Ziele geben die Richtung vor. Die kürzeren Horizonte übersetzen
              diese Richtung in Entscheidungen, Etappen und konkrete Arbeit.
            </p>

            {fiveYearGoals.length ? (
              <div className="goals-five-year-list">
                {fiveYearGoals.map(goal => (
                  <button type="button" key={goal.id} onClick={() => { setEditing(goal); setShowForm(true); }}>
                    <span>{goal.progress}%</span>
                    <div><strong>{goal.title}</strong><small>bis {formatDate(goal.targetDate)}</small></div>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" className="goals-five-year-empty" onClick={() => openNew("5 Jahre")}>
                <Plus size={15} />
                <span>5-Jahres-Richtung definieren</span>
              </button>
            )}
          </article>

          <article className="goals-rule">
            <span className="section-kicker">JAN-OS-REGEL</span>
            <h2>Ein Ziel ohne Termin ist nur ein Wunsch.</h2>
            <p>
              Deshalb verlangt JAN OS für jedes Ziel ein Zieldatum, ein messbares Ergebnis
              und einen nächsten konkreten Schritt.
            </p>
          </article>
        </aside>
      </section>

      {showForm ? (
        <GoalForm
          initial={editing}
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
  preferredHorizon,
  onClose,
  onSave
}: {
  initial: GoalItem | null;
  preferredHorizon?: GoalHorizon;
  onClose: () => void;
  onSave: (goal: GoalItem) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [horizon, setHorizon] = useState<GoalHorizon>(initial?.horizon ?? preferredHorizon ?? "90 Tage");
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [result, setResult] = useState(initial?.result ?? "");
  const [progress, setProgress] = useState(String(initial?.progress ?? 0));
  const [nextStep, setNextStep] = useState(initial?.nextStep ?? "");
  const [status, setStatus] = useState<GoalStatus>(initial?.status ?? "aktiv");

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
      createdAt: initial?.createdAt ?? todayKey()
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
            <select value={horizon} onChange={event => setHorizon(event.target.value as GoalHorizon)}>
              {horizonOrder.map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label><span>Zieldatum</span><input type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)} /></label>
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

        <div className="calendar-modal-actions">
          <button type="button" onClick={onClose}>Abbrechen</button>
          <button type="submit"><CheckCircle2 size={14} /> Speichern</button>
        </div>
      </form>
    </div>
  );
}
