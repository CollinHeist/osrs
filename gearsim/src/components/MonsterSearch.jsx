import { useDeferredValue, useMemo, useState, useRef, useEffect } from "react";

/**
 * @param {object} props
 * @param {any[]} props.monsters
 * @param {number} props.value monster id
 * @param {(id: number) => void} props.onChange
 */
export function MonsterSearch({ monsters, value, onChange }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const deferred = useDeferredValue(q.trim().toLowerCase());
  const boxRef = useRef(null);

  const selected = useMemo(
    () => monsters.find((m) => m.id === value) ?? null,
    [monsters, value]
  );

  const matches = useMemo(() => {
    if (!deferred || deferred.length < 2) return [];
    const out = [];
    for (const m of monsters) {
      const label = `${m.name}${m.version ? ` — ${m.version}` : ""}`;
      if (label.toLowerCase().includes(deferred)) {
        out.push(m);
        if (out.length >= 50) break;
      }
    }
    return out;
  }, [monsters, deferred]);

  useEffect(() => {
    function onDoc(e) {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const label = selected
    ? `${selected.name}${selected.version ? ` (${selected.version})` : ""}`
    : "Select monster…";

  return (
    <div className="ms-wrap" ref={boxRef}>
      <label className="ms-label" htmlFor="ms-input">
        Target monster
      </label>
      <div className="ms-control">
        <input
          id="ms-input"
          className="ms-input"
          type="search"
          placeholder="Search by name (min 2 letters)…"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
        />
        <div className="ms-current" title={`ID ${value}`}>
          {label}
        </div>
      </div>
      {open && matches.length > 0 && (
        <ul className="ms-list" role="listbox">
          {matches.map((m) => (
            <li key={`${m.id}-${m.version ?? ""}`}>
              <button
                type="button"
                className="ms-option"
                onClick={() => {
                  onChange(m.id);
                  setQ("");
                  setOpen(false);
                }}
              >
                <span className="ms-name">{m.name}</span>
                {m.version && (
                  <span className="ms-ver">{m.version}</span>
                )}
                <span className="ms-meta">Lv {m.level}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
