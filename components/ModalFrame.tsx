"use client";

import { useEffect, useRef, type ReactNode } from "react";

const focusableSelector = "a[href], button, input:not([type='hidden']), select, textarea, [tabindex], [contenteditable='true']";
const visibleControls = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(element =>
  element.tabIndex >= 0 && !element.matches(":disabled") && !element.closest("[inert]") && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden"
);

export function ModalFrame({ children, close, busy = false, centered = false, dismissible = true }: { children: ReactNode; close: () => void; busy?: boolean; centered?: boolean; dismissible?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const outside: { element: HTMLElement; inert: boolean }[] = [];
    // Keep the rest of the app out of the keyboard and accessibility tree.
    for (let branch: HTMLElement | null = container; branch?.parentElement && branch !== document.body; branch = branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          outside.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
    }
    document.body.style.overflow = "hidden";
    const dialog = container.querySelector<HTMLElement>("[role='dialog']") ?? container;
    dialog.tabIndex = -1;
    const controls = visibleControls(container);
    const target = controls.find(element => element.matches("input, select, textarea")) ?? controls.find(element => element.matches(".cancel-action")) ?? controls[0] ?? dialog;
    target.focus({ preventScroll: true });
    const keepFocusInside = (event: FocusEvent) => {
      if (event.target instanceof Node && !container.contains(event.target)) (visibleControls(container)[0] ?? dialog).focus({ preventScroll: true });
    };
    document.addEventListener("focusin", keepFocusInside);
    return () => {
      document.removeEventListener("focusin", keepFocusInside);
      document.body.style.overflow = previousOverflow;
      outside.forEach(({ element, inert }) => { element.inert = inert; });
      if (opener?.isConnected && !opener.closest("[inert]")) opener.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const dialog = container.querySelector<HTMLElement>("[role='dialog']") ?? container;
    if (!container.contains(document.activeElement) || document.activeElement?.matches(":disabled")) dialog.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy && dismissible) { event.preventDefault(); close(); }
      if (event.key !== "Tab") return;
      const controls = visibleControls(container);
      const first = controls[0], last = controls.at(-1);
      const activeIndex = controls.findIndex(element => element === document.activeElement);
      if (!first) { event.preventDefault(); dialog.focus({ preventScroll: true }); return; }
      if (event.shiftKey && activeIndex <= 0) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (activeIndex < 0 || document.activeElement === last)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, close, dismissible]);
  return <div ref={root} tabIndex={-1} className={`sheet-backdrop${centered ? " confirm-backdrop" : ""}`} onClick={event => { if (event.target === event.currentTarget && !busy && dismissible) close(); }}>{children}</div>;
}
