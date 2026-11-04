import {redirect} from "next/navigation";
import Portal from "./portal";
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const p=await searchParams;const old=p.university;if(typeof old==='string'&&['srm','vit','au'].includes(old))redirect('/register/'+old);return <Portal/>;}
