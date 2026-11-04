import {CLOSED_MESSAGE,COMPETITIONS,DEFAULT_SETTINGS,RULES_VERSION,getCollege,registrationSchema,type CollegeId,type Confirmation,type RegistrationRow} from "./domain";
import {ATOMIC_REGISTER_SQL} from "./registration-sql";
import {availability,body,database,json} from "./server";
import {verifyContext} from "./registration-context";

function confirmation(row:RegistrationRow):Confirmation{const c=getCollege(row.college_id)!;return {id:row.id,collegeId:c.id,collegeName:c.name,competition:row.competition,topic:row.topic,createdAt:row.created_at,status:row.status};}
export async function submitRegistration(request:Request,id:CollegeId){
 const college=getCollege(id)!;
 let raw;try{raw=await body(request,true);}catch{return json({error:"Submit this request using the college registration portal."},400);}
 if(Date.now()>=Date.parse("2026-11-16T11:30:00Z"))return json({error:CLOSED_MESSAGE,title:"REGISTRATION CLOSED",code:"deadline"},410);
 const context=await verifyContext(request,id);
 if(!context)return json({error:"Read and acknowledge the instructions on this college’s registration page before proceeding.",code:"instructions_required"},403);
 if((raw.collegeId&&raw.collegeId!==id)||(raw.university&&raw.university!==college.name)
   ||(Array.isArray(raw.members)&&raw.members.some((m:{institution?:unknown})=>m.institution!==college.name)))return json({error:"The college is locked to this registration link. Use the correct college link.",code:"college_mismatch"},400);
 const parsed=registrationSchema.safeParse({...raw,collegeId:id,university:college.name});
 if(!parsed.success)return json({error:parsed.error.issues[0]?.message||"Check your details.",fields:parsed.error.flatten()},400);
 const {requestKey,website,...details}=parsed.data;
 if(details.competition==='essay')details.topic='';if(details.competition!=='ppt')details.teamName='';
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(details)));
 const fingerprint=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
 const payload=JSON.stringify({...details,rulesVersion:RULES_VERSION,instructionsAcknowledgedAt:context.acknowledgedAt,teamNameKey:details.teamName.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim(),submissionFingerprint:fingerprint});
 const matches=(row:RegistrationRow)=>row.college_id===id&&JSON.parse(row.payload).submissionFingerprint===fingerprint;
 try{
  const db=database();const previous=await db.prepare('SELECT * FROM registrations WHERE request_key=?').bind(requestKey).first<RegistrationRow>();
  if(previous){if(previous.status!=='confirmed')return json({error:"This entry was cancelled. Reload the page for a new registration."},409);return matches(previous)?json({registration:confirmation(previous),repeated:true}):json({error:"This submission key was already used. Reload the page for a new entry."},409);}
  const registrationId=`WSD26-${college.short}-${COMPETITIONS[details.competition].code}-${crypto.randomUUID().replace(/-/g,'').slice(0,16).toUpperCase()}`;
  const now=new Date().toISOString();
  const result=await db.prepare(ATOMIC_REGISTER_SQL).bind(registrationId,id,details.competition,details.topic||null,payload,requestKey,now,JSON.stringify(DEFAULT_SETTINGS.posterTopics)).run();
  if(result.meta.changes===1)return json({registration:{id:registrationId,collegeId:id,collegeName:college.name,competition:details.competition,topic:details.topic||null,createdAt:now,status:'confirmed'}},201);
  const repeated=await db.prepare('SELECT * FROM registrations WHERE request_key=?').bind(requestKey).first<RegistrationRow>();
  if(repeated?.status==='confirmed'&&matches(repeated))return json({registration:confirmation(repeated),repeated:true});
  const state=await availability();const current=state.colleges[id];const competition=current.competitions[details.competition];
  if(state.deadlinePassed)return json({error:CLOSED_MESSAGE,title:"REGISTRATION CLOSED",code:"deadline",availability:state},410);
  if(competition.reason==='manual')return json({error:"The organizer has closed this college’s registration for this competition.",code:'manual',availability:state},409);
  if(!competition.remaining)return json({error:`Registration Closed – Maximum Participants Reached for ${college.short}.`,code:'full',availability:state},409);
  if(details.competition==='ppt'&&!current.topics.find(t=>t.name===details.topic)?.remaining)return json({error:`This topic is full for ${college.short}. Select another available topic.`,code:'topic_full',availability:state},409);
  if(details.competition==='poster'&&!state.settings.posterTopics.includes(details.topic))return json({error:"Select a current poster topic.",availability:state},409);
  return json({error:"This team name, student email address or mobile number is already registered for this college and competition.",code:'duplicate',availability:state},409);
 }catch{
  try{const previous=await database().prepare('SELECT * FROM registrations WHERE request_key=?').bind(requestKey).first<RegistrationRow>();if(previous?.status==='confirmed'&&matches(previous))return json({registration:confirmation(previous),repeated:true});}catch{}
  return json({error:"Unable to confirm this submission. Retry with the same details to safely check the outcome."},503);
 }
}
