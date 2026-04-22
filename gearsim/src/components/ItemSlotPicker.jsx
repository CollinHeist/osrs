import { useDeferredValue, useMemo, useState, useRef, useEffect } from "react";

/**
 * @param {object} props
 * @param {string} props.slot
 * @param {string | null} props.value item id string
 * @param {(id: string | null) => void} props.onChange
 * @param {Record<string, any>} props.itemsById
 * @param {any[]} props.slotItems items in this slot only
 */
export function ItemSlotPicker({
  slot,
  value,
  onChange,
  itemsById,
  slotItems,
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const deferred = useDeferredValue(q.trim().toLowerCase());
  const ref = useRef(null);

  const current = value ? itemsById[value] : null;
  const currentLabel = current?.name ?? (value ? `#${value}` : "Empty slot");

  const matches = useMemo(() => {
    if (!deferred || deferred.length < 2) return [];
    const out = [];
    for (const it of slotItems) {
      const nm = (it.name ?? "").toLowerCase();
      if (nm.includes(deferred)) {
        out.push(it);
        if (out.length >= 80) break;
      }
    }
    return out;
  }, [slotItems, deferred]);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="isp-wrap" ref={ref}>
      <div className="isp-row">
        <span className="isp-slot">{slot}</span>
        <div className="isp-main">
          <button
            type="button"
            className="isp-current"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="isp-name">{currentLabel}</span>
            {value && (
              <span className="isp-id" title="OSRS item id">
                {value}
              </span>
            )}
          </button>
          {value && (
            <button
              type="button"
              className="isp-clear"
              onClick={() => onChange(null)}
              title="Clear slot"
            >
              ×
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="isp-panel">
          <input
            className="isp-search"
            type="search"
            placeholder={`Search ${slot}…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {deferred.length < 2 ? (
            <p className="isp-hint">Type at least 2 characters.</p>
          ) : matches.length === 0 ? (
            <p className="isp-hint">No matches.</p>
          ) : (
            <ul className="isp-list">
              {matches.map((it) => {
                const id = String(it.id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className="isp-opt"
                      onClick={() => {
                        onChange(id);
                        setQ("");
                        setOpen(false);
                      }}
                    >
                      {it.name}
                      <span className="isp-opt-id">{id}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
