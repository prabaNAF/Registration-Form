import {publicResponse,publicPreflight} from "@/lib/public-cors";
import {getCollege} from "@/lib/domain";
import {json} from "@/lib/server";
import {submitRegistration} from "@/lib/register";
export const dynamic="force-dynamic";
export async function POST(request:Request,context:{params:Promise<{college:string}>}){const college=getCollege((await context.params).college);return publicResponse(request,await (college?submitRegistration(request,college.id):json({error:"Unknown college registration link."},404)));}

export const OPTIONS=publicPreflight;
