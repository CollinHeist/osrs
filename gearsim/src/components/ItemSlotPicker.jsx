import {
  useDeferredValue,
  useMemo,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";

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
  const wrapRef = useRef(null);
  const anchorRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);

  const current = value ? itemsById[value] : null;
  const currentLabel = current?.name ?? (value ? "Unknown item" : "Empty slot");

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

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setMenuPos(null);
      return;
    }
    function place() {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuPos({
        top: r.bottom + 6,
        left: r.left,
        width: Math.max(260, r.width),
        maxH: Math.min(320, window.innerHeight - r.bottom - 12),
      });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, deferred, q]);

  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current?.contains(e.target)) {
        const p = document.getElementById(`isp-portal-${slot}`);
        if (p?.contains(e.target)) return;
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [slot]);

  const portal =
    open &&
    menuPos &&
    createPortal(
      <div
        id={`isp-portal-${slot}`}
        className="isp-portal-panel"
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          maxHeight: menuPos.maxH,
          zIndex: 20000,
        }}
      >
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
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>,
      document.body
    );

  return (
    <div className="isp-wrap" ref={wrapRef}>
      <div className="isp-row">
        <span className="isp-slot">{slot}</span>
        <div className="isp-main" ref={anchorRef}>
          <button
            type="button"
            className="isp-current"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="isp-name">{currentLabel}</span>
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
      {portal}
    </div>
  );
}
