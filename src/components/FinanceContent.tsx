"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type FinanceData = {
  income: number;
  fixedCosts: number;
  variableCosts: number;
  reserveMonthly: number;
  liquidReserve: number;
  reserveTarget: number;
};

const STORAGE_KEY = "jan-os-finance-v1";

const EMPTY_DATA: FinanceData = {
  income: 0,
  fixedCosts: 0,
  variableCosts: 0,
  reserveMonthly: 0,
  liquidReserve: 0,
  reserveTarget: 0
};

function euro(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);
}

function percent(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "percent",
    maximumFractionDigits: 0
  }).format(Math.max(0, Math.min(1, value)));
}

export function FinanceContent() {
  const [data, setData] = useState<FinanceData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setData({ ...EMPTY_DATA, ...parsed });
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  function save(next: FinanceData) {
    setData(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setShowForm(false);
  }

  const metrics = useMemo(() => {
    const free = data.income - data.fixedCosts - data.variableCosts - data.reserveMonthly;
    const fixedRate = data.income > 0 ? data.fixedCosts / data.income : 0;
    const reserveProgress = data.reserveTarget > 0 ? data.liquidReserve / data.reserveTarget : 0;
    const planned = data.fixedCosts + data.variableCosts + data.reserveMonthly;
    const plannedRate = data.income > 0 ? planned / data.income : 0;

    return { free, fixedRate, reserveProgress, planned, plannedRate };
  }, [data]);

  const hasData = data.income > 0 || data.fixedCosts > 0 || data.variableCosts > 0 || data.liquidReserve > 0;

  const recommendation = useMemo(() => {
    if (!hasData) {
      return {
        tone: "neutral",
        title: "Monatsdaten erfassen",
        copy: "Mit sechs Zahlen wird aus der leeren Finanzseite ein belastbares Monatscockpit."
      };
    }
    if (metrics.free < 0) {
      return {
        tone: "alert",
        title: "Monat ist aktuell überplant",
        copy: `Es fehlen ${euro(Math.abs(metrics.free))}. Prüfe zuerst variable Ausgaben oder geplante Rücklagen.`
      };
    }
    if (data.reserveTarget > 0 && metrics.reserveProgress < 1) {
      return {
        tone: "focus",
        title: "Rücklage weiter aufbauen",
        copy: `${euro(metrics.free)} bleiben nach laufender Planung frei. Die Rücklage steht bei ${percent(metrics.reserveProgress)} des Ziels.`
      };
    }
    return {
      tone: "good",
      title: "Finanzieller Spielraum vorhanden",
      copy: `${euro(metrics.free)} sind nach Kosten und geplanter Rücklage noch frei verfügbar.`
    };
  }, [data, hasData, metrics]);

  return (
    <>
      <section className="finance-hero">
        <div>
          <p className="eyebrow">FINANZCOCKPIT · MONAT</p>
          <h1>Finanzen</h1>
          <p>
            Nicht Zahlen sammeln, sondern sofort sehen, was gebunden ist, was frei bleibt
            und wo als Nächstes eine Entscheidung nötig ist.
          </p>
        </div>
        <div className="finance-hero-actions">
          <span><ShieldCheck size={14} /> Daten nur lokal gespeichert</span>
          <button type="button" onClick={() => setShowForm(true)}>
            <SlidersHorizontal size={15} /> Monatsdaten bearbeiten
          </button>
        </div>
      </section>

      <section className="finance-kpis">
        <article className="finance-kpi primary">
          <span className="finance-kpi-icon"><WalletCards size={18} /></span>
          <div>
            <span>FREI VERFÜGBAR</span>
            <strong>{hasData ? euro(metrics.free) : "–"}</strong>
            <small>{hasData ? "nach Kosten & Rücklage" : "noch keine Monatsdaten"}</small>
          </div>
          {hasData ? (metrics.free >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />) : null}
        </article>

        <article className="finance-kpi">
          <span className="finance-kpi-icon"><ReceiptText size={18} /></span>
          <div>
            <span>FIXKOSTEN</span>
            <strong>{hasData ? euro(data.fixedCosts) : "–"}</strong>
            <small>{hasData && data.income > 0 ? percent(metrics.fixedRate) + " vom Einkommen" : "monatlich gebunden"}</small>
          </div>
        </article>

        <article className="finance-kpi">
          <span className="finance-kpi-icon"><PiggyBank size={18} /></span>
          <div>
            <span>RÜCKLAGE</span>
            <strong>{hasData ? euro(data.liquidReserve) : "–"}</strong>
            <small>{data.reserveTarget > 0 ? percent(metrics.reserveProgress) + " vom Ziel" : "Ziel noch offen"}</small>
          </div>
        </article>

        <article className="finance-kpi">
          <span className="finance-kpi-icon"><Landmark size={18} /></span>
          <div>
            <span>EINKOMMEN</span>
            <strong>{hasData ? euro(data.income) : "–"}</strong>
            <small>Monatsbasis</small>
          </div>
        </article>
      </section>

      <section className="finance-layout">
        <div className="finance-main">
          <article className="finance-panel allocation">
            <div className="finance-panel-head">
              <div>
                <span className="section-kicker">MONATSVERTEILUNG</span>
                <h2>Wohin fließt das Geld?</h2>
              </div>
              <span>{hasData ? percent(metrics.plannedRate) + " verplant" : "noch leer"}</span>
            </div>

            {hasData && data.income > 0 ? (
              <>
                <div className="finance-allocation-bar" aria-label="Monatsverteilung">
                  <span className="fixed" style={{ width: `${Math.min(100, data.fixedCosts / data.income * 100)}%` }} />
                  <span className="variable" style={{ width: `${Math.min(100, data.variableCosts / data.income * 100)}%` }} />
                  <span className="reserve" style={{ width: `${Math.min(100, data.reserveMonthly / data.income * 100)}%` }} />
                </div>
                <div className="finance-breakdown">
                  <div><span className="dot fixed" /><span>Fixkosten</span><strong>{euro(data.fixedCosts)}</strong></div>
                  <div><span className="dot variable" /><span>Variable Ausgaben</span><strong>{euro(data.variableCosts)}</strong></div>
                  <div><span className="dot reserve" /><span>Rücklage geplant</span><strong>{euro(data.reserveMonthly)}</strong></div>
                  <div><span className="dot free" /><span>Frei</span><strong>{euro(metrics.free)}</strong></div>
                </div>
              </>
            ) : (
              <div className="finance-empty-state">
                <CircleDollarSign size={22} />
                <strong>Noch keine Monatsbasis hinterlegt</strong>
                <span>Einmal Einkommen, Kosten und Rücklagen erfassen – danach rechnet JAN OS den Monat automatisch.</span>
                <button type="button" onClick={() => setShowForm(true)}><Plus size={14} /> Daten erfassen</button>
              </div>
            )}
          </article>

          <article className="finance-panel reserve-panel">
            <div className="finance-panel-head">
              <div>
                <span className="section-kicker">SICHERHEIT</span>
                <h2>Rücklage</h2>
              </div>
              <PiggyBank size={18} />
            </div>

            <div className="finance-reserve-progress">
              <div>
                <strong>{data.reserveTarget > 0 ? percent(metrics.reserveProgress) : "–"}</strong>
                <span>Ziel erreicht</span>
              </div>
              <div className="finance-progress-track">
                <i style={{ width: `${Math.min(100, metrics.reserveProgress * 100)}%` }} />
              </div>
              <div className="finance-reserve-meta">
                <span>Ist <strong>{euro(data.liquidReserve)}</strong></span>
                <span>Ziel <strong>{data.reserveTarget ? euro(data.reserveTarget) : "–"}</strong></span>
              </div>
            </div>
          </article>
        </div>

        <aside className="finance-side">
          <article className={`finance-decision ${recommendation.tone}`}>
            <span className="section-kicker">PRIORITÄT JETZT</span>
            <h2>{recommendation.title}</h2>
            <p>{recommendation.copy}</p>
            {!hasData ? (
              <button type="button" onClick={() => setShowForm(true)}>Monat einrichten</button>
            ) : (
              <span className="finance-decision-status"><CheckCircle2 size={14} /> automatisch berechnet</span>
            )}
          </article>

          <article className="finance-panel compact">
            <div className="finance-panel-head">
              <div>
                <span className="section-kicker">PLANBAR</span>
                <h2>Monatsrahmen</h2>
              </div>
            </div>
            <div className="finance-mini-list">
              <div><span>Einnahmen</span><strong>{euro(data.income)}</strong></div>
              <div><span>Gesamtausgaben</span><strong>{euro(data.fixedCosts + data.variableCosts)}</strong></div>
              <div><span>Geplante Rücklage</span><strong>{euro(data.reserveMonthly)}</strong></div>
              <div><span>Rest</span><strong className={metrics.free < 0 ? "negative" : ""}>{euro(metrics.free)}</strong></div>
            </div>
          </article>
        </aside>
      </section>

      {showForm ? <FinanceForm initial={data} onClose={() => setShowForm(false)} onSave={save} /> : null}

      {!ready ? <span className="sr-only">Finanzdaten werden geladen</span> : null}
    </>
  );
}

function FinanceForm({
  initial,
  onClose,
  onSave
}: {
  initial: FinanceData;
  onClose: () => void;
  onSave: (data: FinanceData) => void;
}) {
  const [form, setForm] = useState(initial);

  function update(key: keyof FinanceData, value: string) {
    setForm(current => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <div className="calendar-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="calendar-modal finance-modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
        <div className="calendar-modal-head">
          <div>
            <span className="section-kicker">MONATSBASIS</span>
            <h2>Finanzdaten bearbeiten</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
        </div>

        <div className="finance-form-grid">
          <label><span>Monatliches Einkommen</span><input type="number" min="0" step="1" value={form.income || ""} onChange={e => update("income", e.target.value)} /></label>
          <label><span>Fixkosten</span><input type="number" min="0" step="1" value={form.fixedCosts || ""} onChange={e => update("fixedCosts", e.target.value)} /></label>
          <label><span>Variable Ausgaben</span><input type="number" min="0" step="1" value={form.variableCosts || ""} onChange={e => update("variableCosts", e.target.value)} /></label>
          <label><span>Monatliche Rücklage</span><input type="number" min="0" step="1" value={form.reserveMonthly || ""} onChange={e => update("reserveMonthly", e.target.value)} /></label>
          <label><span>Aktuelle Rücklage</span><input type="number" min="0" step="1" value={form.liquidReserve || ""} onChange={e => update("liquidReserve", e.target.value)} /></label>
          <label><span>Rücklagenziel</span><input type="number" min="0" step="1" value={form.reserveTarget || ""} onChange={e => update("reserveTarget", e.target.value)} /></label>
        </div>

        <p className="finance-modal-note">Diese Werte bleiben ausschließlich im lokalen Browser-Speicher.</p>

        <div className="calendar-modal-actions">
          <button type="button" onClick={onClose}>Abbrechen</button>
          <button type="submit"><CheckCircle2 size={14} /> Speichern</button>
        </div>
      </form>
    </div>
  );
}
