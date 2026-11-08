"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ModalFrame({ children, close, busy = false, centered = false, dismissible = true }: { children: ReactNode; close: () => void; busy?: boolean; centered?: boolean; dismissible?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const target = root.current?.querySelector<HTMLElement>("input:not(:disabled)") ?? root.current?.querySelector<HTMLElement>(".cancel-action") ?? root.current?.querySelector<HTMLElement>("button:not(:disabled)");
    target?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = previousOverflow; opener?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy && dismissible) { event.preventDefault(); close(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(root.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex='0']") ?? []);
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, close, dismissible]);
  return <div ref={root} className={`sheet-backdrop${centered ? " confirm-backdrop" : ""}`} onClick={() => { if (!busy && dismissible) close(); }}>{children}</div>;
}
