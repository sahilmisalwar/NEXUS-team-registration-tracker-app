"use client";

import { ArrowLeft, Building2, ChevronRight, Edit3, UserRound, Users } from "lucide-react";
import { Plant, stage } from "@/components/Plant";

type TeamDetailData = {
  name: string;
  leader: string;
  username: string;
  members: string[];
  target: number;
  colleges: { id: string; name: string }[];
  counts: { interested: number; registered: number; confirmed: number };
  updated: string | null;
};

export function TeamDetail({ team, back, edit }: { team: TeamDetailData; back: () => void; edit: () => void }) {
  const progress = team.target ? team.counts.confirmed / team.target * 100 : 0;
  const progressLabel = `${Math.min(100, Math.round(progress))}%`;
  const lastSaved = team.updated ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(team.updated)) : "not yet";

  return <section className="page team-detail-page">
    <button className="back" type="button" aria-label="Back to teams" onClick={back}><ArrowLeft size={20} /></button>
    <div className="team-detail-heading"><div><p className="eyebrow">TEAM OVERVIEW</p><h1>{team.name}</h1></div><span>View only</span></div>

    <div className="team-detail-hero">
      <div className="team-detail-hero-copy"><p className="eyebrow">CONFIRMED REGISTRATIONS</p><strong>{team.counts.confirmed}<small> / {team.target}</small></strong><p>{progressLabel} of target · Stage {stage(progress)} of 5</p></div>
      <Plant percent={progress} compact />
      <div className="progress"><span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>
    </div>

    <div className="counter-grid team-detail-counts"><div className="counter peach"><strong>{team.counts.interested}</strong><span>Interested</span></div><div className="counter yellow"><strong>{team.counts.registered}</strong><span>Registered · unpaid</span></div><div className="counter sage"><strong>{team.counts.confirmed}</strong><span>Confirmed · paid</span></div></div>

    <section className="team-detail-panel" aria-labelledby="team-people-title">
      <div className="team-detail-panel-heading"><Users size={18} /><h2 id="team-people-title">People</h2><span>{team.members.length} members</span></div>
      <div className="team-detail-leader"><div className="team-detail-avatar"><UserRound size={20} /></div><div><small>TEAM LEADER</small><strong>{team.leader}</strong><p>Username: {team.username || "Not set"}</p></div></div>
      <h3>Team members</h3>
      {team.members.length ? <ul className="team-detail-list">{team.members.map((member, index) => <li key={`${member}-${index}`}><span className="team-detail-number">{String(index + 1).padStart(2, "0")}</span>{member}</li>)}</ul> : <p className="team-detail-empty">No team members have been added yet.</p>}
    </section>

    <section className="team-detail-panel" aria-labelledby="team-colleges-title">
      <div className="team-detail-panel-heading"><Building2 size={18} /><h2 id="team-colleges-title">Assigned colleges</h2><span>{team.colleges.length}</span></div>
      {team.colleges.length ? <ul className="team-detail-list">{team.colleges.map(college => <li key={college.id}><span className="team-detail-college-icon"><Building2 size={17} /></span>{college.name}</li>)}</ul> : <p className="team-detail-empty">No colleges are assigned to this team yet.</p>}
    </section>

    <p className="team-detail-updated">Counts are reported by the team leader. Last saved {lastSaved}.</p>
    <button className="primary team-detail-edit" type="button" onClick={edit}><Edit3 size={18} />Edit team<ChevronRight size={18} /></button>
  </section>;
}
