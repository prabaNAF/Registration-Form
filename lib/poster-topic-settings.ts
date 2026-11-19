import type {D1Database} from "@cloudflare/workers-types";
import {POSTER_TOPICS} from "./domain";

const UPDATE_KEY="poster_topics_2026_11_19";

// Apply the organizer's published topic revision once, preserving every other
// setting and all registrations. Later administrator edits remain authoritative.
export async function applyPublishedPosterTopics(db:D1Database){
 if(await db.prepare("SELECT value FROM settings WHERE key=?").bind(UPDATE_KEY).first())return;
 const topics=JSON.stringify(POSTER_TOPICS);const now=new Date().toISOString();
 await db.batch([
  db.prepare(`INSERT INTO settings(key,value)
   SELECT 'config',json_object('posterTopics',json(?))
   WHERE NOT EXISTS(SELECT 1 FROM settings WHERE key=?)
   ON CONFLICT(key) DO UPDATE SET value=json_set(settings.value,'$.posterTopics',json(?))`).bind(topics,UPDATE_KEY,topics),
  db.prepare(`INSERT INTO audit(id,actor,action,target,created_at)
   SELECT ?,'site-publication','update_poster_topics','posterTopics',?
   WHERE NOT EXISTS(SELECT 1 FROM settings WHERE key=?)`).bind(crypto.randomUUID(),now,UPDATE_KEY),
  db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)").bind(UPDATE_KEY,JSON.stringify({appliedAt:now,topicCount:POSTER_TOPICS.length})),
 ]);
}
