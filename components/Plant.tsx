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

const stageNames = ["", "A new beginning", "Taking root", "Growing strong", "Almost in bloom", "In full bloom"];
const seedlingLeaves = [
  { d: "M120 168 C108 168 99 157 98 147 C112 148 120 156 120 168Z", vein: "M118 165 Q108 153 101 150", ribs: "M110 156 L109 151 M113 160 L106 158" },
  { d: "M121 162 C132 162 141 152 144 142 C132 143 122 150 121 162Z", vein: "M124 159 Q133 148 141 145", ribs: "M132 151 L133 146 M128 155 L136 153" },
];
const leaves = [
  { d: "M120 171 C101 174 84 158 80 142 C102 142 117 152 120 171Z", vein: "M116 168 Q101 151 85 146", ribs: "M101 154 L98 146 M108 161 L96 159 M94 150 L93 145" },
  { d: "M122 163 C141 165 159 149 164 132 C142 133 126 144 122 163Z", vein: "M126 160 Q142 142 159 136", ribs: "M140 146 L144 137 M133 153 L145 150 M151 139 L153 135" },
  { d: "M120 140 C99 139 88 124 86 106 C108 109 120 121 120 140Z", vein: "M117 135 Q104 117 91 110", ribs: "M106 122 L106 113 M111 129 L100 126 M98 116 L98 111" },
  { d: "M121 128 C142 129 159 113 166 94 C143 96 126 108 121 128Z", vein: "M125 124 Q144 104 160 99", ribs: "M141 109 L145 100 M133 117 L146 113 M153 102 L156 97" },
];
const stemPaths = ["", "M120 181 C119 171 122 160 120 151", "M120 181 C117 162 126 145 122 127", "M120 181 C117 160 124 139 120 110", "M120 181 C116 155 126 130 120 88", "M120 181 C116 155 126 130 120 88"];
const stemLengths = [0, 30, 54, 72, 94, 94];

export function Plant({ percent, compact = false, motion, fromPercent, motionKey = 0 }: PlantProps) {
  const s = stage(percent);
  const fromStage = stage(fromPercent ?? percent);
  const id = useId().replace(/:/g, "");
  const stemStart = motion === "grow" ? s > fromStage ? Math.max(8, Math.round(100 * (1 - stemLengths[fromStage] / stemLengths[s]))) : 12 : 0;
  const leafCount = s >= 3 ? 4 : 2;
  const previousLeafCount = fromStage >= 3 ? 4 : 2;
  const classes = ["plant botanical-plant", compact && "plant-small", s === 5 && "is-blooming", motion === "grow" && "plant-growing", motion === "nudge" && "plant-nudging"].filter(Boolean).join(" ");

  return <div className={classes} role="img" aria-label={`${stageNames[s]}. Plant growth stage ${s} of 5.`}>
    <svg viewBox="0 0 240 220" fill="none" aria-hidden="true" key={`${s}-${motionKey}`} className="plant-art">
      <defs>
        <linearGradient id={`leaf-${id}`} x1="87" y1="106" x2="155" y2="171" gradientUnits="userSpaceOnUse"><stop stopColor="#C0D5AE" /><stop offset=".46" stopColor="#8CAE87" /><stop offset="1" stopColor="#527D62" /></linearGradient>
        <linearGradient id={`leaf-light-${id}`} x1="155" y1="96" x2="116" y2="166" gradientUnits="userSpaceOnUse"><stop stopColor="#BCD2A9" /><stop offset=".6" stopColor="#7CA27C" /><stop offset="1" stopColor="#456F57" /></linearGradient>
        <linearGradient id={`stem-${id}`} x1="116" y1="90" x2="124" y2="182" gradientUnits="userSpaceOnUse"><stop stopColor="#8DAB7C" /><stop offset="1" stopColor="#52765B" /></linearGradient>
        <radialGradient id={`petal-${id}`} cx=".45" cy=".15" r=".9"><stop stopColor="#FFF5E9" /><stop offset=".55" stopColor="#F1C8B5" /><stop offset="1" stopColor="#D99A86" /></radialGradient>
        <linearGradient id={`soil-${id}`} x1="120" y1="179" x2="120" y2="205" gradientUnits="userSpaceOnUse"><stop stopColor="#BA9D81" /><stop offset="1" stopColor="#947B67" /></linearGradient>
        <radialGradient id={`sun-${id}`}><stop stopColor="#FFFAED" stopOpacity=".95" /><stop offset=".7" stopColor="#F7F3DF" stopOpacity=".5" /><stop offset="1" stopColor="#F8F3E9" stopOpacity="0" /></radialGradient>
        <radialGradient id={`heart-${id}`}><stop stopColor="#F9E6B5" /><stop offset="1" stopColor="#D9B578" /></radialGradient>
      </defs>
      <circle className="plant-halo" cx="120" cy="105" r="94" fill={`url(#sun-${id})`} />
      <g className="plant-orbit" stroke="#A6B99A" strokeWidth=".65" opacity=".35"><path d="M56 155 A79 79 0 1 1 185 154" /><path d="M63 164 A87 87 0 0 1 49 145 M179 165 A87 87 0 0 0 191 145" /></g>
      <g className="plant-small-details" fill="#C9A677"><circle cx="51" cy="101" r="1.6" opacity=".7" /><circle cx="190" cy="122" r="1.5" opacity=".6" /><path d="M175 64 v6 M172 67 h6" stroke="#C9A677" strokeWidth=".8" strokeLinecap="round" opacity=".65" /><circle cx="77" cy="67" r="1" opacity=".5" /></g>
      <ellipse className="plant-ground-shadow" cx="120" cy="200" rx="65" ry="8" fill="#6F8B65" opacity=".12" />
      <path d="M57 193 C79 180 102 179 120 180 C145 180 169 185 184 194 C159 203 80 204 57 193Z" fill="#B0C3A0" opacity=".6" />
      <path className="plant-soil" d="M83 185 C95 179 106 178 120 178 C137 178 151 180 159 186 C157 197 143 203 120 203 C98 203 85 196 83 185Z" fill={`url(#soil-${id})`} />
      <ellipse cx="121" cy="185" rx="37" ry="7" fill="#C7B297" />
      <path d="M86 189 C103 196 140 197 155 189" stroke="#E0C9AC" strokeWidth="1.1" strokeLinecap="round" opacity=".7" />
      <g className="plant-growth-body">
        <path d={stemPaths[s]} pathLength={100} stroke={`url(#stem-${id})`} strokeWidth="4.4" strokeLinecap="round" className="plant-stem" style={{ "--stem-start": stemStart } as CSSProperties} />
        {(s === 1 ? seedlingLeaves : leaves.slice(0, leafCount)).map((leaf, i) => {
          const isNew = motion === "grow" && (s <= 2 && fromStage < s || i >= previousLeafCount);
          return <g className={`plant-leaf ${isNew ? "plant-leaf-new" : ""}`} key={i} style={{ animationDelay: `${320 + i * 125}ms` }}>
            <path d={leaf.d} fill={`url(#${i % 2 ? "leaf-light" : "leaf"}-${id})`} stroke="#5B8063" strokeOpacity=".5" strokeWidth=".7" strokeLinejoin="round" />
            <path d={leaf.vein} stroke="#E1EBD0" strokeWidth="1.05" strokeLinecap="round" opacity=".8" />
            <path className="plant-leaf-detail" d={leaf.ribs} stroke="#E1EBD0" strokeWidth=".55" strokeLinecap="round" opacity=".5" />
          </g>;
        })}
        {s >= 4 && <g className={`plant-flower ${motion === "grow" && fromStage < 4 ? "plant-flower-new" : ""}`}>
          <path d="M120 96 C111 94 106 86 107 81 C114 82 119 85 120 91 C122 85 128 81 134 82 C132 91 127 95 120 96Z" fill="#6E926B" />
          {s === 4 ? <><path d="M120 91 C108 86 108 72 120 64 C132 72 132 86 120 91Z" fill={`url(#petal-${id})`} stroke="#C89882" strokeWidth=".7" /><path d="M120 87 C116 80 117 72 120 68" stroke="#FFF4E7" strokeWidth="1.1" strokeLinecap="round" opacity=".8" /></> : <g transform="translate(120 76)">
            {Array.from({ length: 8 }, (_, i) => <g transform={`rotate(${i * 45 + 22.5})`} key={i}><g className="plant-petal" style={{ animationDelay: `${520 + i * 65}ms` }}><path d="M0 4 C-10 -3 -16 -21 -9 -29 C-2 -37 9 -29 11 -20 C14 -9 7 1 0 4Z" fill={`url(#petal-${id})`} stroke="#D9AC97" strokeWidth=".65" /><path d="M0 -3 Q-1 -15 -5 -26" stroke="#FFFAEE" strokeWidth=".9" opacity=".65" /></g></g>)}
            {Array.from({ length: 6 }, (_, i) => <g transform={`rotate(${i * 60})`} key={i}><g className="plant-petal plant-petal-inner" style={{ animationDelay: `${850 + i * 55}ms` }}><path d="M0 3 C-9 -1 -11 -14 -5 -20 C1 -25 9 -18 8 -10 C8 -3 3 1 0 3Z" fill="#F6D9C5" stroke="#E8BCA4" strokeWidth=".55" /></g></g>)}
            <g className="plant-flower-center"><circle r="10.5" fill={`url(#heart-${id})`} stroke="#D4AE70" strokeWidth=".7" />{Array.from({ length: 9 }, (_, i) => <circle key={i} cx={Math.cos(i * Math.PI * 2 / 9) * 6} cy={Math.sin(i * Math.PI * 2 / 9) * 6} r="1" fill="#B9975F" opacity=".75" />)}<circle r="3" fill="#F5DCA5" /></g>
          </g>}
        </g>}
        {s < 4 && <path d={`M120 ${s === 1 ? 153 : s === 2 ? 130 : 113} q-5 -7 0 -11 q6 5 0 11Z`} fill="#93B185" />}
      </g>
      <g className="plant-small-details" stroke="#7D9B73" strokeWidth="1.3" strokeLinecap="round"><path d="M64 194 q-2 -6 -6 -8 M65 194 q3 -5 7 -6 M174 195 q1 -7 5 -10 M174 195 q-4 -4 -6 -4" /></g>
      <ellipse cx="91" cy="184" rx="2.5" ry="1.2" fill="#DFCEB3" opacity=".7" /><ellipse cx="144" cy="186" rx="3.5" ry="1.2" fill="#DFCEB3" opacity=".7" />
    </svg>
    {motion === "grow" && <span key={`dew-${motionKey}`} className="growth-dew" aria-hidden="true"><i /><i /><i /></span>}
    {motion && <span key={`sparkles-${motionKey}`} className="growth-sparkles" aria-hidden="true"><i>✦</i><i>✦</i><i>✦</i><i>✦</i><i>✦</i></span>}
    {s === 5 && motion === "grow" && <span key={`petals-${motionKey}`} className="falling-petals botanical-petals" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</span>}
  </div>;
}
