import {z} from "zod";
export const COLLEGES=[
 {id:"srm",short:"SRM",name:"SRM Institute of Science and Technology (SRM)",slug:"srm"},
 {id:"vit",short:"VIT",name:"Vellore Institute of Technology (VIT)",slug:"vit"},
 {id:"au",short:"AU",name:"Anna University (AU)",slug:"au"},
] as const;
export const COLLEGE_IDS=["srm","vit","au"] as const;
export const COLLEGE_NAMES=[COLLEGES[0].name,COLLEGES[1].name,COLLEGES[2].name] as const;
export type CollegeId=typeof COLLEGE_IDS[number];
export type College=typeof COLLEGES[number];
export const getCollege=(id:unknown)=>COLLEGES.find(c=>c.id===id)||null;
export const DEADLINE="2026-11-16T11:30:00.000Z";
export const DEADLINE_LABEL="16 November 2026, 5:00 PM IST";
export const RULES_VERSION="wsd-2026-three-college-v2";
export const CLOSED_MESSAGE="Thank you for your interest in World Soil Day 2026 Student Competitions. The registration deadline has ended.";
export const TOPICS=["Genesis of Soil Compaction","Consequences of Soil Compaction","Diagnosis of Soil Compaction","Recent Advances in Soil Compaction Assessment","Ameliorative Measures in Soil Compaction"] as const;
export const COMPETITIONS={
 essay:{title:"Essay Writing",full:"Essay Writing Competition",capacity:25,unit:"participants",code:"ESS"},
 ppt:{title:"Oral / PowerPoint",full:"Oral/PowerPoint Presentation",capacity:15,unit:"teams",code:"PPT"},
 poster:{title:"Poster Presentation",full:"Poster Presentation",capacity:25,unit:"participants",code:"POS"},
} as const;
export type Competition=keyof typeof COMPETITIONS;
export const INSTRUCTIONS=[
 "Registration is open only for students from the respective institution linked to this registration page.",
 "Participation is on a FIRST-COME, FIRST-SERVED basis.",
 "Registration is subject to the availability of seats and competition-wise capacity.",
 "Essay Writing: Maximum 25 individual participants per college.",
 "PPT Presentation: Maximum 15 teams per college.",
 "Poster Presentation: Maximum 25 individual participants per college.",
 "PPT topics will be allotted based on availability. Each topic can accommodate a maximum of 3 teams per college.",
 "Once the registration limit for a competition or topic is reached, further registration will not be permitted.",
 "Duplicate registrations are strictly prohibited.",
 "All registrations must be completed before 16 November 2026, 5:00 PM IST.",
 "Submission of the registration form does not guarantee participation unless a registration confirmation and unique registration ID are generated.",
];
const switches=z.object({open:z.boolean(),essayOpen:z.boolean(),pptOpen:z.boolean(),posterOpen:z.boolean()});
export const settingsSchema=z.object({essayOpen:z.boolean(),pptOpen:z.boolean(),posterOpen:z.boolean(),
 teamMin:z.literal(2),teamMax:z.literal(3),colleges:z.object({srm:switches,vit:switches,au:switches}),
 posterTopics:z.array(z.string().trim().min(3).max(180)).min(1).max(20),
}).refine(s=>new Set(s.posterTopics).size===s.posterTopics.length,{message:"Poster topics must be unique."});
export type Settings=z.infer<typeof settingsSchema>;
const enabled={open:true,essayOpen:true,pptOpen:true,posterOpen:true};
export const DEFAULT_SETTINGS:Settings={essayOpen:true,pptOpen:true,posterOpen:true,teamMin:2,teamMax:3,colleges:{srm:{...enabled},vit:{...enabled},au:{...enabled}},posterTopics:[...TOPICS]};
export function normalizeSettings(raw:Partial<Settings>|null):Settings{return {...DEFAULT_SETTINGS,...raw,teamMin:2,teamMax:3,colleges:{srm:{...enabled,...raw?.colleges?.srm},vit:{...enabled,...raw?.colleges?.vit},au:{...enabled,...raw?.colleges?.au}},posterTopics:raw?.posterTopics||[...TOPICS]};}
export function normalizeMobile(value:string){let d=value.replace(/\D/g,"");if(/^0091\d{10}$/.test(d))d=d.slice(4);else if(/^91\d{10}$/.test(d))d=d.slice(2);else if(/^0\d{10}$/.test(d))d=d.slice(1);return d;}
const text=z.string().trim().min(2).max(180);
const email=z.string().trim().max(254).email("Enter a valid email address.").transform(v=>v.toLowerCase());
const mobile=z.string().max(30).transform(normalizeMobile).pipe(z.string().regex(/^\d{10,15}$/, "Enter a valid mobile number (10–15 digits)."));
export const studentSchema=z.object({name:text,institution:z.enum(COLLEGE_NAMES),department:text,degree:text,year:z.enum(["1","2","3","4","5","6"]),programme:z.enum(["UG","PG"]),email,mobile});
export type Student=z.infer<typeof studentSchema>;
export const registrationSchema=z.object({collegeId:z.enum(COLLEGE_IDS),university:z.enum(COLLEGE_NAMES),competition:z.enum(["essay","ppt","poster"]),
 topic:z.string().trim().max(180).default(""),teamName:z.string().trim().max(120).default(""),
 facultyName:text,facultyEmail:email,facultyMobile:mobile,members:z.array(studentSchema).min(1).max(3),
 consent:z.literal(true,{errorMap:()=>({message:"Confirm student eligibility and permission to share these details with NAF."})}),
 requestKey:z.string().uuid(),website:z.string().max(0).optional(),
}).superRefine((d,ctx)=>{
 if(d.competition!=="ppt"&&d.members.length!==1)ctx.addIssue({code:"custom",message:"Individual participation only.",path:["members"]});
 if(d.competition==="ppt"&&(d.members.length<2||d.members.length>3))ctx.addIssue({code:"custom",message:"PPT teams must have 2–3 students.",path:["members"]});
 if(d.competition==="ppt"&&d.teamName.length<2)ctx.addIssue({code:"custom",message:"Enter the team name.",path:["teamName"]});
 if(d.competition==="ppt"&&!TOPICS.includes(d.topic as typeof TOPICS[number]))ctx.addIssue({code:"custom",message:"Choose one of the five available PPT topics.",path:["topic"]});
 if(d.competition==="poster"&&!d.topic)ctx.addIssue({code:"custom",message:"Select a poster topic.",path:["topic"]});
 if(new Set(d.members.map(m=>m.email)).size!==d.members.length||new Set(d.members.map(m=>m.mobile)).size!==d.members.length)ctx.addIssue({code:"custom",message:"Each team member must have a different email address and mobile number.",path:["members"]});
});
export type RegistrationInput=z.infer<typeof registrationSchema>;
export type CompetitionAvailability={count:number;remaining:number;capacity:number;open:boolean;reason:"deadline"|"manual"|"full"|null};
export type CollegeAvailability={collegeId:CollegeId;competitions:Record<Competition,CompetitionAvailability>;topics:{name:string;count:number;remaining:number}[];open:boolean};
export type Availability={settings:Settings;serverNow:string;deadline:string;deadlinePassed:boolean;colleges:Record<CollegeId,CollegeAvailability>;competitions:Record<Competition,CompetitionAvailability>};
export type RegistrationRow={id:string;college_id:string|null;competition:Competition;topic:string|null;status:"confirmed"|"cancelled";payload:string;request_key:string;created_at:string;cancelled_at:string|null};
export type AdminDetails=Omit<RegistrationInput,"requestKey"|"website"|"university"|"collegeId">&{university:string|null;collegeId:CollegeId|null;rulesVersion?:string;instructionsAcknowledgedAt?:string};
export type AdminRegistration=Omit<RegistrationRow,"payload"|"request_key">&{collegeId:CollegeId|null;legacy:boolean;details:AdminDetails};
export type Confirmation={id:string;competition:Competition;collegeId:CollegeId;collegeName:string;topic:string|null;createdAt:string;status:string};
