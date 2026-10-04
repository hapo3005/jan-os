"use client";

import {
  CheckCircle2,
  Clock3,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UsersRound,
  X
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

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

function readPrivateContactsFromHash(): SocialContact[] {
  const prefix = "#jan-contacts=";
  if (!window.location.hash.startsWith(prefix)) return [];

  try {
    const encoded = window.location.hash.slice(prefix.length);
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(decoded) as ImportPayload;
    return Array.isArray(parsed.contacts) ? parsed.contacts : [];
  } catch {
    return [];
  }
}

export function SocialCircle() {
  const [contacts, setContacts] = useState<SocialContact[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SocialContact | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);

  useEffect(() => {
    try {
      const imported = readPrivateContactsFromHash();
      if (imported.length) {
        persist(imported);
        setMessage(`${imported.length} Kontakte lokal übernommen`);
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } else {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ImportPayload;
          if (Array.isArray(parsed.contacts)) setContacts(parsed.contacts);
        }
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

  function openNewContact() {
    setEditing(null);
    setShowContactForm(true);
  }

  function openEditContact(contact: SocialContact) {
    setEditing(contact);
    setShowContactForm(true);
  }

  function saveContact(next: SocialContact) {
    const originalName = editing?.name;
    const withoutOriginal = originalName
      ? contacts.filter(contact => contact.name !== originalName)
      : contacts.filter(contact => contact.name !== next.name);
    persist([...withoutOriginal, next]);
    setShowContactForm(false);
    setEditing(null);
    setMessage(`${next.name} gespeichert`);
  }

  function deleteContact(name: string) {
    persist(contacts.filter(contact => contact.name !== name));
    setShowContactForm(false);
    setEditing(null);
    setMessage(`${name} entfernt`);
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
          <p>Hier sind die Kontakte tatsächlich hinterlegt: abrufen, durchsuchen, aktualisieren und Kontaktverläufe pflegen – direkt in „Leben“.</p>
        </div>
        {contacts.length ? (
          <div className="social-directory-actions">
            <label className="social-search">
              <Search size={15} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Kontakt suchen" />
            </label>
            <button type="button" className="social-add-contact" onClick={openNewContact}><Plus size={14} /> Kontakt</button>
          </div>
        ) : null}
      </div>

      {!ready ? null : contacts.length === 0 ? (
        <div className="social-empty">
          <div className="social-empty-icon"><UsersRound size={24} /></div>
          <div>
            <span className="section-kicker">PRIVATE DATEN</span>
            <h3>Deine Kontakte sind vorbereitet</h3>
            <p>Lade sie einmal ein. Danach kannst du jeden Kontakt hier direkt öffnen und aktualisieren; gespeichert wird lokal in diesem Browser.</p>
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
                    <div className="social-focus-actions">
                      <button type="button" onClick={() => markToday(contact.name)}><CheckCircle2 size={14} /> Heute Kontakt</button>
                      <button type="button" className="icon" onClick={() => openEditContact(contact)} aria-label={contact.name + " bearbeiten"}><Pencil size={13} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          <div className="social-directory">
            <div className="social-subhead">
              <div><span className="section-kicker">KONTAKTVERZEICHNIS</span><h3>Alle Kontakte</h3></div>
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
                        <button type="button" className="social-contact-copy social-contact-open" onClick={() => openEditContact(contact)}>
                          <strong>{contact.name}</strong>
                          <span>
                            {contact.relationJan || "Beziehung offen"}
                            {contact.relationNadine ? ` · Nadine: ${contact.relationNadine}` : ""}
                          </span>
                        </button>
                        <div className="social-frequency">
                          <small>Rhythmus</small>
                          <span>{contact.frequency}</span>
                        </div>
                        <div className={`social-state ${state.key}`}>
                          <strong>{state.label}</strong>
                          <span>{state.detail}</span>
                        </div>
                        <div className="social-row-actions">
                          {state.key !== "occasion" && state.key !== "open" ? (
                            <button type="button" onClick={() => markToday(contact.name)}>
                              <CheckCircle2 size={14} /> Heute Kontakt
                            </button>
                          ) : <span className="social-passive"><Clock3 size={14} /></span>}
                          <button type="button" className="icon" onClick={() => openEditContact(contact)} aria-label={contact.name + " bearbeiten"}><Pencil size={13} /></button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="social-local-footer">
            <span><ShieldCheck size={14} /> Lokal gespeichert · hier bearbeitbar</span>
            <div>
              {message ? <small>{message}</small> : null}
              <label><Upload size={13} /> Neu importieren<input type="file" accept=".json,application/json" onChange={handleImport} /></label>
              <button type="button" onClick={reset}><RotateCcw size={13} /> Zurücksetzen</button>
            </div>
          </div>
        </>
      )}

      {contacts.length === 0 && message ? <p className="social-import-message">{message}</p> : null}

      {showContactForm ? (
        <ContactForm
          initial={editing}
          onClose={() => { setShowContactForm(false); setEditing(null); }}
          onSave={saveContact}
          onDelete={editing ? () => deleteContact(editing.name) : undefined}
        />
      ) : null}
    </section>
  );
}

function ContactForm({
  initial,
  onClose,
  onSave,
  onDelete
}: {
  initial: SocialContact | null;
  onClose: () => void;
  onSave: (contact: SocialContact) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<SocialContact>(initial ?? {
    name: "",
    circle: "",
    relationJan: "",
    relationNadine: "",
    closeness: "normal",
    frequency: "noch festlegen",
    lastContact: null
  });

  function update<K extends keyof SocialContact>(key: K, value: SocialContact[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      name: form.name.trim(),
      circle: form.circle.trim() || "Sonstige",
      relationJan: form.relationJan.trim(),
      relationNadine: form.relationNadine.trim()
    });
  }

  return (
    <div className="calendar-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="calendar-modal social-contact-modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
        <div className="calendar-modal-head">
          <div>
            <span className="section-kicker">KONTAKTVERWALTUNG</span>
            <h2>{initial ? initial.name : "Kontakt hinzufügen"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
        </div>

        <div className="social-contact-form">
          <label><span>Name</span><input autoFocus value={form.name} onChange={e => update("name", e.target.value)} /></label>
          <label><span>Kreis</span><input value={form.circle} onChange={e => update("circle", e.target.value)} placeholder="Familie Jan, Freunde…" /></label>
          <label><span>Beziehung zu Jan</span><input value={form.relationJan} onChange={e => update("relationJan", e.target.value)} /></label>
          <label><span>Beziehung zu Nadine</span><input value={form.relationNadine} onChange={e => update("relationNadine", e.target.value)} /></label>
          <label>
            <span>Nähe</span>
            <select value={form.closeness} onChange={e => update("closeness", e.target.value)}>
              <option>sehr nah</option><option>nah</option><option>gut</option><option>normal</option><option>lose</option>
            </select>
          </label>
          <label>
            <span>Kontaktfrequenz</span>
            <select value={form.frequency} onChange={e => update("frequency", e.target.value)}>
              <option>mehrmals pro Woche</option><option>1× pro Woche</option><option>alle 1–2 Wochen</option>
              <option>alle 3–4 Wochen</option><option>alle 1–2 Monate</option><option>anlassbezogen</option><option>noch festlegen</option>
            </select>
          </label>
          <label>
            <span>Letzter Kontakt</span>
            <input type="date" value={form.lastContact ?? ""} onChange={e => update("lastContact", e.target.value || null)} />
          </label>
        </div>

        <div className="social-contact-modal-actions">
          {onDelete ? <button type="button" className="danger" onClick={onDelete}><Trash2 size={14} /> Löschen</button> : <span />}
          <div>
            <button type="button" onClick={onClose}>Abbrechen</button>
            <button type="submit"><CheckCircle2 size={14} /> Speichern</button>
          </div>
        </div>
      </form>
    </div>
  );
}
