import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createLocalHarness} from './local-api-harness.mjs';

const expected=[
 'Breaking the Barrier: Mechanical and Biological Tillage Strategies to Alleviate Compaction',
 'Controlled Traffic Farming (CTF): A Precision Approach to Minimizing Wheel-Induced Soil Compaction',
 'The Choked Rhizosphere: Quantifying the Impact of Soil Compaction on Soil Properties and Nutrient Uptake',
 'Loosening the Earth: How Organic Amendments and Earthworm Activity Restore Compacted Soil Structure',
];
const pptTopics=['Genesis of Soil Compaction','Consequences of Soil Compaction','Diagnosis of Soil Compaction','Recent Advances in Soil Compaction Assessment','Ameliorative Measures in Soil Compaction'];
const colleges={srm:'SRM Institute of Science and Technology (SRM)',vit:'Vellore Institute of Technology (VIT)',aac:'Adhiparaskthi Agricultural and Horticultural College'};
const h=await createLocalHarness();h.setTime('2026-11-19T07:00:00Z');
const base='http://terminal.local:4173';let checks=0,serial=0;
const check=(ok,message)=>{assert.ok(ok,message);checks++;console.log('PASS '+message);};
const call=(path,body,headers={})=>h.fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
const state=async()=>{const r=await call('/api/availability');assert.equal(r.status,200,await r.clone().text());return r.json();};
const entry=(id,topic)=>({collegeId:id,university:colleges[id],competition:'poster',topic,teamName:'',members:[{name:'Poster Test '+(++serial),institution:colleges[id],department:'Agriculture',degree:'B.Sc. Agriculture',year:'2',programme:'UG',email:`poster-${serial}@example.invalid`,mobile:`98${String(serial).padStart(8,'0')}`}],facultyName:'Test Faculty',facultyEmail:'faculty@example.invalid',facultyMobile:'9000000000',consent:true,requestKey:randomUUID()});
try{
 const enabled={open:true,essayOpen:true,pptOpen:true,posterOpen:true};
 const before={essayOpen:false,pptOpen:true,posterOpen:true,teamMin:2,teamMax:3,colleges:{srm:{...enabled,essayOpen:false},vit:{...enabled,pptOpen:false},aac:{...enabled}},posterTopics:pptTopics,organizerNote:'Preserve unrelated configuration'};
 await h.database.prepare("INSERT INTO settings(key,value) VALUES('config',?)").bind(JSON.stringify(before)).run();
 const legacy=entry('srm',pptTopics[0]);const originalPayload=JSON.stringify(legacy);
 await h.database.prepare('INSERT INTO registrations(id,college_id,competition,topic,payload,request_key,created_at,status) VALUES(?,?,?,?,?,?,?,?)').bind('WSD26-SRM-POS-0000000000000001','srm','poster',pptTopics[0],originalPayload,legacy.requestKey,'2026-11-10T10:00:00Z','confirmed').run();
 const snapshots=await Promise.all(Array.from({length:8},()=>state()));
 check(snapshots.every(s=>JSON.stringify(s.settings.posterTopics)===JSON.stringify(expected)),'concurrent live reads publish exactly the four requested poster topics');
 const saved=JSON.parse((await h.database.prepare("SELECT value FROM settings WHERE key='config'").first()).value);
 const {posterTopics:oldList,...oldRest}=before;const {posterTopics:newList,...newRest}=saved;
 assert.deepEqual(newRest,oldRest);check(true,'topic update preserves every other saved setting and manual switch');
 const historical=await h.database.prepare('SELECT topic,payload FROM registrations WHERE id=?').bind('WSD26-SRM-POS-0000000000000001').first();
 check(historical.topic===pptTopics[0]&&historical.payload===originalPayload,'existing poster registrations retain their original topic and details');
 check((await h.database.prepare("SELECT count(*) n FROM audit WHERE action='update_poster_topics'").first()).n===1,'concurrent publication creates one audit entry');
 for(const id of Object.keys(colleges)){
  const ack=await call(`/api/college/${id}/instructions`,{accepted:true,version:'wsd-2026-three-college-v2'});assert.equal(ack.status,200);const cookie=ack.headers.get('set-cookie').split(';')[0];
  for(const topic of expected){const r=await call(`/api/college/${id}/register`,entry(id,topic),{Cookie:cookie});const result=await r.json();check(r.status===201&&result.registration.topic===topic,`${id.toUpperCase()} accepts and records poster topic ${expected.indexOf(topic)+1}`);}
  const stale=await call(`/api/college/${id}/register`,entry(id,pptTopics[0]),{Cookie:cookie});check(stale.status===409,'previous poster choice is rejected for new '+id.toUpperCase()+' registrations');
  const invalid=await call(`/api/college/${id}/register`,entry(id,'Invalid poster topic'),{Cookie:cookie});check(invalid.status===409,'unlisted poster choice is rejected server-side for '+id.toUpperCase());
 }
 const current=await state();
 check(Object.values(current.colleges).every(c=>JSON.stringify(c.topics.map(t=>t.name))===JSON.stringify(pptTopics)),'all five PPT topics remain unchanged for every college');
 check(current.deadline==='2026-11-20T11:30:00.000Z'&&Object.values(current.colleges).every(c=>c.competitions.poster.capacity===25),'deadline and independent 25-seat poster limits remain unchanged');
 check(current.colleges.srm.competitions.poster.count===5&&current.colleges.vit.competitions.poster.count===4&&current.colleges.aac.competitions.poster.count===4,'rejected topics consume no seats and historical registrations still count');
 const custom={...current.settings,posterTopics:['Future organizer topic']};
 const edited=await call('/api/admin',{action:'settings',settings:custom},{'oai-authenticated-user-id':'qa-organizer','oai-authenticated-user-email':'qa@naf.test'});
 check(edited.status===200&&(await state()).settings.posterTopics[0]==='Future organizer topic','later authorized administrator topic edits are preserved on subsequent reads');
 check((await h.database.prepare("SELECT count(*) n FROM audit WHERE action='update_poster_topics'").first()).n===1,'subsequent requests do not repeat the published update');
 console.log(`${checks} poster-topic publication and validation checks passed.`);
}finally{h.dispose();}
