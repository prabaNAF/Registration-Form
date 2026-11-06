import {COLLEGES,RULES_VERSION,COMPETITIONS,getCollege,type CollegeId,type AdminRegistration,type RegistrationRow,type Competition} from "./domain";
export function legacyCollege(name:unknown):CollegeId|null {
 if(typeof name!=="string")return null;
 const n=name.trim().toLowerCase().replace(/\s+/g," ");
 if(["srm university","srm institute of science and technology","srm institute of science and technology (srm)"].includes(n))return "srm";
 if(["vit university","vellore institute of technology","vellore institute of technology (vit)"].includes(n))return "vit";
 if(["adhiparashakthi agricultural college","adhiparashakthi agricultural college (aac)","adhiparaskthi agricultural and horticultural college","adhiparaskthi agricultural and horticultural college (aac)"].includes(n))return "aac";
 return null; // Retired Anna / Annamalai institutions remain historical; never relabel them as AAC.
}
export function adminRegistration(row:RegistrationRow):AdminRegistration {
 const {payload,request_key,...fields}=row;const d=JSON.parse(payload);
 const collegeId=getCollege(row.college_id)?.id||legacyCollege(d.university);
 const college=getCollege(collegeId);
 return {...fields,collegeId,legacy:!college||d.rulesVersion!==RULES_VERSION,details:{...d,collegeId,university:college?.name||d.university||null,facultyEmail:d.facultyEmail||"",members:(d.members||[]).map((m:Record<string,unknown>)=>({...m,degree:m.degree||""}))}};
}
export type CollegeFilter=CollegeId|"all"|"legacy";
export function filterRegistrations(rows:AdminRegistration[],filter:{college?:CollegeFilter;competition?:Competition|"all";status?:string;query?:string}){
 const q=(filter.query||"").trim().toLowerCase();return rows.filter(r=>(!filter.college||filter.college==="all"||(filter.college==="legacy"?!r.collegeId:r.collegeId===filter.college))&&(!filter.competition||filter.competition==="all"||r.competition===filter.competition)&&(!filter.status||r.status===filter.status)&&(!q||[r.id,r.details.university,r.details.teamName,r.topic,COMPETITIONS[r.competition].full,...r.details.members.flatMap(m=>[m.name,m.institution,m.department,m.degree,m.email,m.mobile])].some(v=>v?.toLowerCase().includes(q))));
}
export function collegeOverview(rows:AdminRegistration[]){return COLLEGES.map(c=>{const entries=rows.filter(r=>r.collegeId===c.id&&r.status==="confirmed");return {...c,registrations:entries.length,studentEntries:entries.reduce((n,r)=>n+r.details.members.length,0),essay:entries.filter(r=>r.competition==="essay").length,ppt:entries.filter(r=>r.competition==="ppt").length,poster:entries.filter(r=>r.competition==="poster").length};});}
export function competitionVenue(id:unknown){const c=getCollege(id);return c?`On campus at ${c.name}`:"Institution campus — review institution";}
