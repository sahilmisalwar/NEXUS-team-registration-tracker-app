// Wait until the entry sheet has released focus and scrolling, then let the
// visible plant paint before starting its reward animation.
export function revealSavedPlant(plant: HTMLElement, celebrate: () => void) {
  let cancelled = false;
  let frame = requestAnimationFrame(() => {
    if (cancelled || !plant.isConnected) return;
    plant.focus({ preventScroll: true });
    plant.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
    frame = requestAnimationFrame(() => {
      if (!cancelled && plant.isConnected) celebrate();
    });
  });
  return () => { cancelled = true; cancelAnimationFrame(frame); };
}
