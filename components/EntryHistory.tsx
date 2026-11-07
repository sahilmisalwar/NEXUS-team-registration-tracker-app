"use client";

import { useState } from "react";
import { Building2, FileText } from "lucide-react";

export type CountEntry = {
  id: string;
  team_id: string;
  college_id: string | null;
  college_name: string;
  note: string;
  interested: number;
  registered_unpaid: number;
  confirmed_paid: number;
  previous_interested: number;
  previous_registered_unpaid: number;
  previous_confirmed_paid: number;
  created_at: string;
};

type TeamName = { id: string; name: string };

export function EntryCard({ entry, teamName }: { entry: CountEntry; teamName: string }) {
  const changes = [
    ["Interested", entry.interested - entry.previous_interested],
    ["Registered · unpaid", entry.registered_unpaid - entry.previous_registered_unpaid],
    ["Confirmed · paid", entry.confirmed_paid - entry.previous_confirmed_paid],
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
    <p className="entry-changes">{summary}</p>
    {entry.note && <p className="entry-note"><FileText size={15} />{entry.note}</p>}
  </article>;
}

export function EntriesPage({ admin, entries, teams }: { admin: boolean; entries: CountEntry[]; teams: TeamName[] }) {
  const [teamFilter, setTeamFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const scoped = entries.filter(entry => !teamFilter || entry.team_id === teamFilter);
  const collegeNames = [...new Set(scoped.map(entry => entry.college_name))].sort((a, b) => a.localeCompare(b));
  const visible = scoped.filter(entry => !collegeFilter || entry.college_name === collegeFilter);

  return <section className="page entries-page">
    <p className="eyebrow">{admin ? "ADMIN · READ ONLY" : "TEAM HISTORY"}</p>
    <h1>Saved entries</h1>
    <p className="entries-intro">Each save shows its college, count changes, and the leader’s note.</p>
    <div className="entry-filters">
      {admin && <label>Team<select value={teamFilter} onChange={event => { setTeamFilter(event.target.value); setCollegeFilter(""); }}><option value="">All teams</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
      <label>College<select value={collegeFilter} onChange={event => setCollegeFilter(event.target.value)}><option value="">All colleges</option>{collegeNames.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
    </div>
    {visible.length ? <div className="entry-list">{visible.map(entry => <EntryCard key={entry.id} entry={entry} teamName={teams.find(team => team.id === entry.team_id)?.name ?? "Team"} />)}</div> : <div className="empty-card">{entries.length ? "No entries match these filters." : "No saved entries yet. New updates and notes will appear here."}</div>}
    {entries.length === 300 && <p className="hint">Showing the latest 300 saved entries.</p>}
  </section>;
}
