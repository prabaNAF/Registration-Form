// Existing SRM/VIT records keep their bookings. Unrelated historical institutions
// remain in the database for organizer review, outside the new college limits.
export const EFFECTIVE_COLLEGE_SQL=`COALESCE(NULLIF(r.college_id,''),CASE lower(trim(json_extract(r.payload,'$.university')))
 WHEN 'srm university' THEN 'srm' WHEN 'srm institute of science and technology' THEN 'srm' WHEN 'srm institute of science and technology (srm)' THEN 'srm'
 WHEN 'vit university' THEN 'vit' WHEN 'vellore institute of technology' THEN 'vit' WHEN 'vellore institute of technology (vit)' THEN 'vit'
 WHEN 'adhiparashakthi agricultural college' THEN 'aac' WHEN 'adhiparashakthi agricultural college (aac)' THEN 'aac' WHEN 'adhiparaskthi agricultural and horticultural college' THEN 'aac' WHEN 'adhiparaskthi agricultural and horticultural college (aac)' THEN 'aac' ELSE NULL END)`;
// One atomic SQLite write checks the database clock, college-specific capacity,
// topic capacity, duplicates across every member, and manual closing controls.
export const ATOMIC_REGISTER_SQL=`
WITH input AS(SELECT ? id,? college_id,? competition,? topic,? payload,? request_key,? created_at),
 config AS(SELECT COALESCE((SELECT value FROM settings WHERE key='config'),'{}') value)
INSERT INTO registrations(id,college_id,competition,topic,payload,request_key,created_at,status)
SELECT i.id,i.college_id,i.competition,i.topic,i.payload,i.request_key,i.created_at,'confirmed' FROM input i,config c
WHERE unixepoch('now')<unixepoch('2026-11-16T11:30:00Z')
AND COALESCE(json_extract(c.value,'$.'||i.competition||'Open'),1)=1
AND COALESCE(json_extract(c.value,'$.colleges.'||i.college_id||'.open'),1)=1
AND COALESCE(json_extract(c.value,'$.colleges.'||i.college_id||'.'||i.competition||'Open'),1)=1
AND (SELECT COUNT(*) FROM registrations r WHERE ${EFFECTIVE_COLLEGE_SQL}=i.college_id AND r.competition=i.competition AND r.status='confirmed')<CASE i.competition WHEN 'ppt' THEN 15 ELSE 25 END
AND (i.competition!='ppt' OR(
 json_array_length(i.payload,'$.members') BETWEEN 2 AND 3
 AND (SELECT COUNT(*) FROM registrations r WHERE ${EFFECTIVE_COLLEGE_SQL}=i.college_id AND r.competition='ppt' AND r.topic=i.topic AND r.status='confirmed')<3
 AND NOT EXISTS(SELECT 1 FROM registrations r WHERE ${EFFECTIVE_COLLEGE_SQL}=i.college_id AND r.competition='ppt' AND r.status='confirmed' AND COALESCE(json_extract(r.payload,'$.teamNameKey'),lower(trim(json_extract(r.payload,'$.teamName'))))=json_extract(i.payload,'$.teamNameKey'))))
AND (i.competition!='poster' OR EXISTS(SELECT 1 FROM json_each(COALESCE(json_extract(c.value,'$.posterTopics'),?)) t WHERE t.value=i.topic))
AND NOT EXISTS(SELECT 1 FROM registrations r,json_each(r.payload,'$.members') old_member,json_each(i.payload,'$.members') new_member
 WHERE ${EFFECTIVE_COLLEGE_SQL}=i.college_id AND r.competition=i.competition AND r.status='confirmed'
 AND(json_extract(old_member.value,'$.email')=json_extract(new_member.value,'$.email') OR json_extract(old_member.value,'$.mobile')=json_extract(new_member.value,'$.mobile')))`;
