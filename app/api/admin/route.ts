import {adminUser,availability,body,database,json} from "@/lib/server";
import {settingsSchema,type RegistrationRow} from "@/lib/domain";
import {adminRegistration,collegeOverview} from "@/lib/colleges";
export const dynamic="force-dynamic";
export async function GET(){const user=await adminUser();if(!user)return json({error:"Administrator access required."},403);try{const result=await database().prepare('SELECT * FROM registrations ORDER BY created_at DESC').all<RegistrationRow>();const registrations=result.results.map(adminRegistration);return json({user:{name:user.displayName,email:user.email},availability:await availability(),registrations,colleges:collegeOverview(registrations)});}catch{return json({error:"Unable to load the central registration database."},503);}}
export async function POST(request:Request){
 const user=await adminUser();if(!user)return json({error:"Administrator access required."},403);
 try{const input=await body(request);const db=database();const now=new Date().toISOString();
  if(input.action==='settings'){const parsed=settingsSchema.safeParse(input.settings);if(!parsed.success)return json({error:parsed.error.issues[0].message},400);await db.batch([db.prepare("INSERT INTO settings(key,value) VALUES('config',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(parsed.data)),db.prepare('INSERT INTO audit(id,actor,action,target,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),user.userId,'update_college_settings','config',now)]);}
  else if(input.action==='cancel'&&typeof input.id==='string'&&/^WSD26-(?:(?:SRM|VIT|AAC|AU)-)?(?:ESS|PPT|POS)-[A-F0-9]{16}$/.test(input.id)){const found=await db.prepare('SELECT id FROM registrations WHERE id=?').bind(input.id).first();if(!found)return json({error:"Registration not found."},404);await db.batch([db.prepare("UPDATE registrations SET status='cancelled',cancelled_at=? WHERE id=? AND status='confirmed'").bind(now,input.id),db.prepare('INSERT INTO audit(id,actor,action,target,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),user.userId,'cancel_registration',input.id,now)]);}
  else return json({error:"Unknown administrator action. College assignment is fixed to the registration link."},400);
  return json({ok:true,availability:await availability()});
 }catch{return json({error:"Unable to save this change."},400);}
}
