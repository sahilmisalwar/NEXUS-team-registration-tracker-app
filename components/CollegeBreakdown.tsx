"use client";

import { Building2 } from "lucide-react";
import type { Counts } from "@/components/UpdateEntriesSheet";

export type CollegeTotal = { id: string; name: string; assigned: boolean; counts: Counts };

function Totals({ counts }: { counts: Counts }) {
  return <div className="college-totals-grid">
    <div><strong>{counts.interested}</strong><span>Interested</span></div>
    <div><strong>{counts.registered}</strong><span>Registered · unpaid</span></div>
    <div><strong>{counts.confirmed}</strong><span>Confirmed · paid</span></div>
  </div>;
}

export function CollegeBreakdown({ colleges, unallocated, onAllocate }: { colleges: CollegeTotal[]; unallocated: Counts; onAllocate?: () => void }) {
  const hasUnallocated = Object.values(unallocated).some(value => value > 0);
  return <section className="college-breakdown" aria-label="College totals">
    <div className="college-breakdown-heading"><Building2 size={18} /><h2>College totals</h2></div>
    <p className="college-breakdown-intro">Counts recorded for each college since college tracking began.</p>
    {colleges.length ? colleges.map(college => <div className="college-totals-row" key={college.id}>
      <div className="college-totals-name"><strong>{college.name}</strong>{!college.assigned && <span>Previously assigned</span>}</div>
      <Totals counts={college.counts} />
    </div>) : <p className="college-breakdown-empty">No colleges have been assigned yet.</p>}
    {hasUnallocated && <div className="college-unallocated">
      <div className="college-totals-name"><strong>Earlier team totals</strong><span>College not verified</span></div>
      <Totals counts={unallocated} />
      <p>These totals were saved before reliable college tracking. They remain in the team total, but cannot be assigned to a college from the old entries.</p>
      {onAllocate && colleges.some(college => college.assigned) && <button className="college-allocate" type="button" onClick={onAllocate}>Assign earlier totals</button>}
    </div>}
  </section>;
}
