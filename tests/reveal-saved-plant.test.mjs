import test from "node:test";
import assert from "node:assert/strict";
import { revealSavedPlant } from "../lib/reveal-saved-plant.ts";

function setup(t) {
  const frames = new Map();
  let id = 0;
  t.mock.method(globalThis, "requestAnimationFrame", callback => { frames.set(++id, callback); return id; });
  t.mock.method(globalThis, "cancelAnimationFrame", key => frames.delete(key));
  const events = [];
  const plant = {
    isConnected: true,
    focus: options => events.push(["focus", options]),
    scrollIntoView: options => events.push(["scroll", options]),
  };
  const tick = () => { const current = [...frames.values()]; frames.clear(); current.forEach(callback => callback()); };
  return { plant, events, tick };
}

// Node has no browser animation clock.
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

test("saved plant is focused and centered before the growth animation begins", t => {
  const { plant, events, tick } = setup(t);
  revealSavedPlant(plant, () => events.push(["grow"]));
  assert.deepEqual(events, []);
  tick();
  assert.deepEqual(events, [["focus", { preventScroll: true }], ["scroll", { behavior: "instant", block: "center", inline: "nearest" }]]);
  tick();
  assert.equal(events.at(-1)[0], "grow");
});

test("leaving the page or switching accounts cancels a queued reward", t => {
  const { plant, events, tick } = setup(t);
  const cancel = revealSavedPlant(plant, () => events.push(["grow"]));
  tick();
  cancel();
  tick();
  assert.equal(events.some(event => event[0] === "grow"), false);
});

test("an unmounted plant is neither scrolled to nor animated", t => {
  const { plant, events, tick } = setup(t);
  revealSavedPlant(plant, () => events.push(["grow"]));
  plant.isConnected = false;
  tick(); tick();
  assert.deepEqual(events, []);
});
