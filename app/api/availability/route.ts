import {availability,json} from "@/lib/server";
import {publicResponse,publicPreflight} from "@/lib/public-cors";
export const dynamic="force-dynamic";
export const OPTIONS=publicPreflight;
export async function GET(request:Request){try{return publicResponse(request,json(await availability()));}catch{return publicResponse(request,json({error:"Live availability is temporarily unavailable. Please try again."},503));}}
