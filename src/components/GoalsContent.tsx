"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Brain,
  CalendarCheck2,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flag,
  Gauge,
  HelpCircle,
  Link2,
  ListChecks,
  Milestone,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type GoalHorizon = "30 Tage" | "90 Tage" | "6 Monate" | "1 Jahr" | "5 Jahre";
type GoalStatus = "aktiv" | "wartet" | "erreicht";
type GoalArea = "Leben" | "Gesundheit" | "Finanzen" | "KISS" | "Projekte";
type DossierTab = "Übersicht" | "Kontext" | "Plan" | "Review";

type GoalMilestone = {
  id: string;
  title: string;
  targetDate: string;
  done: boolean;
};

type GoalReview = {
  id: string;
  date: string;
  progress: number;
  note: string;
  nextStep: string;
};

type GoalDossier = {
  why: string;
  currentState: string;
  weeklyTime: string;
  budget: string;
  resources: string;
  people: string;
  constraints: string;
  dependencies: string;
  risks: string;
  pastAttempts: string;
  notes: string;
  links: string;
  milestones: GoalMilestone[];
  reviews: GoalReview[];
};

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
  dossier?: GoalDossier;
};

const STORAGE_KEY = "jan-os-goals-v3";
const LEGACY_KEYS = ["jan-os-goals-v2", "jan-os-goals-v1"];

const horizonOrder: GoalHorizon[] = ["30 Tage", "90 Tage", "6 Monate", "1 Jahr", "5 Jahre"];
const strategyOrder: GoalHorizon[] = ["5 Jahre", "1 Jahr", "6 Monate", "90 Tage", "30 Tage"];
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

function makeId(prefix = "goal") {
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
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

function addDays(value: string, amount: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
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

function emptyDossier(): GoalDossier {
  return {
    why: "",
    currentState: "",
    weeklyTime: "",
    budget: "",
    resources: "",
    people: "",
    constraints: "",
    dependencies: "",
    risks: "",
    pastAttempts: "",
    notes: "",
    links: "",
    milestones: [],
    reviews: []
  };
}

function normalizeGoal(raw: Partial<GoalItem>): GoalItem {
  const dossier = { ...emptyDossier(), ...(raw.dossier ?? {}) };
  dossier.milestones = Array.isArray(raw.dossier?.milestones) ? raw.dossier!.milestones : [];
  dossier.reviews = Array.isArray(raw.dossier?.reviews) ? raw.dossier!.reviews : [];

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
    area: raw.area ?? "Leben",
    dossier
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

function nextReviewDate(goal: GoalItem) {
  const base = goal.lastReviewedAt ?? goal.createdAt;
  return addDays(base, reviewCadence[goal.horizon]);
}

function dossierAnalysis(goal: GoalItem) {
  const d = goal.dossier ?? emptyDossier();
  const required = [
    ["Warum das Ziel wichtig ist", d.why],
    ["Ausgangslage", d.currentState],
    ["verfügbare Zeit", d.weeklyTime],
    ["vorhandene Ressourcen", d.resources],
    ["Einschränkungen", d.constraints],
    ["Abhängigkeiten", d.dependencies],
    ["Risiken", d.risks]
  ] as const;

  const missing = required.filter(([, value]) => !value.trim()).map(([label]) => label);
  const completeness = Math.round((required.length - missing.length) / required.length * 100);
  const riskCount = d.risks.trim()
    ? d.risks.split(/\n|;|,/).map(item => item.trim()).filter(Boolean).length
    : 0;
  const milestoneDone = d.milestones.filter(item => item.done).length;
  const days = daysUntil(goal.targetDate);

  let status = "Arbeitsfähig";
  let tone = "good";
  if (goal.status === "erreicht") {
    status = "Ziel erreicht";
    tone = "done";
  } else if (missing.length >= 4) {
    status = "Mehr Kontext nötig";
    tone = "attention";
  } else if (!d.milestones.length) {
    status = "Plan ergänzen";
    tone = "attention";
  } else if (days < 0) {
    status = "Termin überschritten";
    tone = "alert";
  } else if (days <= 14 && goal.progress < 75) {
    status = "Zeit kritisch";
    tone = "alert";
  }

  let recommendation = goal.nextStep || "Nächsten Schritt festlegen";
  if (missing.length) recommendation = "Ergänze zuerst: " + missing[0];
  else if (!d.milestones.length) recommendation = "Erzeuge einen ersten Meilensteinplan";
  else if (days < 0) recommendation = "Zieldatum und Scope neu bewerten";

  return {
    missing,
    completeness,
    riskCount,
    milestoneDone,
    milestoneTotal: d.milestones.length,
    status,
    tone,
    recommendation
  };
}

function buildDemoMilestones(goal: GoalItem): GoalMilestone[] {
  const remaining = Math.max(8, daysUntil(goal.targetDate));
  const today = todayKey();
  const dateAt = (fraction: number) => addDays(today, Math.max(2, Math.round(remaining * fraction)));

  return [
    {
      id: makeId("milestone"),
      title: "Ausgangslage und Rahmen vollständig klären",
      targetDate: dateAt(.1),
      done: false
    },
    {
      id: makeId("milestone"),
      title: "Ersten messbaren Zwischenstand erreichen",
      targetDate: dateAt(.35),
      done: false
    },
    {
      id: makeId("milestone"),
      title: "Zwischenreview und Kurskorrektur",
      targetDate: dateAt(.7),
      done: false
    },
    {
      id: makeId("milestone"),
      title: goal.result || "Zielzustand erreicht",
      targetDate: goal.targetDate,
      done: false
    }
  ];
}

export function GoalsContent() {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GoalItem | null>(null);
  const [activeHorizon, setActiveHorizon] = useState<GoalHorizon | "Alle">("Alle");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [dossierTab, setDossierTab] = useState<DossierTab>("Übersicht");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      let stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        for (const key of LEGACY_KEYS) {
          stored = window.localStorage.getItem(key);
          if (stored) break;
        }
      }

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
    const isNew = !goals.some(item => item.id === goal.id);
    const normalized = normalizeGoal({ ...goal, updatedAt: todayKey() });
    persist([...goals.filter(item => item.id !== goal.id), normalized]);
    setEditing(null);
    setShowForm(false);

    if (isNew) {
      setSelectedGoalId(normalized.id);
      setDossierTab("Kontext");
    }
  }

  function updateGoal(goal: GoalItem) {
    const normalized = normalizeGoal({ ...goal, updatedAt: todayKey() });
    persist(goals.map(item => item.id === normalized.id ? normalized : item));
  }

  function removeGoal(id: string) {
    persist(goals
      .filter(goal => goal.id !== id)
      .map(goal => goal.parentGoalId === id ? { ...goal, parentGoalId: undefined } : goal)
    );
    if (selectedGoalId === id) setSelectedGoalId(null);
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

  function openDossier(goal: GoalItem, tab: DossierTab = "Übersicht") {
    setSelectedGoalId(goal.id);
    setDossierTab(tab);
  }

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) =>
      (a.targetDate || "9999-12-31").localeCompare(b.targetDate || "9999-12-31")
    ),
    [goals]
  );

  const selectedGoal = useMemo(
    () => goals.find(goal => goal.id === selectedGoalId) ?? null,
    [goals, selectedGoalId]
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
    const next = sortedGoals.find(goal => goal.status === "aktiv" && goal.targetDate);
    const shortActive = active.filter(goal => goal.horizon !== "5 Jahre");
    const aligned = shortActive.filter(goal => goal.parentGoalId).length;
    const alignment = shortActive.length ? Math.round(aligned / shortActive.length * 100) : 0;
    const dueReview = active.filter(reviewDue).length;
    const contextReady = active.length
      ? Math.round(active.reduce((sum, goal) => sum + dossierAnalysis(goal).completeness, 0) / active.length)
      : 0;
    return { active: active.length, next, alignment, dueReview, contextReady };
  }, [goals, sortedGoals]);

  const fiveYearGoals = useMemo(
    () => sortedGoals.filter(goal => goal.horizon === "5 Jahre" && goal.status !== "erreicht"),
    [sortedGoals]
  );

  const recommendedHorizon = useMemo<GoalHorizon>(() => {
    const activeHorizons = new Set(goals.filter(goal => goal.status !== "erreicht").map(goal => goal.horizon));
    return strategyOrder.find(horizon => !activeHorizons.has(horizon)) ?? "30 Tage";
  }, [goals]);

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
          <p className="eyebrow">RICHTUNG · KONTEXT · UMSETZUNG</p>
          <h1>Ziele</h1>
          <p>
            JAN OS sammelt nicht nur Ziele. Zu jedem Ziel entsteht ein Arbeitsdossier:
            Kontext, Ressourcen, Risiken, Meilensteine, nächste Aktion und regelmäßige Reviews.
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
        <article><Brain size={18} /><div><strong>{stats.contextReady}%</strong><span>Kontext vollständig</span></div></article>
        <article><RefreshCw size={18} /><div><strong>{stats.dueReview}</strong><span>Review fällig</span></div></article>
        <article className="next">
          <CalendarRange size={18} />
          <div>
            <strong>{stats.next ? formatDate(stats.next.targetDate) : "–"}</strong>
            <span>{stats.next ? stats.next.title : "nächstes Zieldatum"}</span>
          </div>
        </article>
      </section>

      <section className="goals-roadmap-panel">
        <div className="goals-roadmap-intro">
          <div>
            <span className="section-kicker">SO FUNKTIONIERT ES</span>
            <h2>Von der Richtung zur nächsten Handlung</h2>
            <p>Langfristige Richtung festlegen, Etappen ableiten und jedes Ziel mit genug Kontext versehen, damit JAN OS sinnvoll mitarbeiten kann.</p>
          </div>
          <button type="button" onClick={() => openNew(recommendedHorizon)}>
            <Plus size={14} /> {goals.length ? recommendedHorizon + "-Ziel ergänzen" : "Mit 5 Jahren starten"}
          </button>
        </div>

        <div className="goals-roadmap">
          {strategyOrder.map((horizon, index) => {
            const count = goals.filter(goal => goal.horizon === horizon && goal.status !== "erreicht").length;
            const isRecommended = horizon === recommendedHorizon;
            return (
              <div className="goals-roadmap-step" key={horizon}>
                <button
                  type="button"
                  className={activeHorizon === horizon ? "active" : ""}
                  onClick={() => setActiveHorizon(horizon)}
                >
                  <span className="goals-roadmap-number">{index + 1}</span>
                  <div>
                    <small>{horizonCopy[horizon]}</small>
                    <strong>{horizon}</strong>
                    <span>{count ? count + " offene Ziele" : "noch leer"}</span>
                  </div>
                  {isRecommended ? <b>Als Nächstes</b> : <ChevronRight size={15} />}
                </button>
                {index < strategyOrder.length - 1 ? <span className="goals-roadmap-arrow">→</span> : null}
              </div>
            );
          })}
        </div>

        <div className="goals-roadmap-footer">
          <button type="button" className={activeHorizon === "Alle" ? "active" : ""} onClick={() => setActiveHorizon("Alle")}>
            Alle Ziele gemeinsam anzeigen
          </button>
          <span>5 Jahre geben die Richtung vor · 30 Tage erzeugen konkrete Bewegung</span>
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
                        const analysis = dossierAnalysis(goal);
                        return (
                          <article className="goal-card professional dossier-ready" key={goal.id}>
                            <button type="button" className="goal-card-open" onClick={() => openDossier(goal)}>
                              <div className="goal-card-top">
                                <div>
                                  <div className="goal-card-title">
                                    <strong>{goal.title}</strong>
                                    <span className={"goal-health " + health.key}>{health.label}</span>
                                    {due ? <span className="goal-review-due">Review</span> : null}
                                  </div>
                                  <small>{goal.area ?? "Leben"} · Zieltermin {formatDate(goal.targetDate)}</small>
                                </div>
                                <ChevronRight size={17} />
                              </div>

                              <div className="goal-intelligence-strip">
                                <span><Brain size={13} /> Kontext <strong>{analysis.completeness}%</strong></span>
                                <span><ListChecks size={13} /> Plan <strong>{analysis.milestoneDone}/{analysis.milestoneTotal}</strong></span>
                                <span className={analysis.tone}><Gauge size={13} /> {analysis.status}</span>
                              </div>

                              <div className={parent || goal.horizon === "5 Jahre" ? "goal-alignment linked" : "goal-alignment"}>
                                <Link2 size={13} />
                                <span>
                                  {goal.horizon === "5 Jahre"
                                    ? "Strategische Richtung"
                                    : parent
                                      ? "Zahlt ein auf: " + parent.title
                                      : "Eigenständiges Ziel"}
                                </span>
                              </div>

                              <div className="goal-next-step">
                                <Flag size={15} />
                                <div>
                                  <span>NÄCHSTE SINNVOLLE AKTION</span>
                                  <strong>{analysis.recommendation}</strong>
                                </div>
                              </div>
                            </button>

                            <div className="goal-card-actions goal-card-actions-bottom">
                              <button type="button" className="text" onClick={() => openDossier(goal)}>Ziel-Dossier öffnen</button>
                              <button type="button" onClick={() => { setEditing(goal); setShowForm(true); }} aria-label={goal.title + " bearbeiten"}><Pencil size={13} /></button>
                              <button type="button" className="danger" onClick={() => removeGoal(goal.id)} aria-label={goal.title + " löschen"}><Trash2 size={13} /></button>
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
              <span>Lege ein Ziel an. Danach öffnet JAN OS automatisch das Ziel-Dossier und fragt den nötigen Kontext ab.</span>
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
            <p>Kürzere Ziele sollten – wenn sinnvoll – auf eine längere Richtung einzahlen.</p>

            {strategicChains.length ? (
              <div className="goal-chain-list">
                {strategicChains.map(chain => (
                  <div className="goal-chain" key={chain.root.id}>
                    <button type="button" className="goal-chain-root" onClick={() => openDossier(chain.root)}>
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
                  <button type="button" key={goal.id} onClick={() => openDossier(goal, "Review")}>
                    <div><strong>{goal.title}</strong><small>{goal.horizon} · {goal.progress}%</small></div>
                    <span>Review öffnen</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="goals-review-empty"><CheckCircle2 size={17} /><span>Kein Review fällig</span></div>
            )}
          </article>

          <article className="goals-rule professional">
            <span className="section-kicker">JAN-OS-PRINZIP</span>
            <h2>Je besser der Kontext, desto besser die Unterstützung.</h2>
            <p>Ziel-Dossiers sammeln deshalb nicht nur das Ergebnis, sondern auch Ausgangslage, Zeit, Ressourcen, Hindernisse und Erfahrungen.</p>
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

      {selectedGoal ? (
        <GoalDossierModal
          goal={selectedGoal}
          tab={dossierTab}
          onTabChange={setDossierTab}
          onClose={() => setSelectedGoalId(null)}
          onSave={updateGoal}
          onEditBasic={() => {
            setEditing(selectedGoal);
            setShowForm(true);
          }}
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
  const [step, setStep] = useState(1);

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
      area,
      dossier: initial?.dossier ?? emptyDossier()
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

        <div className="goal-wizard-progress">
          <span className={step >= 1 ? "active" : ""}><b>1</b> Richtung</span>
          <i />
          <span className={step >= 2 ? "active" : ""}><b>2</b> Messbar machen</span>
          <i />
          <span className={step >= 3 ? "active" : ""}><b>3</b> Einordnen</span>
        </div>

        {step === 1 ? (
          <div className="goal-wizard-step">
            <div className="goal-wizard-copy">
              <span className="section-kicker">SCHRITT 1 VON 3</span>
              <h3>Was willst du erreichen – und bis wann?</h3>
            </div>
            <label className="goal-wizard-wide"><span>Ziel</span><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="z. B. KISS profitabel etablieren" /></label>
            <div className="goal-horizon-choice">
              {strategyOrder.map(item => (
                <button type="button" key={item} className={horizon === item ? "active" : ""} onClick={() => changeHorizon(item)}>
                  <strong>{item}</strong><span>{horizonCopy[item]}</span>
                </button>
              ))}
            </div>
            <label className="goal-wizard-date"><span>Zieldatum</span><input type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)} /></label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="goal-wizard-step">
            <div className="goal-wizard-copy">
              <span className="section-kicker">SCHRITT 2 VON 3</span>
              <h3>Wie sieht Erfolg konkret aus?</h3>
              <p>Das Ergebnis sollte so eindeutig sein, dass du später nicht diskutieren musst, ob das Ziel erreicht wurde.</p>
            </div>
            <label className="goal-wizard-wide"><span>Messbares Ergebnis</span><input autoFocus value={result} onChange={event => setResult(event.target.value)} placeholder="z. B. 10 zahlende Kunden und positiver Monats-Cashflow" /></label>
            <label className="goal-wizard-wide"><span>Nächster konkreter Schritt</span><input value={nextStep} onChange={event => setNextStep(event.target.value)} placeholder="Was kannst du als Nächstes wirklich tun?" /></label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="goal-wizard-step">
            <div className="goal-wizard-copy">
              <span className="section-kicker">SCHRITT 3 VON 3</span>
              <h3>Wo gehört das Ziel hin?</h3>
              <p>Nach dem Speichern öffnet sich das Ziel-Dossier für den Kontext, den JAN OS zur Unterstützung braucht.</p>
            </div>
            <div className="goal-form-grid">
              <label>
                <span>Lebensbereich</span>
                <select value={area} onChange={event => setArea(event.target.value as GoalArea)}>
                  {areaOptions.map(item => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span>Strategische Verbindung</span>
                <select value={parentGoalId} onChange={event => setParentGoalId(event.target.value)} disabled={horizon === "5 Jahre"}>
                  <option value="">{horizon === "5 Jahre" ? "Strategische Richtung" : "Eigenständiges Ziel"}</option>
                  {parentCandidates.map(goal => <option value={goal.id} key={goal.id}>{goal.horizon} · {goal.title}</option>)}
                </select>
              </label>
              {initial ? (
                <>
                  <label><span>Fortschritt %</span><input type="number" min="0" max="100" value={progress} onChange={event => setProgress(event.target.value)} /></label>
                  <label>
                    <span>Status</span>
                    <select value={status} onChange={event => setStatus(event.target.value as GoalStatus)}>
                      <option value="aktiv">Aktiv</option>
                      <option value="wartet">Wartet</option>
                      <option value="erreicht">Erreicht</option>
                    </select>
                  </label>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="goal-wizard-actions">
          <button type="button" onClick={step === 1 ? onClose : () => setStep(step - 1)}>{step === 1 ? "Abbrechen" : "Zurück"}</button>
          {step < 3 ? (
            <button
              type="button"
              className="primary"
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && (!title.trim() || !targetDate)) || (step === 2 && (!result.trim() || !nextStep.trim()))}
            >
              Weiter <ChevronRight size={14} />
            </button>
          ) : (
            <button type="submit" className="primary"><CheckCircle2 size={14} /> Ziel speichern</button>
          )}
        </div>
      </form>
    </div>
  );
}

function GoalDossierModal({
  goal,
  tab,
  onTabChange,
  onClose,
  onSave,
  onEditBasic
}: {
  goal: GoalItem;
  tab: DossierTab;
  onTabChange: (tab: DossierTab) => void;
  onClose: () => void;
  onSave: (goal: GoalItem) => void;
  onEditBasic: () => void;
}) {
  const [draft, setDraft] = useState<GoalDossier>({ ...emptyDossier(), ...(goal.dossier ?? {}) });
  const [newMilestone, setNewMilestone] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState(goal.targetDate);
  const [reviewProgress, setReviewProgress] = useState(String(goal.progress));
  const [reviewNote, setReviewNote] = useState("");
  const [reviewNextStep, setReviewNextStep] = useState(goal.nextStep);

  useEffect(() => {
    setDraft({ ...emptyDossier(), ...(goal.dossier ?? {}) });
    setReviewProgress(String(goal.progress));
    setReviewNextStep(goal.nextStep);
  }, [goal.id, goal.updatedAt]);

  const analysis = useMemo(
    () => dossierAnalysis({ ...goal, dossier: draft }),
    [goal, draft]
  );

  function saveDossier() {
    onSave({ ...goal, dossier: draft });
  }

  function updateField(field: keyof GoalDossier, value: string) {
    setDraft(current => ({ ...current, [field]: value }));
  }

  function generatePlan() {
    setDraft(current => ({ ...current, milestones: buildDemoMilestones(goal) }));
  }

  function addMilestone() {
    if (!newMilestone.trim() || !newMilestoneDate) return;
    setDraft(current => ({
      ...current,
      milestones: [
        ...current.milestones,
        { id: makeId("milestone"), title: newMilestone.trim(), targetDate: newMilestoneDate, done: false }
      ]
    }));
    setNewMilestone("");
  }

  function toggleMilestone(id: string) {
    const next = draft.milestones.map(item => item.id === id ? { ...item, done: !item.done } : item);
    const done = next.filter(item => item.done).length;
    const milestoneProgress = next.length ? Math.round(done / next.length * 100) : goal.progress;
    const nextDraft = { ...draft, milestones: next };
    setDraft(nextDraft);
    onSave({ ...goal, dossier: nextDraft, progress: Math.max(goal.progress, milestoneProgress) });
  }

  function deleteMilestone(id: string) {
    setDraft(current => ({ ...current, milestones: current.milestones.filter(item => item.id !== id) }));
  }

  function submitReview(event: FormEvent) {
    event.preventDefault();
    const progress = Math.max(0, Math.min(100, Number(reviewProgress) || 0));
    const review: GoalReview = {
      id: makeId("review"),
      date: todayKey(),
      progress,
      note: reviewNote.trim(),
      nextStep: reviewNextStep.trim() || goal.nextStep
    };
    const nextDossier = { ...draft, reviews: [review, ...draft.reviews] };
    setDraft(nextDossier);
    onSave({
      ...goal,
      progress,
      nextStep: review.nextStep,
      lastReviewedAt: todayKey(),
      dossier: nextDossier
    });
    setReviewNote("");
  }

  return (
    <div className="goal-dossier-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="goal-dossier-modal" onMouseDown={event => event.stopPropagation()}>
        <header className="goal-dossier-head">
          <div>
            <span className="section-kicker">{goal.area ?? "Leben"} · {goal.horizon}</span>
            <h2>{goal.title}</h2>
            <p>{goal.result}</p>
          </div>
          <div className="goal-dossier-head-actions">
            <button type="button" onClick={onEditBasic}><Pencil size={14} /> Basisdaten</button>
            <button type="button" className="icon" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
          </div>
        </header>

        <nav className="goal-dossier-tabs" aria-label="Ziel-Dossier">
          {(["Übersicht", "Kontext", "Plan", "Review"] as DossierTab[]).map(item => (
            <button type="button" key={item} className={tab === item ? "active" : ""} onClick={() => onTabChange(item)}>
              {item}
              {item === "Kontext" && analysis.missing.length ? <span>{analysis.missing.length}</span> : null}
              {item === "Review" && reviewDue(goal) ? <span>!</span> : null}
            </button>
          ))}
        </nav>

        <div className="goal-dossier-body">
          {tab === "Übersicht" ? (
            <div className="goal-dossier-overview">
              <section className={"goal-ai-summary " + analysis.tone}>
                <div className="goal-ai-summary-icon"><Brain size={21} /></div>
                <div>
                  <span className="section-kicker">JAN OS · DEMO-ANALYSE</span>
                  <h3>{analysis.status}</h3>
                  <p>{analysis.recommendation}</p>
                </div>
                <div className="goal-ai-score">
                  <strong>{analysis.completeness}%</strong>
                  <span>Kontext</span>
                </div>
              </section>

              <div className="goal-dossier-metrics">
                <article><CalendarRange size={17} /><div><strong>{formatDate(goal.targetDate)}</strong><span>Zieldatum</span></div></article>
                <article><Gauge size={17} /><div><strong>{goal.progress}%</strong><span>Fortschritt</span></div></article>
                <article><ListChecks size={17} /><div><strong>{analysis.milestoneDone}/{analysis.milestoneTotal}</strong><span>Meilensteine</span></div></article>
                <article><AlertTriangle size={17} /><div><strong>{analysis.riskCount}</strong><span>benannte Risiken</span></div></article>
              </div>

              <section className="goal-dossier-next">
                <div>
                  <span className="section-kicker">NÄCHSTE AKTION</span>
                  <h3>{goal.nextStep}</h3>
                  <p>Der nächste Schritt bleibt bewusst sichtbar, bis er ersetzt oder im Review aktualisiert wird.</p>
                </div>
                <button type="button" onClick={() => onTabChange("Review")}>Fortschritt aktualisieren <ChevronRight size={14} /></button>
              </section>

              <div className="goal-dossier-overview-grid">
                <section className="goal-dossier-panel">
                  <div className="goal-dossier-panel-head"><div><HelpCircle size={16} /><h3>Was mir noch fehlt</h3></div><span>{analysis.missing.length}</span></div>
                  {analysis.missing.length ? (
                    <div className="goal-missing-list">
                      {analysis.missing.map(item => <button type="button" key={item} onClick={() => onTabChange("Kontext")}><Plus size={12} /> {item}</button>)}
                    </div>
                  ) : (
                    <div className="goal-dossier-complete"><CheckCircle2 size={17} /><span>Der Kernkontext ist vollständig.</span></div>
                  )}
                </section>

                <section className="goal-dossier-panel">
                  <div className="goal-dossier-panel-head"><div><RefreshCw size={16} /><h3>Nächstes Review</h3></div></div>
                  <div className="goal-review-next">
                    <strong>{formatDate(nextReviewDate(goal))}</strong>
                    <span>Rhythmus: alle {reviewCadence[goal.horizon]} Tage</span>
                    <button type="button" onClick={() => onTabChange("Review")}>Review öffnen</button>
                  </div>
                </section>
              </div>

              <div className="goal-demo-note">
                <Sparkles size={15} />
                <span>Diese Demoversion analysiert lokal anhand deiner Angaben. Später kann dieselbe Datenstruktur mit einer privaten KI-Auswertung verbunden werden.</span>
              </div>
            </div>
          ) : null}

          {tab === "Kontext" ? (
            <div className="goal-context-layout">
              <div className="goal-context-intro">
                <div>
                  <span className="section-kicker">ZIEL VERSTEHEN</span>
                  <h3>Gib JAN OS den Kontext, den es zum Mitdenken braucht.</h3>
                  <p>Du musst nicht alles sofort ausfüllen. Fehlende Kerninformationen werden in der Übersicht gezielt angezeigt.</p>
                </div>
                <div className="goal-context-score"><strong>{analysis.completeness}%</strong><span>vollständig</span></div>
              </div>

              <div className="goal-context-form">
                <ContextArea label="Warum ist dir dieses Ziel wichtig?" value={draft.why} onChange={value => updateField("why", value)} placeholder="Motivation, gewünschte Veränderung, Bedeutung…" />
                <ContextArea label="Wo stehst du heute?" value={draft.currentState} onChange={value => updateField("currentState", value)} placeholder="Ausgangslage, Zahlen, Status quo…" />
                <ContextInput label="Wie viel Zeit kannst du investieren?" value={draft.weeklyTime} onChange={value => updateField("weeklyTime", value)} placeholder="z. B. 5 Stunden pro Woche" icon={<Clock3 size={15} />} />
                <ContextInput label="Budget / finanzieller Rahmen" value={draft.budget} onChange={value => updateField("budget", value)} placeholder="falls relevant" icon={<WalletCards size={15} />} />
                <ContextArea label="Welche Ressourcen sind schon vorhanden?" value={draft.resources} onChange={value => updateField("resources", value)} placeholder="Wissen, Werkzeuge, Kontakte, Vorarbeiten…" />
                <ContextArea label="Welche Personen können helfen oder sind beteiligt?" value={draft.people} onChange={value => updateField("people", value)} placeholder="Partner, Familie, Kollegen, Dienstleister…" />
                <ContextArea label="Welche Einschränkungen muss ich kennen?" value={draft.constraints} onChange={value => updateField("constraints", value)} placeholder="Zeit, Geld, Verpflichtungen, feste Grenzen…" />
                <ContextArea label="Wovon hängt das Ziel ab?" value={draft.dependencies} onChange={value => updateField("dependencies", value)} placeholder="Freigaben, Termine, andere Projekte, Personen…" />
                <ContextArea label="Welche Risiken oder Hindernisse siehst du?" value={draft.risks} onChange={value => updateField("risks", value)} placeholder="Ein Punkt pro Zeile hilft bei der Auswertung." />
                <ContextArea label="Was hast du bisher versucht oder gelernt?" value={draft.pastAttempts} onChange={value => updateField("pastAttempts", value)} placeholder="Bisherige Versuche, Erfahrungen, Fehler, Erkenntnisse…" />
                <ContextArea label="Weitere Anmerkungen" value={draft.notes} onChange={value => updateField("notes", value)} placeholder="Alles, was sonst wichtig ist…" />
                <ContextArea label="Links / Referenzen" value={draft.links} onChange={value => updateField("links", value)} placeholder="Links, Quellen, Dokumenthinweise…" />
              </div>

              <div className="goal-dossier-savebar">
                <span><ShieldCheck size={14} /> bleibt lokal in diesem Browser</span>
                <button type="button" onClick={saveDossier}><CheckCircle2 size={14} /> Kontext speichern</button>
              </div>
            </div>
          ) : null}

          {tab === "Plan" ? (
            <div className="goal-plan-layout">
              <section className="goal-plan-head">
                <div>
                  <span className="section-kicker">UMSETZUNGSPLAN</span>
                  <h3>Vom Ziel zu überprüfbaren Etappen</h3>
                  <p>Meilensteine machen Fortschritt sichtbar. Die Demo kann einen neutralen Startplan erzeugen, den du anschließend anpasst.</p>
                </div>
                <button type="button" onClick={generatePlan}><Sparkles size={14} /> Planvorschlag erzeugen</button>
              </section>

              <div className="goal-milestone-list">
                {draft.milestones.length ? draft.milestones
                  .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
                  .map(item => (
                    <article className={item.done ? "done" : ""} key={item.id}>
                      <button type="button" className="goal-milestone-check" onClick={() => toggleMilestone(item.id)}>
                        {item.done ? <CheckCircle2 size={16} /> : <span />}
                      </button>
                      <div><strong>{item.title}</strong><span>bis {formatDate(item.targetDate)}</span></div>
                      <button type="button" className="delete" onClick={() => deleteMilestone(item.id)}><Trash2 size={13} /></button>
                    </article>
                  )) : (
                    <div className="goal-plan-empty"><ListChecks size={22} /><strong>Noch keine Meilensteine</strong><span>Erzeuge einen Vorschlag oder füge unten selbst den ersten hinzu.</span></div>
                  )}
              </div>

              <div className="goal-add-milestone">
                <input value={newMilestone} onChange={event => setNewMilestone(event.target.value)} placeholder="Neuer Meilenstein" />
                <input type="date" value={newMilestoneDate} onChange={event => setNewMilestoneDate(event.target.value)} />
                <button type="button" onClick={addMilestone}><Plus size={14} /> Hinzufügen</button>
              </div>

              <div className="goal-dossier-savebar">
                <span>{analysis.milestoneDone} von {analysis.milestoneTotal} erledigt</span>
                <button type="button" onClick={saveDossier}><CheckCircle2 size={14} /> Plan speichern</button>
              </div>
            </div>
          ) : null}

          {tab === "Review" ? (
            <div className="goal-review-layout">
              <section className="goal-review-form-card">
                <div>
                  <span className="section-kicker">REVIEW</span>
                  <h3>Was hat sich seit dem letzten Check verändert?</h3>
                  <p>Fortschritt aktualisieren, Erkenntnisse festhalten und die nächste Aktion bewusst neu setzen.</p>
                </div>
                <form onSubmit={submitReview}>
                  <label>
                    <span>Fortschritt</span>
                    <div className="goal-review-progress-input">
                      <input type="range" min="0" max="100" value={reviewProgress} onChange={event => setReviewProgress(event.target.value)} />
                      <strong>{reviewProgress}%</strong>
                    </div>
                  </label>
                  <label><span>Was ist passiert / was hast du gelernt?</span><textarea rows={5} value={reviewNote} onChange={event => setReviewNote(event.target.value)} placeholder="Fortschritt, Probleme, neue Informationen, Entscheidungen…" /></label>
                  <label><span>Nächste konkrete Aktion</span><input value={reviewNextStep} onChange={event => setReviewNextStep(event.target.value)} /></label>
                  <button type="submit"><CalendarCheck2 size={14} /> Review speichern</button>
                </form>
              </section>

              <section className="goal-review-history">
                <div className="goal-dossier-panel-head"><div><BookOpen size={16} /><h3>Review-Verlauf</h3></div><span>{draft.reviews.length}</span></div>
                {draft.reviews.length ? (
                  <div className="goal-review-history-list">
                    {draft.reviews.map(review => (
                      <article key={review.id}>
                        <div><strong>{formatDate(review.date)}</strong><span>{review.progress}%</span></div>
                        {review.note ? <p>{review.note}</p> : null}
                        <small>Nächster Schritt: {review.nextStep}</small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="goal-plan-empty"><RefreshCw size={21} /><strong>Noch kein Review</strong><span>Der erste Review-Eintrag schafft die Basis für spätere Kurskorrekturen.</span></div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ContextArea({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="goal-context-field wide">
      <span>{label}</span>
      <textarea rows={4} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function ContextInput({
  label,
  value,
  onChange,
  placeholder,
  icon
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  return (
    <label className="goal-context-field">
      <span>{label}</span>
      <div className="goal-context-input"><i>{icon}</i><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></div>
    </label>
  );
}
