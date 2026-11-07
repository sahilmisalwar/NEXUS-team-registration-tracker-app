"use client";

import { useId, type CSSProperties } from "react";

export const stage = (percent: number) => percent >= 100 ? 5 : percent >= 75 ? 4 : percent >= 50 ? 3 : percent >= 25 ? 2 : 1;

type PlantProps = {
  percent: number;
  compact?: boolean;
  motion?: "grow" | "nudge";
  fromPercent?: number;
  motionKey?: number;
};

const leaves = [
  { d: "M120 170 C99 169 88 156 83 145 C101 143 116 150 120 170Z", vein: "M117 166 Q102 154 87 148" },
  { d: "M121 165 C139 163 151 151 155 138 C137 139 124 147 121 165Z", vein: "M125 161 Q138 149 151 143" },
  { d: "M119 141 C100 140 89 125 88 111 C105 114 117 122 119 141Z", vein: "M116 136 Q105 124 92 116" },
  { d: "M121 132 C141 131 155 116 159 101 C139 105 125 113 121 132Z", vein: "M125 127 Q140 113 154 106" },
];
const stemPaths = [
  "",
  "M120 181 C120 171 120 162 119 153",
  "M120 181 C119 163 123 146 120 131",
  "M120 181 C118 159 124 137 119 113",
  "M120 181 C116 153 126 130 120 90",
  "M120 181 C116 153 126 130 120 90",
];
const stemLengths = [0, 28, 50, 72, 94, 94];

export function Plant({ percent, compact = false, motion, fromPercent, motionKey = 0 }: PlantProps) {
  const s = stage(percent);
  const fromStage = stage(fromPercent ?? percent);
  const id = useId().replace(/:/g, "");
  const stemStart = motion === "grow"
    ? s > fromStage ? Math.max(8, Math.round(100 * (1 - stemLengths[fromStage] / stemLengths[s]))) : 12
    : 0;
  const leafCount = s >= 3 ? 4 : 2;
  const previousLeafCount = fromStage >= 3 ? 4 : 2;
  const classes = ["plant", compact && "plant-small", s === 5 && "is-blooming", motion === "grow" && "plant-growing", motion === "nudge" && "plant-nudging"].filter(Boolean).join(" ");

  return <div className={classes} role="img" aria-label={`Plant growth stage ${s} of 5`}>
    <svg viewBox="0 0 240 220" fill="none" aria-hidden="true" key={`${s}-${motionKey}`} className="plant-art">
      <defs>
        <linearGradient id={`leaf-${id}`} x1="84" y1="110" x2="158" y2="172" gradientUnits="userSpaceOnUse"><stop stopColor="#B9D6AC" /><stop offset=".48" stopColor="#83AD83" /><stop offset="1" stopColor="#4F7E60" /></linearGradient>
        <linearGradient id={`petal-${id}`} x1="103" y1="55" x2="142" y2="95" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF0E4" /><stop offset=".55" stopColor="#F9C6AD" /><stop offset="1" stopColor="#E99D89" /></linearGradient>
        <linearGradient id={`soil-${id}`} x1="120" y1="177" x2="120" y2="208" gradientUnits="userSpaceOnUse"><stop stopColor="#C4A68B" /><stop offset="1" stopColor="#917A69" /></linearGradient>
        <radialGradient id={`sun-${id}`}><stop stopColor="#FFF9E8" stopOpacity=".82" /><stop offset="1" stopColor="#F8F3E9" stopOpacity=".14" /></radialGradient>
      </defs>
      <circle className="plant-halo" cx="120" cy="105" r="87" fill={`url(#sun-${id})`} />
      <circle cx="120" cy="105" r="69" stroke="#F9FBF5" strokeWidth="1.5" strokeDasharray="3 9" opacity=".8" />
      <circle cx="65" cy="102" r="2" fill="#F6CCA9" opacity=".8" /><circle cx="179" cy="125" r="2" fill="#F6CCA9" opacity=".8" />
      <path d="M49 197 C68 184 91 180 119 180 C150 180 177 185 194 198 C166 209 74 209 49 197Z" fill="#8BAF83" opacity=".48" />
      <path className="plant-soil" d="M78 187 C91 178 104 177 120 178 C141 176 153 180 163 189 C160 202 146 209 120 209 C94 209 81 202 78 187Z" fill={`url(#soil-${id})`} />
      <path d="M80 188 C103 195 140 195 161 188" stroke="#D0B6A0" strokeWidth="2" strokeLinecap="round" opacity=".7" />
      <g className="plant-growth-body">
        <path d={stemPaths[s]} pathLength={100} stroke="#4E785C" strokeWidth="5" strokeLinecap="round" className="plant-stem" style={{ "--stem-start": stemStart } as CSSProperties} />
        <path d="M120 173 C112 166 106 157 106 151" stroke="#A8C9A0" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
        {leaves.slice(0, leafCount).map((leaf, i) => {
          const isNew = motion === "grow" && (s <= 2 && fromStage < s || i >= previousLeafCount);
          return <g className={`plant-leaf ${isNew ? "plant-leaf-new" : ""}`} key={i} style={{ animationDelay: `${350 + i * 125}ms` }}>
            <path d={s === 1 ? i === 0 ? "M119 167 C108 164 101 156 99 148 C110 150 117 157 119 167Z" : "M120 164 C130 162 138 155 141 147 C130 149 123 155 120 164Z" : leaf.d} fill={`url(#leaf-${id})`} stroke="#4E785C" strokeWidth="1.2" strokeLinejoin="round" />
            <path d={leaf.vein} stroke="#E6F0D9" strokeWidth="1.3" strokeLinecap="round" opacity=".76" />
          </g>;
        })}
        {s >= 4 && <g className={`plant-flower ${motion === "grow" && fromStage < 4 ? "plant-flower-new" : ""}`}>
          <path d="M120 96 C108 87 111 76 120 70 C129 76 132 87 120 96Z" fill={s === 5 ? "#698D65" : `url(#petal-${id})`} stroke="#B78276" strokeWidth="1.3" />
          {s === 5 && <g transform="translate(120 77)">
            {Array.from({ length: 8 }, (_, i) => <g transform={`rotate(${i * 45})`} key={i}><g className="plant-petal" style={{ animationDelay: `${550 + i * 85}ms` }}><ellipse cy="-17" rx="9.5" ry="19" fill={`url(#petal-${id})`} stroke="#D79585" strokeWidth=".9" /><ellipse cy="-22" rx="3" ry="8" fill="#FFF5E9" opacity=".32" /></g></g>)}
            <circle className="plant-flower-center" r="13" fill="#F7DFA9" stroke="#DBB96C" strokeWidth="1.5" /><circle r="5" fill="#E6B46F" />
            {[-7, 0, 7].map(x => <circle cx={x} cy="-3" r="1" fill="#C38D53" key={x} />)}
          </g>}
        </g>}
        {s < 4 && <circle cx="120" cy={s === 1 ? 152 : s === 2 ? 130 : 112} r="4" fill="#8CB280" />}
      </g>
      <path d="M58 197 l-4 -7 M68 200 l-3 -5 M182 198 l4 -8" stroke="#769C73" strokeWidth="2" strokeLinecap="round" />
    </svg>
    {motion === "grow" && <span className="growth-dew" aria-hidden="true"><i /><i /><i /></span>}
    {motion && <span className="growth-sparkles" aria-hidden="true"><i>✦</i><i>✦</i><i>✦</i><i>✦</i><i>✦</i></span>}
    {s === 5 && motion === "grow" && <span className="falling-petals" aria-hidden="true"><i>✦</i><i>❀</i><i>✦</i><i>❀</i><i>✦</i></span>}
  </div>;
}
