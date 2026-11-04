import {registrationOrigin,publicResponse,publicPreflight} from "@/lib/public-cors";
import {CLOSED_MESSAGE,DEADLINE,RULES_VERSION,getCollege} from "@/lib/domain";
import {body,json,availability} from "@/lib/server";
import {contextCookie,issueContext} from "@/lib/registration-context";
export const dynamic="force-dynamic";
export async function acknowledge(request:Request,context:{params:Promise<{college:string}>}){
 const college=getCollege((await context.params).college);if(!college)return json({error:"Unknown college registration link."},404);
 let input;try{input=await body(request,true);}catch{return json({error:"Acknowledge the instructions using this college’s portal."},400);}
 if(input.accepted!==true||input.version!==RULES_VERSION)return json({error:"Please read and agree to the registration instructions."},400);
 try{const state=await availability();if(state.deadlinePassed||Date.now()>=Date.parse(DEADLINE))return json({error:CLOSED_MESSAGE,title:"REGISTRATION CLOSED",code:"deadline"},410);
  const origin=registrationOrigin(request);const token=await issueContext(college.id,origin||undefined);return json({acknowledged:true,collegeId:college.id,version:RULES_VERSION,...(origin?{token}:{})},200,origin?{}:{'Set-Cookie':contextCookie(college.id,token,new URL(request.url).protocol==='https:')});
 }catch{return json({error:"The instructions could not be acknowledged. Please try again."},503);}
}

export const OPTIONS=publicPreflight;
export async function POST(request:Request,context:{params:Promise<{college:string}>}){return publicResponse(request,await acknowledge(request,context));}
