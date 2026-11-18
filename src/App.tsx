import { useEffect, useRef, useState } from 'react';
import { Well } from './Well';
import { NEXT_COLOUR } from './types';
import type { Colour, WellState } from './types';

const COLOUR_CODE: Record<Colour, number> = { blank: 0, green: 1, blue: 2, red: 3 };

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const COLS = Array.from({ length: 12 }, (_, i) => 12 - i); // 12 → 1
const STORAGE_KEY = 'genotype-selector-v1';
const GENE_KEY = 'genotype-selector-gene';

function csvFileName(gene: string): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  // Strip characters that aren't allowed in file names; spaces become underscores.
  const safeGene = gene.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
  return safeGene ? `genotypes-${safeGene}-${date}.csv` : `genotypes-${date}.csv`;
}
const BLANK: WellState = { colour: 'blank', note: '' };

type Plate = Record<string, WellState>;

function loadPlate(): Plate {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Plate) : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [plate, setPlate] = useState<Plate>(loadPlate);
  const [gene, setGene] = useState<string>(() => {
    try {
      return localStorage.getItem(GENE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plate));
    } catch {
      /* storage unavailable (e.g. private mode) – state just won't persist */
    }
  }, [plate]);

  useEffect(() => {
    try {
      localStorage.setItem(GENE_KEY, gene);
    } catch {
      /* ignore */
    }
  }, [gene]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const get = (id: string) => plate[id] ?? BLANK;

  const cycle = (id: string) =>
    setPlate((p) => {
      const cur = p[id] ?? BLANK;
      return { ...p, [id]: { ...cur, colour: NEXT_COLOUR[cur.colour] } };
    });

  const openNote = (id: string) => {
    setDraft(get(id).note);
    setEditing(id);
  };

  const saveNote = (note: string) => {
    if (!editing) return;
    const id = editing;
    setPlate((p) => ({ ...p, [id]: { ...(p[id] ?? BLANK), note } }));
    setEditing(null);
  };

  const exportCsv = () => {
    const esc = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const lines: string[] = [];

    // Rows A–H, columns 12–1.
    lines.push(['', ...COLS].join(','));
    for (const r of ROWS) {
      lines.push([r, ...COLS.map((c) => COLOUR_CODE[get(`${r}${c}`).colour])].join(','));
    }

    lines.push('', 'Well,Note');
    for (const r of ROWS) {
      for (const c of COLS) {
        const id = `${r}${c}`;
        const note = get(id).note.trim();
        if (note) lines.push(`${id},${esc(note)}`);
      }
    }

    const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = csvFileName(gene);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const resetAll = () => {
    if (window.confirm('Clear all colours and notes?')) setPlate({});
  };

  return (
    <main className="app">
      <h1>Genotype Selector</h1>

      <label className="gene">
        <span>Gene</span>
        <input
          type="text"
          value={gene}
          onChange={(e) => setGene(e.target.value)}
          placeholder="Enter gene name"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>

      {/* Rotated for portrait: rows A–H run across, columns 1–12 run down. */}
      <div className="plate">
        <div className="plate__corner" />
        {ROWS.map((r) => (
          <div key={r} className="plate__header">
            {r}
          </div>
        ))}
        {COLS.map((c) => (
          <Row key={c} col={c} get={get} onTap={cycle} onLongPress={openNote} />
        ))}
      </div>

      <p className="hint">Tap to change colour · Long-press to add a note</p>

      <ul className="key">
        <li>
          <span className="swatch well--green" /> Homozygous
        </li>
        <li>
          <span className="swatch well--blue" /> Heterozygous
        </li>
        <li>
          <span className="swatch well--red" /> Wildtype
        </li>
      </ul>

      <div className="actions">
        <button type="button" className="action" onClick={resetAll}>
          Reset all
        </button>
        <button type="button" className="action primary" onClick={exportCsv}>
          Export to CSV
        </button>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="note-title">Note for {editing}</h2>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="Add a note…"
            />
            <div className="modal__actions">
              <button type="button" onClick={() => saveNote('')}>
                Delete
              </button>
              <button type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={() => saveNote(draft)}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Row({
  col,
  get,
  onTap,
  onLongPress,
}: {
  col: number;
  get: (id: string) => WellState;
  onTap: (id: string) => void;
  onLongPress: (id: string) => void;
}) {
  return (
    <>
      <div className="plate__header">{col}</div>
      {ROWS.map((r) => {
        const id = `${r}${col}`;
        return <Well key={id} id={id} state={get(id)} onTap={onTap} onLongPress={onLongPress} />;
      })}
    </>
  );
}
