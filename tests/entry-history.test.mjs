import test from "node:test";
import assert from "node:assert/strict";
import { mergeEntryHistory, olderEntriesFilter } from "../lib/entry-history.ts";

const entry = (id, time = "2026-11-08T12:00:00.123456+00:00", team = "team-a") => ({ id, created_at: time, team_id: team });

test("pagination keeps microsecond precision and includes an ID tie-breaker", () => {
  assert.equal(olderEntriesFilter(entry("00000000-0000-0000-0000-000000000050")), 'created_at.lt."2026-11-08T12:00:00.123456+00:00",and(created_at.eq."2026-11-08T12:00:00.123456+00:00",id.lt."00000000-0000-0000-0000-000000000050")');
});

test("a refresh retains older pages, deduplicates overlap, and orders tied timestamps", () => {
  const older = entry("1", "2026-11-07T10:00:00+00:00");
  const current = [entry("3"), entry("2"), older];
  const incoming = [entry("4"), entry("3")];
  assert.deepEqual(mergeEntryHistory(current, incoming, ["team-a"]).map(row => row.id), ["4", "3", "2", "1"]);
});

test("refresh removes history from deleted or inaccessible teams", () => {
  assert.deepEqual(mergeEntryHistory([entry("1", undefined, "removed")], [entry("2")], ["team-a"]).map(row => row.id), ["2"]);
});

test("new response replaces an overlapping record without mutating the prior list", () => {
  const current = [{ ...entry("1"), note: "before" }];
  const merged = mergeEntryHistory(current, [{ ...entry("1"), note: "after" }], ["team-a"]);
  assert.equal(merged[0].note, "after");
  assert.equal(current[0].note, "before");
});

test("timestamp order handles omitted fractions, microseconds, and time-zone offsets", () => {
  const rows = [entry("zero", "2026-11-08T12:00:00+00:00"), entry("micro1", "2026-11-08T12:00:00.000001+00:00"), entry("micro2", "2026-11-08T12:00:00.000002+00:00"), entry("later", "2026-11-08T17:30:01+05:30")];
  assert.deepEqual(mergeEntryHistory([], rows, ["team-a"]).map(row => row.id), ["later", "micro2", "micro1", "zero"]);
});
