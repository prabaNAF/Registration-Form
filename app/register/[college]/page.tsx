import {notFound} from "next/navigation";
import {getCollege} from "@/lib/domain";
import Portal from "@/app/portal";
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{college:string}>}){const college=getCollege((await params).college);return {title:college?`${college.short} Registration | World Soil Day 2026 – NAF`:'College not found'};}
export default async function CollegePage({params}:{params:Promise<{college:string}>}){const college=getCollege((await params).college);if(!college)notFound();return <Portal collegeId={college.id}/>;}
