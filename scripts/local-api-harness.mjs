import {createRequire} from 'node:module';
import {readFile,mkdir,readdir} from 'node:fs/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
import {DatabaseSync} from 'node:sqlite';

// Invokes production handlers against isolated SQLite. Only this test harness
// supplies a controlled clock and identity headers. No test endpoint is deployed.
export async function createLocalHarness(){
 const require=createRequire(import.meta.resolve('wrangler'));const {build}=require('esbuild');
 const RealDate=globalThis.Date;let clock=RealDate.parse('2026-11-04T10:00:00.000Z');let insertHook=null;
 await mkdir('.sites-runtime',{recursive:true});await mkdir('outputs',{recursive:true});
 const sqlite=new DatabaseSync(':memory:');
 for(const file of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())sqlite.exec(await readFile('drizzle/'+file,'utf8'));
 sqlite.function('unixepoch',{varargs:true},value=>Math.floor((value==='now'?clock:RealDate.parse(value))/1000));
 sqlite.function('strftime',{varargs:true},()=>new RealDate(clock).toISOString());
 globalThis.__NAF_QA_CONTEXT=new AsyncLocalStorage();
 const DB={prepare(sql){let args=[];const statement={bind(...values){args=values;return statement;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {success:true,results:sqlite.prepare(sql).all(...args)};},execute(){if(insertHook&&sql.includes("unixepoch('now')")&&sql.includes('INSERT INTO registrations')){const hook=insertHook;insertHook=null;hook();}const r=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};},async run(){return statement.execute();}};return statement;},async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(s=>s.execute());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 globalThis.__NAF_QA_ENV={DB,ADMIN_EMAILS:'qa@naf.test',PUBLIC_SITE_URL:'http://terminal.local:4173',PUBLIC_REGISTRATION_ORIGINS:'https://prabanaf.github.io',REGISTRATION_CONTEXT_SECRET:'local-test-only-college-context-key-00000000000000000000'};
 await build({stdin:{contents:`export {POST as register} from './app/api/college/[college]/register/route';export {POST as instructions} from './app/api/college/[college]/instructions/route';export {POST as oldRegister} from './app/api/register/route';export {GET as availability} from './app/api/availability/route';export {GET as adminGet,POST as adminPost} from './app/api/admin/route';export {GET as exportFile} from './app/api/admin/export/route';export {publicPreflight} from './lib/public-cors';export {ATOMIC_REGISTER_SQL} from './lib/registration-sql';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/api-harness.mjs',plugins:[{name:'local-context',setup(b){b.onResolve({filter:/^(cloudflare:workers|next\/headers|next\/navigation)$/},a=>({path:a.path,namespace:'local-context'}));b.onLoad({filter:/.*/,namespace:'local-context'},a=>({contents:a.path==='cloudflare:workers'?`export const env=globalThis.__NAF_QA_ENV;`:a.path==='next/headers'?`export const headers=async()=>globalThis.__NAF_QA_CONTEXT.getStore().headers;`:`export function redirect(){throw new Error('Not used in API tests');}`}));}}]});
 const api=await import(new URL('../.sites-runtime/api-harness.mjs',import.meta.url));
 globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}};
 return {database:DB,sql:api.ATOMIC_REGISTER_SQL,setTime(value){clock=typeof value==='number'?value:RealDate.parse(value);},beforeNextInsert(fn){insertHook=fn;},async fetch(url,init){const request=new Request(url,init);const path=new URL(url).pathname;const college=path.match(/^\/api\/college\/([^/]+)\/(register|instructions)$/);let handler=request.method==='OPTIONS'?api.publicPreflight:college?(college[2]==='register'?api.register:api.instructions):path==='/api/register'?api.oldRegister:path==='/api/availability'?api.availability:path==='/api/admin/export'?api.exportFile:path==='/api/admin'?(request.method==='POST'?api.adminPost:api.adminGet):null;if(!handler)throw Error('Unknown test route '+path);return globalThis.__NAF_QA_CONTEXT.run({headers:request.headers},()=>handler(request,{params:Promise.resolve({college:college?.[1]})}));},dispose(){globalThis.Date=RealDate;sqlite.close();}};
}
