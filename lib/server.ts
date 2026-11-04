import {env} from "cloudflare:workers";
import {registrationOrigin} from "./public-cors";
import {getChatGPTUser} from "@/app/chatgpt-auth";
import {COLLEGES,COMPETITIONS,TOPICS,DEADLINE,normalizeSettings,type Availability,type CollegeId,type Competition} from "./domain";
import {EFFECTIVE_COLLEGE_SQL} from "./registration-sql";
export function database(){if(!env.DB)throw new Error("Registration database unavailable.");return env.DB;}
export function json(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff",...headers}});}
export function validOrigin(r:Request){const o=r.headers.get("origin");return r.headers.get("sec-fetch-site")!=="cross-site"&&(!o||o===new URL(r.url).origin||o===env.PUBLIC_SITE_URL);}
export async function body(r:Request,publicRegistration=false){if((!validOrigin(r)&&!(publicRegistration&&registrationOrigin(r)))||!r.headers.get("content-type")?.includes("application/json"))throw new Error("Use the registration portal.");if(Number(r.headers.get("content-length")||0)>32768)throw new Error("Request too large.");const value=await r.text();if(value.length>32768)throw new Error("Request too large.");return JSON.parse(value);}
export async function adminUser(){const u=await getChatGPTUser();const allowed=(env.ADMIN_EMAILS||"").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);return u&&allowed.includes(u.email.toLowerCase())?u:null;}
export async function availability():Promise<Availability>{
 const d=await database().prepare(`SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now') server_now,(SELECT value FROM settings WHERE key='config') config,
 (SELECT json_group_array(json_object('college',college,'competition',competition,'topic',topic,'count',n)) FROM
 (SELECT ${EFFECTIVE_COLLEGE_SQL} college,r.competition,r.topic,COUNT(*) n FROM registrations r WHERE r.status='confirmed' GROUP BY college,r.competition,r.topic)) counts`).first<{server_now:string;config:string|null;counts:string}>();
 if(!d)throw new Error("Database snapshot unavailable.");
 const settings=normalizeSettings(d.config?JSON.parse(d.config):null);const deadlinePassed=Date.parse(d.server_now)>=Date.parse(DEADLINE);
 const rows=JSON.parse(d.counts||"[]") as {college:CollegeId|null;competition:Competition;topic:string|null;count:number}[];
 const colleges={} as Availability['colleges'];const competitions={} as Availability['competitions'];
 for(const c of COLLEGES){const counts={} as Availability['competitions'];for(const key of Object.keys(COMPETITIONS) as Competition[]){const count=rows.filter(r=>r.college===c.id&&r.competition===key).reduce((n,r)=>n+r.count,0);const capacity=COMPETITIONS[key].capacity;const manual=!settings[`${key}Open`]||!settings.colleges[c.id].open||!settings.colleges[c.id][`${key}Open`];const reason=deadlinePassed?'deadline':manual?'manual':count>=capacity?'full':null;counts[key]={count,capacity,remaining:Math.max(0,capacity-count),open:reason===null,reason};}colleges[c.id]={collegeId:c.id,competitions:counts,topics:TOPICS.map(name=>{const count=rows.find(r=>r.college===c.id&&r.competition==='ppt'&&r.topic===name)?.count||0;return {name,count,remaining:Math.max(0,3-count)};}),open:!deadlinePassed&&settings.colleges[c.id].open};}
 for(const key of Object.keys(COMPETITIONS) as Competition[]){const count=COLLEGES.reduce((n,c)=>n+colleges[c.id].competitions[key].count,0);const capacity=COMPETITIONS[key].capacity*3;competitions[key]={count,capacity,remaining:COLLEGES.reduce((n,c)=>n+colleges[c.id].competitions[key].remaining,0),open:COLLEGES.some(c=>colleges[c.id].competitions[key].open),reason:deadlinePassed?'deadline':null};}
 return {settings,serverNow:d.server_now,deadline:DEADLINE,deadlinePassed,colleges,competitions};
}
