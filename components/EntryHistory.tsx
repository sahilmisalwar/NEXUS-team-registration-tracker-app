"use client";

import { useState } from "react";
import { Building2, FileText } from "lucide-react";
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

export function EntryCard({ entry, teamName }: { entry: CountEntry; teamName: string }) {
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
      <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</time>
    </div>
    <h3>{teamName}</h3>
    {!tracked && <p className="entry-legacy-tag">Earlier team total change · college count unverified</p>}
    {entry.entry_kind === "allocation" && <p className="entry-legacy-tag">Earlier totals assigned · team total unchanged</p>}
    <p className="entry-changes">{summary}</p>
    {entry.note && <p className="entry-note"><FileText size={15} />{entry.note}</p>}
  </article>;
}

export function EntriesPage({ admin, entries, teams, hasOlder, loadingOlder, loadOlder }: { admin: boolean; entries: CountEntry[]; teams: TeamName[]; hasOlder: boolean; loadingOlder: boolean; loadOlder: () => void }) {
  const [teamFilter, setTeamFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const scoped = entries.filter(entry => !teamFilter || entry.team_id === teamFilter);
  const collegeNames = [...new Set(scoped.map(entry => entry.college_name))].sort((a, b) => a.localeCompare(b));
  const visible = scoped.filter(entry => !collegeFilter || entry.college_name === collegeFilter);
  const selectedTeam = teamFilter ? teams.find(team => team.id === teamFilter) : admin ? null : teams[0];

  return <section className="page entries-page">
    <p className="eyebrow">{admin ? "ADMIN · READ ONLY" : "TEAM HISTORY"}</p>
    <h1>Saved entries</h1>
    <p className="entries-intro">Each save shows its college, count changes, and the leader’s note. Earlier team-wide edits are marked separately.</p>
    <div className="entry-filters">
      {admin && <label>Team<select value={teamFilter} onChange={event => { setTeamFilter(event.target.value); setCollegeFilter(""); }}><option value="">All teams</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
      <label>College<select value={collegeFilter} onChange={event => setCollegeFilter(event.target.value)}><option value="">All colleges</option>{collegeNames.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
    </div>
    {selectedTeam ? <CollegeBreakdown colleges={selectedTeam.collegeTotals} unallocated={selectedTeam.unallocated} /> : admin && <p className="entries-team-prompt">Choose a team to see its college totals.</p>}
    {visible.length ? <div className="entry-list">{visible.map(entry => <EntryCard key={entry.id} entry={entry} teamName={teams.find(team => team.id === entry.team_id)?.name ?? "Team"} />)}</div> : <div className="empty-card">{entries.length ? "No entries match these filters." : "No saved entries yet. New updates and notes will appear here."}</div>}
    {hasOlder && <button className="load-older" type="button" disabled={loadingOlder} onClick={loadOlder}>{loadingOlder ? "Loading older entries…" : "Load older entries"}</button>}
  </section>;
}
