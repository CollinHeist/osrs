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
 * @param {any[]} props.monsters
 * @param {number} props.value monster id
 * @param {(id: number) => void} props.onChange
 */
export function MonsterSearch({ monsters, value, onChange }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const deferred = useDeferredValue(q.trim().toLowerCase());
  const wrapRef = useRef(null);
  const anchorRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);

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

  useLayoutEffect(() => {
    if (!open || !matches.length || !anchorRef.current) {
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
        width: Math.max(280, r.width),
        maxH: Math.min(360, window.innerHeight - r.bottom - 16),
      });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, matches.length, deferred, q]);

  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current?.contains(e.target)) {
        const portal = document.getElementById("ms-portal-root");
        if (portal?.contains(e.target)) return;
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const label = selected
    ? `${selected.name}${selected.version ? ` (${selected.version})` : ""}`
    : "Select monster…";

  const portal =
    open &&
    matches.length > 0 &&
    menuPos &&
    createPortal(
      <ul
        id="ms-portal-root"
        className="ms-portal-list"
        role="listbox"
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          maxHeight: menuPos.maxH,
          zIndex: 20000,
        }}
      >
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
              {m.version && <span className="ms-ver">{m.version}</span>}
              <span className="ms-meta">Lv {m.level}</span>
            </button>
          </li>
        ))}
      </ul>,
      document.body
    );

  return (
    <div className="ms-wrap" ref={wrapRef}>
      <label className="ms-label" htmlFor="ms-input">
        Target monster
      </label>
      <div className="ms-control" ref={anchorRef}>
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
        <div className="ms-current">{label}</div>
      </div>
      {portal}
    </div>
  );
}
