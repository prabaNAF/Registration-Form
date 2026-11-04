import {adminUser,database,availability,json} from "@/lib/server";
import {COLLEGE_IDS,type RegistrationRow,type Competition} from "@/lib/domain";
import {adminRegistration,filterRegistrations,type CollegeFilter} from "@/lib/colleges";
import {excelWorkbook} from "@/lib/excel";
import {exportSheets,registrationTable} from "@/lib/registration-export";
export const dynamic='force-dynamic';
export function csvCell(value:unknown){let s=String(value??'');if(/^[\s\u0000-\u001f]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export async function GET(request:Request){
 if(!await adminUser())return json({error:'Administrator access required.'},403);
 const p=new URL(request.url).searchParams;const college=p.get('college')||p.get('university')||'all';const competition=p.get('competition')||'all';const status=p.get('status')||'';const query=p.get('q')||'';const format=p.get('format')||'csv';
 if(!['all','legacy',...COLLEGE_IDS].includes(college)||!['all','essay','ppt','poster'].includes(competition)||!['','confirmed','cancelled'].includes(status)||!['csv','xlsx'].includes(format)||query.length>200)return json({error:'Invalid report filters.'},400);
 try{const data=await database().prepare('SELECT * FROM registrations ORDER BY created_at ASC').all<RegistrationRow>();const rows=filterRegistrations(data.results.map(adminRegistration),{college:college as CollegeFilter,competition:competition as Competition|'all',status,query});const filename=`NAF_WSD_2026_${college}_${competition}_${status||'all-statuses'}.${format}`;const headers={'Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'};
  if(format==='xlsx'){const bytes=excelWorkbook(exportSheets(rows,college as CollegeFilter,await availability()));return new Response(new Uint8Array(bytes).buffer,{headers:{...headers,'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}});}
  return new Response('\uFEFF'+registrationTable(rows).map(r=>r.map(csvCell).join(',')).join('\r\n'),{headers:{...headers,'Content-Type':'text/csv; charset=utf-8'}});
 }catch{return json({error:'Unable to generate the college report. Please try again.'},503);}
}
