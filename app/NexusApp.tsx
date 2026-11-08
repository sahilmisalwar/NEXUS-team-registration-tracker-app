"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { FunctionsHttpError, type Session } from "@supabase/supabase-js";
import { ArrowLeft, Building2, Check, ChevronRight, Copy, Edit3, Eye, EyeOff, FileText, Home, LogOut, Plus, Search, Settings2, Trash2, UserRound, Users, X } from "lucide-react";
import { ModalFrame } from "@/components/ModalFrame";
import { Plant, stage } from "@/components/Plant";
import { CollegeBreakdown, type CollegeTotal } from "@/components/CollegeBreakdown";
import { EntryCard, EntriesPage, type CountEntry } from "@/components/EntryHistory";
import { TeamDetail } from "@/components/TeamDetail";
import { UpdateSheet, type Counts } from "@/components/UpdateEntriesSheet";
import { authLinkType, supabase } from "@/lib/supabase";

type Profile = { user_id: string; username: string; display_name: string; role: "admin" | "leader" };
type College = { id: string; name: string; team_id: string | null };
type CollegeCountRow = { team_id: string; college_id: string; interested: number; registered_unpaid: number; confirmed_paid: number };
type Team = { id: string; name: string; leader: string; leaderId: string | null; username: string; members: string[]; target: number; colleges: College[]; collegeTotals: CollegeTotal[]; unallocated: Counts; counts: Counts; updated: string | null };
type LeaderCredentials = { teamName: string; username: string; password: string; kind: "created" | "reset" };
type Screen = "login" | "admin" | "leader" | "teams" | "team-detail" | "team-form" | "colleges" | "entries" | "profile";
type PlantMotion = { kind: "grow" | "nudge"; fromPercent: number; id: number };
type PlantMessage = { text: string; id: number };
type EntryMode = "update" | "allocation";
const entryColumns = "id,team_id,college_id,college_name,note,entry_kind,interested,registered_unpaid,confirmed_paid,previous_interested,previous_registered_unpaid,previous_confirmed_paid,college_interested,college_registered_unpaid,college_confirmed_paid,previous_college_interested,previous_college_registered_unpaid,previous_college_confirmed_paid,created_at";
const entryPageSize = 50;
const empty = (): Counts => ({ interested: 0, registered: 0, confirmed: 0 });
function savedEntryMessage(confirmed: number, target: number, increased: boolean) {
  const remaining = Math.max(0, target - confirmed);
  if (!remaining) return increased ? "You did it! Your plant is blooming. Amazing work!" : "Entry saved. Your plant is in full bloom!";
  if (remaining === 1) return "Just one more confirmed registration to go. You can do this!";
  if (remaining <= 5) return `You can do this! Just ${remaining} more to go.`;
  if (remaining <= Math.ceil(target / 4)) return `So close! ${remaining} more confirmed registrations to go.`;
  return increased ? `Lovely progress! ${remaining} more confirmed registrations until your plant blooms.` : `Entry saved. Keep going—${remaining} more to go!`;
}
const percent = (t: Team) => t.target ? t.counts.confirmed / t.target * 100 : 0;
const pct = (n: number) => `${Math.min(100, Math.round(n || 0))}%`;
const errText = (e: unknown) => e && typeof e === "object" && "message" in e && typeof e.message === "string" ? e.message : "Something went wrong. Please try again.";
async function edgeErrorText(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try {
      const body: unknown = await error.context.json();
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
    } catch { /* Keep the network error if the response is not JSON. */ }
  }
  return errText(error);
}
function Progress({ value }: { value: number }) { return <div className="progress" role="progressbar" aria-label="Registration progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, Math.round(value)))}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>; }
function Counter({ color, value, label }: { color: string; value: number; label: string }) { return <div className={`counter ${color}`}><strong>{value}</strong><span>{label}</span></div>; }
function PasswordField({ label, value, onChange, placeholder, autoComplete, required = false, minLength, className = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; autoComplete?: string; required?: boolean; minLength?: number; className?: string }) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return <div className={`password-field ${className}`}><label htmlFor={id}>{label}</label><span className="password-wrap"><input id={id} type={visible ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} minLength={minLength} required={required} /><button type="button" className="password-toggle" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></div>;
}

export default function NexusApp() {
  const [session, setSession] = useState<Session | null>(null), [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null), [teams, setTeams] = useState<Team[]>([]), [colleges, setColleges] = useState<College[]>([]), [entries, setEntries] = useState<CountEntry[]>([]);
  const [hasOlderEntries, setHasOlderEntries] = useState(false), [loadingOlderEntries, setLoadingOlderEntries] = useState(false);
  const [screen, setScreen] = useState<Screen>("login"), [selected, setSelected] = useState<string | null>(null), [editing, setEditing] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false), [entryMode, setEntryMode] = useState<EntryMode>("update"), [draft, setDraft] = useState<Counts>(empty()), [baseCounts, setBaseCounts] = useState<Counts>(empty()), [entryCollegeId, setEntryCollegeId] = useState(""), [entryNote, setEntryNote] = useState(""), [entryError, setEntryError] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [plantMotion, setPlantMotion] = useState<PlantMotion | null>(null);
  const [plantMessage, setPlantMessage] = useState<PlantMessage | null>(null);
  const [credentials, setCredentials] = useState<LeaderCredentials | null>(null);
  const [needsPassword, setNeedsPassword] = useState(() => authLinkType === "invite" || authLinkType === "recovery");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = (s: string) => { if (noticeTimer.current) clearTimeout(noticeTimer.current); setNotice(s); noticeTimer.current = setTimeout(() => setNotice(""), 4000); };
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [screen]);

  const reload = useCallback(async (userId: string, quiet = false) => {
    if (!quiet) setBusy(true);
    try {
      const [p, t, c, n, e, cc] = await Promise.all([
        supabase.from("profiles").select("user_id,username,display_name,role"),
        supabase.from("teams").select("id,name,leader_name,leader_user_id,member_names,target").is("archived_at", null).order("created_at"),
        supabase.from("colleges").select("id,name,team_id").order("name"),
        supabase.from("team_counts").select("team_id,interested,registered_unpaid,confirmed_paid,updated_at"),
        supabase.from("count_entries").select(entryColumns).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(entryPageSize),
        supabase.from("college_counts").select("team_id,college_id,interested,registered_unpaid,confirmed_paid"),
      ]);
      for (const r of [p, t, c, n, e, cc]) if (r.error) throw r.error;
      const profiles = (p.data ?? []) as Profile[];
      const mine = profiles.find(x => x.user_id === userId);
      if (!mine) throw new Error("This account has no NEXUS role yet. Ask your administrator for access.");
      const cs = (c.data ?? []) as College[];
      const ns = (n.data ?? []) as { team_id: string; interested: number; registered_unpaid: number; confirmed_paid: number; updated_at: string }[];
      const trackedCounts = (cc.data ?? []) as CollegeCountRow[];
      const mapped = ((t.data ?? []) as { id: string; name: string; leader_name: string; leader_user_id: string | null; member_names: string[]; target: number }[]).map(row => {
        const count = ns.find(x => x.team_id === row.id);
        const counts = count ? { interested: count.interested, registered: count.registered_unpaid, confirmed: count.confirmed_paid } : empty();
        const assigned = cs.filter(x => x.team_id === row.id);
        const recorded = trackedCounts.filter(x => x.team_id === row.id);
        const collegeTotals: CollegeTotal[] = [
          ...assigned.map(college => {
            const saved = recorded.find(item => item.college_id === college.id);
            return { id: college.id, name: college.name, assigned: true, counts: saved ? { interested: saved.interested, registered: saved.registered_unpaid, confirmed: saved.confirmed_paid } : empty() };
          }),
          ...recorded.filter(item => !assigned.some(college => college.id === item.college_id)).map(item => ({ id: item.college_id, name: cs.find(college => college.id === item.college_id)?.name ?? "Former college", assigned: false, counts: { interested: item.interested, registered: item.registered_unpaid, confirmed: item.confirmed_paid } })),
        ];
        const tracked = collegeTotals.reduce((sum, college) => ({ interested: sum.interested + college.counts.interested, registered: sum.registered + college.counts.registered, confirmed: sum.confirmed + college.counts.confirmed }), empty());
        const unallocated = { interested: Math.max(0, counts.interested - tracked.interested), registered: Math.max(0, counts.registered - tracked.registered), confirmed: Math.max(0, counts.confirmed - tracked.confirmed) };
        return { id: row.id, name: row.name, leader: row.leader_name, leaderId: row.leader_user_id, username: profiles.find(x => x.user_id === row.leader_user_id)?.username ?? "", members: row.member_names ?? [], target: row.target, colleges: assigned, collegeTotals, unallocated, counts, updated: count?.updated_at ?? null } as Team;
      });
      setProfile(mine); setTeams(mapped); setColleges(cs); setEntries((e.data ?? []) as CountEntry[]); setHasOlderEntries((e.data ?? []).length === entryPageSize); setError(""); setScreen(x => x === "login" ? mine.role : x);
    } catch (e) { setError(errText(e)); }
    finally { if (!quiet) setBusy(false); }
  }, []);
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data, error: e }) => { if (live) { if (e) setError(e.message); setSession(data.session); setReady(true); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, current) => {
      if (event === "PASSWORD_RECOVERY") setNeedsPassword(true);
      setSession(current); setReady(true);
      if (!current) { setProfile(null); setTeams([]); setColleges([]); setEntries([]); setHasOlderEntries(false); setCredentials(null); setPlantMotion(null); setPlantMessage(null); setScreen("login"); }
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
  useEffect(() => {
    if (!plantMotion) return;
    const timer = window.setTimeout(() => setPlantMotion(null), plantMotion.kind === "grow" ? 3300 : 1100);
    return () => window.clearTimeout(timer);
  }, [plantMotion]);
  useEffect(() => {
    if (!plantMessage) return;
    const timer = window.setTimeout(() => setPlantMessage(null), 9000);
    return () => window.clearTimeout(timer);
  }, [plantMessage]);

  const role = profile?.role;
  const team = role === "leader" ? teams.find(t => t.leaderId === session?.user.id) : teams.find(t => t.id === selected) ?? teams[0];
  const selectedTeam = teams.find(t => t.id === selected);
  const home = () => setScreen(role === "admin" ? "admin" : "leader");
  const saveCounts = async () => {
    if (!team || role !== "leader" || busy) return;
    if (!team.colleges.some(c => c.id === entryCollegeId)) { setEntryError("Choose one of your assigned colleges."); return; }
    const previousPercent = percent(team);
    const nextCounts = { ...draft };
    const delta = { interested: nextCounts.interested - baseCounts.interested, registered: nextCounts.registered - baseCounts.registered, confirmed: nextCounts.confirmed - baseCounts.confirmed };
    if (entryMode === "allocation") {
      if (Object.values(delta).some(value => value < 0) || Object.values(delta).every(value => value === 0)) { setEntryError("Add at least one earlier count to this college."); return; }
      if (delta.interested > team.unallocated.interested || delta.registered > team.unallocated.registered || delta.confirmed > team.unallocated.confirmed) { setEntryError("The amounts exceed the earlier totals awaiting a college."); return; }
    } else if (Object.values(delta).every(value => value === 0) && !entryNote.trim()) { setEntryError("Change a college count or add a note before saving."); return; }
    const nextTeamCounts = entryMode === "allocation" ? team.counts : { interested: team.counts.interested + delta.interested, registered: team.counts.registered + delta.registered, confirmed: team.counts.confirmed + delta.confirmed };
    setBusy(true); setEntryError("");
    const r = await supabase.from("count_entries").insert({ team_id: team.id, college_id: entryCollegeId, note: entryNote.trim(), entry_kind: entryMode, college_interested: nextCounts.interested, college_registered_unpaid: nextCounts.registered, college_confirmed_paid: nextCounts.confirmed, previous_college_interested: baseCounts.interested, previous_college_registered_unpaid: baseCounts.registered, previous_college_confirmed_paid: baseCounts.confirmed }).select("id").single();
    setBusy(false);
    if (r.error) { setEntryError(r.error.message); return; }
    setTeams(current => current.map(item => item.id === team.id ? { ...item, counts: nextTeamCounts, collegeTotals: item.collegeTotals.map(college => college.id === entryCollegeId ? { ...college, counts: nextCounts } : college), unallocated: entryMode === "allocation" ? { interested: item.unallocated.interested - delta.interested, registered: item.unallocated.registered - delta.registered, confirmed: item.unallocated.confirmed - delta.confirmed } : item.unallocated, updated: new Date().toISOString() } : item));
    setSheet(false); setScreen("leader");
    setPlantMotion(current => ({ kind: entryMode === "update" && delta.confirmed > 0 ? "grow" : "nudge", fromPercent: previousPercent, id: (current?.id ?? 0) + 1 }));
    setPlantMessage(current => ({ text: entryMode === "allocation" ? "Earlier totals assigned to your college. Nicely done!" : savedEntryMessage(nextTeamCounts.confirmed, team.target, delta.confirmed > 0), id: (current?.id ?? 0) + 1 }));
    flash(entryMode === "allocation" ? "Earlier totals assigned" : "Entry saved"); if (session) void reload(session.user.id, true);
  };
  const openUpdate = (mode: EntryMode = "update") => { if (team && role === "leader") { setEntryMode(mode); setDraft(empty()); setBaseCounts(empty()); setEntryCollegeId(""); setEntryNote(""); setEntryError(""); setSheet(true); } };
  const chooseEntryCollege = (id: string) => {
    const counts = team?.collegeTotals.find(college => college.id === id && college.assigned)?.counts ?? empty();
    setEntryCollegeId(id); setBaseCounts({ ...counts }); setDraft({ ...counts }); setEntryError("");
  };
  const tapPlant = () => { if (team && plantMotion?.kind !== "grow") setPlantMotion(current => ({ kind: "nudge", fromPercent: percent(team), id: (current?.id ?? 0) + 1 })); };
  const loadOlderEntries = async () => {
    const oldest = entries.at(-1);
    if (!oldest || !hasOlderEntries || loadingOlderEntries) return;
    setLoadingOlderEntries(true);
    const r = await supabase.from("count_entries").select(entryColumns).lt("created_at", oldest.created_at).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(entryPageSize);
    setLoadingOlderEntries(false);
    if (r.error) { setError(r.error.message); return; }
    const older = (r.data ?? []) as CountEntry[];
    setEntries(current => [...current, ...older.filter(entry => !current.some(saved => saved.id === entry.id))]);
    setHasOlderEntries(older.length === entryPageSize);
  };

  if (!ready || (session && !profile && !error)) return <main className="login-page"><section className="login-card"><div className="login-plant"><Plant percent={65} /></div><h1>NEXUS</h1><p className="sub loading-welcome" role="status"><span />Getting your progress ready…</p></section></main>;
  if (!session) return <Login error={error} onError={setError} />;
  if (needsPassword) return <PasswordSetup done={() => { setNeedsPassword(false); flash("Password saved"); }} />;
  if (!profile) return <main className="login-page"><section className="login-card"><h1>NEXUS</h1><p className="sub">{error || "Account access is being prepared."}</p><button className="primary" onClick={() => void supabase.auth.signOut()}>Sign out</button></section></main>;
  return <main className="app-shell"><header className="topbar"><button className="brand" onClick={home}><b className="brand-emblem"><Image src="/nexus-team-emblem.png" alt="" width={31} height={31} /></b><span>NEXUS<small>PROGRESS TRACKER</small></span></button><button className="avatar" aria-label="Open your profile" onClick={() => setScreen("profile")}>{profile.display_name.slice(0, 2).toUpperCase()}</button></header>
    {notice && <div className="toast" role="status">✓ {notice}</div>}{error && <div className="app-error" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}{busy && <p className="loading-note">Updating your plant…</p>}
    {screen === "admin" && <AdminDashboard teams={teams} entries={entries} manage={() => setScreen("teams")} view={id => { setSelected(id); setScreen("team-detail"); }} history={() => setScreen("entries")} create={() => { setEditing(null); setScreen("team-form"); }} />}
    {screen === "leader" && (team ? <LeaderDashboard team={team} name={profile.display_name} motion={plantMotion} message={plantMessage} tapPlant={tapPlant} update={() => openUpdate()} allocate={() => openUpdate("allocation")} colleges={() => setScreen("colleges")} history={() => setScreen("entries")} /> : <section className="page empty-state"><Plant percent={0} /><h1>Your team is being prepared.</h1><p>Ask your administrator to assign your account to a team.</p></section>)}
    {screen === "teams" && <TeamsPage teams={teams} create={() => { setEditing(null); setScreen("team-form"); }} view={id => { setSelected(id); setScreen("team-detail"); }} />}
    {screen === "team-detail" && (selectedTeam ? <TeamDetail team={selectedTeam} back={() => setScreen("teams")} edit={() => { setEditing(selectedTeam.id); setScreen("team-form"); }} /> : <section className="page empty-state"><h1>Team unavailable</h1><p>This team may have been removed.</p><button className="primary" onClick={() => setScreen("teams")}>Back to teams</button></section>)}
    {screen === "team-form" && <TeamWizard key={editing ?? "new"} team={teams.find(t => t.id === editing)} colleges={colleges} back={() => setScreen(editing ? "team-detail" : "teams")} saved={async (id, login) => { setSelected(id); if (session) await reload(session.user.id); setScreen(editing ? "team-detail" : "teams"); if (login) setCredentials(login); else flash(editing ? "Team updated" : "Team created"); }} deleted={async () => { setSelected(null); setEditing(null); if (session) await reload(session.user.id); setScreen("teams"); flash("Team deleted"); }} />}
    {screen === "colleges" && <CollegesPage admin={role === "admin"} team={team} teams={teams} colleges={colleges} back={home} onNotice={flash} refresh={() => session ? reload(session.user.id, true) : Promise.resolve()} />}
    {screen === "entries" && <EntriesPage admin={role === "admin"} entries={entries} teams={teams} hasOlder={hasOlderEntries} loadingOlder={loadingOlderEntries} loadOlder={() => void loadOlderEntries()} />}
    {screen === "profile" && <ProfilePage profile={profile} team={team} logout={() => void supabase.auth.signOut()} />}
    <nav className="bottom-nav" aria-label="Main navigation"><button aria-current={screen === "admin" || screen === "leader" ? "page" : undefined} className={screen === "admin" || screen === "leader" ? "active" : ""} onClick={home}><Home size={20} /><span>Home</span></button>{role === "admin" ? <><button aria-current={["teams", "team-detail", "team-form"].includes(screen) ? "page" : undefined} className={screen === "teams" || screen === "team-detail" || screen === "team-form" ? "active" : ""} onClick={() => setScreen("teams")}><Users size={20} /><span>Teams</span></button><button aria-current={screen === "colleges" ? "page" : undefined} className={screen === "colleges" ? "active" : ""} onClick={() => setScreen("colleges")}><Building2 size={20} /><span>Colleges</span></button></> : <button onClick={() => openUpdate()}><Edit3 size={20} /><span>Update</span></button>}<button aria-current={screen === "entries" ? "page" : undefined} className={screen === "entries" ? "active" : ""} onClick={() => setScreen("entries")}><FileText size={20} /><span>Entries</span></button><button aria-current={screen === "profile" ? "page" : undefined} className={screen === "profile" ? "active" : ""} onClick={() => setScreen("profile")}><UserRound size={20} /><span>Profile</span></button></nav>
    {sheet && team && <UpdateSheet team={team} mode={entryMode} draft={draft} setDraft={setDraft} collegeId={entryCollegeId} setCollegeId={chooseEntryCollege} note={entryNote} setNote={setEntryNote} error={entryError} close={() => { if (!busy) setSheet(false); }} save={() => void saveCounts()} busy={busy} />}
    {credentials && <CredentialsSheet credentials={credentials} close={() => setCredentials(null)} />}
  </main>;
}

function Login({ error, onError }: { error: string; onError: (s: string) => void }) {
  const [identifier, setIdentifier] = useState(""), [password, setPassword] = useState(""), [sending, setSending] = useState(false), [info, setInfo] = useState("");
  const signIn = async (event: React.FormEvent) => { event.preventDefault(); onError(""); setSending(true); const value = identifier.trim().toLowerCase(); const email = value.includes("@") ? value : `${value}@leaders.nexus-tracker.example`; const r = await supabase.auth.signInWithPassword({ email, password }); if (r.error) onError("Sign in failed. Check your username or email and password."); setSending(false); };
  const sendSetup = async () => { if (!identifier.trim().includes("@")) { onError("Enter your administrator email to get a setup link."); return; } setSending(true); onError(""); const r = await supabase.auth.resetPasswordForEmail(identifier.trim(), { redirectTo: window.location.origin }); setSending(false); if (r.error) onError(r.error.message); else setInfo("If this email belongs to an administrator, a setup link is on its way."); };
  return <main className="login-page"><i className="sprig a">❋</i><i className="sprig b">❋</i><section className="login-card"><Image className="login-emblem login-emblem-left" src="/nexus-team-emblem.png" alt="" width={38} height={38} /><Image className="login-emblem login-emblem-nit" src="/nit-shield-crest.png" alt="Nagpur Institute of Technology crest" width={48} height={32} /><div className="login-plant"><Plant percent={65} /></div><p className="eyebrow">WELCOME TO</p><h1>NEXUS</h1><p className="sub">Progress grows one step at a time.</p><div className="login-divider"><span>YOUR NEXT MILESTONE STARTS HERE</span></div><form onSubmit={signIn}><label>Email or leader username<input autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="you@example.com or username" autoCapitalize="none" spellCheck={false} required /></label><PasswordField label="Password" value={password} onChange={setPassword} placeholder="Your password" autoComplete="current-password" required />{error && <p className="form-error" role="alert">{error}</p>}{info && <p className="form-info">{info}</p>}<button className="primary" disabled={sending} type="submit">{sending ? "Please wait…" : "Sign in"}<ChevronRight size={18} /></button></form><button className="role-switch" type="button" onClick={() => void sendSetup()} disabled={sending}>Admin: set or reset your password</button></section></main>;
}
function PasswordSetup({ done }: { done: () => void }) { const [password, setPassword] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false); const save = async (event: React.FormEvent) => { event.preventDefault(); if (password.length < 12) { setError("Use at least 12 characters."); return; } setBusy(true); const r = await supabase.auth.updateUser({ password }); setBusy(false); if (r.error) setError(r.error.message); else done(); }; return <main className="login-page"><section className="login-card"><Image className="login-emblem" src="/nexus-team-emblem.png" alt="" width={38} height={38} /><div className="login-plant"><Plant percent={100} /></div><h1>Welcome to NEXUS</h1><p className="sub">Choose your password to finish setting up your account.</p><form onSubmit={save}><PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" minLength={12} required />{error && <p className="form-error" role="alert">{error}</p>}<button className="primary" disabled={busy}>Save password<ChevronRight size={18} /></button></form></section></main>; }
function LeaderDashboard({ team, name, motion, message, tapPlant, update, allocate, colleges, history }: { team: Team; name: string; motion: PlantMotion | null; message: PlantMessage | null; tapPlant: () => void; update: () => void; allocate: () => void; colleges: () => void; history: () => void }) {
  const progress = percent(team);
  return <section className="page leader-page">
    <p className="greeting">Hello, {name.split(" ")[0]} <span>☀</span></p>
    <h1>Let’s help your plant grow.</h1><p className="page-intro">Small steps. Shared progress. A little closer every day.</p>
    <div className="garden-card">
      <div className="garden-heading"><div><p className="eyebrow">{team.name.toUpperCase()}</p><h2>{team.counts.confirmed} <small>of {team.target} confirmed</small></h2></div><b>Stage {stage(progress)}/5</b></div>
      <button className="plant-touch" type="button" aria-label={`Tap the plant, stage ${stage(progress)} of 5`} onClick={tapPlant}><Plant percent={progress} motion={motion?.kind} fromPercent={motion?.fromPercent} motionKey={motion?.id} /></button>
      {message && <p className="plant-message" role="status" key={message.id}>{message.text}</p>}
      <div className="percent-row"><strong>{pct(progress)}</strong><span>toward your target</span></div>
      <Progress value={progress} />
      <p className={`encourage ${motion ? "growth-encourage" : ""}`}>{motion?.kind === "grow" ? progress >= 100 ? "Your plant is blooming!" : "Look, your plant is growing!" : progress >= 100 ? "Your plant is in full bloom!" : "Every confirmed registration helps it grow."}</p>
      <p className="plant-tap-hint">Tap the plant for a little sway ✦</p>
    </div>
    <div className="counter-grid"><Counter color="peach" value={team.counts.interested} label="Interested" /><Counter color="yellow" value={team.counts.registered} label="Registered · unpaid" /><Counter color="sage" value={team.counts.confirmed} label="Confirmed · paid" /></div>
    <button className="primary entry-primary" onClick={update}><Edit3 size={18} />Update entries<ChevronRight size={18} /></button>
    <CollegeBreakdown colleges={team.collegeTotals} unallocated={team.unallocated} onAllocate={allocate} />
    <button className="link-row" onClick={colleges}><Building2 size={18} /><span>My assigned colleges</span><ChevronRight size={18} /></button>
    <button className="link-row" onClick={history}><FileText size={18} /><span>Saved entries & notes</span><ChevronRight size={18} /></button>
    <p className="hint">Last saved {team.updated ? new Date(team.updated).toLocaleString() : "not yet"}</p>
  </section>;
}
function AdminDashboard({ teams, entries, manage, view, history, create }: { teams: Team[]; entries: CountEntry[]; manage: () => void; view: (id: string) => void; history: () => void; create: () => void }) { const confirmed = teams.reduce((n, t) => n + t.counts.confirmed, 0), target = teams.reduce((n, t) => n + t.target, 0), progress = target ? confirmed / target * 100 : 0; return <section className="page"><p className="greeting">Admin overview <span>✦</span></p><h1>Every plant at a glance.</h1><div className="admin-hero"><div><p className="eyebrow">TOTAL CONFIRMED</p><h2>{confirmed}<small>{target ? ` / ${target}` : " confirmed"}</small></h2><Progress value={progress} /><p>{target ? `${pct(progress)} of the collective target` : "Create a team to set your first target."}</p></div><Plant percent={progress} compact /></div><div className="overview-metrics"><div><Users size={17} /><strong>{teams.length}</strong><span>{teams.length === 1 ? "Active team" : "Active teams"}</span></div><div><Building2 size={17} /><strong>{teams.reduce((total, t) => total + t.colleges.length, 0)}</strong><span>Assigned colleges</span></div><div><Check size={17} /><strong>{teams.filter(t => t.counts.confirmed >= t.target).length}</strong><span>Targets reached</span></div></div><div className="section-row"><h2>Team plants</h2><button onClick={manage}>Manage</button></div>{teams.length ? <div className="team-list">{teams.slice(0, 3).map(t => <button className="team-card clickable" aria-label={`View ${t.name} details`} key={t.id} onClick={() => view(t.id)}><Plant percent={percent(t)} compact /><div><h3>{t.name}</h3><p>{t.leader} · {pct(percent(t))} complete</p><Progress value={percent(t)} /></div><strong>{t.counts.confirmed}/{t.target}</strong></button>)}</div> : <div className="empty-card"><p>There are no teams yet. Create the first one to start growing.</p><button className="primary" onClick={create}><Plus size={18} />Create a team</button></div>}<div className="section-row"><h2>Recent entries</h2><button onClick={history}>View all</button></div>{entries.length ? <div className="entry-list">{entries.slice(0, 3).map(entry => <EntryCard key={entry.id} entry={entry} teamName={teams.find(t => t.id === entry.team_id)?.name ?? "Team"} />)}</div> : <div className="empty-card">No saved entries yet. Notes from team leaders will appear here.</div>}<p className="read-only"><Settings2 size={15} />Counts and notes are leader-reported and read-only for admins.</p></section>; }
function TeamsPage({ teams, create, view }: { teams: Team[]; create: () => void; view: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const visible = teams.filter(t => `${t.name} ${t.leader}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="page teams-page">
    <div className="title-row"><div><p className="eyebrow">YOUR PEOPLE, THEIR PROGRESS</p><h1>Manage teams</h1></div><button className="round-add" aria-label="Create team" onClick={create}><Plus /></button></div>
    <p className="page-intro">Open a team to see its people, colleges, and progress.</p>
    {teams.length > 0 && <><div className="search"><Search size={17} /><input aria-label="Search teams or leaders" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search teams or leaders" />{query && <button className="search-clear" aria-label="Clear team search" onClick={() => setQuery("")}><X size={16} /></button>}</div><p className="list-count" role="status">{visible.length} of {teams.length} {teams.length === 1 ? "team" : "teams"}</p></>}
    <div className="team-list">{visible.map(t => <button className="team-card clickable" key={t.id} aria-label={`View ${t.name} details`} onClick={() => view(t.id)}><Plant percent={percent(t)} compact /><div><h3>{t.name}</h3><p>{t.leader} · {t.colleges.length} {t.colleges.length === 1 ? "college" : "colleges"}</p><Progress value={percent(t)} /><span className="team-card-progress">{t.counts.confirmed} / {t.target} confirmed <b>{pct(percent(t))}</b></span></div><ChevronRight /></button>)}</div>
    {!visible.length && <div className="empty-card workflow-empty"><span className="detail-empty-icon"><Users size={25} /></span><h2>{teams.length ? "No teams found" : "A fresh start for your teams"}</h2><p>{teams.length ? "Try a different team or leader name." : "Create a team, set its target, and give its leader a place to grow."}</p><button className={teams.length ? "secondary-action" : "primary"} onClick={teams.length ? () => setQuery("") : create}>{teams.length ? "Clear search" : <><Plus size={17} />Create your first team</>}</button></div>}
  </section>;
}

function TeamWizard({ team, colleges, back, saved, deleted }: { team?: Team; colleges: College[]; back: () => void; saved: (id: string, login?: LeaderCredentials) => Promise<void>; deleted: () => Promise<void> }) {
  const [step, setStep] = useState(1), [name, setName] = useState(team?.name ?? ""), [leader, setLeader] = useState(team?.leader ?? ""), [target, setTarget] = useState(String(team?.target ?? 50)), [members, setMembers] = useState(team?.members.join(", ") ?? ""), [username, setUsername] = useState(team?.username ?? ""), [password, setPassword] = useState(""), [selected, setSelected] = useState<string[]>(team?.colleges.map(c => c.id) ?? []), [newCollege, setNewCollege] = useState(""), [savedId, setSavedId] = useState(team?.id ?? ""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false), [deleteError, setDeleteError] = useState("");
  const stepHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (step > 1) { window.scrollTo({ top: 0, behavior: "instant" }); stepHeading.current?.focus({ preventScroll: true }); } }, [step]);
  const selectedCollegeCount = selected.length + newCollege.split(",").filter(s => s.trim()).length;
  const available = colleges.filter(c => !c.team_id || c.team_id === savedId || c.team_id === team?.id);
  const next = () => { if (busy) return; setError(""); if (step === 1 && (!name.trim() || !leader.trim() || !Number.isInteger(Number(target)) || Number(target) < 1 || Number(target) > 2147483647)) { setError("Enter a team name, leader name, and positive whole-number target."); return; } if (step === 2 && !team?.leaderId && (!/^[a-z0-9_.-]{3,32}$/.test(username.trim().toLowerCase()) || password.length < 12)) { setError("Use a 3–32 character username and a password of at least 12 characters."); return; } if (step === 2 && team?.leaderId && password && password.length < 12) { setError("Use at least 12 characters for the new password, or leave it blank to keep the current one."); return; } setStep(step + 1); };
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
  return <section className="page form-page"><button aria-label="Go back" className="back" disabled={busy} onClick={step > 1 ? () => { setError(""); setStep(step - 1); } : back}><ArrowLeft size={20} /></button><p className="eyebrow">{team ? "EDIT TEAM" : "NEW TEAM"} · STEP {step} OF 3</p><h1 ref={stepHeading} tabIndex={-1}>{["Team details", "People & access", "Assign colleges"][step - 1]}</h1><p className="page-intro">{["Give the team a name and a target to work toward.", "Add the people behind the progress and their leader’s login.", "Choose the colleges this team will look after."][step - 1]}</p><div className="steps" aria-label={`Step ${step} of 3`}>{[1, 2, 3].map(n => <i className={n <= step ? "done" : ""} key={n} />)}</div><div className="step-labels" aria-hidden="true">{["Details", "People", "Colleges"].map((label, i) => <span className={step === i + 1 ? "current" : ""} key={label}>{label}</span>)}</div>
    <fieldset className="wizard-fields" disabled={busy} key={step}>
    {step === 1 && <><label className="field">Team name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Team Daisy" maxLength={120} /></label><label className="field">Leader name<input value={leader} onChange={e => setLeader(e.target.value)} placeholder="Full name" maxLength={120} disabled={Boolean(team?.leaderId)} /></label><label className="field">Registration target<input type="number" inputMode="numeric" min={1} max={2147483647} step={1} value={target} onChange={e => setTarget(e.target.value)} /></label></>}
    {step === 2 && <><label className="field">Leader username<input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" disabled={Boolean(team?.leaderId)} autoComplete="off" /></label><PasswordField className="field" label={team?.leaderId ? "New password (optional)" : "Temporary password"} value={password} onChange={setPassword} placeholder="At least 12 characters" autoComplete="new-password" /><p className="hint">{team?.leaderId ? "The current password cannot be viewed. Enter a new one to reset it and see it after saving." : "You can view the username and temporary password after creating the team."}</p><label className="field">Team members (optional, comma separated)<input value={members} onChange={e => setMembers(e.target.value)} placeholder="Member names" /></label></>}
    {step === 3 && <><div className="assignment"><Building2 /><div><h3>{selected.length ? `${selected.length} ${selected.length === 1 ? "college" : "colleges"} selected` : "Choose colleges"}</h3><p>Each college can belong to one team only.</p></div></div>{available.map(c => <label className="check" key={c.id}><input type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))} />{c.name}</label>)}{!available.length && <p className="hint">No unassigned colleges yet. Add one below.</p>}<label className="field">Add new colleges (comma separated)<input value={newCollege} onChange={e => setNewCollege(e.target.value)} placeholder="e.g. Riverdale College" /></label></>}
    </fieldset>
    {step === 3 && <div className="wizard-review"><p className="eyebrow">READY WHEN YOU ARE</p><strong>{name}</strong><span>{leader} · Target: {Number(target).toLocaleString("en-IN")}</span><span>{selectedCollegeCount} {selectedCollegeCount === 1 ? "college" : "colleges"} selected</span></div>}
    {error && <p className="form-error" role="alert">{error}</p>}<button className="primary bottom-action" disabled={busy} onClick={step < 3 ? next : () => void save()}>{busy ? "Saving…" : step < 3 ? "Continue" : team?.leaderId ? "Save team" : savedId ? "Finish team setup" : "Create team"}<ChevronRight size={18} /></button>
    {team && step === 1 && <button className="delete-team" type="button" onClick={() => { setDeleteError(""); setDeleteOpen(true); }}><Trash2 size={17} />Delete team</button>}
    {deleteOpen && team && <ModalFrame centered busy={busy} close={() => setDeleteOpen(false)}><section className="confirm-card" role="dialog" aria-modal="true" aria-labelledby="delete-team-title" onClick={e => e.stopPropagation()}><p className="eyebrow">REMOVE TEAM</p><h2 id="delete-team-title">Delete {team.name}?</h2><p>This permanently removes the team, its counts, saved entries and notes, and its leader login. Its colleges become unassigned.</p>{deleteError && <p className="form-error" role="alert">{deleteError}</p>}<button className="danger-action" disabled={busy} onClick={() => void remove()}><Trash2 size={17} />{busy ? "Deleting…" : "Delete team"}</button><button className="cancel-action" disabled={busy} onClick={() => setDeleteOpen(false)}>Keep team</button></section></ModalFrame>}
  </section>;
}

function CredentialsSheet({ credentials, close }: { credentials: LeaderCredentials; close: () => void }) {
  const [visible, setVisible] = useState(false), [copyState, setCopyState] = useState("");
  const copy = async () => {
    try { await navigator.clipboard.writeText(`NEXUS · ${credentials.teamName}\nUsername: ${credentials.username}\nPassword: ${credentials.password}`); setCopyState("Login details copied. Share them privately with the leader."); }
    catch { setCopyState("Copy is unavailable. You can reveal the password and copy it manually."); }
  };
  return <ModalFrame close={close} dismissible={false}><section onClick={e => e.stopPropagation()} className="sheet credentials-sheet" role="dialog" aria-modal="true" aria-labelledby="credentials-title">
    <i className="sheet-handle" /><span className="credential-ready"><Check size={22} /></span>
    <p className="eyebrow">{credentials.kind === "created" ? "LEADER ACCOUNT READY" : "PASSWORD UPDATED"}</p><h2 id="credentials-title">Login details for {credentials.teamName}</h2>
    <p className="sheet-note">Everything the leader needs to sign in. Keep these details somewhere private before closing.</p>
    <div className="credential-row"><span>Username</span><strong>{credentials.username}</strong></div>
    <div className="credential-row"><span>{credentials.kind === "created" ? "Temporary password" : "New password"}</span><div className="credential-secret"><code>{visible ? credentials.password : "••••••••••••"}</code><button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
    <p className="credential-warning">The password is shown only this once. You can reset it later by editing the team.</p>
    <button className="secondary-action credential-copy" onClick={() => void copy()}><Copy size={17} />Copy username & password</button>
    {copyState && <p className="credential-copy-status" role="status">{copyState}</p>}
    <button className="primary" onClick={close}>I’ve saved the details<Check size={17} /></button>
  </section></ModalFrame>;
}

function CollegesPage({ admin, team, teams, colleges, back, refresh, onNotice }: { admin: boolean; team?: Team; teams: Team[]; colleges: College[]; back: () => void; refresh: () => Promise<void>; onNotice: (message: string) => void }) {
  const [name, setName] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<College | null>(null), [editName, setEditName] = useState("");
  const [deleting, setDeleting] = useState<College | null>(null), [dialogError, setDialogError] = useState("");
  const [query, setQuery] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const visible = (admin ? colleges : team?.colleges ?? []).filter(c => (!unassignedOnly || !c.team_id) && c.name.toLowerCase().includes(query.trim().toLowerCase()));
  const closeDialog = () => { if (!busy) { setEditing(null); setDeleting(null); setDialogError(""); } };
  const create = async () => {
    if (!admin || !name.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const { error: saveError } = await supabase.from("colleges").insert({ name: name.trim(), team_id: null });
      if (saveError) throw saveError;
      setName(""); await refresh(); onNotice("College added");
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };
  const assign = async (id: string, teamId: string | null) => {
    if (!admin || busy) return;
    setBusy(true); setError("");
    try {
      const { error: saveError } = await supabase.from("colleges").update({ team_id: teamId }).eq("id", id);
      if (saveError) throw saveError;
      await refresh(); onNotice(teamId ? "College assignment saved" : "College is now unassigned");
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };
  const rename = async () => {
    if (!admin || !editing || busy) return;
    const nextName = editName.trim();
    if (!nextName || nextName.length > 160) { setDialogError("Enter a college name of up to 160 characters."); return; }
    if (nextName === editing.name) { closeDialog(); return; }
    setBusy(true); setDialogError("");
    try {
      const { data, error: saveError } = await supabase.from("colleges").update({ name: nextName }).eq("id", editing.id).select("id").maybeSingle();
      if (saveError) throw new Error(saveError.code === "23505" ? "A college with this name already exists." : saveError.message);
      if (!data) throw new Error("This college is no longer available. Refresh the page and try again.");
      await refresh(); setEditing(null); onNotice("College name updated");
    } catch (e) { setDialogError(errText(e)); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!admin || !deleting || busy) return;
    setBusy(true); setDialogError("");
    try {
      const [entryCheck, totalCheck] = await Promise.all([
        supabase.from("count_entries").select("id", { count: "exact", head: true }).eq("college_id", deleting.id),
        supabase.from("college_counts").select("college_id", { count: "exact", head: true }).eq("college_id", deleting.id),
      ]);
      if (entryCheck.error || totalCheck.error) throw new Error("Could not check this college's saved entries. Try again.");
      if ((entryCheck.count ?? 0) > 0 || (totalCheck.count ?? 0) > 0)
        throw new Error("This college has saved entries or totals and cannot be deleted. Its history will stay intact.");
      const { data, error: deleteError } = await supabase.from("colleges").delete().eq("id", deleting.id).select("id").maybeSingle();
      if (deleteError) throw new Error(deleteError.code === "23503" ? "This college has saved entries or totals and cannot be deleted." : deleteError.message);
      if (!data) throw new Error("This college is no longer available. Refresh the page and try again.");
      await refresh(); setDeleting(null); onNotice("College deleted");
    } catch (e) { setDialogError(errText(e)); }
    finally { setBusy(false); }
  };
  return <section className="page">
    <button aria-label="Go back" className="back" onClick={back}><ArrowLeft size={20} /></button>
    <p className="eyebrow">{admin ? "COLLEGE ASSIGNMENT" : "MY COLLEGES"}</p>
    <h1>{admin ? "Colleges by team" : "Your assigned colleges"}</h1>
    {!admin && team && <CollegeBreakdown colleges={team.collegeTotals} unallocated={team.unallocated} />}
    {admin && <div className="college-create"><input aria-label="New college name" value={name} onChange={e => setName(e.target.value)} placeholder="New college name" maxLength={160} disabled={busy} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void create(); } }} /><button className="add-college" disabled={busy || !name.trim()} onClick={() => void create()}><Plus size={17} />Add college</button></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {admin && colleges.length > 0 && <div className="college-tools"><div className="search"><Search size={17} /><input aria-label="Search colleges" placeholder="Find a college" value={query} onChange={e => setQuery(e.target.value)} />{query && <button className="search-clear" aria-label="Clear college search" onClick={() => setQuery("")}><X size={16} /></button>}</div><div className="filter-pills" aria-label="College assignments"><button aria-pressed={!unassignedOnly} onClick={() => setUnassignedOnly(false)}>All colleges <span>{colleges.length}</span></button><button aria-pressed={unassignedOnly} onClick={() => setUnassignedOnly(true)}>Unassigned <span>{colleges.filter(c => !c.team_id).length}</span></button></div></div>}
    <div className="college-list">{visible.map(c => <div className="college-card" key={c.id}>
      <b><Building2 size={20} /></b>
      <div><h3>{c.name}</h3>{admin ? <select aria-label={`Assign ${c.name}`} value={c.team_id ?? ""} disabled={busy} onChange={e => void assign(c.id, e.target.value || null)}><option value="">Unassigned</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select> : <p>Assigned to your team</p>}</div>
      {admin && <span className="college-actions"><button type="button" aria-label={`Edit ${c.name} name`} title="Edit name" disabled={busy} onClick={() => { setEditing(c); setEditName(c.name); setDialogError(""); }}><Edit3 size={16} /></button><button type="button" className="remove-college" aria-label={`Delete ${c.name}`} title="Delete college" disabled={busy} onClick={() => { setDeleting(c); setDialogError(""); }}><Trash2 size={16} /></button></span>}
    </div>)}</div>
    {!visible.length && <div className="empty-card workflow-empty"><span className="detail-empty-icon"><Building2 size={25} /></span><h2>{colleges.length && admin ? "No matching colleges" : "Room to grow"}</h2><p>{colleges.length && admin ? "Clear your search or choose All colleges." : admin ? "Add your first college above, then assign it to a team." : "Your admin will add your assigned colleges here."}</p>{admin && (query || unassignedOnly) && <button className="secondary-action" onClick={() => { setQuery(""); setUnassignedOnly(false); }}>Show all colleges</button>}</div>}
    <p className="hint">{admin ? "A college can be assigned to one team at a time." : "Need a change? Ask your admin to update assignments."}</p>
    {editing && <ModalFrame centered busy={busy} close={closeDialog}><section className="confirm-card" role="dialog" aria-modal="true" aria-labelledby="edit-college-title" onClick={e => e.stopPropagation()}><p className="eyebrow">COLLEGE DETAILS</p><h2 id="edit-college-title">Edit college name</h2><label className="field">College name<input value={editName} onChange={e => setEditName(e.target.value)} maxLength={160} autoFocus onKeyDown={e => { if (e.key === "Enter") void rename(); }} /></label>{dialogError && <p className="form-error" role="alert">{dialogError}</p>}<button className="primary" disabled={busy || !editName.trim()} onClick={() => void rename()}>{busy ? "Saving…" : "Save name"}</button><button className="cancel-action" disabled={busy} onClick={closeDialog}>Cancel</button></section></ModalFrame>}
    {deleting && <ModalFrame centered busy={busy} close={closeDialog}><section className="confirm-card" role="dialog" aria-modal="true" aria-labelledby="delete-college-title" onClick={e => e.stopPropagation()}><p className="eyebrow">REMOVE COLLEGE</p><h2 id="delete-college-title">Delete {deleting.name}?</h2><p>This permanently removes the college from the list and its team assignment. Colleges with saved entries or totals cannot be deleted, so their history stays intact.</p>{dialogError && <p className="form-error" role="alert">{dialogError}</p>}<button className="danger-action" disabled={busy} onClick={() => void remove()}><Trash2 size={17} />{busy ? "Deleting…" : "Delete college"}</button><button className="cancel-action" disabled={busy} onClick={closeDialog}>Keep college</button></section></ModalFrame>}
  </section>;
}
function ProfilePage({ profile, team, logout }: { profile: Profile; team?: Team; logout: () => void }) {
  return <section className="page profile"><p className="eyebrow">YOUR NEXUS ACCOUNT</p><div className="profile-avatar">{profile.display_name.slice(0, 2).toUpperCase()}</div><h1>{profile.display_name}</h1><p>{profile.role === "admin" ? "NEXUS administrator" : `${team?.name ?? "Team"} leader`}</p>
    <div className="profile-card"><div><span>Role</span><strong>{profile.role === "admin" ? "Administrator" : "Team leader"}</strong></div><div><span>Username</span><strong>{profile.username}</strong></div>{profile.role === "leader" && <><div><span>Team</span><strong>{team?.name ?? "Pending assignment"}</strong></div>{team && <div><span>Assigned colleges</span><strong>{team.colleges.length}</strong></div>}</>}</div>
    <div className="profile-access"><span><Settings2 size={17} />Your access</span><p>{profile.role === "admin" ? "Manage teams, leader accounts, and colleges. Follow every team’s progress and read their saved notes." : "Update your team’s college counts and add notes. Your administrator manages team details and college assignments."}</p></div>
    <button className="logout" onClick={logout}><LogOut size={18} />Log out</button><p className="profile-footer">NEXUS · Progress grows together.</p>
  </section>;
}
