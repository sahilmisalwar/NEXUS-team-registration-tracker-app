"use client";

import { useId } from "react";
import { ModalFrame } from "./ModalFrame";
import { Building2, Check, ChevronRight, LoaderCircle, Minus, Plus, X } from "lucide-react";

export type Counts = { interested: number; registered: number; confirmed: number };
type CollegeOption = { id: string; name: string };

type Props = {
  team: { name: string; colleges: CollegeOption[]; unallocated: Counts };
  mode: "update" | "allocation";
  draft: Counts;
  setDraft: (counts: Counts) => void;
  collegeId: string;
  setCollegeId: (id: string) => void;
  note: string;
  setNote: (note: string) => void;
  error: string;
  close: () => void;
  save: () => void;
  busy: boolean;
};

export function UpdateSheet({ team, mode, draft, setDraft, collegeId, setCollegeId, note, setNote, error, close, save, busy }: Props) {
  const titleId = useId();
  const rows: [keyof Counts, string, string, string][] = [
    ["interested", "Interested", "Considering joining", "peach"],
    ["registered", "Registered", "Signed up, unpaid", "yellow"],
    ["confirmed", "Confirmed", "Paid & confirmed", "sage"],
  ];
  const change = (key: keyof Counts, value: number) => setDraft({ ...draft, [key]: Math.min(2147483647, Math.max(0, Math.floor(value || 0))) });

  return <ModalFrame close={close} busy={busy}>
    <section tabIndex={-1} className="sheet update-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy}>
      <i className="sheet-handle" />
      <div className="sheet-title"><div><p className="eyebrow">{team.name.toUpperCase()}</p><h2 id={titleId}>{mode === "allocation" ? "Assign earlier totals" : "A little more progress."}</h2></div><button type="button" aria-label="Close update entries" disabled={busy} onClick={close}><X size={20} /></button></div>
      <p className="sheet-note">{mode === "allocation" ? "If you know which college earned earlier registrations, assign those existing totals here. The team total will stay the same." : "Choose a college, then update its counts. The team totals adjust automatically when you save."}</p>
      <form onSubmit={event => { event.preventDefault(); save(); }}>
        <label className="entry-field"><span><Building2 size={16} />College <b>Required</b></span><select required value={collegeId} onChange={event => setCollegeId(event.target.value)} disabled={busy || !team.colleges.length}><option value="">Choose an assigned college</option>{team.colleges.map(college => <option key={college.id} value={college.id}>{college.name}</option>)}</select></label>
        {!team.colleges.length && <p className="entry-help">Ask your admin to assign a college before saving an entry.</p>}
        {mode === "allocation" ? <p className="entry-help entry-legacy-note">Still awaiting a college: {team.unallocated.interested} interested · {team.unallocated.registered} registered unpaid · {team.unallocated.confirmed} confirmed paid. Increase the selected college totals by no more than these amounts.</p> : Object.values(team.unallocated).some(value => value > 0) && <p className="entry-help entry-legacy-note">Earlier team totals remain separate because their colleges cannot be verified. The totals below start with entries tracked for this college.</p>}
        <p className="entry-section-label">{collegeId ? mode === "allocation" ? "College totals after assigning earlier counts" : "Selected college totals after this update" : "Choose a college to see its totals"}</p>
        <div className="entry-counter-stack">{rows.map(([key, label, subtitle, color]) => <div className={`update-row update-row-${color}`} key={key}><i className={`dot ${color}`} /><div><strong>{label}</strong><small>{subtitle}</small></div><div className="adjust"><button type="button" aria-label={`Decrease ${label}`} disabled={busy || !collegeId || draft[key] <= 0} onClick={() => change(key, draft[key] - 1)}><Minus size={16} /></button><input aria-label={`${label} college total`} type="number" inputMode="numeric" min="0" max="2147483647" step="1" value={draft[key]} disabled={busy || !collegeId} onChange={event => change(key, Number(event.target.value))} /><button type="button" aria-label={`Increase ${label}`} disabled={busy || !collegeId || draft[key] >= 2147483647} onClick={() => change(key, draft[key] + 1)}><Plus size={16} /></button></div></div>)}</div>
        <label className="entry-field entry-note-field"><span>Note <b>Optional</b></span><textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} rows={3} placeholder="Add context about today’s entry…" disabled={busy} /></label>
        <div className="entry-note-meta"><p className="entry-help">Your admin can read this note with the saved entry.</p><span>{note.length}/1,000</span></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="entry-save-footer"><button className="primary" type="submit" disabled={busy || !collegeId || !team.colleges.length}>{busy ? <LoaderCircle size={18} className="detail-spinner" /> : <Check size={18} />}{busy ? "Saving your progress…" : mode === "allocation" ? "Assign totals" : "Save entry"}{!busy && <ChevronRight size={18} />}</button><span>Every small step counts.</span></div>
      </form>
    </section>
  </ModalFrame>;
}
