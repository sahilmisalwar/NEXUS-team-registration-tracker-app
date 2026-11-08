"use client";

import { useState } from "react";
import { Building2, FileText, History, LoaderCircle, X } from "lucide-react";
import { CollegeBreakdown, type CollegeTotal } from "@/components/CollegeBreakdown";
import type { Counts } from "@/components/UpdateEntriesSheet";

export type CountEntry = {
  id: string;
  team_id: string;
  college_id: string | null;
  college_name: string;
  note: string;
  entry_kind: "update" | "allocation";
  interested: number;
  registered_unpaid: number;
  confirmed_paid: number;
  previous_interested: number;
  previous_registered_unpaid: number;
  previous_confirmed_paid: number;
  college_interested: number | null;
  college_registered_unpaid: number | null;
  college_confirmed_paid: number | null;
  previous_college_interested: number | null;
  previous_college_registered_unpaid: number | null;
  previous_college_confirmed_paid: number | null;
  created_at: string;
};

type TeamName = { id: string; name: string; collegeTotals: CollegeTotal[]; unallocated: Counts };

export function EntryCard({ entry, teamName, timeOnly = false }: { entry: CountEntry; teamName: string; timeOnly?: boolean }) {
  const tracked = entry.college_interested !== null;
  const changes = [
    ["Interested", tracked ? entry.college_interested! - entry.previous_college_interested! : entry.interested - entry.previous_interested],
    ["Registered · unpaid", tracked ? entry.college_registered_unpaid! - entry.previous_college_registered_unpaid! : entry.registered_unpaid - entry.previous_registered_unpaid],
    ["Confirmed · paid", tracked ? entry.college_confirmed_paid! - entry.previous_college_confirmed_paid! : entry.confirmed_paid - entry.previous_confirmed_paid],
  ] as const;
  const summary = changes
    .filter(([, change]) => change !== 0)
    .map(([label, change]) => `${label} ${change > 0 ? "+" : ""}${change}`)
    .join(" · ") || "Totals unchanged";

  return <article className="entry-card">
    <div className="entry-card-top">
      <span><Building2 size={14} />{entry.college_name}</span>
      <time dateTime={entry.created_at} title={new Date(entry.created_at).toLocaleString()}>{new Date(entry.created_at).toLocaleString(undefined, timeOnly ? { hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</time>
    </div>
    <h3>{teamName}</h3>
    {!tracked && <p className="entry-legacy-tag">Earlier team total change · college count unverified</p>}
    {entry.entry_kind === "allocation" && <p className="entry-legacy-tag">Earlier totals assigned · team total unchanged</p>}
    {changes.some(([, change]) => change !== 0) ? <div className="entry-deltas" aria-label={summary}>{changes.filter(([, change]) => change !== 0).map(([label, change]) => <div key={label} className={`entry-delta${change < 0 ? " is-correction" : ""}`}><strong>{change > 0 ? "+" : ""}{change.toLocaleString("en-IN")}</strong><span>{label}</span></div>)}</div> : <p className="entry-changes">{entry.note ? "Note added · totals unchanged" : "Totals unchanged"}</p>}
    {entry.note && <div className="entry-note"><FileText size={15} /><div><span>LEADER’S NOTE</span><p>{entry.note}</p></div></div>}
  </article>;
}

export function EntriesPage({ admin, entries, teams, hasOlder, loadingOlder, loadOlder }: { admin: boolean; entries: CountEntry[]; teams: TeamName[]; hasOlder: boolean; loadingOlder: boolean; loadOlder: () => void }) {
  const [teamFilter, setTeamFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const scoped = entries.filter(entry => !teamFilter || entry.team_id === teamFilter);
  const collegeNames = [...new Set(scoped.map(entry => entry.college_name))].sort((a, b) => a.localeCompare(b));
  const visible = scoped.filter(entry => !collegeFilter || entry.college_name === collegeFilter);
  const selectedTeam = teamFilter ? teams.find(team => team.id === teamFilter) : admin ? null : teams[0];
  const filtered = Boolean(teamFilter || collegeFilter);
  const dayGroups = new Map<string, { date: Date; entries: CountEntry[] }>();
  for (const entry of visible) {
    const date = new Date(entry.created_at);
    const day = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const group = dayGroups.get(day);
    if (group) group.entries.push(entry);
    else dayGroups.set(day, { date, entries: [entry] });
  }
  const clearFilters = () => { setTeamFilter(""); setCollegeFilter(""); };

  return <section className="page entries-page">
    <p className="eyebrow">{admin ? "ADMIN · READ ONLY" : "TEAM HISTORY"}</p>
    <h1>Saved entries</h1>
    <p className="entries-intro">A record of every step forward. {admin ? "Review college updates and notes from your team leaders." : "Revisit your college updates and the notes behind them."}</p>
    <div className="entry-filters" role="group" aria-label="Filter saved entries">
      {admin && <label>Team<select value={teamFilter} onChange={event => { setTeamFilter(event.target.value); setCollegeFilter(""); }}><option value="">All teams</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
      <label>College<select value={collegeFilter} onChange={event => setCollegeFilter(event.target.value)}><option value="">All colleges</option>{collegeNames.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
    </div>
    {selectedTeam ? <CollegeBreakdown colleges={selectedTeam.collegeTotals} unallocated={selectedTeam.unallocated} /> : admin && <p className="entries-team-prompt">Choose a team to see its college totals.</p>}
    <div className="entries-result-line"><span role="status" aria-live="polite">{visible.length} {visible.length === 1 ? "entry" : "entries"}{filtered ? " matching your filters" : " shown"}</span>{filtered && <button type="button" onClick={clearFilters}>Clear filters<X size={13} /></button>}</div>
    {hasOlder && <p className="entries-loaded-context">Browsing {entries.length} recent entries. Filters apply to the entries loaded here; load older entries to look further back.</p>}
    {visible.length ? <div className="entry-day-list">{Array.from(dayGroups, ([day, group]) => <section className="entry-day-group" key={day} aria-labelledby={`entry-day-${day}`}><div className="entry-day-heading"><h2 id={`entry-day-${day}`}>{group.date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</h2><span>{group.date.toLocaleDateString(undefined, { weekday: "long" })}</span></div><div className="entry-list">{group.entries.map(entry => <EntryCard key={entry.id} entry={entry} teamName={teams.find(team => team.id === entry.team_id)?.name ?? "Team"} timeOnly />)}</div></section>)}</div> : <div className="empty-card entries-empty"><span className="detail-empty-icon"><History size={26} /></span><h2>{filtered ? "No matching entries" : "Your story starts here"}</h2><p>{filtered ? hasOlder ? "No matches in the entries loaded so far. Clear your filters or look further back below." : "Try another team or college to see its updates." : "New college updates and notes will appear here after the first save."}</p>{filtered && <button className="entries-empty-clear" type="button" onClick={clearFilters}>Show all loaded entries</button>}</div>}
    {hasOlder ? <div className="entries-load-section"><button className="load-older" type="button" disabled={loadingOlder} onClick={loadOlder}>{loadingOlder && <LoaderCircle size={16} className="detail-spinner" />}{loadingOlder ? "Loading older entries…" : "Load older entries"}</button><p>Earlier updates will appear below.</p></div> : entries.length > 0 && <p className="entries-history-end"><span />You’re at the beginning of {filtered ? "the loaded history" : "your history"}.<span /></p>}
  </section>;
}
