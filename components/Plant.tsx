"use client";
import { useId } from "react";
export const stage=(n:number)=>n>=100?5:n>=75?4:n>=50?3:n>=25?2:1;
export function Plant({percent,compact=false}:{percent:number;compact?:boolean}){
 const s=stage(percent), id=useId().replace(/:/g,"");
 const leaves=[
  {d:"M120 170 C99 169 88 156 83 145 C101 143 116 150 120 170Z",vein:"M117 166 Q102 154 87 148"},
  {d:"M121 165 C139 163 151 151 155 138 C137 139 124 147 121 165Z",vein:"M125 161 Q138 149 151 143"},
  {d:"M119 141 C100 140 89 125 88 111 C105 114 117 122 119 141Z",vein:"M116 136 Q105 124 92 116"},
  {d:"M121 132 C141 131 155 116 159 101 C139 105 125 113 121 132Z",vein:"M125 127 Q140 113 154 106"},
 ];
 return <div className={`plant ${compact?"plant-small":""} ${s===5?"is-blooming":""}`} role="img" aria-label={`Plant growth stage ${s} of 5`}>
  <svg viewBox="0 0 240 220" fill="none" aria-hidden="true" key={s} className="plant-art">
   <defs>
    <linearGradient id={`leaf-${id}`} x1="84" y1="110" x2="158" y2="172" gradientUnits="userSpaceOnUse"><stop stopColor="#A8CBA2"/><stop offset="1" stopColor="#5D8A67"/></linearGradient>
    <linearGradient id={`petal-${id}`} x1="103" y1="55" x2="142" y2="95" gradientUnits="userSpaceOnUse"><stop stopColor="#FFE8DB"/><stop offset=".58" stopColor="#F6BBA5"/><stop offset="1" stopColor="#E69382"/></linearGradient>
    <linearGradient id={`soil-${id}`} x1="120" y1="177" x2="120" y2="208" gradientUnits="userSpaceOnUse"><stop stopColor="#B69A80"/><stop offset="1" stopColor="#917A69"/></linearGradient>
   </defs>
   <circle cx="120" cy="105" r="87" fill="#F8F3E9" opacity=".47"/>
   <circle cx="120" cy="105" r="69" stroke="#F9FBF5" strokeWidth="1.5" strokeDasharray="3 9" opacity=".8"/>
   <path d="M49 197 C68 184 91 180 119 180 C150 180 177 185 194 198 C166 209 74 209 49 197Z" fill="#8BAF83" opacity=".48"/>
   <path d="M78 187 C91 178 104 177 120 178 C141 176 153 180 163 189 C160 202 146 209 120 209 C94 209 81 202 78 187Z" fill={`url(#soil-${id})`}/>
   <path d="M80 188 C103 195 140 195 161 188" stroke="#D0B6A0" strokeWidth="2" strokeLinecap="round" opacity=".7"/>
   <path d={s===1?"M120 181 C120 171 120 162 119 153":s===2?"M120 181 C119 163 123 146 120 131":s===3?"M120 181 C118 159 124 137 119 113":"M120 181 C116 153 126 130 120 90"} stroke="#4E785C" strokeWidth="5" strokeLinecap="round" className="plant-stem"/>
   <path d="M120 173 C112 166 106 157 106 151" stroke="#A8C9A0" strokeWidth="1.4" strokeLinecap="round" opacity=".8"/>
   {leaves.slice(0,s===1?2:s===2?2:4).map((leaf,i)=><g className="plant-leaf" key={i} style={{animationDelay:`${i*90}ms`}}><path d={s===1?(i===0?"M119 167 C108 164 101 156 99 148 C110 150 117 157 119 167Z":"M120 164 C130 162 138 155 141 147 C130 149 123 155 120 164Z"):leaf.d} fill={`url(#leaf-${id})`} stroke="#4E785C" strokeWidth="1.2" strokeLinejoin="round"/><path d={leaf.vein} stroke="#D7E8C9" strokeWidth="1.3" strokeLinecap="round" opacity=".7"/></g>)}
   {s>=4&&<g className="plant-flower"><path d="M120 96 C108 87 111 76 120 70 C129 76 132 87 120 96Z" fill={s===5?"#698D65":`url(#petal-${id})`} stroke="#B78276" strokeWidth="1.3"/>{s===5&&<g transform="translate(120 77)">{Array.from({length:8},(_,i)=><g transform={`rotate(${i*45})`} key={i}><ellipse cy="-17" rx="9.5" ry="19" fill={`url(#petal-${id})`} stroke="#D79585" strokeWidth=".9"/></g>)}<circle r="13" fill="#F7DFA9" stroke="#DBB96C" strokeWidth="1.5"/><circle r="5" fill="#E6B46F"/>{[-7,0,7].map(x=><circle cx={x} cy="-3" r="1" fill="#C38D53" key={x}/>)}</g>}</g>}
   {s<4&&<circle cx="120" cy={s===1?152:s===2?130:112} r="4" fill="#8CB280"/>}
   <path d="M58 197 l-4 -7 M68 200 l-3 -5 M182 198 l4 -8" stroke="#769C73" strokeWidth="2" strokeLinecap="round"/>
   <circle cx="65" cy="102" r="2" fill="#F6CCA9" opacity=".8"/><circle cx="179" cy="125" r="2" fill="#F6CCA9" opacity=".8"/>
  </svg>
  {s===5&&<span className="falling-petals" aria-hidden="true"><i>✦</i><i>❀</i><i>✦</i><i>❀</i><i>✦</i></span>}
 </div>
}
