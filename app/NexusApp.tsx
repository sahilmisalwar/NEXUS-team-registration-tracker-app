"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { FunctionsHttpError, type Session } from "@supabase/supabase-js";
import { ArrowLeft, Building2, ChevronRight, Edit3, Eye, EyeOff, Home, Leaf, LogOut, Plus, Search, Settings2, Trash2, UserRound, Users, X } from "lucide-react";
import { Plant, stage } from "@/components/Plant";
import { authLinkType, supabase } from "@/lib/supabase";

type Counts = { interested: number; registered: number; confirmed: number };
type Profile = { user_id: string; username: string; display_name: string; role: "admin" | "leader" };
type College = { id: string; name: string; team_id: string | null };
type Team = { id: string; name: string; leader: string; leaderId: string | null; username: string; members: string[]; target: number; colleges: College[]; counts: Counts; updated: string | null };
type LeaderCredentials = { teamName: string; username: string; password: string; kind: "created" | "reset" };
type Screen = "login" | "admin" | "leader" | "teams" | "team-form" | "colleges" | "profile";
const empty = (): Counts => ({ interested: 0, registered: 0, confirmed: 0 });
const percent = (t: Team) => t.target ? t.counts.confirmed / t.target * 100 : 0;
const pct = (n: number) => `${Math.min(100, Math.round(n || 0))}%`;
const errText = (e: unknown) => e instanceof Error ? e.message : "Something went wrong. Please try again.";
async function edgeErrorText(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try {
      const body: unknown = await error.context.json();
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
    } catch { /* Keep the network error if the response is not JSON. */ }
  }
  return errText(error);
}
function Progress({ value }: { value: number }) { return <div className="progress"><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>; }
function Counter({ color, value, label }: { color: string; value: number; label: string }) { return <div className={`counter ${color}`}><strong>{value}</strong><span>{label}</span></div>; }
function PasswordField({ label, value, onChange, placeholder, autoComplete, required = false, minLength, className = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; autoComplete?: string; required?: boolean; minLength?: number; className?: string }) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return <div className={`password-field ${className}`}><label htmlFor={id}>{label}</label><span className="password-wrap"><input id={id} type={visible ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} minLength={minLength} required={required} /><button type="button" className="password-toggle" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></div>;
}

export default function NexusApp() {
  const [session, setSession] = useState<Session | null>(null), [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null), [teams, setTeams] = useState<Team[]>([]), [colleges, setColleges] = useState<College[]>([]);
  const [screen, setScreen] = useState<Screen>("login"), [selected, setSelected] = useState<string | null>(null), [editing, setEditing] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false), [draft, setDraft] = useState<Counts>(empty()), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [credentials, setCredentials] = useState<LeaderCredentials | null>(null);
  const [needsPassword, setNeedsPassword] = useState(() => authLinkType === "invite" || authLinkType === "recovery");
  const flash = (s: string) => { setNotice(s); window.setTimeout(() => setNotice(""), 3000); };

  const reload = useCallback(async (userId: string, quiet = false) => {
    if (!quiet) setBusy(true);
    try {
      const [p, t, c, n] = await Promise.all([
        supabase.from("profiles").select("user_id,username,display_name,role"),
        supabase.from("teams").select("id,name,leader_name,leader_user_id,member_names,target").is("archived_at", null).order("created_at"),
        supabase.from("colleges").select("id,name,team_id").order("name"),
        supabase.from("team_counts").select("team_id,interested,registered_unpaid,confirmed_paid,updated_at"),
      ]);
      for (const r of [p, t, c, n]) if (r.error) throw r.error;
      const profiles = (p.data ?? []) as Profile[];
      const mine = profiles.find(x => x.user_id === userId);
      if (!mine) throw new Error("This account has no NEXUS role yet. Ask your administrator for access.");
      const cs = (c.data ?? []) as College[];
      const ns = (n.data ?? []) as { team_id: string; interested: number; registered_unpaid: number; confirmed_paid: number; updated_at: string }[];
      const mapped = ((t.data ?? []) as { id: string; name: string; leader_name: string; leader_user_id: string | null; member_names: string[]; target: number }[]).map(row => {
        const count = ns.find(x => x.team_id === row.id);
        return { id: row.id, name: row.name, leader: row.leader_name, leaderId: row.leader_user_id, username: profiles.find(x => x.user_id === row.leader_user_id)?.username ?? "", members: row.member_names ?? [], target: row.target, colleges: cs.filter(x => x.team_id === row.id), counts: count ? { interested: count.interested, registered: count.registered_unpaid, confirmed: count.confirmed_paid } : empty(), updated: count?.updated_at ?? null } as Team;
      });
      setProfile(mine); setTeams(mapped); setColleges(cs); setError(""); setScreen(x => x === "login" ? mine.role : x);
    } catch (e) { setError(errText(e)); }
    finally { if (!quiet) setBusy(false); }
  }, []);
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data, error: e }) => { if (live) { if (e) setError(e.message); setSession(data.session); setReady(true); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, current) => {
      if (event === "PASSWORD_RECOVERY") setNeedsPassword(true);
      setSession(current); setReady(true);
      if (!current) { setProfile(null); setTeams([]); setColleges([]); setCredentials(null); setScreen("login"); }
    });
    return () => { live = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!session) return;
    void reload(session.user.id);
    const channel = supabase.channel(`nexus-live-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => void reload(session.user.id, true))
      .on("postgres_changes", { event: "*", schema: "public", table: "colleges" }, () => void reload(session.user.id, true))
      .on("postgres_changes", { event: "*", schema: "public", table: "team_counts" }, () => void reload(session.user.id, true)).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [session?.user.id, reload]);

  const role = profile?.role;
  const team = role === "leader" ? teams.find(t => t.leaderId === session?.user.id) : teams.find(t => t.id === selected) ?? teams[0];
  const home = () => setScreen(role === "admin" ? "admin" : "leader");
  const saveCounts = async () => {
    if (!team || role !== "leader") return;
    setBusy(true); setError("");
    const r = await supabase.from("team_counts").update({ interested: draft.interested, registered_unpaid: draft.registered, confirmed_paid: draft.confirmed }).eq("team_id", team.id).select("team_id").single();
    setBusy(false);
    if (r.error) { setError(r.error.message); return; }
    setSheet(false); flash("Plant progress saved"); if (session) void reload(session.user.id, true);
  };
  const openUpdate = () => { if (team && role === "leader") { setDraft({ ...team.counts }); setSheet(true); } };

  if (!ready || (session && !profile && !error)) return <main className="login-page"><section className="login-card"><div className="login-plant"><Plant percent={65} /></div><h1>NEXUS</h1><p className="sub">Loading your plant…</p></section></main>;
  if (!session) return <Login error={error} onError={setError} />;
  if (needsPassword) return <PasswordSetup done={() => { setNeedsPassword(false); flash("Password saved"); }} />;
  if (!profile) return <main className="login-page"><section className="login-card"><h1>NEXUS</h1><p className="sub">{error || "Account access is being prepared."}</p><button className="primary" onClick={() => void supabase.auth.signOut()}>Sign out</button></section></main>;
  return <main className="app-shell"><header className="topbar"><button className="brand" onClick={home}><b><Leaf size={18} /></b><span>NEXUS<small>PROGRESS TRACKER</small></span></button><button className="avatar" onClick={() => setScreen("profile")}>{profile.display_name.slice(0, 2).toUpperCase()}</button></header>
    {notice && <div className="toast">✓ {notice}</div>}{error && <div className="app-error" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}{busy && <p className="loading-note">Updating your plant…</p>}
    {screen === "admin" && <AdminDashboard teams={teams} manage={() => setScreen("teams")} create={() => { setEditing(null); setScreen("team-form"); }} />}
    {screen === "leader" && (team ? <LeaderDashboard team={team} name={profile.display_name} update={openUpdate} colleges={() => setScreen("colleges")} /> : <section className="page empty-state"><Plant percent={0} /><h1>Your team is being prepared.</h1><p>Ask your administrator to assign your account to a team.</p></section>)}
    {screen === "teams" && <TeamsPage teams={teams} create={() => { setEditing(null); setScreen("team-form"); }} edit={id => { setEditing(id); setScreen("team-form"); }} />}
    {screen === "team-form" && <TeamWizard key={editing ?? "new"} team={teams.find(t => t.id === editing)} colleges={colleges} back={() => setScreen("teams")} saved={async (id, login) => { setSelected(id); if (session) await reload(session.user.id); setScreen("teams"); if (login) setCredentials(login); else flash(editing ? "Team updated" : "Team created"); }} deleted={async () => { setSelected(null); setEditing(null); if (session) await reload(session.user.id); setScreen("teams"); flash("Team deleted"); }} />}
    {screen === "colleges" && <CollegesPage admin={role === "admin"} team={team} teams={teams} colleges={colleges} back={home} refresh={() => session ? reload(session.user.id, true) : Promise.resolve()} />}
    {screen === "profile" && <ProfilePage profile={profile} team={team} logout={() => void supabase.auth.signOut()} />}
    <nav className="bottom-nav"><button className={screen === "admin" || screen === "leader" ? "active" : ""} onClick={home}><Home size={20} /><span>Home</span></button>{role === "admin" ? <><button className={screen === "teams" || screen === "team-form" ? "active" : ""} onClick={() => setScreen("teams")}><Users size={20} /><span>Teams</span></button><button className={screen === "colleges" ? "active" : ""} onClick={() => setScreen("colleges")}><Building2 size={20} /><span>Colleges</span></button></> : <button onClick={openUpdate}><Edit3 size={20} /><span>Update</span></button>}<button className={screen === "profile" ? "active" : ""} onClick={() => setScreen("profile")}><UserRound size={20} /><span>Profile</span></button></nav>
    {sheet && team && <UpdateSheet team={team} draft={draft} setDraft={setDraft} close={() => setSheet(false)} save={() => void saveCounts()} busy={busy} />}
    {credentials && <CredentialsSheet credentials={credentials} close={() => setCredentials(null)} />}
  </main>;
}

function Login({ error, onError }: { error: string; onError: (s: string) => void }) {
  const [identifier, setIdentifier] = useState(""), [password, setPassword] = useState(""), [sending, setSending] = useState(false), [info, setInfo] = useState("");
  const signIn = async (event: React.FormEvent) => { event.preventDefault(); onError(""); setSending(true); const value = identifier.trim().toLowerCase(); const email = value.includes("@") ? value : `${value}@leaders.nexus-tracker.example`; const r = await supabase.auth.signInWithPassword({ email, password }); if (r.error) onError("Sign in failed. Check your username or email and password."); setSending(false); };
  const sendSetup = async () => { if (!identifier.trim().includes("@")) { onError("Enter your administrator email to get a setup link."); return; } setSending(true); onError(""); const r = await supabase.auth.resetPasswordForEmail(identifier.trim(), { redirectTo: window.location.origin }); setSending(false); if (r.error) onError(r.error.message); else setInfo("If this email belongs to an administrator, a setup link is on its way."); };
  return <main className="login-page"><i className="sprig a">❋</i><i className="sprig b">❋</i><section className="login-card"><div className="login-plant"><Plant percent={65} /></div><p className="eyebrow">WELCOME TO</p><h1>NEXUS</h1><p className="sub">Progress grows one step at a time.</p><form onSubmit={signIn}><label>Email or leader username<input autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="you@example.com or username" required /></label><PasswordField label="Password" value={password} onChange={setPassword} placeholder="Your password" autoComplete="current-password" required />{error && <p className="form-error" role="alert">{error}</p>}{info && <p className="form-info">{info}</p>}<button className="primary" disabled={sending} type="submit">{sending ? "Please wait…" : "Sign in"}<ChevronRight size={18} /></button></form><button className="role-switch" type="button" onClick={() => void sendSetup()} disabled={sending}>Admin: set or reset your password</button></section></main>;
}
function PasswordSetup({ done }: { done: () => void }) { const [password, setPassword] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false); const save = async (event: React.FormEvent) => { event.preventDefault(); if (password.length < 12) { setError("Use at least 12 characters."); return; } setBusy(true); const r = await supabase.auth.updateUser({ password }); setBusy(false); if (r.error) setError(r.error.message); else done(); }; return <main className="login-page"><section className="login-card"><div className="login-plant"><Plant percent={100} /></div><h1>Welcome to NEXUS</h1><p className="sub">Choose your password to finish setting up your account.</p><form onSubmit={save}><PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" minLength={12} required />{error && <p className="form-error" role="alert">{error}</p>}<button className="primary" disabled={busy}>Save password<ChevronRight size={18} /></button></form></section></main>; }
function LeaderDashboard({ team, name, update, colleges }: { team: Team; name: string; update: () => void; colleges: () => void }) { const progress = percent(team); return <section className="page"><p className="greeting">Hello, {name.split(" ")[0]} <span>☀</span></p><h1>Let’s help your plant grow.</h1><div className="garden-card"><div className="garden-heading"><div><p className="eyebrow">{team.name.toUpperCase()}</p><h2>{team.counts.confirmed} <small>of {team.target} confirmed</small></h2></div><b>Stage {stage(progress)}/5</b></div><Plant percent={progress} /><div className="percent-row"><strong>{pct(progress)}</strong><span>toward your target</span></div><Progress value={progress} /><p className="encourage">{progress >= 100 ? "Your plant is in full bloom!" : "Every confirmed registration helps it grow."}</p></div><div className="counter-grid"><Counter color="peach" value={team.counts.interested} label="Interested" /><Counter color="yellow" value={team.counts.registered} label="Registered · unpaid" /><Counter color="sage" value={team.counts.confirmed} label="Confirmed · paid" /></div><button className="primary" onClick={update}><Edit3 size={18} />Update entries</button><button className="link-row" onClick={colleges}><Building2 size={18} /><span>My assigned colleges</span><ChevronRight size={18} /></button><p className="hint">Last saved {team.updated ? new Date(team.updated).toLocaleString() : "not yet"}</p></section>; }
function AdminDashboard({ teams, manage, create }: { teams: Team[]; manage: () => void; create: () => void }) { const confirmed = teams.reduce((n, t) => n + t.counts.confirmed, 0), target = teams.reduce((n, t) => n + t.target, 0), progress = target ? confirmed / target * 100 : 0; return <section className="page"><p className="greeting">Admin overview <span>✦</span></p><h1>Every plant at a glance.</h1><div className="admin-hero"><div><p className="eyebrow">TOTAL CONFIRMED</p><h2>{confirmed}<small> / {target}</small></h2><Progress value={progress} /><p>{pct(progress)} of the collective target</p></div><Plant percent={progress} compact /></div><div className="section-row"><h2>Team plants</h2><button onClick={manage}>Manage</button></div>{teams.length ? <div className="team-list">{teams.slice(0, 3).map(t => <div className="team-card" key={t.id}><Plant percent={percent(t)} compact /><div><h3>{t.name}</h3><p>{t.leader} · {pct(percent(t))} complete</p><Progress value={percent(t)} /></div><strong>{t.counts.confirmed}/{t.target}</strong></div>)}</div> : <div className="empty-card"><p>There are no teams yet. Create the first one to start growing.</p><button className="primary" onClick={create}><Plus size={18} />Create a team</button></div>}<p className="read-only"><Settings2 size={15} />Counts are leader-reported and read-only for admins.</p></section>; }
function TeamsPage({ teams, create, edit }: { teams: Team[]; create: () => void; edit: (id: string) => void }) { const [query, setQuery] = useState(""); const visible = teams.filter(t => `${t.name} ${t.leader}`.toLowerCase().includes(query.toLowerCase())); return <section className="page"><div className="title-row"><div><p className="eyebrow">ADMIN</p><h1>Manage teams</h1></div><button className="round-add" aria-label="Create team" onClick={create}><Plus /></button></div><div className="search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search teams or leaders" /></div><div className="team-list">{visible.map(t => <button className="team-card clickable" key={t.id} onClick={() => edit(t.id)}><Plant percent={percent(t)} compact /><div><h3>{t.name}</h3><p>{t.leader} · {pct(percent(t))} complete</p><Progress value={percent(t)} /></div><ChevronRight /></button>)}</div>{!visible.length && <p className="hint">{teams.length ? "No teams match your search." : "No teams yet. Tap + to create one."}</p>}</section>; }

function TeamWizard({ team, colleges, back, saved, deleted }: { team?: Team; colleges: College[]; back: () => void; saved: (id: string, login?: LeaderCredentials) => Promise<void>; deleted: () => Promise<void> }) {
  const [step, setStep] = useState(1), [name, setName] = useState(team?.name ?? ""), [leader, setLeader] = useState(team?.leader ?? ""), [target, setTarget] = useState(String(team?.target ?? 50)), [members, setMembers] = useState(team?.members.join(", ") ?? ""), [username, setUsername] = useState(team?.username ?? ""), [password, setPassword] = useState(""), [selected, setSelected] = useState<string[]>(team?.colleges.map(c => c.id) ?? []), [newCollege, setNewCollege] = useState(""), [savedId, setSavedId] = useState(team?.id ?? ""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false), [deleteError, setDeleteError] = useState("");
  const available = colleges.filter(c => !c.team_id || c.team_id === savedId || c.team_id === team?.id);
  const next = () => { setError(""); if (step === 1 && (!name.trim() || !leader.trim() || !Number.isInteger(Number(target)) || Number(target) < 1)) { setError("Enter a team name, leader name, and positive whole-number target."); return; } if (step === 2 && !team?.leaderId && (!/^[a-z0-9_.-]{3,32}$/.test(username.trim().toLowerCase()) || password.length < 12)) { setError("Use a 3–32 character username and a password of at least 12 characters."); return; } setStep(step + 1); };
  const save = async () => { if (busy) return; setBusy(true); setError(""); let currentId = savedId; let phase = "team"; try {
    let login: LeaderCredentials | undefined;
    const details = { name: name.trim(), leader_name: leader.trim(), member_names: members.split(",").map(s => s.trim()).filter(Boolean), target: Number(target) };
    let id = currentId;
    if (id) { const r = await supabase.from("teams").update(details).eq("id", id).select("id").single(); if (r.error) throw r.error; }
    else { const r = await supabase.from("teams").insert(details).select("id").single(); if (r.error) throw r.error; id = r.data.id as string; currentId = id; setSavedId(id); }
    phase = "colleges";
    for (const c of colleges) { if (selected.includes(c.id) && c.team_id !== id) { const r = await supabase.from("colleges").update({ team_id: id }).eq("id", c.id); if (r.error) throw r.error; } if (!selected.includes(c.id) && c.team_id === id) { const r = await supabase.from("colleges").update({ team_id: null }).eq("id", c.id); if (r.error) throw r.error; } }
    for (const collegeName of newCollege.split(",").map(s => s.trim()).filter(Boolean)) { const r = await supabase.from("colleges").insert({ name: collegeName, team_id: id }); if (r.error) throw r.error; } setNewCollege("");
    phase = "leader";
    if (!team?.leaderId) { const r = await supabase.functions.invoke("admin-leaders", { body: { action: "create_leader", team_id: id, username: username.trim().toLowerCase(), display_name: leader.trim(), password } }); if (r.error) throw new Error(await edgeErrorText(r.error)); if (!r.data?.ok) throw new Error(r.data?.error ?? "Could not create the leader account."); login = { teamName: name.trim(), username: username.trim().toLowerCase(), password, kind: "created" }; }
    else if (password) { const r = await supabase.functions.invoke("admin-leaders", { body: { action: "reset_password", team_id: id, password } }); if (r.error) throw new Error(await edgeErrorText(r.error)); if (!r.data?.ok) throw new Error(r.data?.error ?? "Could not reset the leader password."); login = { teamName: name.trim(), username: username.trim().toLowerCase(), password, kind: "reset" }; }
    await saved(id, login);
  } catch (e) { const savedHint = currentId ? phase === "leader" ? "Team and colleges are saved. Retry to finish leader setup." : "Team details are saved. Retry to finish setup." : ""; setError([errText(e), savedHint].filter(Boolean).join(" ")); } finally { setBusy(false); } };
  const remove = async () => {
    if (!team || busy) return;
    setBusy(true); setDeleteError("");
    try {
      const r = await supabase.functions.invoke("admin-leaders", { body: { action: "delete_team", team_id: team.id } });
      if (r.error) throw new Error(await edgeErrorText(r.error));
      if (!r.data?.ok) throw new Error(r.data?.error ?? "Could not delete the team.");
      setDeleteOpen(false);
      await deleted();
    } catch (e) { setDeleteError(errText(e)); }
    finally { setBusy(false); }
  };
  return <section className="page form-page"><button className="back" onClick={step > 1 ? () => setStep(step - 1) : back}><ArrowLeft size={20} /></button><p className="eyebrow">{team ? "EDIT TEAM" : "NEW TEAM"} · STEP {step} OF 3</p><h1>{["Team details", "People & access", "Assign colleges"][step - 1]}</h1><div className="steps">{[1, 2, 3].map(n => <i className={n <= step ? "done" : ""} key={n} />)}</div>
    {step === 1 && <><label className="field">Team name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Team Daisy" maxLength={120} /></label><label className="field">Leader name<input value={leader} onChange={e => setLeader(e.target.value)} placeholder="Full name" maxLength={120} disabled={Boolean(team?.leaderId)} /></label><label className="field">Registration target<input type="number" min={1} step={1} value={target} onChange={e => setTarget(e.target.value)} /></label></>}
    {step === 2 && <><label className="field">Leader username<input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" disabled={Boolean(team?.leaderId)} autoComplete="off" /></label><PasswordField className="field" label={team?.leaderId ? "New password (optional)" : "Temporary password"} value={password} onChange={setPassword} placeholder="At least 12 characters" autoComplete="new-password" /><p className="hint">{team?.leaderId ? "The current password cannot be viewed. Enter a new one to reset it and see it after saving." : "You can view the username and temporary password after creating the team."}</p><label className="field">Team members (optional, comma separated)<input value={members} onChange={e => setMembers(e.target.value)} placeholder="Member names" /></label></>}
    {step === 3 && <><div className="assignment"><Building2 /><div><h3>Choose colleges</h3><p>Each college can belong to one team only.</p></div></div>{available.map(c => <label className="check" key={c.id}><input type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))} />{c.name}</label>)}{!available.length && <p className="hint">No unassigned colleges yet. Add one below.</p>}<label className="field">Add new colleges (comma separated)<input value={newCollege} onChange={e => setNewCollege(e.target.value)} placeholder="e.g. Riverdale College" /></label></>}
    {error && <p className="form-error" role="alert">{error}</p>}<button className="primary bottom-action" disabled={busy} onClick={step < 3 ? next : () => void save()}>{busy ? "Saving…" : step < 3 ? "Continue" : team?.leaderId ? "Save team" : savedId ? "Finish team setup" : "Create team"}<ChevronRight size={18} /></button>
    {team && step === 1 && <button className="delete-team" type="button" onClick={() => { setDeleteError(""); setDeleteOpen(true); }}><Trash2 size={17} />Delete team</button>}
    {deleteOpen && team && <div className="sheet-backdrop confirm-backdrop" onClick={() => { if (!busy) setDeleteOpen(false); }}><section className="confirm-card" role="dialog" aria-modal="true" aria-labelledby="delete-team-title" onClick={e => e.stopPropagation()}><p className="eyebrow">REMOVE TEAM</p><h2 id="delete-team-title">Delete {team.name}?</h2><p>This permanently removes the team, its counts, and its leader login. Its colleges become unassigned.</p>{deleteError && <p className="form-error" role="alert">{deleteError}</p>}<button className="danger-action" disabled={busy} onClick={() => void remove()}><Trash2 size={17} />{busy ? "Deleting…" : "Delete team"}</button><button className="cancel-action" disabled={busy} onClick={() => setDeleteOpen(false)}>Keep team</button></section></div>}
  </section>;
}

function CredentialsSheet({ credentials, close }: { credentials: LeaderCredentials; close: () => void }) {
  const [visible, setVisible] = useState(false);
  return <div className="sheet-backdrop"><section className="sheet credentials-sheet" role="dialog" aria-modal="true" aria-labelledby="credentials-title"><i className="sheet-handle" /><p className="eyebrow">{credentials.kind === "created" ? "LEADER ACCOUNT READY" : "PASSWORD UPDATED"}</p><h2 id="credentials-title">Login details for {credentials.teamName}</h2><p className="sheet-note">Use this username on the NEXUS sign-in page. Share the details with the leader privately.</p><div className="credential-row"><span>Username</span><strong>{credentials.username}</strong></div><div className="credential-row"><span>{credentials.kind === "created" ? "Temporary password" : "New password"}</span><div className="credential-secret"><code>{visible ? credentials.password : "••••••••••••"}</code><button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div><p className="credential-warning">This password is shown only now. If it is lost, edit the team to set a new one.</p><button className="primary" onClick={close}>Done<ChevronRight size={18} /></button></section></div>;
}

function CollegesPage({ admin, team, teams, colleges, back, refresh }: { admin: boolean; team?: Team; teams: Team[]; colleges: College[]; back: () => void; refresh: () => Promise<void> }) {
  const [name, setName] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false); const visible = admin ? colleges : team?.colleges ?? [];
  const create = async () => { if (!name.trim()) return; setBusy(true); setError(""); const r = await supabase.from("colleges").insert({ name: name.trim(), team_id: null }); if (r.error) setError(r.error.message); else { setName(""); await refresh(); } setBusy(false); };
  const assign = async (id: string, teamId: string | null) => { setBusy(true); setError(""); const r = await supabase.from("colleges").update({ team_id: teamId }).eq("id", id); if (r.error) setError(r.error.message); else await refresh(); setBusy(false); };
  return <section className="page"><button className="back" onClick={back}><ArrowLeft size={20} /></button><p className="eyebrow">{admin ? "COLLEGE ASSIGNMENT" : "MY COLLEGES"}</p><h1>{admin ? "Colleges by team" : "Your assigned colleges"}</h1>{admin && <div className="college-create"><input aria-label="New college name" value={name} onChange={e => setName(e.target.value)} placeholder="New college name" /><button className="add-college" disabled={busy || !name.trim()} onClick={() => void create()}><Plus size={17} />Add college</button></div>}{error && <p className="form-error" role="alert">{error}</p>}<div className="college-list">{visible.map(c => <div className="college-card" key={c.id}><b><Building2 size={20} /></b><div><h3>{c.name}</h3>{admin ? <select aria-label={`Assign ${c.name}`} value={c.team_id ?? ""} disabled={busy} onChange={e => void assign(c.id, e.target.value || null)}><option value="">Unassigned</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select> : <p>Assigned to your team</p>}</div></div>)}</div>{!visible.length && <p className="hint">{admin ? "Add a college to start assigning it." : "No colleges are assigned yet."}</p>}<p className="hint">{admin ? "A college can be assigned to one team at a time." : "Need a change? Ask your admin to update assignments."}</p></section>;
}
function ProfilePage({ profile, team, logout }: { profile: Profile; team?: Team; logout: () => void }) { return <section className="page profile"><div className="profile-avatar">{profile.display_name.slice(0, 2).toUpperCase()}</div><h1>{profile.display_name}</h1><p>{profile.role === "admin" ? "NEXUS administrator" : `${team?.name ?? "Team"} leader`}</p><div className="profile-card"><div><span>Role</span><strong>{profile.role === "admin" ? "Administrator" : "Team leader"}</strong></div><div><span>Username</span><strong>{profile.username}</strong></div>{profile.role === "leader" && <div><span>Team</span><strong>{team?.name ?? "Pending assignment"}</strong></div>}</div><button className="logout" onClick={logout}><LogOut size={18} />Log out</button></section>; }
function UpdateSheet({ team, draft, setDraft, close, save, busy }: { team: Team; draft: Counts; setDraft: (c: Counts) => void; close: () => void; save: () => void; busy: boolean }) { const rows: [keyof Counts, string, string, string][] = [["interested", "Interested", "Considering joining", "peach"], ["registered", "Registered", "Signed up, unpaid", "yellow"], ["confirmed", "Confirmed", "Paid & confirmed", "sage"]]; const change = (key: keyof Counts, n: number) => setDraft({ ...draft, [key]: Math.max(0, Math.floor(n || 0)) }); return <div className="sheet-backdrop" onClick={close}><section className="sheet" role="dialog" aria-modal="true" aria-label="Update entries" onClick={e => e.stopPropagation()}><i className="sheet-handle" /><div className="sheet-title"><div><p className="eyebrow">{team.name.toUpperCase()}</p><h2>Update entries</h2></div><button aria-label="Close" onClick={close}><X /></button></div><p className="sheet-note">Save all totals together. Your admin will see the latest saved update.</p>{rows.map(([key, label, subtitle, color]) => <div className="update-row" key={key}><i className={`dot ${color}`} /><div><strong>{label}</strong><small>{subtitle}</small></div><div className="adjust"><button aria-label={`Decrease ${label}`} onClick={() => change(key, draft[key] - 1)}>−</button><input aria-label={`${label} total`} type="number" min="0" step="1" value={draft[key]} onChange={e => change(key, Number(e.target.value))} /><button aria-label={`Increase ${label}`} onClick={() => change(key, draft[key] + 1)}>+</button></div></div>)}<button className="primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}<ChevronRight size={18} /></button></section></div>; }
