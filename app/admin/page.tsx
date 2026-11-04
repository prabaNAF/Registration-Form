import { adminUser } from "@/lib/server";
import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import AdminClient from "./ui";
export const dynamic="force-dynamic";
export const metadata={title:"Organizer Dashboard | NAF World Soil Day 2026",robots:{index:false,follow:false}};
export default async function AdminPage() {
  const user=await adminUser();
  if(user) return <AdminClient email={user.email}/>;
  const signedIn=await getChatGPTUser();
  return <main className="auth-page"><a href="/" className="auth-brand"><img src="/naf-logo.png" alt="National Agro Foundation"/></a><div className="auth-card"><span className="eyebrow">NAF · ORGANIZER ACCESS</span><h1>A place for the people behind the day.</h1><p>{signedIn ? "This signed-in account is not an authorized organizer. Sign out and use the NAF organizer account." : "Sign in with the authorized NAF ChatGPT account to manage registrations, topics and competition settings."}</p><a className="button" href={signedIn?chatGPTSignOutPath("/admin"):chatGPTSignInPath("/admin")} target="_top">{signedIn?"Sign out":"Sign in with ChatGPT"} <span>↗</span></a><a className="text-link" href="/">Return to registration portal</a><small>Student registrations remain publicly accessible.</small></div></main>;
}
