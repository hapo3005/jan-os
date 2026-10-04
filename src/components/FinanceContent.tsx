"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Trash2,
  WalletCards,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type FinanceAccount = {
  id: string;
  name: string;
  kind: "Giro" | "Tagesgeld" | "Depot" | "Sonstiges";
  balance: number;
};

type RecurringPayment = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
};

type SavingsGoal = {
  id: string;
  name: string;
  target: number;
  current: number;
  monthly: number;
};

type FinanceDecision = {
  id: string;
  title: string;
  price: number;
  ownFunds: number;
  monthlyRate: number;
  termMonths: number;
};

type FinanceData = {
  income: number;
  fixedCosts: number;
  variableCosts: number;
  reserveMonthly: number;
  liquidReserve: number;
  reserveTarget: number;
  accounts: FinanceAccount[];
  recurring: RecurringPayment[];
  goals: SavingsGoal[];
  decisions: FinanceDecision[];
};

type ModalMode = "month" | "account" | "recurring" | "goal" | "decision" | null;

const STORAGE_KEY = "jan-os-finance-v2";
const LEGACY_KEY = "jan-os-finance-v1";

const EMPTY_DATA: FinanceData = {
  income: 0,
  fixedCosts: 0,
  variableCosts: 0,
  reserveMonthly: 0,
  liquidReserve: 0,
  reserveTarget: 0,
  accounts: [],
  recurring: [],
  goals: [],
  decisions: []
};

function makeId(prefix: string) {
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
}

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

function nextDueDate(day: number) {
  const now = new Date();
  const safeDay = Math.max(1, Math.min(28, day));
  let target = new Date(now.getFullYear(), now.getMonth(), safeDay);
  target.setHours(0, 0, 0, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (target < today) target = new Date(now.getFullYear(), now.getMonth() + 1, safeDay);
  return target;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export function FinanceContent() {
  const [data, setData] = useState<FinanceData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState<ModalMode>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const migrated = {
          ...EMPTY_DATA,
          ...parsed,
          accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
          recurring: Array.isArray(parsed.recurring) ? parsed.recurring : [],
          goals: Array.isArray(parsed.goals) ? parsed.goals : [],
          decisions: Array.isArray(parsed.decisions) ? parsed.decisions : []
        };
        setData(migrated);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  function persist(next: FinanceData) {
    setData(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const metrics = useMemo(() => {
    const recurringTotal = data.recurring.reduce((sum, item) => sum + item.amount, 0);
    const totalFixed = data.fixedCosts + recurringTotal;
    const free = data.income - totalFixed - data.variableCosts - data.reserveMonthly;
    const fixedRate = data.income > 0 ? totalFixed / data.income : 0;
    const reserveProgress = data.reserveTarget > 0 ? data.liquidReserve / data.reserveTarget : 0;
    const planned = totalFixed + data.variableCosts + data.reserveMonthly;
    const plannedRate = data.income > 0 ? planned / data.income : 0;
    const accountBalance = data.accounts.reduce((sum, item) => sum + item.balance, 0);

    return { recurringTotal, totalFixed, free, fixedRate, reserveProgress, planned, plannedRate, accountBalance };
  }, [data]);

  const hasData = data.income > 0 || metrics.totalFixed > 0 || data.variableCosts > 0 || data.accounts.length > 0;

  const upcomingPayments = useMemo(
    () => data.recurring
      .map(item => ({ ...item, next: nextDueDate(item.dueDay) }))
      .sort((a, b) => a.next.getTime() - b.next.getTime())
      .slice(0, 5),
    [data.recurring]
  );

  const recommendation = useMemo(() => {
    if (!hasData) return {
      tone: "neutral",
      title: "Finanzsystem einrichten",
      copy: "Lege Monatsbasis, Konten und wiederkehrende Zahlungen an. Danach priorisiert JAN OS automatisch."
    };
    if (metrics.free < 0) return {
      tone: "alert",
      title: "Monat ist überplant",
      copy: `Es fehlen aktuell ${euro(Math.abs(metrics.free))}. Neue Verpflichtungen sollten vorerst nicht dazukommen.`
    };

    const riskyDecision = data.decisions.find(item => item.monthlyRate > Math.max(0, metrics.free) * .5);
    if (riskyDecision) return {
      tone: "alert",
      title: "Finanzierungsbelastung prüfen",
      copy: `${riskyDecision.title} würde mit ${euro(riskyDecision.monthlyRate)} pro Monat mehr als die Hälfte des freien Cashflows binden.`
    };

    const unfinishedGoal = data.goals.find(goal => goal.target > 0 && goal.current < goal.target);
    if (unfinishedGoal) return {
      tone: "focus",
      title: unfinishedGoal.name + " priorisieren",
      copy: `${euro(metrics.free)} bleiben frei. Das Ziel steht bei ${percent(unfinishedGoal.current / unfinishedGoal.target)}.`
    };

    return {
      tone: "good",
      title: "Finanzieller Spielraum vorhanden",
      copy: `${euro(metrics.free)} bleiben nach laufender Planung frei verfügbar.`
    };
  }, [data, hasData, metrics]);

  function remove(collection: "accounts" | "recurring" | "goals" | "decisions", id: string) {
    persist({ ...data, [collection]: data[collection].filter(item => item.id !== id) } as FinanceData);
  }

  return (
    <>
      <section className="finance-hero">
        <div>
          <p className="eyebrow">FINANZCOCKPIT · PRIVAT</p>
          <h1>Finanzen</h1>
          <p>
            Liquidität, laufende Verpflichtungen, Sparziele und größere Entscheidungen
            in einem belastbaren persönlichen Finanzsystem.
          </p>
        </div>
        <div className="finance-hero-actions">
          <span><ShieldCheck size={14} /> Daten nur lokal gespeichert</span>
          <button type="button" onClick={() => setModal("month")}>
            <SlidersHorizontal size={15} /> Monatsbasis bearbeiten
          </button>
        </div>
      </section>

      <section className="finance-kpis">
        <article className="finance-kpi primary">
          <span className="finance-kpi-icon"><WalletCards size={18} /></span>
          <div><span>FREIER CASHFLOW</span><strong>{hasData ? euro(metrics.free) : "–"}</strong><small>nach Kosten & Sparrate</small></div>
          {hasData ? (metrics.free >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />) : null}
        </article>
        <article className="finance-kpi">
          <span className="finance-kpi-icon"><Landmark size={18} /></span>
          <div><span>KONTEN</span><strong>{data.accounts.length ? euro(metrics.accountBalance) : "–"}</strong><small>{data.accounts.length} hinterlegt</small></div>
        </article>
        <article className="finance-kpi">
          <span className="finance-kpi-icon"><ReceiptText size={18} /></span>
          <div><span>FIX GEBUNDEN</span><strong>{hasData ? euro(metrics.totalFixed) : "–"}</strong><small>{data.income > 0 ? percent(metrics.fixedRate) + " vom Einkommen" : "monatlich"}</small></div>
        </article>
        <article className="finance-kpi">
          <span className="finance-kpi-icon"><PiggyBank size={18} /></span>
          <div><span>RÜCKLAGE</span><strong>{data.liquidReserve ? euro(data.liquidReserve) : "–"}</strong><small>{data.reserveTarget > 0 ? percent(metrics.reserveProgress) + " vom Ziel" : "Ziel offen"}</small></div>
        </article>
      </section>

      <section className="finance-layout">
        <div className="finance-main">
          <article className="finance-panel allocation">
            <div className="finance-panel-head">
              <div><span className="section-kicker">MONATSVERTEILUNG</span><h2>Wie stark ist der Monat gebunden?</h2></div>
              <span>{hasData ? percent(metrics.plannedRate) + " verplant" : "noch leer"}</span>
            </div>

            {hasData && data.income > 0 ? (
              <>
                <div className="finance-allocation-bar">
                  <span className="fixed" style={{ width: `${Math.min(100, metrics.totalFixed / data.income * 100)}%` }} />
                  <span className="variable" style={{ width: `${Math.min(100, data.variableCosts / data.income * 100)}%` }} />
                  <span className="reserve" style={{ width: `${Math.min(100, data.reserveMonthly / data.income * 100)}%` }} />
                </div>
                <div className="finance-breakdown">
                  <div><span className="dot fixed" /><span>Fix & wiederkehrend</span><strong>{euro(metrics.totalFixed)}</strong></div>
                  <div><span className="dot variable" /><span>Variable Ausgaben</span><strong>{euro(data.variableCosts)}</strong></div>
                  <div><span className="dot reserve" /><span>Sparrate</span><strong>{euro(data.reserveMonthly)}</strong></div>
                  <div><span className="dot free" /><span>Frei</span><strong>{euro(metrics.free)}</strong></div>
                </div>
              </>
            ) : (
              <div className="finance-empty-state">
                <CircleDollarSign size={22} />
                <strong>Monatsbasis fehlt</strong>
                <span>Einmal Einkommen und Grundkosten erfassen – danach rechnet JAN OS automatisch.</span>
                <button type="button" onClick={() => setModal("month")}><Plus size={14} /> Monatsbasis erfassen</button>
              </div>
            )}
          </article>

          <article className="finance-panel finance-structured">
            <div className="finance-panel-head">
              <div><span className="section-kicker">KONTEN</span><h2>Liquidität</h2></div>
              <button type="button" className="finance-add-small" onClick={() => setModal("account")}><Plus size={13} /> Konto</button>
            </div>
            {data.accounts.length ? (
              <div className="finance-entity-list">
                {data.accounts.map(account => (
                  <div className="finance-entity-row" key={account.id}>
                    <span className="finance-entity-icon"><Landmark size={15} /></span>
                    <div><strong>{account.name}</strong><span>{account.kind}</span></div>
                    <strong>{euro(account.balance)}</strong>
                    <button type="button" onClick={() => remove("accounts", account.id)}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            ) : <EmptyMini text="Noch keine Konten hinterlegt." />}
          </article>

          <article className="finance-panel finance-structured">
            <div className="finance-panel-head">
              <div><span className="section-kicker">WIEDERKEHREND</span><h2>Kommende Belastungen</h2></div>
              <button type="button" className="finance-add-small" onClick={() => setModal("recurring")}><Plus size={13} /> Zahlung</button>
            </div>
            {upcomingPayments.length ? (
              <div className="finance-payment-list">
                {upcomingPayments.map(payment => (
                  <div key={payment.id}>
                    <span className="finance-due-date">{formatShortDate(payment.next)}</span>
                    <div><strong>{payment.name}</strong><span>{payment.category || "Fixkosten"}</span></div>
                    <strong>{euro(payment.amount)}</strong>
                    <button type="button" onClick={() => remove("recurring", payment.id)}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            ) : <EmptyMini text="Noch keine wiederkehrenden Zahlungen erfasst." />}
          </article>

          <article className="finance-panel finance-structured">
            <div className="finance-panel-head">
              <div><span className="section-kicker">SPARZIELE</span><h2>Wofür wird aufgebaut?</h2></div>
              <button type="button" className="finance-add-small" onClick={() => setModal("goal")}><Plus size={13} /> Ziel</button>
            </div>
            {data.goals.length ? (
              <div className="finance-goal-list">
                {data.goals.map(goal => {
                  const progress = goal.target > 0 ? goal.current / goal.target : 0;
                  return (
                    <div className="finance-goal-card" key={goal.id}>
                      <div><span className="finance-entity-icon"><Target size={15} /></span><div><strong>{goal.name}</strong><span>{euro(goal.current)} von {euro(goal.target)}</span></div><button type="button" onClick={() => remove("goals", goal.id)}><Trash2 size={13} /></button></div>
                      <div className="finance-goal-progress"><i style={{ width: `${Math.min(100, progress * 100)}%` }} /></div>
                      <small>{percent(progress)} erreicht · {goal.monthly > 0 ? euro(goal.monthly) + " / Monat" : "keine Sparrate"}</small>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyMini text="Noch kein konkretes Sparziel angelegt." />}
          </article>

          <article className="finance-panel finance-structured">
            <div className="finance-panel-head">
              <div><span className="section-kicker">ENTSCHEIDUNGEN</span><h2>Größere Käufe & Finanzierungen</h2></div>
              <button type="button" className="finance-add-small" onClick={() => setModal("decision")}><Plus size={13} /> Entscheidung</button>
            </div>
            {data.decisions.length ? (
              <div className="finance-decision-list">
                {data.decisions.map(decision => {
                  const financed = Math.max(0, decision.price - decision.ownFunds);
                  const afterRate = metrics.free - decision.monthlyRate;
                  const totalRates = decision.monthlyRate * decision.termMonths;
                  return (
                    <article key={decision.id}>
                      <div className="finance-decision-list-head">
                        <div><strong>{decision.title}</strong><span>{euro(decision.price)} Kaufpreis</span></div>
                        <button type="button" onClick={() => remove("decisions", decision.id)}><Trash2 size={13} /></button>
                      </div>
                      <div className="finance-decision-metrics">
                        <div><span>Finanzierung</span><strong>{euro(financed)}</strong></div>
                        <div><span>Rate</span><strong>{euro(decision.monthlyRate)}</strong></div>
                        <div><span>Laufzeit</span><strong>{decision.termMonths || "–"} Mon.</strong></div>
                        <div><span>Danach frei</span><strong className={afterRate < 0 ? "negative" : ""}>{euro(afterRate)}</strong></div>
                      </div>
                      {decision.termMonths > 0 && decision.monthlyRate > 0 ? <small>Raten gesamt: {euro(totalRates)} · ohne Schlussrate/Zinsen separat</small> : null}
                    </article>
                  );
                })}
              </div>
            ) : <EmptyMini text="Noch keine größere Entscheidung zur Bewertung hinterlegt." />}
          </article>
        </div>

        <aside className="finance-side">
          <article className={`finance-decision ${recommendation.tone}`}>
            <span className="section-kicker">PRIORITÄT JETZT</span>
            <h2>{recommendation.title}</h2>
            <p>{recommendation.copy}</p>
            <span className="finance-decision-status"><CheckCircle2 size={14} /> automatisch berechnet</span>
          </article>

          <article className="finance-panel compact">
            <div className="finance-panel-head"><div><span className="section-kicker">PLANBAR</span><h2>Monatsrahmen</h2></div></div>
            <div className="finance-mini-list">
              <div><span>Einkommen</span><strong>{euro(data.income)}</strong></div>
              <div><span>Fix & wiederkehrend</span><strong>{euro(metrics.totalFixed)}</strong></div>
              <div><span>Variable Ausgaben</span><strong>{euro(data.variableCosts)}</strong></div>
              <div><span>Sparrate</span><strong>{euro(data.reserveMonthly)}</strong></div>
              <div><span>Freier Cashflow</span><strong className={metrics.free < 0 ? "negative" : ""}>{euro(metrics.free)}</strong></div>
            </div>
          </article>

          <article className="finance-panel compact">
            <div className="finance-panel-head"><div><span className="section-kicker">NÄCHSTE BELASTUNG</span><h2>Was kommt zuerst?</h2></div><CalendarClock size={17} /></div>
            {upcomingPayments[0] ? (
              <div className="finance-next-payment">
                <strong>{upcomingPayments[0].name}</strong>
                <span>{formatShortDate(upcomingPayments[0].next)} · {euro(upcomingPayments[0].amount)}</span>
              </div>
            ) : <EmptyMini text="Keine regelmäßige Zahlung hinterlegt." />}
          </article>
        </aside>
      </section>

      {modal === "month" ? <MonthForm initial={data} onClose={() => setModal(null)} onSave={next => { persist(next); setModal(null); }} /> : null}
      {modal === "account" ? <AccountForm onClose={() => setModal(null)} onSave={item => { persist({ ...data, accounts: [...data.accounts, item] }); setModal(null); }} /> : null}
      {modal === "recurring" ? <RecurringForm onClose={() => setModal(null)} onSave={item => { persist({ ...data, recurring: [...data.recurring, item] }); setModal(null); }} /> : null}
      {modal === "goal" ? <GoalForm onClose={() => setModal(null)} onSave={item => { persist({ ...data, goals: [...data.goals, item] }); setModal(null); }} /> : null}
      {modal === "decision" ? <DecisionForm onClose={() => setModal(null)} onSave={item => { persist({ ...data, decisions: [...data.decisions, item] }); setModal(null); }} /> : null}

      {!ready ? <span className="sr-only">Finanzdaten werden geladen</span> : null}
    </>
  );
}

function EmptyMini({ text }: { text: string }) {
  return <div className="finance-empty-mini"><span>{text}</span></div>;
}

function ModalShell({ title, kicker, onClose, children }: { title: string; kicker: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="calendar-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="calendar-modal finance-modal" onMouseDown={event => event.stopPropagation()}>
        <div className="calendar-modal-head">
          <div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MonthForm({ initial, onClose, onSave }: { initial: FinanceData; onClose: () => void; onSave: (data: FinanceData) => void }) {
  const [form, setForm] = useState(initial);
  function update(key: keyof FinanceData, value: string) {
    setForm(current => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
  }
  function submit(event: FormEvent) { event.preventDefault(); onSave(form); }
  return (
    <ModalShell title="Monatsbasis bearbeiten" kicker="MONATSBASIS" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="finance-form-grid">
          <label><span>Monatliches Einkommen</span><input type="number" min="0" value={form.income || ""} onChange={e => update("income", e.target.value)} /></label>
          <label><span>Sonstige Fixkosten</span><input type="number" min="0" value={form.fixedCosts || ""} onChange={e => update("fixedCosts", e.target.value)} /></label>
          <label><span>Variable Ausgaben</span><input type="number" min="0" value={form.variableCosts || ""} onChange={e => update("variableCosts", e.target.value)} /></label>
          <label><span>Monatliche Sparrate</span><input type="number" min="0" value={form.reserveMonthly || ""} onChange={e => update("reserveMonthly", e.target.value)} /></label>
          <label><span>Aktuelle Rücklage</span><input type="number" min="0" value={form.liquidReserve || ""} onChange={e => update("liquidReserve", e.target.value)} /></label>
          <label><span>Rücklagenziel</span><input type="number" min="0" value={form.reserveTarget || ""} onChange={e => update("reserveTarget", e.target.value)} /></label>
        </div>
        <ModalActions onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function AccountForm({ onClose, onSave }: { onClose: () => void; onSave: (item: FinanceAccount) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<FinanceAccount["kind"]>("Giro");
  const [balance, setBalance] = useState("");
  function submit(e: FormEvent) { e.preventDefault(); if (!name.trim()) return; onSave({ id: makeId("acc"), name: name.trim(), kind, balance: Number(balance) || 0 }); }
  return (
    <ModalShell title="Konto hinzufügen" kicker="LIQUIDITÄT" onClose={onClose}>
      <form onSubmit={submit}><div className="finance-form-grid">
        <label><span>Name</span><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="z. B. Girokonto" /></label>
        <label><span>Art</span><select value={kind} onChange={e => setKind(e.target.value as FinanceAccount["kind"])}><option>Giro</option><option>Tagesgeld</option><option>Depot</option><option>Sonstiges</option></select></label>
        <label><span>Aktueller Stand</span><input type="number" value={balance} onChange={e => setBalance(e.target.value)} /></label>
      </div><ModalActions onClose={onClose} /></form>
    </ModalShell>
  );
}

function RecurringForm({ onClose, onSave }: { onClose: () => void; onSave: (item: RecurringPayment) => void }) {
  const [name, setName] = useState(""); const [amount, setAmount] = useState(""); const [dueDay, setDueDay] = useState("1"); const [category, setCategory] = useState("");
  function submit(e: FormEvent) { e.preventDefault(); if (!name.trim() || !amount) return; onSave({ id: makeId("rec"), name: name.trim(), amount: Math.max(0, Number(amount) || 0), dueDay: Math.max(1, Math.min(28, Number(dueDay) || 1)), category: category.trim() }); }
  return (
    <ModalShell title="Wiederkehrende Zahlung" kicker="FIXKOSTEN" onClose={onClose}>
      <form onSubmit={submit}><div className="finance-form-grid">
        <label><span>Name</span><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="z. B. Miete" /></label>
        <label><span>Betrag / Monat</span><input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <label><span>Fälligkeit (Tag)</span><input type="number" min="1" max="28" value={dueDay} onChange={e => setDueDay(e.target.value)} /></label>
        <label><span>Kategorie</span><input value={category} onChange={e => setCategory(e.target.value)} placeholder="Wohnen, Versicherung…" /></label>
      </div><ModalActions onClose={onClose} /></form>
    </ModalShell>
  );
}

function GoalForm({ onClose, onSave }: { onClose: () => void; onSave: (item: SavingsGoal) => void }) {
  const [name, setName] = useState(""); const [target, setTarget] = useState(""); const [current, setCurrent] = useState(""); const [monthly, setMonthly] = useState("");
  function submit(e: FormEvent) { e.preventDefault(); if (!name.trim() || !target) return; onSave({ id: makeId("goal"), name: name.trim(), target: Number(target) || 0, current: Number(current) || 0, monthly: Number(monthly) || 0 }); }
  return (
    <ModalShell title="Sparziel anlegen" kicker="ZIEL" onClose={onClose}>
      <form onSubmit={submit}><div className="finance-form-grid">
        <label><span>Ziel</span><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="z. B. Notgroschen" /></label>
        <label><span>Zielbetrag</span><input type="number" min="0" value={target} onChange={e => setTarget(e.target.value)} /></label>
        <label><span>Bereits vorhanden</span><input type="number" min="0" value={current} onChange={e => setCurrent(e.target.value)} /></label>
        <label><span>Monatliche Sparrate</span><input type="number" min="0" value={monthly} onChange={e => setMonthly(e.target.value)} /></label>
      </div><ModalActions onClose={onClose} /></form>
    </ModalShell>
  );
}

function DecisionForm({ onClose, onSave }: { onClose: () => void; onSave: (item: FinanceDecision) => void }) {
  const [title, setTitle] = useState(""); const [price, setPrice] = useState(""); const [ownFunds, setOwnFunds] = useState(""); const [monthlyRate, setMonthlyRate] = useState(""); const [termMonths, setTermMonths] = useState("");
  function submit(e: FormEvent) { e.preventDefault(); if (!title.trim() || !price) return; onSave({ id: makeId("dec"), title: title.trim(), price: Number(price) || 0, ownFunds: Number(ownFunds) || 0, monthlyRate: Number(monthlyRate) || 0, termMonths: Number(termMonths) || 0 }); }
  return (
    <ModalShell title="Entscheidung bewerten" kicker="KAUF / FINANZIERUNG" onClose={onClose}>
      <form onSubmit={submit}><div className="finance-form-grid">
        <label><span>Vorhaben</span><input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="z. B. Fahrzeug" /></label>
        <label><span>Kaufpreis</span><input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} /></label>
        <label><span>Eigenmittel</span><input type="number" min="0" value={ownFunds} onChange={e => setOwnFunds(e.target.value)} /></label>
        <label><span>Monatliche Rate</span><input type="number" min="0" value={monthlyRate} onChange={e => setMonthlyRate(e.target.value)} /></label>
        <label><span>Laufzeit Monate</span><input type="number" min="0" value={termMonths} onChange={e => setTermMonths(e.target.value)} /></label>
      </div><ModalActions onClose={onClose} /></form>
    </ModalShell>
  );
}

function ModalActions({ onClose }: { onClose: () => void }) {
  return <div className="calendar-modal-actions"><button type="button" onClick={onClose}>Abbrechen</button><button type="submit"><CheckCircle2 size={14} /> Speichern</button></div>;
}
