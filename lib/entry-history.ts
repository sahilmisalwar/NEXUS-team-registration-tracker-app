export type HistoryRecord = { id: string; team_id: string; created_at: string };

// Preserve the original database timestamp, including microseconds, at page edges.
export function olderEntriesFilter(entry: Pick<HistoryRecord, "id" | "created_at">) {
  const time = JSON.stringify(entry.created_at);
  const id = JSON.stringify(entry.id);
  return `created_at.lt.${time},and(created_at.eq.${time},id.lt.${id})`;
}

export function mergeEntryHistory<T extends HistoryRecord>(current: T[], incoming: T[], teamIds: string[]): T[] {
  const allowed = new Set(teamIds);
  const byId = new Map(current.filter(entry => allowed.has(entry.team_id)).map(entry => [entry.id, entry]));
  for (const entry of incoming) if (allowed.has(entry.team_id)) byId.set(entry.id, entry);
  return [...byId.values()].sort((a, b) => {
    const milliseconds = Date.parse(b.created_at) - Date.parse(a.created_at);
    const fraction = (value: string) => (value.match(/\.(\d+)(?:Z|[+-]\d{2}(?::?\d{2})?)$/)?.[1] ?? "").padEnd(6, "0");
    const aFraction = fraction(a.created_at), bFraction = fraction(b.created_at);
    return milliseconds || (aFraction < bFraction ? 1 : aFraction > bFraction ? -1 : 0) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
  });
}
