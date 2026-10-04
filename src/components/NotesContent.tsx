"use client";

import {
  Archive,
  CheckCircle2,
  ChevronRight,
  FileText,
  Inbox,
  Lightbulb,
  Link2,
  MoreHorizontal,
  NotebookPen,
  Pin,
  PinOff,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type NoteKind = "Notiz" | "Idee" | "Wissen" | "Entscheidung";
type NoteStatus = "offen" | "in Arbeit" | "archiviert";
type NotePriority = "normal" | "wichtig";
type ContextType = "Keiner" | "Projekt" | "Ziel" | "Kontakt" | "Kalender" | "Gesundheit" | "Finanzen" | "KISS" | "Leben";

type NoteItem = {
  id: string;
  title: string;
  body: string;
  kind: NoteKind;
  status: NoteStatus;
  priority: NotePriority;
  pinned: boolean;
  contextType: ContextType;
  contextLabel: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type NoteView = "Alle" | "Inbox" | "Angeheftet" | "Verknüpft" | "Wissen" | "Entscheidungen";

const STORAGE_KEY = "jan-os-notes-v1";

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return "note-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function relativeLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const diff = Math.floor((today.getTime() - date.getTime()) / 86400000);
  if (diff <= 0) return "heute";
  if (diff === 1) return "gestern";
  if (diff < 7) return "vor " + diff + " Tagen";
  return formatDate(value);
}

function shortBody(value: string) {
  const clean = value.trim().replace(/\s+/g, " ");
  return clean.length > 160 ? clean.slice(0, 157) + "…" : clean;
}

export function NotesContent() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [capture, setCapture] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<NoteView>("Alle");
  const [editing, setEditing] = useState<NoteItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setNotes(parsed);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  function persist(next: NoteItem[]) {
    setNotes(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function quickCapture(kind: NoteKind = "Notiz") {
    const text = capture.trim();
    if (!text) return;

    const firstLine = text.split("\n")[0].trim();
    const title = firstLine.length > 72 ? firstLine.slice(0, 69) + "…" : firstLine;

    const note: NoteItem = {
      id: makeId(),
      title: title || "Neue Notiz",
      body: text,
      kind,
      status: "offen",
      priority: "normal",
      pinned: false,
      contextType: "Keiner",
      contextLabel: "",
      tags: [],
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    persist([note, ...notes]);
    setCapture("");
    setView("Inbox");
  }

  function saveNote(note: NoteItem) {
    persist([
      { ...note, updatedAt: nowIso() },
      ...notes.filter(item => item.id !== note.id)
    ]);
    setEditing(null);
    setShowForm(false);
  }

  function togglePin(id: string) {
    persist(notes.map(note => note.id === id
      ? { ...note, pinned: !note.pinned, updatedAt: nowIso() }
      : note
    ));
  }

  function archiveNote(id: string) {
    persist(notes.map(note => note.id === id
      ? { ...note, status: note.status === "archiviert" ? "offen" : "archiviert", updatedAt: nowIso() }
      : note
    ));
  }

  function deleteNote(id: string) {
    persist(notes.filter(note => note.id !== id));
  }

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  const activeNotes = useMemo(
    () => notes.filter(note => note.status !== "archiviert"),
    [notes]
  );

  const stats = useMemo(() => {
    const inbox = activeNotes.filter(note => note.contextType === "Keiner").length;
    const pinned = activeNotes.filter(note => note.pinned).length;
    const linked = activeNotes.filter(note => note.contextType !== "Keiner").length;
    const decisions = activeNotes.filter(note => note.kind === "Entscheidung").length;
    return { inbox, pinned, linked, decisions };
  }, [activeNotes]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return notes
      .filter(note => {
        if (view === "Inbox") return note.status !== "archiviert" && note.contextType === "Keiner";
        if (view === "Angeheftet") return note.status !== "archiviert" && note.pinned;
        if (view === "Verknüpft") return note.status !== "archiviert" && note.contextType !== "Keiner";
        if (view === "Wissen") return note.status !== "archiviert" && note.kind === "Wissen";
        if (view === "Entscheidungen") return note.status !== "archiviert" && note.kind === "Entscheidung";
        return note.status !== "archiviert";
      })
      .filter(note => {
        if (!search) return true;
        return [
          note.title,
          note.body,
          note.kind,
          note.contextType,
          note.contextLabel,
          note.tags.join(" ")
        ].some(value => value.toLowerCase().includes(search));
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [notes, query, view]);

  const recent = useMemo(
    () => [...activeNotes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [activeNotes]
  );

  return (
    <>
      <section className="notes-hero">
        <div>
          <p className="eyebrow">CAPTURE · ORDNEN · WIEDERFINDEN</p>
          <h1>Notizen</h1>
          <p>
            Gedanken sofort festhalten, später sauber zuordnen und dauerhaft wiederfinden.
            Die Inbox ist schnell – die Struktur kommt danach.
          </p>
        </div>
        <div className="notes-hero-actions">
          <span><ShieldCheck size={14} /> lokal gespeichert</span>
          <button type="button" onClick={openNew}><Plus size={15} /> Neue Notiz</button>
        </div>
      </section>

      <section className="notes-capture">
        <div className="notes-capture-head">
          <div>
            <span className="section-kicker">SCHNELL ERFASSEN</span>
            <h2>Gedanke rein. Sortieren später.</h2>
          </div>
          <span>Strg/⌘ + Enter zum Speichern</span>
        </div>
        <textarea
          value={capture}
          onChange={event => setCapture(event.target.value)}
          onKeyDown={event => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              quickCapture();
            }
          }}
          placeholder="Was willst du festhalten?"
          rows={4}
        />
        <div className="notes-capture-actions">
          <div>
            <button type="button" onClick={() => quickCapture("Notiz")}><NotebookPen size={14} /> Notiz</button>
            <button type="button" onClick={() => quickCapture("Idee")}><Lightbulb size={14} /> Idee</button>
            <button type="button" onClick={() => quickCapture("Wissen")}><Sparkles size={14} /> Wissen</button>
            <button type="button" onClick={() => quickCapture("Entscheidung")}><CheckCircle2 size={14} /> Entscheidung</button>
          </div>
          <button type="button" className="primary" onClick={() => quickCapture()} disabled={!capture.trim()}>
            Speichern
          </button>
        </div>
      </section>

      <section className="notes-kpis">
        <button type="button" className={view === "Inbox" ? "active" : ""} onClick={() => setView("Inbox")}>
          <Inbox size={18} /><div><strong>{stats.inbox}</strong><span>Inbox</span></div>
        </button>
        <button type="button" className={view === "Angeheftet" ? "active" : ""} onClick={() => setView("Angeheftet")}>
          <Pin size={18} /><div><strong>{stats.pinned}</strong><span>Angeheftet</span></div>
        </button>
        <button type="button" className={view === "Verknüpft" ? "active" : ""} onClick={() => setView("Verknüpft")}>
          <Link2 size={18} /><div><strong>{stats.linked}</strong><span>Verknüpft</span></div>
        </button>
        <button type="button" className={view === "Entscheidungen" ? "active" : ""} onClick={() => setView("Entscheidungen")}>
          <CheckCircle2 size={18} /><div><strong>{stats.decisions}</strong><span>Entscheidungen</span></div>
        </button>
      </section>

      <section className="notes-workspace">
        <div className="notes-main">
          <div className="notes-toolbar">
            <div className="notes-view-tabs">
              {(["Alle", "Inbox", "Angeheftet", "Verknüpft", "Wissen", "Entscheidungen"] as NoteView[]).map(item => (
                <button type="button" key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>
                  {item}
                </button>
              ))}
            </div>
            <label className="notes-search">
              <Search size={15} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Notizen durchsuchen" />
            </label>
          </div>

          {filtered.length ? (
            <div className="notes-list">
              {filtered.map(note => (
                <article className={note.pinned ? "note-card pinned" : "note-card"} key={note.id}>
                  <div className="note-card-main" onClick={() => { setEditing(note); setShowForm(true); }}>
                    <div className="note-card-top">
                      <div>
                        <span className={"note-kind " + note.kind.toLowerCase()}>{note.kind}</span>
                        {note.priority === "wichtig" ? <span className="note-important">Wichtig</span> : null}
                      </div>
                      <time>{relativeLabel(note.updatedAt)}</time>
                    </div>
                    <h3>{note.title}</h3>
                    <p>{shortBody(note.body)}</p>

                    <div className="note-card-meta">
                      {note.contextType !== "Keiner" ? (
                        <span className="note-context"><Link2 size={12} /> {note.contextType}{note.contextLabel ? " · " + note.contextLabel : ""}</span>
                      ) : <span className="note-context inbox"><Inbox size={12} /> Inbox</span>}
                      {note.tags.slice(0, 3).map(tag => <span key={tag}>#{tag}</span>)}
                    </div>
                  </div>

                  <div className="note-card-actions">
                    <button type="button" onClick={() => togglePin(note.id)} aria-label={note.pinned ? "Lösen" : "Anheften"}>
                      {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                    <button type="button" onClick={() => archiveNote(note.id)} aria-label="Archivieren"><Archive size={14} /></button>
                    <button type="button" className="danger" onClick={() => deleteNote(note.id)} aria-label="Löschen"><Trash2 size={14} /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="notes-empty">
              <FileText size={25} />
              <strong>Hier ist noch nichts.</strong>
              <span>{query ? "Die Suche liefert keine Treffer." : "Neue Gedanken kannst du direkt oben erfassen."}</span>
            </div>
          )}
        </div>

        <aside className="notes-side">
          <article className="notes-side-panel">
            <div className="notes-side-head">
              <div><span className="section-kicker">ZULETZT AKTIV</span><h2>Weitermachen</h2></div>
              <MoreHorizontal size={17} />
            </div>
            {recent.length ? (
              <div className="notes-recent-list">
                {recent.map(note => (
                  <button type="button" key={note.id} onClick={() => { setEditing(note); setShowForm(true); }}>
                    <div><strong>{note.title}</strong><small>{note.kind} · {relativeLabel(note.updatedAt)}</small></div>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="notes-side-empty">Noch keine Notizen vorhanden.</div>
            )}
          </article>

          <article className="notes-side-panel context">
            <span className="section-kicker">KONTEXT</span>
            <h2>Eine Notiz darf überall hängen.</h2>
            <p>
              Projekt, Ziel, Kontakt, Termin, Gesundheit, Finanzen oder KISS:
              Verknüpfe eine Notiz dort, wo sie später wieder gebraucht wird.
            </p>
            <button type="button" onClick={openNew}><Link2 size={14} /> Verknüpfte Notiz anlegen</button>
          </article>

          <article className="notes-side-panel rule">
            <span className="section-kicker">JAN-OS-REGEL</span>
            <h2>Erfassen darf schnell sein. Wiederfinden muss zuverlässig sein.</h2>
            <p>Darum bleibt die Inbox bewusst einfach; Struktur, Tags und Kontext kommen erst beim Verarbeiten.</p>
          </article>
        </aside>
      </section>

      {showForm ? (
        <NoteForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={saveNote}
        />
      ) : null}

      {!ready ? <span className="sr-only">Notizen werden geladen</span> : null}
    </>
  );
}

function NoteForm({
  initial,
  onClose,
  onSave
}: {
  initial: NoteItem | null;
  onClose: () => void;
  onSave: (note: NoteItem) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [kind, setKind] = useState<NoteKind>(initial?.kind ?? "Notiz");
  const [status, setStatus] = useState<NoteStatus>(initial?.status ?? "offen");
  const [priority, setPriority] = useState<NotePriority>(initial?.priority ?? "normal");
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [contextType, setContextType] = useState<ContextType>(initial?.contextType ?? "Keiner");
  const [contextLabel, setContextLabel] = useState(initial?.contextLabel ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;

    const timestamp = nowIso();
    onSave({
      id: initial?.id ?? makeId(),
      title: title.trim(),
      body: body.trim(),
      kind,
      status,
      priority,
      pinned,
      contextType,
      contextLabel: contextType === "Keiner" ? "" : contextLabel.trim(),
      tags: tags.split(",").map(tag => tag.trim().replace(/^#/, "")).filter(Boolean),
      createdAt: initial?.createdAt ?? timestamp,
      updatedAt: timestamp
    });
  }

  return (
    <div className="calendar-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="calendar-modal note-modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
        <div className="calendar-modal-head">
          <div>
            <span className="section-kicker">NOTIZ</span>
            <h2>{initial ? "Notiz bearbeiten" : "Neue Notiz"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
        </div>

        <div className="note-form-grid">
          <label className="wide"><span>Titel</span><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Worum geht es?" /></label>
          <label className="wide"><span>Inhalt</span><textarea value={body} onChange={event => setBody(event.target.value)} rows={9} placeholder="Notiz schreiben…" /></label>

          <label>
            <span>Art</span>
            <select value={kind} onChange={event => setKind(event.target.value as NoteKind)}>
              <option>Notiz</option><option>Idee</option><option>Wissen</option><option>Entscheidung</option>
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={status} onChange={event => setStatus(event.target.value as NoteStatus)}>
              <option value="offen">Offen</option><option value="in Arbeit">In Arbeit</option><option value="archiviert">Archiviert</option>
            </select>
          </label>
          <label>
            <span>Priorität</span>
            <select value={priority} onChange={event => setPriority(event.target.value as NotePriority)}>
              <option value="normal">Normal</option><option value="wichtig">Wichtig</option>
            </select>
          </label>
          <label>
            <span>Angeheftet</span>
            <select value={pinned ? "ja" : "nein"} onChange={event => setPinned(event.target.value === "ja")}>
              <option value="nein">Nein</option><option value="ja">Ja</option>
            </select>
          </label>

          <div className="note-form-divider">
            <span className="section-kicker">VERKNÜPFUNG</span>
            <strong>Wo soll diese Notiz später wieder auftauchen?</strong>
          </div>

          <label>
            <span>Bereich</span>
            <select value={contextType} onChange={event => setContextType(event.target.value as ContextType)}>
              <option>Keiner</option><option>Projekt</option><option>Ziel</option><option>Kontakt</option><option>Kalender</option>
              <option>Gesundheit</option><option>Finanzen</option><option>KISS</option><option>Leben</option>
            </select>
          </label>
          <label>
            <span>Kontext</span>
            <input disabled={contextType === "Keiner"} value={contextLabel} onChange={event => setContextLabel(event.target.value)} placeholder="z. B. Smile & Shine, Reha, Birgit…" />
          </label>
          <label className="wide"><span>Tags</span><input value={tags} onChange={event => setTags(event.target.value)} placeholder="z. B. reha, wichtig, später prüfen" /></label>
        </div>

        <div className="calendar-modal-actions">
          <button type="button" onClick={onClose}>Abbrechen</button>
          <button type="submit"><CheckCircle2 size={14} /> Speichern</button>
        </div>
      </form>
    </div>
  );
}
