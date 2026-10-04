"use client";

import {
  CheckCircle2,
  Clock3,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  UsersRound
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type SocialContact = {
  name: string;
  circle: string;
  relationJan: string;
  relationNadine: string;
  closeness: string;
  frequency: string;
  lastContact: string | null;
};

type ImportPayload = {
  schemaVersion: number;
  contacts: SocialContact[];
};

const STORAGE_KEY = "jan-os-social-contacts-v1";

const cadenceDays: Record<string, number | null> = {
  "mehrmals pro Woche": 3,
  "1× pro Woche": 7,
  "alle 1–2 Wochen": 10,
  "alle 3–4 Wochen": 24,
  "alle 1–2 Monate": 45,
  "anlassbezogen": null,
  "noch festlegen": null,
  "—": null
};

const statusOrder: Record<string, number> = {
  due: 0,
  soon: 1,
  start: 2,
  okay: 3,
  occasion: 4,
  open: 5
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function diffDays(from: string) {
  const start = new Date(`${from}T12:00:00`);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

function addDays(from: string, days: number) {
  const date = new Date(`${from}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function getContactState(contact: SocialContact) {
  const cadence = cadenceDays[contact.frequency];

  if (contact.frequency === "anlassbezogen" || contact.frequency === "—") {
    return { key: "occasion", label: "Anlassbezogen", detail: "keine feste Erinnerung" };
  }

  if (contact.frequency === "noch festlegen" || cadence === undefined || cadence === null) {
    return { key: "open", label: "Noch festlegen", detail: "Rhythmus offen" };
  }

  if (!contact.lastContact) {
    return { key: "start", label: "Start offen", detail: contact.frequency };
  }

  const days = diffDays(contact.lastContact);
  if (days >= cadence) {
    return { key: "due", label: "Jetzt melden", detail: `${days} Tage seit Kontakt` };
  }

  if (days >= Math.floor(cadence * 0.75)) {
    return { key: "soon", label: "Bald", detail: `bis ${addDays(contact.lastContact, cadence)}` };
  }

  return { key: "okay", label: "Im Rhythmus", detail: `bis ${addDays(contact.lastContact, cadence)}` };
}

export function SocialCircle() {
  const [contacts, setContacts] = useState<SocialContact[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ImportPayload;
        if (Array.isArray(parsed.contacts)) setContacts(parsed.contacts);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  function persist(next: SocialContact[]) {
    setContacts(next);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, contacts: next })
    );
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as ImportPayload;
      if (!Array.isArray(parsed.contacts) || parsed.contacts.length === 0) {
        throw new Error("Keine Kontakte gefunden");
      }
      persist(parsed.contacts);
      setMessage(`${parsed.contacts.length} Kontakte lokal geladen`);
    } catch {
      setMessage("Die Datei konnte nicht gelesen werden.");
    } finally {
      event.target.value = "";
    }
  }

  function markToday(name: string) {
    const today = toIsoDate(new Date());
    persist(
      contacts.map(contact =>
        contact.name === name ? { ...contact, lastContact: today } : contact
      )
    );
  }

  function reset() {
    window.localStorage.removeItem(STORAGE_KEY);
    setContacts([]);
    setMessage("Lokale Kontaktdaten entfernt");
  }

  const enriched = useMemo(
    () =>
      contacts
        .map(contact => ({ contact, state: getContactState(contact) }))
        .sort((a, b) => statusOrder[a.state.key] - statusOrder[b.state.key] || a.contact.name.localeCompare(b.contact.name)),
    [contacts]
  );

  const stats = useMemo(() => {
    const due = enriched.filter(item => item.state.key === "due").length;
    const soon = enriched.filter(item => item.state.key === "soon").length;
    const start = enriched.filter(item => item.state.key === "start").length;
    return { due, soon, start };
  }, [enriched]);

  const focus = useMemo(
    () => enriched.filter(item => ["due", "soon", "start"].includes(item.state.key)).slice(0, 5),
    [enriched]
  );

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return enriched;
    return enriched.filter(({ contact }) =>
      [contact.name, contact.circle, contact.relationJan, contact.relationNadine, contact.closeness, contact.frequency]
        .some(field => field?.toLowerCase().includes(value))
    );
  }, [enriched, query]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach(item => {
      const key = item.contact.circle || "Sonstige";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <section className="social-hub social-hub-primary" id="menschen">
      <div className="social-directory-head">
        <div>
          <span className="section-kicker">MENSCHEN & KONTAKTE</span>
          <h2>Familie, Freunde & Kontaktpflege</h2>
          <p>Direkt in „Leben“ – kein eigener Hauptbereich. Wichtig ist nur: Wer ist relevant und wer wäre demnächst wieder dran?</p>
        </div>
        {contacts.length ? (
          <label className="social-search">
            <Search size={15} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Kontakt suchen" />
          </label>
        ) : null}
      </div>

      {!ready ? null : contacts.length === 0 ? (
        <div className="social-empty">
          <div className="social-empty-icon"><UsersRound size={24} /></div>
          <div>
            <span className="section-kicker">PRIVATE DATEN</span>
            <h3>Deine 16 Kontakte sind vorbereitet</h3>
            <p>Lade die JAN-OS-Datei einmal ein. Danach liegen Namen, Beziehungen und Kontaktfrequenzen nur lokal in diesem Browser.</p>
          </div>
          <label className="social-import-button">
            <Upload size={15} /> Kontakte laden
            <input type="file" accept=".json,application/json" onChange={handleImport} />
          </label>
        </div>
      ) : (
        <>
          <div className="social-kpis">
            <div><strong>{contacts.length}</strong><span>Kontakte</span></div>
            <div className={stats.due ? "attention" : ""}><strong>{stats.due}</strong><span>jetzt melden</span></div>
            <div><strong>{stats.soon}</strong><span>bald dran</span></div>
            <div><strong>{stats.start}</strong><span>Start offen</span></div>
          </div>

          {focus.length ? (
            <div className="social-focus-block">
              <div className="social-subhead">
                <div><span className="section-kicker">KONTAKTFOKUS</span><h3>Wer gerade Aufmerksamkeit braucht</h3></div>
              </div>
              <div className="social-focus-list">
                {focus.map(({ contact, state }) => (
                  <article className="social-focus-card" key={contact.name}>
                    <div className="social-avatar">{contact.name.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <strong>{contact.name}</strong>
                      <span>{contact.relationJan || contact.circle}</span>
                    </div>
                    <div className={`social-state ${state.key}`}>
                      <strong>{state.label}</strong>
                      <span>{state.detail}</span>
                    </div>
                    <button type="button" onClick={() => markToday(contact.name)}>
                      <CheckCircle2 size={14} /> Heute Kontakt
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          <div className="social-directory">
            <div className="social-subhead">
              <div><span className="section-kicker">VERZEICHNIS</span><h3>Alle Kontakte</h3></div>
              <span>{filtered.length} von {contacts.length}</span>
            </div>

            <div className="social-groups">
              {groups.map(([circle, entries]) => (
                <section className="social-group" key={circle}>
                  <div className="social-group-head"><strong>{circle}</strong><span>{entries.length}</span></div>
                  <div className="social-contact-list">
                    {entries.map(({ contact, state }) => (
                      <article className="social-contact-row" key={contact.name}>
                        <div className="social-avatar">{contact.name.slice(0, 1).toUpperCase()}</div>
                        <div className="social-contact-copy">
                          <strong>{contact.name}</strong>
                          <span>
                            {contact.relationJan || "Beziehung offen"}
                            {contact.relationNadine ? ` · Nadine: ${contact.relationNadine}` : ""}
                          </span>
                        </div>
                        <div className="social-frequency">
                          <small>Rhythmus</small>
                          <span>{contact.frequency}</span>
                        </div>
                        <div className={`social-state ${state.key}`}>
                          <strong>{state.label}</strong>
                          <span>{state.detail}</span>
                        </div>
                        {state.key !== "occasion" && state.key !== "open" ? (
                          <button type="button" onClick={() => markToday(contact.name)}>
                            <CheckCircle2 size={14} /> Heute Kontakt
                          </button>
                        ) : (
                          <span className="social-passive"><Clock3 size={14} /></span>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="social-local-footer">
            <span><ShieldCheck size={14} /> Lokal gespeichert · nicht im öffentlichen Repo</span>
            <div>
              {message ? <small>{message}</small> : null}
              <label><Upload size={13} /> Neu importieren<input type="file" accept=".json,application/json" onChange={handleImport} /></label>
              <button type="button" onClick={reset}><RotateCcw size={13} /> Zurücksetzen</button>
            </div>
          </div>
        </>
      )}

      {contacts.length === 0 && message ? <p className="social-import-message">{message}</p> : null}
    </section>
  );
}
