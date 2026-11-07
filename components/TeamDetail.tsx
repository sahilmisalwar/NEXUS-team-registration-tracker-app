"use client";

import { ArrowLeft, Building2, ChevronRight, Clock3, Edit3, LockKeyhole, Users } from "lucide-react";
import { Plant, stage } from "@/components/Plant";
import { CollegeBreakdown, type CollegeTotal } from "@/components/CollegeBreakdown";
import type { Counts } from "@/components/UpdateEntriesSheet";

type TeamDetailData = {
  name: string;
  leader: string;
  username: string;
  members: string[];
  target: number;
  colleges: { id: string; name: string }[];
  collegeTotals: CollegeTotal[];
  unallocated: Counts;
  counts: { interested: number; registered: number; confirmed: number };
  updated: string | null;
};

export function TeamDetail({ team, back, edit }: { team: TeamDetailData; back: () => void; edit: () => void }) {
  const progress = team.target ? team.counts.confirmed / team.target * 100 : 0;
  const progressLabel = `${Math.min(100, Math.round(progress))}%`;
  const remaining = Math.max(0, team.target - team.counts.confirmed);
  const initials = team.leader.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const lastSaved = team.updated ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(team.updated)) : "not yet";

  return <section className="page team-detail-page">
    <button className="back" type="button" aria-label="Back to teams" onClick={back}><ArrowLeft size={20} /></button>
    <div className="team-detail-heading"><div><p className="eyebrow">TEAM OVERVIEW</p><h1>{team.name}</h1></div><span><LockKeyhole size={12} />View only</span></div>

    <div className="team-detail-hero">
      <div className="team-detail-hero-copy"><p className="eyebrow">CONFIRMED REGISTRATIONS</p><strong>{team.counts.confirmed}<small> / {team.target}</small></strong><p>{progressLabel} of target · Stage {stage(progress)} of 5</p></div>
      <Plant percent={progress} compact />
      <div className="progress" role="progressbar" aria-label="Confirmed registration target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, Math.round(progress)))}><span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>
      <p className="team-detail-milestone">{remaining ? `${remaining} more confirmed registrations to reach the target` : "Target reached. A wonderful team effort."}</p>
    </div>

    <div className="counter-grid team-detail-counts"><div className="counter peach"><strong>{team.counts.interested}</strong><span>Interested</span></div><div className="counter yellow"><strong>{team.counts.registered}</strong><span>Registered · unpaid</span></div><div className="counter sage"><strong>{team.counts.confirmed}</strong><span>Confirmed · paid</span></div></div>

    <section className="team-detail-panel" aria-labelledby="team-people-title">
      <div className="team-detail-panel-heading"><Users size={18} /><h2 id="team-people-title">People</h2><span>{team.members.length} {team.members.length === 1 ? "member" : "members"}</span></div>
      <div className="team-detail-leader"><div className="team-detail-avatar" aria-hidden="true">{initials || "N"}</div><div><small>TEAM LEADER</small><strong>{team.leader}</strong><p>{team.username ? `@${team.username}` : "Username not set"}</p></div></div>
      <h3>Team members</h3>
      {team.members.length ? <ul className="team-detail-list">{team.members.map((member, index) => <li key={`${member}-${index}`}><span className="team-detail-number">{String(index + 1).padStart(2, "0")}</span>{member}</li>)}</ul> : <p className="team-detail-empty">No team members have been added yet.</p>}
    </section>

    <section className="team-detail-panel" aria-labelledby="team-colleges-title">
      <div className="team-detail-panel-heading"><Building2 size={18} /><h2 id="team-colleges-title">Assigned colleges</h2><span>{team.colleges.length}</span></div>
      {team.colleges.length ? <ul className="team-detail-list">{team.colleges.map(college => <li key={college.id}><span className="team-detail-college-icon"><Building2 size={17} /></span>{college.name}</li>)}</ul> : <p className="team-detail-empty">No colleges are assigned to this team yet.</p>}
    </section>

    <CollegeBreakdown colleges={team.collegeTotals} unallocated={team.unallocated} />

    <div className="team-detail-updated"><Clock3 size={14} /><p>Leader-reported counts<span>{team.updated ? `Last saved ${lastSaved}` : "Awaiting the first entry"}</span></p></div>
    <button className="primary team-detail-edit" type="button" onClick={edit}><Edit3 size={18} />Edit team<ChevronRight size={18} /></button>
  </section>;
}
